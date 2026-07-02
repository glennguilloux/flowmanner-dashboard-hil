"use client";

import { useState, useEffect, useCallback } from "react";
import { Sun, Moon } from "lucide-react";

type Theme = "light" | "dark";

function apply(theme: Theme) {
  const el = document.documentElement;
  if (theme === "dark") {
    el.classList.add("dark");
  } else {
    el.classList.remove("dark");
  }
  try {
    localStorage.setItem("theme", theme);
  } catch {
    /* storage blocked */
  }
}

export function ThemeToggle() {
  // Always start with "light" to match SSR, then sync with the actual DOM
  // state (set by the blocking script in layout.tsx) after hydration.
  const [theme, setTheme] = useState<Theme>("light");

  // Sync state with actual DOM after mount (blocking script may have set .dark).
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (document.documentElement.classList.contains("dark")) {
      setTheme("dark");
    }
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Sync across tabs.
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === "theme") {
        const next: Theme = e.newValue === "dark" ? "dark" : "light";
        setTheme(next);
        apply(next);
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const toggle = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === "dark" ? "light" : "dark";
      apply(next);
      return next;
    });
  }, []);

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
    >
      {theme === "dark" ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
      <span className="hidden sm:inline">
        {theme === "dark" ? "Light" : "Dark"}
      </span>
    </button>
  );
}
