import {
  Database,
  Cpu,
  GitBranch,
  FolderGit2,
  Boxes,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Server,
} from "lucide-react";
import { getSystemHealth, type ServiceHealth } from "@/lib/system-health";

const ICON_MAP: Record<string, React.ElementType> = {
  Database,
  Cpu,
  GitBranch,
  FolderGit2,
  Boxes,
  Server,
  AlertTriangle,
};

function StatusDot({ status }: { status: ServiceHealth["status"] }) {
  const color =        status === "healthy"
              ? "bg-emerald-500"
              : status === "degraded"
                ? "bg-amber-500"
                : "bg-rose-500";
  return (
    <span
      className={[
        "inline-block h-2 w-2 rounded-full",
        color,
        status !== "healthy" ? "animate-pulse" : "",
      ].join(" ")}
      aria-hidden="true"
    />
  );
}

function StatusIcon({ status }: { status: ServiceHealth["status"] }) {
  if (status === "healthy")
    return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />;
  if (status === "degraded")
    return <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />;
  return <XCircle className="h-3.5 w-3.5 text-rose-500" />;
}

export async function SystemHealthPanel() {
  const services = await getSystemHealth();
  const healthyCount = services.filter((s) => s.status === "healthy").length;
  const allHealthy = healthyCount === services.length;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Server className="h-5 w-5 text-indigo-600" aria-hidden="true" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            System Health
          </h2>
        </div>
        <span
          className={[
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
            allHealthy
              ? "bg-emerald-100 text-emerald-700"
              : "bg-amber-100 text-amber-700",
          ].join(" ")}
        >
          <StatusDot status={allHealthy ? "healthy" : "degraded"} />
          {healthyCount}/{services.length} online
        </span>
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {services.map((svc) => {
          const Icon = ICON_MAP[svc.icon] ?? Server;
          const borderColor =
            svc.status === "healthy"
              ? "border-slate-100 dark:border-slate-800"
              : svc.status === "degraded"
                ? "border-amber-200"
                : "border-rose-200";
          const bgColor =
            svc.status === "down"
              ? "bg-rose-50/50 dark:bg-rose-950/20"
              : "";

          return (
            <div
              key={svc.id}
              className={[
                "flex items-start gap-3 rounded-xl border p-3 transition-colors",
                borderColor,
                bgColor,
              ].join(" ")}
            >
              <div
                className={[
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                  svc.status === "healthy"
                    ? "bg-indigo-50 dark:bg-indigo-950/40"
                    : svc.status === "degraded"
                      ? "bg-amber-50 dark:bg-amber-950/40"
                      : "bg-rose-50 dark:bg-rose-950/40",
                ].join(" ")}
              >
                <Icon
                  className={[
                    "h-4 w-4",
                    svc.status === "healthy"
                      ? "text-indigo-600"
                      : svc.status === "degraded"
                        ? "text-amber-600"
                        : "text-rose-600",
                  ].join(" ")}
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {svc.name}
                  </p>
                  <StatusIcon status={svc.status} />
                </div>
                <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                  {svc.detail}
                </p>
                {svc.latencyMs !== null && (
                  <p className="mt-0.5 font-mono text-[10px] text-slate-400">
                    {svc.latencyMs}ms
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
