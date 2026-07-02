"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Target,
  ListChecks,
  LayoutGrid,
  Bot,
  GitPullRequest,
  Users,
  Menu,
  X,
} from "lucide-react";
import { ModelSwapChip } from "@/components/model-swap-chip";
import { ModelSwapPanel } from "@/components/model-swap-panel";
import { WgWatchdogChip } from "@/components/wg-watchdog-chip";
import { WgWatchdogPanel } from "@/components/wg-watchdog-panel";
import { HermesChip } from "@/components/hermes-chip";
import { HermesPanel } from "@/components/hermes-panel";
import { OpenCodeChip } from "@/components/opencode-chip";
import { ThemeToggle } from "@/components/theme-toggle";
import { SessionRitualChip } from "@/components/session-ritual-chip";

const nav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/strategies", label: "Strategies", icon: Target },
  { href: "/tactics", label: "Tactics", icon: ListChecks },
  { href: "/kanban", label: "Kanban", icon: LayoutGrid },
  { href: "/prs", label: "Pull Requests", icon: GitPullRequest },
  { href: "/agents", label: "Agents", icon: Bot },
  { href: "/users", label: "Users", icon: Users },
];

export function Sidebar() {
  const pathname = usePathname();
  const [modelPanelOpen, setModelPanelOpen] = useState(false);
  const [wgPanelOpen, setWgPanelOpen] = useState(false);
  const [hermesPanelOpen, setHermesPanelOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile drawer on navigation.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  const navContent = (
    <>
      <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 px-6 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-lg text-white shadow-sm">
          🎯
        </div>
        <div>
          <h1 className="font-semibold leading-tight text-slate-900 dark:text-slate-100">
            FlowManner HIL
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">Human-in-the-Loop</p>
        </div>
      </div>

      <nav aria-label="Main navigation" className="flex-1 space-y-1 overflow-y-auto px-3 py-6">
        {nav.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(`${item.href}/`));
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={[
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100",
              ].join(" ")}
            >
              <item.icon className="h-4 w-4" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-100 p-4 space-y-3 dark:border-slate-800">
        <div className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2.5 dark:bg-slate-800">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-sm">
            👤
          </div>
          <div className="overflow-hidden">
            <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">Me</p>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">Human operator</p>
          </div>
        </div>
        <SessionRitualChip />
        <WgWatchdogChip onOpenPanel={() => setWgPanelOpen(true)} />
        <HermesChip onOpenPanel={() => setHermesPanelOpen(true)} />
        <OpenCodeChip />
        <ModelSwapChip onOpenPanel={() => setModelPanelOpen(true)} />
        <ThemeToggle />
      </div>
    </>
  );

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        aria-label="Open navigation menu"
        className="fixed left-4 top-4 z-40 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white dark:bg-slate-900 text-slate-700 shadow-sm transition-colors hover:bg-slate-50 lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Desktop sidebar */}
      <aside aria-label="Sidebar" className="hidden w-64 flex-col border-r border-slate-200 bg-white dark:bg-slate-900 lg:flex">
        {navContent}
      </aside>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 lg:hidden"
          onClick={closeMobile}
          aria-hidden="true"
        />
      )}

      {/* Mobile drawer */}
      <aside
        aria-label="Mobile navigation"
        className={[
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-white dark:bg-slate-900 transition-transform duration-200 lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        <div className="flex items-center justify-end p-3">
          <button
            type="button"
            onClick={closeMobile}
            aria-label="Close navigation menu"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {navContent}
      </aside>

      <ModelSwapPanel
        open={modelPanelOpen}
        onClose={() => setModelPanelOpen(false)}
      />
      <WgWatchdogPanel
        open={wgPanelOpen}
        onClose={() => setWgPanelOpen(false)}
      />
      <HermesPanel
        open={hermesPanelOpen}
        onClose={() => setHermesPanelOpen(false)}
      />
    </>
  );
}