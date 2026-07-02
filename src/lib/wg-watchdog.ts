import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile, writeFile, rename, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";

// Wraps SSH exec for the wg-watchdog.timer systemd unit on the homelab and
// the VPS. Each side is independent — the dashboard surfaces per-machine
// status and provides a per-machine toggle.
//
// Env overrides (with hard-coded fallback for homelab defaults):
//   WG_WATCHDOG_HOMELAB_SSH  (default: glenn@archglenn)
//   WG_WATCHDOG_VPS_SSH      (default: root@74.208.115.142)
//   WG_WATCHDOG_VPS_KEY      (default: /home/glenn/.ssh/vps_flowmanner_new)
//
// Toggle semantics:
//   enable  → sudo systemctl enable --now wg-watchdog.timer
//             (enables autostart AND starts the timer now)
//   disable → sudo systemctl disable --now wg-watchdog.timer
//             (stops the timer AND prevents autostart)

const execFileP = promisify(execFile);

const TIMEOUT_MS = 5_000;

export type MachineId = "homelab" | "vps";

export type MachineStatus = {
  id: MachineId;
  name: string;
  isEnabled: boolean | null;
  isActive: boolean | null;
  isReachable: boolean;
  error: string | null;
  // Last N lines from `journalctl -u wg-watchdog.timer -n N --no-pager -o short`.
  // null when the journalctl fetch itself failed (typically when SSH is
  // unreachable). Empty array is a valid state (unit has no recent activity).
  recentLogs: string[] | null;
};

const JOURNAL_LINES = 5;

export type MachineSpec = {
  id: MachineId;
  name: string;
  ssh: string;
  sshKey?: string;
};

const TARGETS: Record<MachineId, MachineSpec> = {
  homelab: {
    id: "homelab",
    name: "Homelab",
    ssh: process.env.WG_WATCHDOG_HOMELAB_SSH ?? "glenn@archglenn",
  },
  vps: {
    id: "vps",
    name: "VPS",
    ssh: process.env.WG_WATCHDOG_VPS_SSH ?? "root@74.208.115.142",
    sshKey:
      process.env.WG_WATCHDOG_VPS_KEY ?? "/home/glenn/.ssh/vps_flowmanner_new",
  },
};

export function listTargets(): MachineSpec[] {
  return [TARGETS.homelab, TARGETS.vps];
}

function buildSshArgs(spec: MachineSpec, remoteCmd: string[]): string[] {
  // Note on `StrictHostKeyChecking=accept-new`: this is trust-on-first-use,
  // one-time, on the very first connect. It auto-accepts whatever host key
  // is presented and writes it to ~/.ssh/known_hosts; subsequent connects
  // verify the persisted key. The hard-coded setting keeps unattended
  // toggles from blocking on the interactive "Are you sure you want to
  // continue connecting (yes/no)?" prompt. For the VPS at 74.208.115.142
  // (public IP), pre-provision known_hosts with `ssh-keyscan` from a
  // trusted machine before first deploy to avoid the one-shot TOFU window.
  // The homelab over the WireGuard tailnet is fine as-is.
  const args = [
    "-o", "BatchMode=yes",
    "-o", "ConnectTimeout=3",
    "-o", "StrictHostKeyChecking=accept-new",
  ];
  if (spec.sshKey) args.push("-i", spec.sshKey);
  args.push(spec.ssh, "--", ...remoteCmd);
  return args;
}

export type SshResult =
  | { ok: true; out: string }
  | { ok: false; error: string; code: number | null };

async function runSsh(
  spec: MachineSpec,
  remoteCmd: string[],
): Promise<SshResult> {
  try {
    const { stdout } = await execFileP("ssh", buildSshArgs(spec, remoteCmd), {
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    return { ok: true, out: stdout.trim() };
  } catch (err) {
    const e = err as Error & {
      code?: number | string;
      stderr?: Buffer | string;
    };
    // node child_process errors: ENOENT = binary missing, ECONNREFUSED, etc.
    const stderrText =
      typeof e.stderr === "string"
        ? e.stderr
        : e.stderr?.toString?.() ?? "";
    const firstStderrLine = stderrText.split("\n").find((l) => l.trim()) ?? "";
    const codeNum =
      typeof e.code === "number"
        ? e.code
        : e.code === "string" && /^\d+$/.test(e.code)
          ? Number(e.code)
          : null;
    return {
      ok: false,
      error: firstStderrLine.slice(0, 200) || e.message.slice(0, 200),
      code: codeNum,
    };
  }
}

/**
 * Returns { ok: true, positive } if the unit-state query finished cleanly,
 * otherwise { ok: false, error } when SSH itself failed (unreachable).
 * Unit-level unknowns (unit not installed, masked, static) are still
 * considered "ok" with a non-positive boolean — they aren't connectivity
 * failures, they're state.
 */
async function queryBoolean(
  spec: MachineSpec,
  subCommand: "is-enabled" | "is-active",
): Promise<
  | { ok: true; positive: boolean }
  | { ok: false; error: string }
> {
  const result = await runSsh(spec, [
    "systemctl",
    subCommand,
    "wg-watchdog.timer",
  ]);
  if (!result.ok) {
    return { ok: false, error: result.error };
  }
  if (subCommand === "is-enabled") {
    return { ok: true, positive: result.out === "enabled" };
  }
  // is-active
  return { ok: true, positive: result.out === "active" };
}

/**
 * Returns the last N lines from `journalctl -u wg-watchdog.timer -n N
 * --no-pager -o short`. Used to surface the operator what the timer has been
 * doing — particularly useful when the unit is in the "Stuck" state (enabled
 * but not active).
 *
 * Note: this intentionally omits `sudo`. The homelab user `glenn` is
 * expected to be in the `systemd-journal` group (standard on modern Linux),
 * and the working `setEnabled` only proves NOPASSWD for `systemctl`, not
 * `journalctl`. If the call fails with a permission error, the panel will
 * show "Logs unavailable" and the operator can add the group membership or
 * extend sudoers accordingly.
 *
 * The `-- No entries --` sentinel that some journalctl versions print to
 * stdout when there are no matching records is filtered out so it doesn't
 * surface as a fake log line.
 */
async function getJournalLines(
  spec: MachineSpec,
  n: number,
): Promise<
  | { ok: true; lines: string[] }
  | { ok: false; error: string }
> {
  const result = await runSsh(spec, [
    "journalctl",
    "-u",
    "wg-watchdog.timer",
    "-n",
    String(n),
    "--no-pager",
    "-o",
    "short",
  ]);
  if (!result.ok) {
    return { ok: false, error: result.error };
  }
  if (result.out.length === 0) {
    return { ok: true, lines: [] };
  }
  const lines = result.out
    .split("\n")
    .filter((l) => l.trim() !== "" && l.trim() !== "-- No entries --");
  return { ok: true, lines };
}

export async function getStatus(machineId: MachineId): Promise<MachineStatus> {
  const spec = TARGETS[machineId];
  const [enabled, active, logs] = await Promise.all([
    queryBoolean(spec, "is-enabled"),
    queryBoolean(spec, "is-active"),
    getJournalLines(spec, JOURNAL_LINES),
  ]);

  if (!enabled.ok || !active.ok) {
    const error = !enabled.ok ? enabled.error : (active as { error: string }).error;
    return {
      id: machineId,
      name: spec.name,
      isEnabled: null,
      isActive: null,
      isReachable: false,
      error,
      // Logs are returned when the journalctl call succeeded independently
      // (rare when the unit queries fail, but possible — e.g. permission on
      // systemctl but not on journalctl).
      recentLogs: logs.ok ? logs.lines : null,
    };
  }

  return {
    id: machineId,
    name: spec.name,
    isEnabled: (enabled as { ok: true; positive: boolean }).positive,
    isActive: (active as { ok: true; positive: boolean }).positive,
    isReachable: true,
    error: null,
    recentLogs: logs.ok ? logs.lines : null,
  };
}

export async function getAllStatus(): Promise<MachineStatus[]> {
  return Promise.all([getStatus("homelab"), getStatus("vps")]);
}

export async function setEnabled(
  machineId: MachineId,
  enable: boolean,
): Promise<void> {
  const spec = TARGETS[machineId];
  const sub = enable ? "enable" : "disable";
  const result = await runSsh(spec, [
    "sudo",
    "systemctl",
    sub,
    "--now",
    "wg-watchdog.timer",
  ]);
  if (!result.ok) {
    throw new Error(result.error);
  }
}

// ─── Audit trail ─────────────────────────────────────────────────────────────
//
// Last-swap persisted to JSON on disk so the chip can show "Last swap X ago
// by <actor>" across restarts. Single-process serialization through a promise
// chain (Node is single-threaded; cross-process locks would need flock or an
// external lock service — out of scope for a homelab dashboard).
//
// Env overrides:
//   WG_WATCHDOG_AUDIT_PATH (default: <process.cwd()>/.hermes/wg-watchdog-audit.json)
//   HIL_ACTOR              (default: "me" — single-operator homelab)

const AUDIT_PATH =
  process.env.WG_WATCHDOG_AUDIT_PATH ??
  join(process.cwd(), ".hermes", "wg-watchdog-audit.json");

const AUDIT_FILE_VERSION = 1 as const;

export type AuditEntry = {
  timestamp: string; // ISO 8601
  actor: string;
  machineId: MachineId;
  action: "enable" | "disable";
  result: "ok" | string; // "ok" on success, error string on failure
};

export type AuditFile = {
  version: typeof AUDIT_FILE_VERSION;
  lastSwap: AuditEntry | null;
};

export function getActor(): string {
  return process.env.HIL_ACTOR ?? "me";
}

let writeChain: Promise<unknown> = Promise.resolve();

/**
 * Read the audit file. Returns an empty audit if the file is missing,
 * unreadable, or corrupt — the chip + API should still render gracefully.
 */
export async function readAudit(): Promise<AuditFile> {
  try {
    const raw = await readFile(AUDIT_PATH, "utf-8");
    const parsed = JSON.parse(raw) as Partial<AuditFile> & { version?: number };
    if (parsed.version !== AUDIT_FILE_VERSION) {
      return { version: AUDIT_FILE_VERSION, lastSwap: null };
    }
    // Tolerate older files that still carry a history array — drop it.
    return { version: AUDIT_FILE_VERSION, lastSwap: parsed.lastSwap ?? null };
  } catch {
    return { version: AUDIT_FILE_VERSION, lastSwap: null };
  }
}

/**
 * Record the most-recent swap entry. Atomic write via temp + rename. Failures
 * are swallowed (logged via console) — the toggle itself may have succeeded,
 * so we don't want to roll it back due to a flaky disk write.
 */
export async function recordAudit(entry: AuditEntry): Promise<void> {
  const next = writeChain.then(async () => {
    const file: AuditFile = {
      version: AUDIT_FILE_VERSION,
      lastSwap: entry,
    };
    const tmpPath = `${AUDIT_PATH}.tmp.${process.pid}`;
    await mkdir(dirname(AUDIT_PATH), { recursive: true });
    await writeFile(tmpPath, JSON.stringify(file, null, 2), "utf-8");
    await rename(tmpPath, AUDIT_PATH);
  });
  // Detach the catch so a single bad write doesn't poison the chain for
  // future calls; surface failure via console only.
  writeChain = next.catch((err) => {
    console.error("[wg-watchdog] audit write failed:", err);
  });
  await writeChain;
}
