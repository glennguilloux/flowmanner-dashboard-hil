import { db } from "@/db";
import {
  users,
  agents,
  strategies,
  tactics,
  messages,
  approvals,
} from "@/db/schema";

// Demo seed. All agents point at homelab LLM models (no SaaS) — this is the
// hard rule per PLAN.md §8 and the FM positioning line. Replace agent.model
// with whatever the homelab llama.cpp currently exposes.
export async function seedDatabase() {
  const insertedUsers = await db
    .insert(users)
    .values({
      name: "Me",
      email: "me@pr-ops.local",
      role: "human_operator",
    })
    .onConflictDoNothing({ target: users.email })
    .returning();
  const [me] = insertedUsers;

  const defaultUser =
    me ??
    (await db.query.users.findFirst({
      where: (u, { eq }) => eq(u.email, "me@pr-ops.local"),
    }));

  const agentRows = await db
    .insert(agents)
    .values([
      {
        name: "Scout",
        role: "research_scout",
        model: "llama.cpp:qwen3-27b-q5 (homelab)",
        avatarUrl: "🕵️",
      },
      {
        name: "Drafter",
        role: "outreach_drafter",
        model: "llama.cpp:qwen3-27b-q5 (homelab)",
        avatarUrl: "✍️",
      },
      {
        name: "Guard",
        role: "risk_gatekeeper",
        model: "llama.cpp:qwen3-27b-q5 (homelab)",
        avatarUrl: "🛡️",
      },
    ])
    .onConflictDoNothing()
    .returning();

  const scout =
    agentRows.find((a) => a.name === "Scout") ??
    (await db.query.agents.findFirst({ where: (a, { eq }) => eq(a.name, "Scout") }));
  const drafter =
    agentRows.find((a) => a.name === "Drafter") ??
    (await db.query.agents.findFirst({ where: (a, { eq }) => eq(a.name, "Drafter") }));
  const guard =
    agentRows.find((a) => a.name === "Guard") ??
    (await db.query.agents.findFirst({ where: (a, { eq }) => eq(a.name, "Guard") }));

  if (!defaultUser || !scout || !drafter || !guard) {
    throw new Error("Seed failed: missing required rows");
  }

  const [strategy] = await db
    .insert(strategies)
    .values({
      title: "Stabilize homelab memory pipeline",
      description:
        "Repair the agent memory replay loop, retire broken retention heuristics, and stop pinging ops with stale alerts.",
      goal:
        "Reach 95%+ memory-replay accuracy on the homelab tenant without any data loss, and gate every risky change behind Glenn.",
      rules:
        "1) Never delete memory rows without a backup taken in the same transaction. 2) Any change touching retention policy pauses for human approval. 3) Email/Slack outreach is always gated. 4) Verify replay on staging before promoting.",
      humanGateTriggers:
        "Low confidence (<70%), retention-policy changes, customer-facing email, schema migrations on the homelab tenant, anything touching postgres volumes",
      status: "active",
      ownerId: defaultUser.id,
    })
    .returning();

  // Tactic 1: clean — already approved, no gate.
  const [tactic1] = await db
    .insert(tactics)
    .values({
      strategyId: strategy.id,
      agentId: scout.id,
      title: "Cross-check memory replay on the last 7 days",
      description:
        "Re-run the replay loop against the last 7 days of mission runs and compare expected vs. observed state. Output a diff table.",
      steps: [
        "Snapshot the last 7 days of mission_runs",
        "Replay each run through the memory agent",
        "Diff expected vs. observed state rows",
        "Emit a per-day accuracy report",
      ],
      sources: [
        { title: "Mission runs (last 7d)", url: "#" },
        { title: "Memory replay script", url: "#" },
      ],
      confidence: 84,
      riskLevel: "low",
      status: "approved",
      requiresHumanApproval: false,
      source: "simulated",
      attemptCount: 1,
      maxAttempts: 3,
    })
    .returning();

  // Tactic 2: gated — low confidence + high risk + explicit gate.
  // This is the one we want to exercise the ApprovalGate component on.
  const [tactic2] = await db
    .insert(tactics)
    .values({
      strategyId: strategy.id,
      agentId: drafter.id,
      title: "Email ops@flowmanner.dev about retention policy change",
      description:
        "Send a customer-facing email claiming the retention policy was changed from 30 to 90 days and that no data was lost. Include a competitor comparison paragraph.",
      steps: [
        "Pull the (single) source for the 90-day retention claim",
        "Draft personalized opener per recipient",
        "Add the competitor comparison paragraph",
        "Gate for human approval before send",
      ],
      sources: [
        { title: "Internal retention spec (single source)", url: "#" },
        { title: "Competitor pricing page", url: "#" },
      ],
      confidence: 55,
      riskLevel: "high",
      status: "needs_review",
      requiresHumanApproval: true,
      source: "simulated",
      uncertaintyNotes:
        "Retention claim is sourced from a single internal spec; competitor comparison is unverified; email is customer-facing — high blast radius.",
      attemptCount: 2,
      maxAttempts: 3,
    })
    .returning();

  // Tactic 3: running — high confidence, no gate, mid-execution.
  const [tactic3] = await db
    .insert(tactics)
    .values({
      strategyId: strategy.id,
      agentId: guard.id,
      title: "Risk scan: outbound messaging for guarantee language",
      description:
        "Review all recent agent outbound for language that could be read as financial, security, or compliance guarantees. Flag and suggest safer alternatives.",
      steps: [
        "Scan drafts for guarantee language",
        "Flag terms like 'guarantees', 'always secure', 'never loses data'",
        "Suggest safer alternatives",
      ],
      sources: [{ title: "FM style guide", url: "#" }],
      confidence: 91,
      riskLevel: "medium",
      status: "running",
      requiresHumanApproval: false,
      source: "simulated",
      attemptCount: 1,
      maxAttempts: 3,
    })
    .returning();

  await db.insert(messages).values([
    {
      parentType: "strategy",
      parentId: strategy.id,
      authorType: "human",
      authorId: defaultUser.id,
      authorName: defaultUser.name,
      content:
        "Every claim needs two independent sources. Retention changes require my sign-off. No exceptions.",
    },
    {
      parentType: "tactic",
      parentId: tactic2.id,
      authorType: "agent",
      authorId: drafter.id,
      authorName: drafter.name,
      content:
        "Confidence is 55% because the 90-day retention claim has only one source and the competitor comparison is unverified. Customer-facing email with legal-adjacent language — high blast radius. Pausing for your decision.",
    },
    {
      parentType: "tactic",
      parentId: tactic2.id,
      authorType: "human",
      authorId: defaultUser.id,
      authorName: defaultUser.name,
      content:
        "Hold the email. Drop the competitor paragraph and find a second source for the 90-day claim before resubmitting. Do not send anything yet.",
    },
  ]);

  await db.insert(approvals).values({
    tacticId: tactic1.id,
    decision: "approve",
    notes: "Sources look solid, low risk. Proceed.",
    decidedBy: defaultUser.id,
  });

  return { strategy, tactics: [tactic1, tactic2, tactic3] };
}

if (require.main === module) {
  seedDatabase()
    .then((result) => {
      console.log("Seeded:", JSON.stringify(result, null, 2));
      process.exit(0);
    })
    .catch((err) => {
      console.error("Seed failed:", err);
      process.exit(1);
    });
}