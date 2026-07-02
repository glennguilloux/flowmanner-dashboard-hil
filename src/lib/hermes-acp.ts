// Hermes Agent REST API client. Talks to the Hermes API server (OpenAI-compatible)
// exposed on the homelab. Used by the dashboard to monitor agent sessions, jobs,
// skills, and toolsets.
//
// Hermes by Nous Research: https://github.com/nousresearch/hermes-agent
// API docs: https://hermes-agent.nousresearch.com/docs/user-guide/features/api-server
//
// HARD RULE: this client only talks to the self-hosted Hermes instance. No SaaS.

const HERMES_URL = process.env.HERMES_URL ?? "http://localhost:8642";
const HERMES_API_KEY = process.env.HERMES_API_KEY ?? "";
const TIMEOUT_MS = 10_000;

// ── Types ─────────────────────────────────────────────────────────────────

export type HermesHealth = {
  ok: boolean;
  version?: string;
  uptime?: number;
  activeSessions?: number;
  model?: string;
  error?: string;
};

export type HermesCapability = {
  name: string;
  supported: boolean;
  description?: string;
};

export type HermesSkill = {
  name: string;
  description: string;
  category: string;
};

export type HermesTool = {
  name: string;
  description: string;
  parameters?: Record<string, unknown>;
};

export type HermesSession = {
  id: string;
  created_at: string;
  updated_at?: string;
  model?: string;
  status?: "active" | "idle" | "completed" | "error";
  message_count?: number;
  metadata?: Record<string, unknown>;
};

export type HermesJob = {
  id: string;
  session_id?: string;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  task?: string;
  created_at: string;
  updated_at?: string;
  progress?: number;
  result?: unknown;
  error?: string;
};

import type { HermesApprovalScope, HermesApproval } from "@/types/hermes";
export type { HermesApprovalScope, HermesApproval };

export type HermesOverview = {
  health: HermesHealth;
  capabilities: HermesCapability[];
  skills: HermesSkill[];
  tools: HermesTool[];
  sessions: HermesSession[];
  jobs: HermesJob[];
  approvals: HermesApproval[];
  latencyMs: number;
};

// ── Internal fetcher ──────────────────────────────────────────────────────

async function hermesFetch<T>(
  path: string,
  opts?: RequestInit & { timeoutMs?: number },
): Promise<T> {
  const { timeoutMs, ...fetchOpts } = opts ?? {};
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(HERMES_API_KEY ? { Authorization: `Bearer ${HERMES_API_KEY}` } : {}),
    ...(fetchOpts.headers as Record<string, string> ?? {}),
  };

  const res = await fetch(`${HERMES_URL}${path}`, {
    ...fetchOpts,
    headers,
    signal: AbortSignal.timeout(timeoutMs ?? TIMEOUT_MS),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Hermes ${res.status} ${path}: ${text.slice(0, 200)}`);
  }

  return res.json() as Promise<T>;
}

// ── Individual fetchers ───────────────────────────────────────────────────

export async function checkHermesHealth(): Promise<HermesHealth> {
  try {
    // Try /v1/capabilities first (the lightest endpoint that confirms the server is up).
    const caps = await hermesFetch<{ capabilities?: unknown[] }>(
      "/v1/capabilities",
    );
    return {
      ok: true,
      activeSessions: Array.isArray(caps.capabilities)
        ? caps.capabilities.length
        : undefined,
    };
  } catch {
    // Fallback: try a raw health check.
    try {
      const res = await fetch(`${HERMES_URL}/health`, {
        signal: AbortSignal.timeout(5_000),
      });
      if (res.ok) {
        const data = (await res.json()) as Record<string, unknown>;
        return { ok: true, ...data };
      }
      return { ok: false, error: `HTTP ${res.status}` };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : "Unreachable",
      };
    }
  }
}

export async function getCapabilities(): Promise<HermesCapability[]> {
  try {
    const data = await hermesFetch<{
      capabilities?: HermesCapability[] | Record<string, boolean>;
    }>("/v1/capabilities");

    if (Array.isArray(data.capabilities)) return data.capabilities;

    // Handle { capabilities: { "feature": true, ... } } shape.
    if (data.capabilities && typeof data.capabilities === "object") {
      return Object.entries(data.capabilities).map(([name, supported]) => ({
        name,
        supported: Boolean(supported),
      }));
    }

    return [];
  } catch {
    return [];
  }
}

export async function getSkills(): Promise<HermesSkill[]> {
  try {
    const data = await hermesFetch<{
      skills?: HermesSkill[];
    }>("/v1/skills");
    return data.skills ?? [];
  } catch {
    return [];
  }
}

export async function getToolsets(): Promise<HermesTool[]> {
  try {
    const data = await hermesFetch<{
      tools?: HermesTool[];
      toolsets?: HermesTool[];
    }>("/v1/toolsets");
    return data.tools ?? data.toolsets ?? [];
  } catch {
    return [];
  }
}

export async function getSessions(): Promise<HermesSession[]> {
  try {
    const data = await hermesFetch<{
      sessions?: HermesSession[];
    }>("/api/sessions");
    return data.sessions ?? [];
  } catch {
    return [];
  }
}

export async function getJobs(): Promise<HermesJob[]> {
  try {
    const data = await hermesFetch<{
      jobs?: HermesJob[];
    }>("/api/jobs");
    return data.jobs ?? [];
  } catch {
    return [];
  }
}

/**
 * Fetch pending (and recently resolved) approval requests from Hermes.
 * Tries /v1/approvals first, falls back to /api/approvals.
 * Returns [] if the endpoint doesn't exist (older Hermes versions).
 */
export async function getApprovals(): Promise<HermesApproval[]> {
  try {
    const data = await hermesFetch<{
      approvals?: HermesApproval[];
    }>("/v1/approvals");
    return data.approvals ?? [];
  } catch {
    // Fallback: try /api/approvals
    try {
      const data = await hermesFetch<{
        approvals?: HermesApproval[];
      }>("/api/approvals");
      return data.approvals ?? [];
    } catch {
      return [];
    }
  }
}

/**
 * Lightweight single-attempt approval count for the health endpoint.
 * Returns the count of pending approvals, or 0 if the endpoint doesn't
 * exist. Only tries /v1/approvals (no fallback) to keep the chip poll fast.
 */
export async function getPendingApprovalCount(): Promise<number> {
  try {
    const data = await hermesFetch<{
      approvals?: HermesApproval[];
    }>("/v1/approvals", { timeoutMs: 5_000 });
    return (
      data.approvals?.filter((a) => a.status === "pending").length ?? 0
    );
  } catch {
    return 0;
  }
}

/**
 * Submit an approval decision to Hermes.
 * Sends the decision (scope + optional notes) back to the agent so it can
 * resume or abort the suspended task.
 */
export async function submitApprovalDecision(
  approvalId: string,
  decision: {
    scope: HermesApprovalScope;
    notes?: string;
  },
): Promise<{ ok: boolean; error?: string }> {
  try {
    // Try /v1/approvals/:id first
    await hermesFetch<{ ok?: boolean }>(`/v1/approvals/${approvalId}`, {
      method: "POST",
      body: JSON.stringify(decision),
    });
    return { ok: true };
  } catch {
    // Fallback: /api/approvals/:id
    try {
      await hermesFetch<{ ok?: boolean }>(`/api/approvals/${approvalId}`, {
        method: "POST",
        body: JSON.stringify(decision),
      });
      return { ok: true };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : "Submit failed",
      };
    }
  }
}

// ── Aggregated overview ───────────────────────────────────────────────────

/**
 * Fetch everything in parallel. Each call is independently try/caught so one
 * failure never blocks the others — same pattern as system-health.ts.
 */
export async function getHermesOverview(): Promise<HermesOverview> {
  const start = Date.now();

  const [health, capabilities, skills, tools, sessions, jobs, approvals] =
    await Promise.all([
      checkHermesHealth(),
      getCapabilities(),
      getSkills(),
      getToolsets(),
      getSessions(),
      getJobs(),
      getApprovals(),
    ]);

  return {
    health,
    capabilities,
    skills,
    tools,
    sessions,
    jobs,
    approvals,
    latencyMs: Date.now() - start,
  };
}
