import { getSessionRitual } from "@/lib/session-ritual";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  GitBranch,
  GitCommit,
  Database,
  FolderGit2,
} from "lucide-react";

export async function SessionRitualPanel() {
  const ritual = await getSessionRitual();

  if (!ritual.available) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <FolderGit2 className="h-5 w-5 text-slate-400" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Session Ritual
          </h2>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 dark:bg-slate-800 p-4 text-sm text-slate-500">
          <XCircle className="h-4 w-4 shrink-0 text-slate-400" />
          {ritual.error ?? "FM repo not available"}
        </div>
      </div>
    );
  }

  const allClean =
    !ritual.dirty &&
    ritual.unpushedCount === 0 &&
    ritual.alembicClean;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FolderGit2 className="h-5 w-5 text-indigo-600" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Session Ritual
          </h2>
        </div>
        {allClean && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
            <CheckCircle2 className="h-3 w-3" /> All clear
          </span>
        )}
      </div>

      <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
        Pre-flight state of{" "}
        <code className="rounded bg-slate-100 dark:bg-slate-800 px-1 py-0.5 text-[11px]">
          {process.env.FM_REPO_PATH ?? "/opt/flowmanner"}
        </code>
      </p>

      <div className="space-y-2">
        {/* Branch */}
        <CheckRow
          icon={<GitBranch className="h-4 w-4" />}
          label="Branch"
          value={ritual.branch ?? "detached HEAD"}
          status={ritual.branch ? "ok" : "warn"}
        />

        {/* Working tree */}
        <CheckRow
          icon={<FolderGit2 className="h-4 w-4" />}
          label="Working tree"
          value={
            ritual.dirty
              ? `${ritual.changedFiles.length} uncommitted change${ritual.changedFiles.length !== 1 ? "s" : ""}`
              : "Clean"
          }
          status={ritual.dirty ? "warn" : "ok"}
        />

        {/* Dirty files (collapsed if many) */}
        {ritual.dirty && ritual.changedFiles.length > 0 && (
          <div className="ml-6 mt-1 max-h-24 space-y-0.5 overflow-y-auto">
            {ritual.changedFiles.slice(0, 8).map((f, i) => (
              <p
                key={i}
                className="truncate font-mono text-xs text-amber-700"
              >
                {f}
              </p>
            ))}
            {ritual.changedFiles.length > 8 && (
              <p className="text-xs text-slate-400">
                … and {ritual.changedFiles.length - 8} more
              </p>
            )}
          </div>
        )}

        {/* Unpushed */}
        <CheckRow
          icon={<GitCommit className="h-4 w-4" />}
          label="Unpushed"
          value={
            ritual.unpushedCount > 0
              ? `${ritual.unpushedCount} commit${ritual.unpushedCount !== 1 ? "s" : ""}`
              : "None"
          }
          status={ritual.unpushedCount > 0 ? "warn" : "ok"}
        />

        {/* Unpushed commit titles */}
        {ritual.unpushedCommits.length > 0 && (
          <div className="ml-6 mt-1 max-h-24 space-y-0.5 overflow-y-auto">
            {ritual.unpushedCommits.map((c, i) => (
              <p key={i} className="truncate font-mono text-xs text-amber-700">
                {c}
              </p>
            ))}
          </div>
        )}

        {/* Alembic migrations */}
        <CheckRow
          icon={<Database className="h-4 w-4" />}
          label="DB migrations"
          value={
            ritual.alembicHead
              ? ritual.alembicClean
                ? "Up to date"
                : `Pending (head: ${ritual.alembicHead.slice(0, 8)})`
              : "Alembic not configured"
          }
          status={
            !ritual.alembicHead
              ? "neutral"
              : ritual.alembicClean
                ? "ok"
                : "warn"
          }
        />
      </div>
    </div>
  );
}

function CheckRow({
  icon,
  label,
  value,
  status,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  status: "ok" | "warn" | "error" | "neutral";
}) {
  const statusIcon = {
    ok: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />,
    warn: <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />,
    error: <XCircle className="h-3.5 w-3.5 text-rose-500" />,
    neutral: <span className="h-3.5 w-3.5 rounded-full bg-slate-300" />,
  }[status];

  return (
    <div className="flex items-center gap-3 rounded-lg px-2 py-1.5">
      <span className="text-slate-400">{icon}</span>
      <span className="min-w-[100px] text-sm text-slate-500 dark:text-slate-400">{label}</span>
      <span className="flex-1 text-right text-sm font-medium text-slate-900 dark:text-slate-100">
        {value}
      </span>
      {statusIcon}
    </div>
  );
}
