import { NextRequest, NextResponse } from "next/server";

// Proxy to the homelab LLM model manager daemon. The daemon runs on the same
// host as this Next.js process, so localhost:9723 is always reachable from
// the server — even when the dashboard is accessed over WireGuard.
//
// Endpoints:
//   GET  /api/models        → merged models + status from daemon
//   POST /api/models        → activate a model (body: { model_id })
//   GET  /api/models/health → daemon health check (used for polling during swap)

const DAEMON_URL = process.env.MODEL_MANAGER_URL ?? "http://localhost:9723";
const FETCH_TIMEOUT_MS = 10_000;

type DaemonModel = {
  id: string;
  display_name?: string;
  architecture?: string;
  quantization?: string;
  spec_type?: string;
  description?: string;
  active?: boolean;
  healthy?: boolean;
};

type DaemonStatus = {
  current_model?: string;
  service_status?: string;
  healthy?: boolean;
  uptime_seconds?: number;
  [key: string]: unknown;
};

async function daemonFetch(
  path: string,
  opts?: RequestInit,
): Promise<Response> {
  return fetch(`${DAEMON_URL}${path}`, {
    ...opts,
    signal: opts?.signal ?? AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
}

export async function GET() {
  // /api/models — full models + status (for panel open and chip mount)
  // NOTE: /api/models/health is a separate route file at
  // src/app/api/models/health/route.ts (Next.js App Router requirement).
  try {
    const start = Date.now();
    const [modelsRes, statusRes] = await Promise.all([
      daemonFetch("/models"),
      daemonFetch("/status"),
    ]);
    const latencyMs = Date.now() - start;

    if (!modelsRes.ok) {
      return NextResponse.json(
        { ok: false, error: `GET /models returned ${modelsRes.status}` },
        { status: 502 },
      );
    }
    if (!statusRes.ok) {
      return NextResponse.json(
        { ok: false, error: `GET /status returned ${statusRes.status}` },
        { status: 502 },
      );
    }

    const models = (await modelsRes.json()) as
      | DaemonModel[]
      | { active_model?: string; models?: Record<string, Omit<DaemonModel, "id">> | DaemonModel[] };
    const status = (await statusRes.json()) as DaemonStatus;

    // The daemon returns `models` as a dict keyed by model id (not a list):
    //   { active_model: "...", models: { "qwen3.6-27b-mtp": { display_name, ... } } }
    // Normalize to a list of { id, ...fields } so the frontend can .map()/.find() it.
    const rawModels = Array.isArray(models) ? models : (models.models ?? {});
    const activeModelId = Array.isArray(models)
      ? undefined
      : models.active_model;

    const modelList: DaemonModel[] = Array.isArray(rawModels)
      ? rawModels
      : Object.entries(rawModels).map(([id, m]) => ({
          id,
          ...(m as Omit<DaemonModel, "id">),
        }));

    // Ensure `active` is set on the model matching the active_model id, in case
    // the daemon's per-model `is_active` flag is stale or absent.
    const normalizedModelList = modelList.map((m) => ({
      ...m,
      active: m.active ?? (m as { is_active?: boolean }).is_active ?? m.id === activeModelId,
    }));

    // The daemon uses `active_model` / `health_status` in /status; the
    // frontend components expect `current_model` / `healthy` (boolean).
    const normalizedStatus: DaemonStatus = {
      ...status,
      current_model:
        status.current_model ?? (status as { active_model?: string }).active_model,
      healthy:
        status.healthy ??
        (status as { health_status?: string }).health_status === "healthy",
    };

    return NextResponse.json({
      ok: true,
      models: normalizedModelList,
      status: normalizedStatus,
      latencyMs,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: `Daemon unreachable at ${DAEMON_URL}: ${err instanceof Error ? err.message : String(err)}`,
      },
      { status: 502 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { model_id?: string };
    if (!body.model_id) {
      return NextResponse.json(
        { ok: false, error: "model_id is required" },
        { status: 400 },
      );
    }

    const res = await daemonFetch("/activate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model_id: body.model_id }),
      // Activation can take 10-30s (regenerate override + restart + health check)
      signal: AbortSignal.timeout(60_000),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return NextResponse.json(
        { ok: false, error: `Activate failed (${res.status}): ${text.slice(0, 500)}` },
        { status: 502 },
      );
    }

    const data = await res.json();
    return NextResponse.json({ ok: true, ...data });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: `Activate request failed: ${err instanceof Error ? err.message : String(err)}`,
      },
      { status: 502 },
    );
  }
}
