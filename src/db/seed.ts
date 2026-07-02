import { db } from "@/db";
import {
  users,
  agents,
  strategies,
  tactics,
  messages,
  approvals,
  goals,
  projects,
  brainDump,
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

  // ── Goals & Projects ────────────────────────────────────────────────────

  const [longTermGoal] = await db
    .insert(goals)
    .values({
      title: "Ship FlowManner v2",
      description:
        "Complete the full v2 release with improved agent orchestration, real-time CI, and human-in-the-loop gates.",
      type: "long-term",
      category: "schedule",
      status: "active",
      timeframe: "Q3 2026",
      progress: 35,
    })
    .onConflictDoNothing()
    .returning();

  const [milestone1] = await db
    .insert(goals)
    .values({
      title: "Complete auth & middleware",
      description: "Ship the auth middleware, bearer token, and dev-mode bypass.",
      type: "medium-term",
      category: "do",
      status: "active",
      timeframe: "2026-07-15",
      parentGoalId: longTermGoal?.id ?? null,
      progress: 80,
    })
    .onConflictDoNothing()
    .returning();

  const [milestone2] = await db
    .insert(goals)
    .values({
      title: "Launch beta program",
      description: "Open the dashboard to 5 beta users for feedback.",
      type: "medium-term",
      category: "schedule",
      status: "active",
      timeframe: "2026-08-01",
      parentGoalId: longTermGoal?.id ?? null,
      progress: 10,
    })
    .onConflictDoNothing()
    .returning();

  const [mediumGoal] = await db
    .insert(goals)
    .values({
      title: "Reach 100 daily active users",
      description: "Grow the user base through content marketing and word-of-mouth.",
      type: "medium-term",
      category: "delegate",
      status: "active",
      timeframe: "Q4 2026",
      progress: 5,
    })
    .onConflictDoNothing()
    .returning();

  const [completedGoal] = await db
    .insert(goals)
    .values({
      title: "Set up homelab infrastructure",
      description: "Deploy WireGuard, Postgres, llama.cpp, and the model manager daemon.",
      type: "medium-term",
      category: "do",
      status: "completed",
      timeframe: "Q2 2026",
      progress: 100,
    })
    .onConflictDoNothing()
    .returning();

  // Projects
  if (longTermGoal) {
    await db
      .insert(projects)
      .values([
        {
          goalId: longTermGoal.id,
          title: "Agent Orchestration",
          description: "Hermes ACP integration and multi-agent coordination.",
          priority: "high" as const,
          color: "#6366f1",
          tags: ["hermes", "agents"],
        },
        {
          goalId: longTermGoal.id,
          title: "CI Pipeline",
          description: "GitHub Actions, test coverage, and deployment automation.",
          priority: "medium" as const,
          color: "#10b981",
          tags: ["ci", "devops"],
        },
      ])
      .onConflictDoNothing();
  }

  if (mediumGoal) {
    await db
      .insert(projects)
      .values({
        goalId: mediumGoal.id,
        title: "Content Marketing",
        description: "Blog posts, social media, and community engagement.",
        priority: "medium" as const,
        color: "#f59e0b",
        tags: ["marketing"],
      })
      .onConflictDoNothing();
  }

  // ── Brain Dump entries ────────────────────────────────────────────────

  const brainDumpEntries = await db
    .insert(brainDump)
    .values([
      {
        content: "Investigate adding WebSocket support for real-time CI status updates",
        source: "manual" as const,
        status: "pending" as const,
        tags: ["infrastructure", "realtime"],
      },
      {
        content: "Create a weekly automated report summarizing agent activity and token usage",
        source: "manual" as const,
        status: "pending" as const,
        tags: ["reporting", "automation"],
      },
      {
        content: "Evaluate switching from Qwen3-27B to a larger model for better reasoning",
        source: "manual" as const,
        status: "pending" as const,
        tags: ["llm", "performance"],
      },
      {
        content: "Add dark mode toggle animation to sidebar",
        source: "manual" as const,
        status: "triaged" as const,
        triageSummary: "Nice-to-have UI polish, not urgent. Could be a quick win for a new contributor.",
        tags: ["ui"],
      },
      {
        content: "Set up monitoring for WireGuard tunnel latency over time",
        source: "manual" as const,
        status: "converted" as const,
        convertedToType: "tactic" as const,
        triageSummary: "Actionable: infrastructure monitoring task. Converted to tactic for Scout to investigate.",
        tags: ["monitoring", "infrastructure"],
      },
    ])
    .onConflictDoNothing()
    .returning();

  return {
    strategy,
    tactics: [tactic1, tactic2, tactic3],
    goals: [longTermGoal, milestone1, milestone2, mediumGoal, completedGoal].filter(Boolean),
    brainDump: brainDumpEntries,
  };
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