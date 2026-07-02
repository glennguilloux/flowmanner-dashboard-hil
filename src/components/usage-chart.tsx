type UsageByDay = {
  date: string;
  inputTokens: number;
  outputTokens: number;
  requests: number;
};

export function UsageChart({ data }: { data: UsageByDay[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-slate-400 dark:text-slate-500">
        No usage data yet
      </div>
    );
  }

  const maxTokens = Math.max(
    ...data.map((d) => d.inputTokens + d.outputTokens),
    1,
  );

  const chartW = 100;
  const chartH = 40;
  const barGap = 0.8;
  const barW = (chartW - barGap * (data.length - 1)) / data.length;

  return (
    <div className="space-y-2">
      <svg
        viewBox={`0 0 ${chartW} ${chartH + 6}`}
        className="h-40 w-full"
        preserveAspectRatio="none"
        role="img"
        aria-label="LLM usage chart"
      >
        {data.map((d, i) => {
          const total = d.inputTokens + d.outputTokens;
          const totalH = (total / maxTokens) * chartH;
          const inputH = (d.inputTokens / maxTokens) * chartH;
          const x = i * (barW + barGap);

          return (
            <g key={d.date}>
              {/* Output tokens (emerald) — bottom */}
              <rect
                x={x}
                y={chartH - totalH}
                width={barW}
                height={totalH - inputH}
                rx={0.5}
                className="fill-emerald-400 dark:fill-emerald-500"
              />
              {/* Input tokens (indigo) — top */}
              <rect
                x={x}
                y={chartH - totalH + (totalH - inputH)}
                width={barW}
                height={inputH}
                rx={0.5}
                className="fill-indigo-400 dark:fill-indigo-500"
              />
              {/* Date label */}
              <text
                x={x + barW / 2}
                y={chartH + 4.5}
                textAnchor="middle"
                className="fill-slate-400 dark:fill-slate-500"
                style={{ fontSize: "2.5px" }}
              >
                {d.date.slice(5)}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="flex items-center justify-center gap-4 text-xs text-slate-500 dark:text-slate-400">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-indigo-400 dark:bg-indigo-500" />
          Input tokens
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-emerald-400 dark:bg-emerald-500" />
          Output tokens
        </span>
      </div>
    </div>
  );
}
