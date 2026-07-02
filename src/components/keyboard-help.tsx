"use client";

import { useEffect, useState } from "react";
import { X, Keyboard, Sun, Moon } from "lucide-react";

const shortcuts = [
  { keys: ["?"], description: "Show this help" },
  { keys: ["r"], description: "Refresh current page" },
  { keys: ["t"], description: "Toggle dark/light theme" },
  { keys: ["g", "d"], description: "Go to Dashboard" },
  { keys: ["g", "s"], description: "Go to Strategies" },
  { keys: ["g", "t"], description: "Go to Tactics" },
  { keys: ["g", "p"], description: "Go to Pull Requests" },
  { keys: ["g", "a"], description: "Go to Agents" },
  { keys: ["Escape"], description: "Close panels / cancel" },
];

export function KeyboardHelp() {
  const [open, setOpen] = useState(false);
  const [pendingG, setPendingG] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Auto-dismiss theme toast after 1.5s.
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 1500);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    let gTimer: ReturnType<typeof setTimeout> | null = null;

    function handleKeyDown(e: KeyboardEvent) {
      // Don't trigger shortcuts when typing in inputs/textareas.
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      if (e.key === "?") {
        e.preventDefault();
        setOpen((v) => !v);
        return;
      }

      if (e.key === "Escape") {
        setOpen(false);
        setPendingG(false);
        return;
      }

      if (e.key === "r" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        window.location.reload();
        return;
      }

      if (e.key === "t" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        const root = document.documentElement;
        const isDark = root.classList.contains("dark");
        if (isDark) {
          root.classList.remove("dark");
          localStorage.setItem("theme", "light");
          setToast("light");
        } else {
          root.classList.add("dark");
          localStorage.setItem("theme", "dark");
          setToast("dark");
        }
        return;
      }

      // Two-key "g + x" navigation.
      if (e.key === "g" && !pendingG && !e.metaKey && !e.ctrlKey) {
        setPendingG(true);
        gTimer = setTimeout(() => setPendingG(false), 1000);
        return;
      }

      if (pendingG) {
        setPendingG(false);
        if (gTimer) clearTimeout(gTimer);
        const navMap: Record<string, string> = {
          d: "/",
          s: "/strategies",
          t: "/tactics",
          p: "/prs",
          a: "/agents",
        };
        const path = navMap[e.key];
        if (path) {
          window.location.href = path;
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (gTimer) clearTimeout(gTimer);
    };
  }, [pendingG]);

  if (!open && !toast) return null;

  return (
    <>
      {/* Theme toggle toast — brief visual feedback */}
      {toast && <ThemeToast mode={toast as "light" | "dark"} />}

      {open && (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      onClick={() => setOpen(false)}
    >
      <div
        role="dialog"
        aria-label="Keyboard shortcuts"
        aria-modal="true"
        className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 p-5">
          <div className="flex items-center gap-2">
            <Keyboard className="h-5 w-5 text-indigo-600" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Keyboard shortcuts
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close shortcuts"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <ul className="divide-y divide-slate-100 p-2">
          {shortcuts.map((s) => (
            <li
              key={s.description}
              className="flex items-center justify-between px-3 py-2.5"
            >
              <span className="text-sm text-slate-600 dark:text-slate-400">{s.description}</span>
              <span className="flex items-center gap-1">
                {s.keys.map((k, i) => (
                  <span key={i}>
                    {i > 0 && (
                      <span className="mx-0.5 text-xs text-slate-400">then</span>
                    )}
                    <kbd className="rounded border border-slate-200 bg-slate-50 dark:bg-slate-800 px-1.5 py-0.5 text-xs font-medium text-slate-700">
                      {k}
                    </kbd>
                  </span>
                ))}
              </span>
            </li>
          ))}
        </ul>

        <div className="border-t border-slate-100 dark:border-slate-800 px-5 py-3">
          <p className="text-xs text-slate-400">
            Shortcuts are disabled while typing in inputs.
          </p>
        </div>
      </div>
    </div>
      )}
    </>
  );
}

function ThemeToast({ mode }: { mode: "light" | "dark" }) {
  return (
    <div className="theme-toast fixed bottom-8 left-1/2 z-50 -translate-x-1/2">
      <div
        className={[
          "flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium shadow-lg ring-1",
          mode === "dark"
            ? "bg-slate-800 text-slate-100 ring-slate-700"
            : "bg-white text-slate-900 ring-slate-200",
        ].join(" ")}
      >
        {mode === "dark" ? (
          <Moon className="h-4 w-4 text-indigo-400" />
        ) : (
          <Sun className="h-4 w-4 text-amber-500" />
        )}
        {mode === "dark" ? "Dark mode" : "Light mode"}
      </div>
    </div>
  );
}
