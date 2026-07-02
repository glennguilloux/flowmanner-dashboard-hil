import { db } from "@/db";
import { llmUsage } from "@/db/schema";
import { sql, desc, eq, gte, and } from "drizzle-orm";

export type UsageSummary = {
  totalInput: number;
  totalOutput: number;
  totalRequests: number;
};

export type UsageByDay = {
  date: string;
  inputTokens: number;
  outputTokens: number;
  requests: number;
};

export type UsageByModel = {
  model: string;
  inputTokens: number;
  outputTokens: number;
  requests: number;
};

export type UsageBySource = {
  source: string;
  inputTokens: number;
  outputTokens: number;
  requests: number;
};

export type UsageData = {
  byDay: UsageByDay[];
  byModel: UsageByModel[];
  bySource: UsageBySource[];
  total: UsageSummary;
  today: UsageSummary;
  week: UsageSummary;
};

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function getUsageData(period: "day" | "week" | "month" = "week"): Promise<UsageData> {
  const days = period === "day" ? 1 : period === "week" ? 7 : 30;
  const since = daysAgo(days);

  // By day
  const byDay = await db
    .select({
      date: sql<string>`to_char(${llmUsage.createdAt}::date, 'YYYY-MM-DD')`,
      inputTokens: sql<number>`sum(${llmUsage.inputTokens})::int`,
      outputTokens: sql<number>`sum(${llmUsage.outputTokens})::int`,
      requests: sql<number>`count(*)::int`,
    })
    .from(llmUsage)
    .where(gte(llmUsage.createdAt, since))
    .groupBy(sql`${llmUsage.createdAt}::date`)
    .orderBy(sql`${llmUsage.createdAt}::date`);

  // By model
  const byModel = await db
    .select({
      model: llmUsage.model,
      inputTokens: sql<number>`sum(${llmUsage.inputTokens})::int`,
      outputTokens: sql<number>`sum(${llmUsage.outputTokens})::int`,
      requests: sql<number>`count(*)::int`,
    })
    .from(llmUsage)
    .where(gte(llmUsage.createdAt, since))
    .groupBy(llmUsage.model)
    .orderBy(desc(sql`sum(${llmUsage.inputTokens}) + sum(${llmUsage.outputTokens})`));

  // By source
  const bySource = await db
    .select({
      source: llmUsage.source,
      inputTokens: sql<number>`sum(${llmUsage.inputTokens})::int`,
      outputTokens: sql<number>`sum(${llmUsage.outputTokens})::int`,
      requests: sql<number>`count(*)::int`,
    })
    .from(llmUsage)
    .where(gte(llmUsage.createdAt, since))
    .groupBy(llmUsage.source)
    .orderBy(desc(sql`sum(${llmUsage.inputTokens}) + sum(${llmUsage.outputTokens})`));

  // Today
  const todayStart = daysAgo(0);
  const [todayRow] = await db
    .select({
      totalInput: sql<number>`coalesce(sum(${llmUsage.inputTokens}), 0)::int`,
      totalOutput: sql<number>`coalesce(sum(${llmUsage.outputTokens}), 0)::int`,
      totalRequests: sql<number>`count(*)::int`,
    })
    .from(llmUsage)
    .where(gte(llmUsage.createdAt, todayStart));

  // This week
  const weekStart = daysAgo(7);
  const [weekRow] = await db
    .select({
      totalInput: sql<number>`coalesce(sum(${llmUsage.inputTokens}), 0)::int`,
      totalOutput: sql<number>`coalesce(sum(${llmUsage.outputTokens}), 0)::int`,
      totalRequests: sql<number>`count(*)::int`,
    })
    .from(llmUsage)
    .where(gte(llmUsage.createdAt, weekStart));

  // Total in period
  const [totalRow] = await db
    .select({
      totalInput: sql<number>`coalesce(sum(${llmUsage.inputTokens}), 0)::int`,
      totalOutput: sql<number>`coalesce(sum(${llmUsage.outputTokens}), 0)::int`,
      totalRequests: sql<number>`count(*)::int`,
    })
    .from(llmUsage)
    .where(gte(llmUsage.createdAt, since));

  return {
    byDay,
    byModel,
    bySource,
    total: totalRow ?? { totalInput: 0, totalOutput: 0, totalRequests: 0 },
    today: todayRow ?? { totalInput: 0, totalOutput: 0, totalRequests: 0 },
    week: weekRow ?? { totalInput: 0, totalOutput: 0, totalRequests: 0 },
  };
}

export async function getTodaySummary(): Promise<UsageSummary> {
  const todayStart = daysAgo(0);
  const [row] = await db
    .select({
      totalInput: sql<number>`coalesce(sum(${llmUsage.inputTokens}), 0)::int`,
      totalOutput: sql<number>`coalesce(sum(${llmUsage.outputTokens}), 0)::int`,
      totalRequests: sql<number>`count(*)::int`,
    })
    .from(llmUsage)
    .where(gte(llmUsage.createdAt, todayStart));
  return row ?? { totalInput: 0, totalOutput: 0, totalRequests: 0 };
}

export async function getWeekSummary(): Promise<UsageSummary> {
  const weekStart = daysAgo(7);
  const [row] = await db
    .select({
      totalInput: sql<number>`coalesce(sum(${llmUsage.inputTokens}), 0)::int`,
      totalOutput: sql<number>`coalesce(sum(${llmUsage.outputTokens}), 0)::int`,
      totalRequests: sql<number>`count(*)::int`,
    })
    .from(llmUsage)
    .where(gte(llmUsage.createdAt, weekStart));
  return row ?? { totalInput: 0, totalOutput: 0, totalRequests: 0 };
}

/**
 * Log a single LLM usage event. Callers pass the raw token counts from the
 * OpenAI-compatible response. This is a fire-and-forget insert — callers
 * should not await or handle errors (usage logging is best-effort).
 */
export async function logLlmUsage(opts: {
  model: string;
  inputTokens: number;
  outputTokens: number;
  source: "briefing" | "review" | "triage" | "other";
  tacticId?: string;
}): Promise<void> {
  try {
    await db.insert(llmUsage).values({
      model: opts.model,
      inputTokens: opts.inputTokens,
      outputTokens: opts.outputTokens,
      source: opts.source,
      tacticId: opts.tacticId ?? null,
    });
  } catch {
    // Best-effort — don't fail the caller if logging breaks.
  }
}
