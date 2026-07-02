// System health checker. Pings all connected services in parallel and returns
// a standardized status array for the SystemHealthPanel dashboard component.
//
// Each service is checked independently via Promise.allSettled so one failure
// never blocks the others. Inspired by Claude OS's Services Dashboard.

import { sql } from "drizzle-orm";
import { db } from "@/db";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileP = promisify(execFile);

export type ServiceStatus = "healthy" | "degraded" | "down";

export type ServiceHealth = {
  id: string;
  name: string;
  icon: string; // lucide icon name — mapped in the component
  status: ServiceStatus;
  latencyMs: number | null;
  detail: string;
};

// ── Individual checks ──────────────────────────────────────────────────────

async function checkPostgres(): Promise<ServiceHealth> {
  const start = Date.now();
  try {
    await db.execute(sql`SELECT 1`);
    return {
      id: "postgres",
      name: "PostgreSQL",
      icon: "Database",
      status: "healthy",
      latencyMs: Date.now() - start,
      detail: "hil_ops schema connected",
    };
  } catch (err) {
    return {
      id: "postgres",
      name: "PostgreSQL",
      icon: "Database",
      status: "down",
      latencyMs: null,
      detail: err instanceof Error ? err.message : "Connection failed",
    };
  }
}

async function checkHomelabLLM(): Promise<ServiceHealth> {
  const url = process.env.LLM_URL ?? "http://localhost:11434";
  const start = Date.now();
  try {
    const res = await fetch(`${url}/v1/models`, {
      signal: AbortSignal.timeout(5_000),
    });
    const latencyMs = Date.now() - start;
    if (!res.ok) {
      return {
        id: "llm",
        name: "Homelab LLM",
        icon: "Cpu",
        status: "degraded",
        latencyMs,
        detail: `HTTP ${res.status}`,
      };
    }
    const data = (await res.json()) as {
      data?: Array<{ id: string }>;
    };
    const modelCount = data.data?.length ?? 0;
    return {
      id: "llm",
      name: "Homelab LLM",
      icon: "Cpu",
      status: "healthy",
      latencyMs,
      detail: `${modelCount} model${modelCount !== 1 ? "s" : ""} loaded`,
    };
  } catch {
    return {
      id: "llm",
      name: "Homelab LLM",
      icon: "Cpu",
      status: "down",
      latencyMs: null,
      detail: `Unreachable at ${url}`,
    };
  }
}

async function checkModelManager(): Promise<ServiceHealth> {
  const url = process.env.MODEL_MANAGER_URL ?? "http://localhost:9723";
  const start = Date.now();
  try {
    const res = await fetch(`${url}/health`, {
      signal: AbortSignal.timeout(5_000),
    });
    const latencyMs = Date.now() - start;
    if (!res.ok) {
      return {
        id: "model-manager",
        name: "Model Manager",
        icon: "Boxes",
        status: "degraded",
        latencyMs,
        detail: `HTTP ${res.status}`,
      };
    }
    const data = (await res.json()) as {
      current_model?: string;
      healthy?: boolean;
    };
    return {
      id: "model-manager",
      name: "Model Manager",
      icon: "Boxes",
      status: data.healthy !== false ? "healthy" : "degraded",
      latencyMs,
      detail: data.current_model
        ? `Serving ${data.current_model}`
        : "Daemon running",
    };
  } catch {
    return {
      id: "model-manager",
      name: "Model Manager",
      icon: "Boxes",
      status: "down",
      latencyMs: null,
      detail: `Unreachable at ${url}`,
    };
  }
}

async function checkGitHub(): Promise<ServiceHealth> {
  const start = Date.now();
  try {
    const { stdout } = await execFileP(
      "gh",
      ["auth", "status"],
      { timeout: 5_000 },
    );
    const latencyMs = Date.now() - start;
    // gh auth status prints to stderr, but exits 0 when authenticated.
    // stdout may be empty; the important thing is exit code 0.
    return {
      id: "github",
      name: "GitHub CLI",
      icon: "GitBranch",
      status: "healthy",
      latencyMs,
      detail: "Authenticated",
    };
  } catch {
    return {
      id: "github",
      name: "GitHub CLI",
      icon: "GitBranch",
      status: "down",
      latencyMs: null,
      detail: "gh not authenticated or missing",
    };
  }
}

async function checkHermes(): Promise<ServiceHealth> {
  const url = process.env.HERMES_URL ?? "http://localhost:8642";
  const start = Date.now();
  try {
    const headers: Record<string, string> = {};
    const apiKey = process.env.HERMES_API_KEY;
    if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

    const res = await fetch(`${url}/v1/capabilities`, {
      headers,
      signal: AbortSignal.timeout(5_000),
    });
    const latencyMs = Date.now() - start;
    if (!res.ok) {
      return {
        id: "hermes",
        name: "Hermes Agent",
        icon: "Brain",
        status: "degraded",
        latencyMs,
        detail: `HTTP ${res.status}`,
      };
    }
    const data = (await res.json()) as {
      capabilities?: unknown[];
    };
    const capCount = Array.isArray(data.capabilities)
      ? data.capabilities.length
      : 0;
    return {
      id: "hermes",
      name: "Hermes Agent",
      icon: "Brain",
      status: "healthy",
      latencyMs,
      detail: capCount > 0
        ? `${capCount} capabilities`
        : "API server online",
    };
  } catch {
    return {
      id: "hermes",
      name: "Hermes Agent",
      icon: "Brain",
      status: "down",
      latencyMs: null,
      detail: `Unreachable at ${url}`,
    };
  }
}

async function checkOpenCode(): Promise<ServiceHealth> {
  const storagePath = process.env.OPENCODE_STORAGE_PATH ??
    `${process.env.HOME ?? "/root"}/.local/share/opencode`;
  const start = Date.now();
  try {
    // Quick check: does the storage directory exist and is it readable?
    const { stdout } = await execFileP(
      "ls",
      [storagePath],
      { timeout: 3_000 },
    );
    const latencyMs = Date.now() - start;
    const entries = stdout.trim().split("\n").filter(Boolean);
    const projects = entries.length;
    return {
      id: "opencode",
      name: "OpenCode",
      icon: "Terminal",
      status: "healthy",
      latencyMs,
      detail: projects > 0
        ? `${projects} item${projects !== 1 ? "s" : ""} in storage`
        : "Storage accessible",
    };
  } catch {
    return {
      id: "opencode",
      name: "OpenCode",
      icon: "Terminal",
      status: "down",
      latencyMs: null,
      detail: `Storage not found at ${storagePath}`,
    };
  }
}

async function checkFMRepo(): Promise<ServiceHealth> {
  const repo = process.env.FM_REPO_PATH ?? "/opt/flowmanner";
  const start = Date.now();
  try {
    const { stdout } = await execFileP(
      "git",
      ["rev-parse", "--is-inside-work-tree"],
      { cwd: repo, timeout: 3_000 },
    );
    const latencyMs = Date.now() - start;
    const clean = stdout.trim() === "true";
    if (!clean) {
      return {
        id: "fm-repo",
        name: "FM Backend",
        icon: "FolderGit2",
        status: "degraded",
        latencyMs,
        detail: `Not a git repo: ${repo}`,
      };
    }

    // Quick branch check.
    try {
      const { stdout: branch } = await execFileP(
        "git",
        ["branch", "--show-current"],
        { cwd: repo, timeout: 3_000 },
      );
      return {
        id: "fm-repo",
        name: "FM Backend",
        icon: "FolderGit2",
        status: "healthy",
        latencyMs,
        detail: `On branch ${branch.trim() || "detached"}`,
      };
    } catch {
      return {
        id: "fm-repo",
        name: "FM Backend",
        icon: "FolderGit2",
        status: "healthy",
        latencyMs,
        detail: "Git repo available",
      };
    }
  } catch {
    return {
      id: "fm-repo",
      name: "FM Backend",
      icon: "FolderGit2",
      status: "down",
      latencyMs: null,
      detail: `Not found at ${repo}`,
    };
  }
}

// ── Public API ─────────────────────────────────────────────────────────────

export async function getSystemHealth(): Promise<ServiceHealth[]> {
  const results = await Promise.allSettled([
    checkPostgres(),
    checkHomelabLLM(),
    checkModelManager(),
    checkGitHub(),
    checkHermes(),
    checkOpenCode(),
    checkFMRepo(),
  ]);

  return results.map((r) => {
    if (r.status === "fulfilled") return r.value;
    // Shouldn't happen since each check catches internally, but be safe.
    return {
      id: "unknown",
      name: "Unknown",
      icon: "AlertTriangle",
      status: "down" as const,
      latencyMs: null,
      detail: r.reason instanceof Error ? r.reason.message : "Check failed",
    };
  });
}
