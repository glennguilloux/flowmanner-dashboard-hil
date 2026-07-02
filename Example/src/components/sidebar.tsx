"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Target,
  ListChecks,
  Bot,
  Settings,
} from "lucide-react";

const nav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/strategies", label: "Strategies", icon: Target },
  { href: "/tactics", label: "Tactics", icon: ListChecks },
  { href: "/agents", label: "Agents", icon: Bot },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 flex-col border-r border-slate-200 bg-white lg:flex">
      <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-lg text-white shadow-sm">
          🎯
        </div>
        <div>
          <h1 className="font-semibold leading-tight text-slate-900">PR Ops</h1>
          <p className="text-xs text-slate-500">Human-in-the-Loop</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-6">
        {nav.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
              ].join(" ")}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-100 p-4">
        <div className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-sm">
            👤
          </div>
          <div className="overflow-hidden">
            <p className="truncate text-sm font-medium text-slate-900">Me</p>
            <p className="truncate text-xs text-slate-500">Human operator</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
