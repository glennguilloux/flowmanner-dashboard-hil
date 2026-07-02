"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    // Log to console for debugging on the homelab.
    console.error("[HIL Dashboard Error]", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-rose-200 bg-white dark:bg-slate-900 p-8 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100">
            <AlertTriangle className="h-5 w-5 text-rose-600" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Something went wrong
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              The dashboard hit an unexpected error.
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-rose-100 bg-rose-50 p-3">
          <p className="break-words font-mono text-xs text-rose-800">
            {error.message || "Unknown error"}
          </p>
          {error.digest && (
            <p className="mt-1 text-xs text-rose-500">
              Digest: {error.digest}
            </p>
          )}
        </div>

        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-rose-700"
          >
            <RefreshCw className="h-4 w-4" />
            Try again
          </button>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="rounded-xl border border-slate-300 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            Go to dashboard
          </button>
        </div>

        <div className="mt-4 border-t border-slate-100 dark:border-slate-800 pt-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Common fixes: check that Postgres is running, that{" "}
            <code className="rounded bg-slate-100 dark:bg-slate-800 px-1 py-0.5">
              DATABASE_URL
            </code>{" "}
            is set in <code className="rounded bg-slate-100 dark:bg-slate-800 px-1 py-0.5">.env.local</code>,
            and that <code className="rounded bg-slate-100 dark:bg-slate-800 px-1 py-0.5">gh auth status</code>{" "}
            is authenticated.
          </p>
        </div>
      </div>
    </div>
  );
}
