"use client";

import { useState, useEffect, useCallback } from "react";
import { BarChart3, Cpu, Layers, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { UsageChart } from "@/components/usage-chart";

type UsageByDay = {
  date: string;
  inputTokens: number;
  outputTokens: number;
  requests: number;
};

type UsageByModel = {
  model: string;
  inputTokens: number;
  outputTokens: number;
  requests: number;
};

type UsageBySource = {
  source: string;
  inputTokens: number;
  outputTokens: number;
  requests: number;
};

type UsageData = {
  byDay: UsageByDay[];
  byModel: UsageByModel[];
  bySource: UsageBySource[];
  total: { totalInput: number; totalOutput: number; totalRequests: number };
  today: { totalInput: number; totalOutput: number; totalRequests: number };
  week: { totalInput: number; totalOutput: number; totalRequests: number };
};

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

const periods = [
  { value: "day", label: "Today" },
  { value: "week", label: "7 days" },
  { value: "month", label: "30 days" },
] as const;

export default function UsagePage() {
  const [period, setPeriod] = useState<"day" | "week" | "month">("week");
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUsage = useCallback(async (p: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/usage?period=${p}`);
      const json = (await res.json()) as { ok: boolean; data?: UsageData };
      if (json.ok && json.data) {
        setData(json.data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsage(period);
  }, [period, fetchUsage]);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-indigo-600 mb-2"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Link>
          <h1 className="text-2xl font-semibold text-slate-950 dark:text-slate-50">
            LLM Usage
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Token consumption across all dashboard features.
          </p>
        </div>
      </div>

      {/* Period selector */}
      <div className="flex items-center gap-2">
        {periods.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => setPeriod(p.value)}
            className={[
              "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              period === p.value
                ? "bg-indigo-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700",
            ].join(" ")}
          >
            {p.label}
          </button>
        ))}
      </div>

      {loading && !data ? (
        <div className="h-64 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
      ) : data ? (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Total tokens
              </p>
              <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-100">
                {formatTokens(data.total.totalInput + data.total.totalOutput)}
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                {data.total.totalRequests} requests
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Input tokens
              </p>
              <p className="mt-1 text-2xl font-semibold text-indigo-600">
                {formatTokens(data.total.totalInput)}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Output tokens
              </p>
              <p className="mt-1 text-2xl font-semibold text-emerald-600">
                {formatTokens(data.total.totalOutput)}
              </p>
            </div>
          </div>

          {/* Chart */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-indigo-600" />
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Daily Usage
              </h2>
            </div>
            <UsageChart data={data.byDay} />
          </section>

          {/* Breakdown tables */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* By model */}
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-4 flex items-center gap-2">
                <Cpu className="h-5 w-5 text-indigo-600" />
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  By Model
                </h2>
              </div>
              {data.byModel.length === 0 ? (
                <p className="text-sm text-slate-400">No data</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-slate-500 dark:text-slate-400">
                      <th className="pb-2">Model</th>
                      <th className="pb-2 text-right">Input</th>
                      <th className="pb-2 text-right">Output</th>
                      <th className="pb-2 text-right">Req</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {data.byModel.map((m) => (
                      <tr key={m.model}>
                        <td className="py-2 font-medium text-slate-900 dark:text-slate-100">
                          {m.model}
                        </td>
                        <td className="py-2 text-right text-slate-600 dark:text-slate-400">
                          {formatTokens(m.inputTokens)}
                        </td>
                        <td className="py-2 text-right text-slate-600 dark:text-slate-400">
                          {formatTokens(m.outputTokens)}
                        </td>
                        <td className="py-2 text-right text-slate-500">{m.requests}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>

            {/* By source */}
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-4 flex items-center gap-2">
                <Layers className="h-5 w-5 text-indigo-600" />
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  By Source
                </h2>
              </div>
              {data.bySource.length === 0 ? (
                <p className="text-sm text-slate-400">No data</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-slate-500 dark:text-slate-400">
                      <th className="pb-2">Source</th>
                      <th className="pb-2 text-right">Input</th>
                      <th className="pb-2 text-right">Output</th>
                      <th className="pb-2 text-right">Req</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {data.bySource.map((s) => (
                      <tr key={s.source}>
                        <td className="py-2 font-medium capitalize text-slate-900 dark:text-slate-100">
                          {s.source}
                        </td>
                        <td className="py-2 text-right text-slate-600 dark:text-slate-400">
                          {formatTokens(s.inputTokens)}
                        </td>
                        <td className="py-2 text-right text-slate-600 dark:text-slate-400">
                          {formatTokens(s.outputTokens)}
                        </td>
                        <td className="py-2 text-right text-slate-500">{s.requests}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          </div>
        </>
      ) : null}
    </div>
  );
}
