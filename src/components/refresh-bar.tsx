"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Inbox, GitPullRequest, Clock } from "lucide-react";
import { apiFetch } from "@/lib/apiFetch";

const REFRESH_INTERVAL = 30; // seconds

type SyncStatus = { ok: boolean; message: string } | null;

export function RefreshBar() {
  const router = useRouter();
  const [secondsLeft, setSecondsLeft] = useState(REFRESH_INTERVAL);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [syncing, setSyncing] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<SyncStatus>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resultTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const secondsRef = useRef(REFRESH_INTERVAL);

  const lastVisibilityRefresh = useRef(0);

  const doRefresh = useCallback(() => {
    router.refresh();
    setLastRefresh(new Date());
    secondsRef.current = REFRESH_INTERVAL;
    setSecondsLeft(REFRESH_INTERVAL);
  }, [router]);

  // Unified countdown + auto-refresh timer. Single interval owns the timing;
  // no drift between a separate hook and the countdown display.
  useEffect(() => {
    timerRef.current = setInterval(() => {
      secondsRef.current -= 1;
      if (secondsRef.current <= 0) {
        doRefresh();
      } else {
        setSecondsLeft(secondsRef.current);
      }
    }, 1000);

    // Also refresh when tab becomes visible again.
    // Debounce to avoid spamming router.refresh() on rapid tab switches.
    const onVisibility = () => {
      if (document.hidden) return;
      const now = Date.now();
      if (now - lastVisibilityRefresh.current < 5_000) return;
      lastVisibilityRefresh.current = now;
      doRefresh();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [doRefresh]);

  // Clear result message after 5 seconds.
  useEffect(() => {
    if (syncResult) {
      resultTimerRef.current = setTimeout(() => setSyncResult(null), 5000);
      return () => {
        if (resultTimerRef.current) clearTimeout(resultTimerRef.current);
      };
    }
  }, [syncResult]);

  async function handleSync(route: "prs" | "inbox") {
    setSyncing(route);
    setSyncResult(null);
    try {
      const res = await apiFetch(`/api/${route}/sync`, { method: "POST" });
      const data = (await res.json()) as {
        ok: boolean;
        count?: number;
        error?: string;
      };
      if (data.ok) {
        const label = route === "prs" ? "PRs" : "inbox";
        setSyncResult({
          ok: true,
          message: `✓ ${label} synced (${data.count ?? 0} items)`,
        });
      } else {
        setSyncResult({ ok: false, message: `✗ ${data.error ?? "Sync failed"}` });
      }
      doRefresh();
    } catch (err) {
      setSyncResult({
        ok: false,
        message: `✗ ${err instanceof Error ? err.message : "Network error"}`,
      });
    } finally {
      setSyncing(null);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white dark:bg-slate-900/80 px-4 py-2.5 text-sm backdrop-blur-sm">
      {/* Auto-refresh info */}
      <span className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
        <Clock className="h-3.5 w-3.5" />
        <span>
          Refreshes in <strong className="text-slate-700">{secondsLeft}s</strong>
        </span>
      </span>
      <span className="hidden text-slate-300 sm:inline">·</span>
      <span className="hidden text-xs text-slate-400 sm:inline" suppressHydrationWarning>
        Last updated {lastRefresh.toLocaleTimeString()}
      </span>

      <div className="flex-1" />

      {/* Sync result feedback */}
      {syncResult && (
        <span
          className={
            syncResult.ok
              ? "text-xs font-medium text-emerald-600"
              : "text-xs font-medium text-rose-600"
          }
        >
          {syncResult.message}
        </span>
      )}

      {/* Action buttons */}
      <button
        type="button"
        onClick={() => handleSync("inbox")}
        disabled={syncing !== null}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
        aria-label="Sync inbox interrupts"
      >
        <Inbox className="h-3.5 w-3.5" />
        Sync Inbox
        {syncing === "inbox" && (
          <RefreshCw className="h-3 w-3 animate-spin" />
        )}
      </button>
      <button
        type="button"
        onClick={() => handleSync("prs")}
        disabled={syncing !== null}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
        aria-label="Sync pull requests from GitHub"
      >
        <GitPullRequest className="h-3.5 w-3.5" />
        Sync PRs
        {syncing === "prs" && (
          <RefreshCw className="h-3 w-3 animate-spin" />
        )}
      </button>
      <button
        type="button"
        onClick={() => doRefresh()}
        className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-slate-800"
        aria-label="Refresh dashboard now"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        Refresh
      </button>
    </div>
  );
}
