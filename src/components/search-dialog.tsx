"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Flag,
  ListChecks,
  Lightbulb,
  Bot,
  Wrench,
  Loader2,
} from "lucide-react";

type SearchResult = {
  type: "goal" | "tactic" | "brain-dump" | "agent" | "skill";
  id: string;
  title: string;
  subtitle: string | null;
};

const typeConfig: Record<
  SearchResult["type"],
  { label: string; icon: typeof Flag; href: (id: string) => string; color: string }
> = {
  goal: {
    label: "Goals",
    icon: Flag,
    href: (id) => `/goals/${id}`,
    color: "text-indigo-600",
  },
  tactic: {
    label: "Tactics",
    icon: ListChecks,
    href: (id) => `/tactics/${id}`,
    color: "text-emerald-600",
  },
  "brain-dump": {
    label: "Brain Dump",
    icon: Lightbulb,
    href: () => "/brain-dump",
    color: "text-amber-600",
  },
  agent: {
    label: "Agents",
    icon: Bot,
    href: (id) => `/agents/${id}`,
    color: "text-violet-600",
  },
  skill: {
    label: "Skills",
    icon: Wrench,
    href: (id) => `/skills/${id}`,
    color: "text-sky-600",
  },
};

const typeOrder: SearchResult["type"][] = [
  "goal",
  "tactic",
  "agent",
  "skill",
  "brain-dump",
];

export function SearchDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Focus input on open
  useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Debounced search
  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = (await res.json()) as { ok: boolean; data?: SearchResult[] };
        if (data.ok && data.data) {
          setResults(data.data);
          setActiveIndex(0);
        }
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Group results by type
  const grouped = typeOrder
    .map((type) => ({
      type,
      config: typeConfig[type],
      items: results.filter((r) => r.type === type),
    }))
    .filter((g) => g.items.length > 0);

  // Flat list for keyboard navigation
  const flatItems = grouped.flatMap((g) => g.items);

  const navigateTo = useCallback(
    (item: SearchResult) => {
      const href = typeConfig[item.type].href(item.id);
      router.push(href);
      onClose();
    },
    [router, onClose],
  );

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((prev) => Math.min(prev + 1, flatItems.length - 1));
        return;
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((prev) => Math.max(prev - 1, 0));
        return;
      }

      if (e.key === "Enter" && flatItems.length > 0) {
        e.preventDefault();
        navigateTo(flatItems[activeIndex]);
        return;
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, flatItems, activeIndex, onClose, navigateTo]);

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return;
    const activeEl = listRef.current.querySelector("[data-active=\"true\"]");
    activeEl?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  if (!open) return null;

  let flatIdx = -1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] p-4 bg-slate-900/50"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label="Search"
        aria-modal="true"
        className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 px-4 py-3">
          {loading ? (
            <Loader2 className="h-5 w-5 shrink-0 animate-spin text-slate-400" />
          ) : (
            <Search className="h-5 w-5 shrink-0 text-slate-400" />
          )}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search goals, tactics, agents, skills…"
            className="flex-1 bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none"
          />
          <kbd className="hidden sm:inline-flex rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:text-slate-400">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-80 overflow-y-auto p-2">
          {query.length < 2 && (
            <p className="px-3 py-6 text-center text-sm text-slate-400 dark:text-slate-500">
              Type at least 2 characters to search
            </p>
          )}

          {query.length >= 2 && !loading && results.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-slate-400 dark:text-slate-500">
              No results for &ldquo;{query}&rdquo;
            </p>
          )}

          {grouped.map((group) => {
            const Icon = group.config.icon;
            return (
              <div key={group.type} className="mb-2">
                <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  {group.config.label}
                </p>
                {group.items.map((item) => {
                  flatIdx++;
                  const isActive = flatIdx === activeIndex;
                  const currentFlatIdx = flatIdx;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      data-active={isActive}
                      onClick={() => navigateTo(item)}
                      onMouseEnter={() => setActiveIndex(currentFlatIdx)}
                      className={[
                        "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors",
                        isActive
                          ? "bg-indigo-50 dark:bg-indigo-950/40"
                          : "hover:bg-slate-50 dark:hover:bg-slate-800/50",
                      ].join(" ")}
                    >
                      <Icon
                        className={`h-4 w-4 shrink-0 ${group.config.color}`}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                          {item.title}
                        </p>
                        {item.subtitle && (
                          <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                            {item.subtitle}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Footer hints */}
        <div className="flex items-center gap-4 border-t border-slate-100 dark:border-slate-800 px-4 py-2.5">
          <span className="flex items-center gap-1 text-[10px] text-slate-400">
            <kbd className="rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-1 py-0.5 text-[10px] font-medium text-slate-500">↑↓</kbd>
            navigate
          </span>
          <span className="flex items-center gap-1 text-[10px] text-slate-400">
            <kbd className="rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-1 py-0.5 text-[10px] font-medium text-slate-500">↵</kbd>
            open
          </span>
          <span className="flex items-center gap-1 text-[10px] text-slate-400">
            <kbd className="rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-1 py-0.5 text-[10px] font-medium text-slate-500">esc</kbd>
            close
          </span>
        </div>
      </div>
    </div>
  );
}
