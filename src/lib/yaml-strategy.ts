import { load as yamlLoad, dump as yamlDump } from "js-yaml";
import { db } from "@/db";
import { strategies, tactics } from "@/db/schema";
import { eq } from "drizzle-orm";

type ParsedTactic = {
  title: string;
  description: string;
  steps: string[];
  riskLevel: "low" | "medium" | "high";
  maxAttempts: number;
  acceptanceCriteria: string[];
  confidence: number;
};

export type ParsedStrategy = {
  version: number;
  strategy: {
    title: string;
    description: string;
    goal: string;
    rules: string;
    humanGateTriggers: string;
    status: "draft" | "active" | "paused" | "completed";
  };
  tactics: ParsedTactic[];
};

/**
 * Export a strategy + its tactics to a YAML string.
 */
export async function exportStrategyToYaml(
  strategyId: string,
): Promise<string | null> {
  const strategy = await db.query.strategies.findFirst({
    where: eq(strategies.id, strategyId),
  });
  if (!strategy) return null;

  const tacticRows = await db
    .select()
    .from(tactics)
    .where(eq(tactics.strategyId, strategyId));

  const obj = {
    version: 1,
    strategy: {
      title: strategy.title,
      description: strategy.description,
      goal: strategy.goal,
      rules: strategy.rules,
      human_gate_triggers: strategy.humanGateTriggers,
      status: strategy.status,
    },
    tactics: tacticRows.map((t) => ({
      title: t.title,
      description: t.description,
      steps: t.steps,
      risk_level: t.riskLevel,
      max_attempts: t.maxAttempts,
      acceptance_criteria: t.acceptanceCriteria,
      confidence: t.confidence,
    })),
  };

  return yamlDump(obj, { lineWidth: 100, noRefs: true });
}

/**
 * Parse a YAML string and validate the shape. Returns null if invalid.
 */
export function parseStrategyYaml(
  yamlString: string,
): ParsedStrategy | null {
  try {
    const parsed = yamlLoad(yamlString) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object") return null;
    if (parsed.version !== 1) return null;

    const s = parsed.strategy as Record<string, unknown>;
    if (!s || typeof s !== "object") return null;
    if (typeof s.title !== "string" || typeof s.goal !== "string") return null;

    const rawTactics = Array.isArray(parsed.tactics) ? parsed.tactics : [];
    const validStatuses = ["draft", "active", "paused", "completed"];

    return {
      version: 1,
      strategy: {
        title: String(s.title),
        description: String(s.description ?? ""),
        goal: String(s.goal),
        rules: String(s.rules ?? ""),
        humanGateTriggers: String(s.human_gate_triggers ?? ""),
        status: validStatuses.includes(String(s.status))
          ? (String(s.status) as ParsedStrategy["strategy"]["status"])
          : "draft",
      },
      tactics: rawTactics.map((t) => {
        const tac = t as Record<string, unknown>;
        const risk = String(tac.risk_level ?? "medium").toLowerCase();
        return {
          title: String(tac.title ?? "Untitled"),
          description: String(tac.description ?? ""),
          steps: Array.isArray(tac.steps)
            ? tac.steps.map(String)
            : typeof tac.steps === "string"
              ? [tac.steps]
              : [],
          riskLevel: ["low", "medium", "high"].includes(risk)
            ? (risk as "low" | "medium" | "high")
            : "medium",
          maxAttempts:
            typeof tac.max_attempts === "number" ? tac.max_attempts : 3,
          acceptanceCriteria: Array.isArray(tac.acceptance_criteria)
            ? tac.acceptance_criteria.map(String)
            : [],
          confidence:
            typeof tac.confidence === "number" ? tac.confidence : 0,
        };
      }),
    };
  } catch {
    return null;
  }
}

/**
 * Import a strategy from a YAML string. Creates the strategy and its tactics
 * in a single transaction. Returns the created strategy or null on parse failure.
 */
export async function importStrategyFromYaml(
  yamlString: string,
) {
  const parsed = parseStrategyYaml(yamlString);
  if (!parsed) return null;

  return db.transaction(async (tx) => {
    const [strategy] = await tx
      .insert(strategies)
      .values({
        title: parsed.strategy.title,
        description: parsed.strategy.description,
        goal: parsed.strategy.goal,
        rules: parsed.strategy.rules,
        humanGateTriggers: parsed.strategy.humanGateTriggers,
        status: parsed.strategy.status,
      })
      .returning();

    if (parsed.tactics.length > 0) {
      await tx.insert(tactics).values(
        parsed.tactics.map((t) => ({
          strategyId: strategy.id,
          title: t.title,
          description: t.description,
          steps: t.steps,
          riskLevel: t.riskLevel,
          maxAttempts: t.maxAttempts,
          acceptanceCriteria: t.acceptanceCriteria,
          confidence: t.confidence,
          status: "proposed" as const,
          source: "simulated" as const,
        })),
      );
    }

    return strategy;
  });
}
