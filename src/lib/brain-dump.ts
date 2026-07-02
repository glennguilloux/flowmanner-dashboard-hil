import { db } from "@/db";
import { brainDump, tactics, goals } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { chat, LLM_MODEL } from "@/lib/llm";
import { logLlmUsage } from "@/lib/usage";

// ── Queries ────────────────────────────────────────────────────────────────

export async function getBrainDumpEntries(limit = 50, offset = 0) {
  return db
    .select()
    .from(brainDump)
    .orderBy(desc(brainDump.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function countBrainDump(): Promise<number> {
  const [row] = await db
    .select({ cnt: sql<number>`count(*)::int` })
    .from(brainDump);
  return row?.cnt ?? 0;
}

export async function getPendingBrainDumpEntries() {
  return db
    .select()
    .from(brainDump)
    .where(eq(brainDump.status, "pending"))
    .orderBy(desc(brainDump.createdAt));
}

export async function countPendingBrainDump(): Promise<number> {
  const [row] = await db
    .select({ cnt: sql<number>`count(*)::int` })
    .from(brainDump)
    .where(eq(brainDump.status, "pending"));
  return row?.cnt ?? 0;
}

export async function createBrainDumpEntry(data: {
  content: string;
  source?: "manual" | "voice" | "slack" | "email";
  tags?: string[];
}) {
  const [entry] = await db
    .insert(brainDump)
    .values({
      content: data.content,
      source: data.source ?? "manual",
      tags: data.tags ?? [],
    })
    .returning();
  return entry;
}

export async function updateBrainDumpEntry(
  id: string,
  data: {
    status?: "pending" | "triaged" | "converted" | "dismissed";
    convertedToId?: string | null;
    convertedToType?: "tactic" | "goal" | "project" | null;
    triageSummary?: string | null;
  },
) {
  const [entry] = await db
    .update(brainDump)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(brainDump.id, id))
    .returning();
  return entry;
}

// ── LLM Triage ─────────────────────────────────────────────────────────────

const TRIAGE_SYSTEM_PROMPT = `You are a triage assistant for an operations dashboard. Given a list of brain dump entries, classify each as actionable or not. For actionable entries, suggest converting to a tactic or goal.

Return ONLY valid JSON with this exact structure:
{ "entries": [{ "id": "<entry id>", "actionable": true|false, "suggestedType": "tactic"|"goal"|"dismiss", "reasoning": "<1-2 sentence explanation>" }] }

Guidelines:
- "tactic" = a concrete action an agent can take (code change, deploy, research task)
- "goal" = a longer-term strategic objective
- "dismiss" = not actionable, vague, or already covered
- Be conservative — when in doubt, mark as not actionable
- Every entry in the input MUST appear in the output`;

type TriageResult = {
  id: string;
  actionable: boolean;
  suggestedType: "tactic" | "goal" | "dismiss";
  reasoning: string;
};

function parseTriageResponse(content: string): TriageResult[] | null {
  // Extract JSON from response (Qwen3 may wrap in thinking tags)
  const candidates: string[] = [];
  let depth = 0;
  let start = -1;
  for (let i = 0; i < content.length; i++) {
    if (content[i] === "{") {
      if (depth === 0) start = i;
      depth++;
    } else if (content[i] === "}") {
      depth--;
      if (depth === 0 && start >= 0) {
        candidates.push(content.slice(start, i + 1));
        start = -1;
      }
    }
  }

  for (let i = candidates.length - 1; i >= 0; i--) {
    try {
      const parsed = JSON.parse(candidates[i]) as Record<string, unknown>;
      if (Array.isArray(parsed.entries)) {
        return parsed.entries as TriageResult[];
      }
    } catch {
      continue;
    }
  }
  return null;
}

const MAX_CONVERSIONS_PER_RUN = 5;

export async function triagePendingEntries(): Promise<{
  processed: number;
  converted: number;
  dismissed: number;
  errors: string[];
}> {
  const pending = await getPendingBrainDumpEntries();
  if (pending.length === 0) {
    return { processed: 0, converted: 0, dismissed: 0, errors: [] };
  }

  // Limit to prevent runaway
  const batch = pending.slice(0, 10);

  const userPrompt = batch
    .map((e) => `ID: ${e.id}\nContent: ${e.content}\nTags: ${e.tags.join(", ") || "none"}`)
    .join("\n---\n");

  let content: string;
  try {
    const result = await chat(
      [
        { role: "system", content: TRIAGE_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      { maxTokens: 2000, temperature: 0.3 },
    );
    content = result.content;

    // Log LLM usage (fire-and-forget)
    logLlmUsage({
      model: LLM_MODEL,
      inputTokens: result.usage.prompt_tokens,
      outputTokens: result.usage.completion_tokens,
      source: "triage",
    });
  } catch (err) {
    // LLM unreachable — entries stay pending
    return {
      processed: 0,
      converted: 0,
      dismissed: 0,
      errors: [`LLM unreachable: ${err instanceof Error ? err.message : String(err)}`],
    };
  }

  let results = parseTriageResponse(content);

  // Retry once if invalid JSON
  if (!results) {
    try {
      const retry = await chat(
        [
          { role: "system", content: TRIAGE_SYSTEM_PROMPT },
          { role: "user", content: `Your previous response was not valid JSON. Try again.\n\n${userPrompt}` },
        ],
        { maxTokens: 2000, temperature: 0.2 },
      );
      results = parseTriageResponse(retry.content);

      // Log retry usage
      logLlmUsage({
        model: LLM_MODEL,
        inputTokens: retry.usage.prompt_tokens,
        outputTokens: retry.usage.completion_tokens,
        source: "triage",
      });
    } catch {
      // LLM failed on retry
    }
  }

  if (!results) {
    // Mark all as triage_error
    for (const entry of batch) {
      await updateBrainDumpEntry(entry.id, {
        status: "triaged",
        triageSummary: "Triage failed: LLM returned unparseable response",
      });
    }
    return {
      processed: batch.length,
      converted: 0,
      dismissed: 0,
      errors: ["LLM returned unparseable JSON after retry"],
    };
  }

  let converted = 0;
  let dismissed = 0;
  const errors: string[] = [];

  for (const result of results) {
    const entry = batch.find((e) => e.id === result.id);
    if (!entry) continue;

    if (!result.actionable || result.suggestedType === "dismiss") {
      await updateBrainDumpEntry(entry.id, {
        status: "dismissed",
        triageSummary: result.reasoning,
      });
      dismissed++;
    } else if (converted < MAX_CONVERSIONS_PER_RUN) {
      // Create a tactic or goal from the entry
      if (result.suggestedType === "tactic") {
        // Get or create a default strategy to link the tactic to
        const defaultStrategy = await db.query.strategies.findFirst();
        if (defaultStrategy) {
          const [tactic] = await db
            .insert(tactics)
            .values({
              strategyId: defaultStrategy.id,
              title: entry.content.slice(0, 200),
              description: `Converted from brain dump: ${entry.content}`,
              source: "simulated",
              status: "proposed",
            })
            .returning();
          await updateBrainDumpEntry(entry.id, {
            status: "converted",
            convertedToId: tactic.id,
            convertedToType: "tactic",
            triageSummary: result.reasoning,
          });
          converted++;
        } else {
          errors.push(`No strategy found to link tactic for entry ${entry.id}`);
          await updateBrainDumpEntry(entry.id, {
            status: "triaged",
            triageSummary: `Actionable but no strategy available: ${result.reasoning}`,
          });
        }
      } else if (result.suggestedType === "goal") {
        const [goal] = await db
          .insert(goals)
          .values({
            title: entry.content.slice(0, 200),
            description: `Converted from brain dump: ${entry.content}`,
          })
          .returning();
        await updateBrainDumpEntry(entry.id, {
          status: "converted",
          convertedToId: goal.id,
          convertedToType: "goal",
          triageSummary: result.reasoning,
        });
        converted++;
      }
    } else {
      // Over conversion limit — mark as triaged but don't convert
      await updateBrainDumpEntry(entry.id, {
        status: "triaged",
        triageSummary: `Max conversions reached. ${result.reasoning}`,
      });
    }
  }

  return { processed: batch.length, converted, dismissed, errors };
}
