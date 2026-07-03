// FlowManner API client for missions. Proxies FM backend endpoints and
// provides a ReadableStream for SSE streaming.
//
// FM_BASE_URL defaults to localhost:8000 (homelab backend on the same host).

const FM_BASE_URL = process.env.FM_API_URL ?? "http://localhost:8000";
const TIMEOUT_MS = 10_000;

// ── Types ─────────────────────────────────────────────────────────────────

export type FmMission = {
  id: string;
  title: string;
  status: string;
  priority: string | null;
  createdAt: string;
  updatedAt: string;
};

export type FmMissionTask = {
  id: string;
  title: string;
  status: string;
  order: number;
};

export type FmMissionLog = {
  id: string;
  level: string;
  message: string;
  createdAt: string;
};

export type FmMissionImprovement = {
  id: string;
  suggestion: string;
  status: string;
  createdAt: string;
};

// ── Internal helpers ──────────────────────────────────────────────────────

async function fmFetch<T>(
  path: string,
  opts?: RequestInit & { timeoutMs?: number },
): Promise<T | null> {
  const { timeoutMs, ...fetchOpts } = opts ?? {};
  try {
    const res = await fetch(`${FM_BASE_URL}${path}`, {
      ...fetchOpts,
      signal: AbortSignal.timeout(timeoutMs ?? TIMEOUT_MS),
    });
    if (res.status === 404) return null;
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`FM ${res.status} ${path}: ${text.slice(0, 200)}`);
    }
    return res.json() as Promise<T>;
  } catch (err) {
    // Connection refused or timeout — return null gracefully
    if (
      err instanceof TypeError ||
      (err instanceof DOMException && err.name === "AbortError")
    ) {
      return null;
    }
    throw err;
  }
}

// Unwrap the v2 envelope: { ok, data, meta }
function unwrap<T>(data: unknown): T | null {
  if (data && typeof data === "object" && "data" in data) {
    return (data as { data: T }).data;
  }
  return null;
}

// ── Public API ────────────────────────────────────────────────────────────

export async function getMission(
  missionId: string,
): Promise<FmMission | null> {
  const raw = await fmFetch<{
    ok: boolean;
    data: FmMission;
  }>(`/api/v2/missions/${missionId}`);
  return raw ? unwrap<FmMission>(raw) : null;
}

export async function getMissionTasks(
  missionId: string,
): Promise<FmMissionTask[]> {
  const raw = await fmFetch<{
    ok: boolean;
    data: FmMissionTask[];
  }>(`/api/v2/missions/${missionId}/tasks`);
  return raw ? unwrap<FmMissionTask[]>(raw) ?? [] : [];
}

export async function getMissionLogs(
  missionId: string,
  limit = 10,
): Promise<FmMissionLog[]> {
  const raw = await fmFetch<{
    ok: boolean;
    data: FmMissionLog[];
  }>(`/api/v2/missions/${missionId}/logs?limit=${limit}`);
  return raw ? unwrap<FmMissionLog[]>(raw) ?? [] : [];
}

export async function getMissionImprovements(
  missionId: string,
): Promise<FmMissionImprovement[]> {
  const raw = await fmFetch<{
    ok: boolean;
    data: FmMissionImprovement[];
  }>(`/api/v2/missions/${missionId}/improvements`);
  return raw ? unwrap<FmMissionImprovement[]>(raw) ?? [] : [];
}

/**
 * Stream SSE events from FM's mission stream endpoint.
 * Returns a ReadableStream that the route handler pipes to the client response.
 * Returns null if FM is unreachable.
 */
export async function streamMission(
  missionId: string,
): Promise<ReadableStream<Uint8Array> | null> {
  try {
    const res = await fetch(
      `${FM_BASE_URL}/api/v2/missions/${missionId}/stream`,
      {
        headers: { Accept: "text/event-stream" },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      },
    );
    if (!res.ok || !res.body) return null;
    return res.body;
  } catch {
    return null;
  }
}
