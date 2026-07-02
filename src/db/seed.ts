import { db } from "@/db";
import { eq } from "drizzle-orm";
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
  skills,
  agentSkills,
  tacticDependencies,
  tacticSubtasks,
  llmUsage,
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
        description:
          "Research and analysis agent. Searches for information, cross-references sources, and produces structured reports.",
        capabilities: ["web_search", "source_verification", "report_generation"],
        instructions:
          "You are a research scout. Your job is to find, verify, and synthesize information from multiple sources.\n\nRules:\n1. Always cross-reference claims with at least 2 independent sources.\n2. Flag any conflicting information explicitly.\n3. Structure reports with clear headings and citations.\n4. Never fabricate data — if you can't find something, say so.",
        status: "active",
      },
      {
        name: "Drafter",
        role: "outreach_drafter",
        model: "llama.cpp:qwen3-27b-q5 (homelab)",
        avatarUrl: "✍️",
        description:
          "Content creation agent. Drafts emails, documents, and outreach materials with careful tone management.",
        capabilities: ["email_drafting", "content_creation", "tone_calibration"],
        instructions:
          "You are an outreach drafter. Your job is to create clear, professional content for external communications.\n\nRules:\n1. Match tone to audience — formal for customers, casual for internal.\n2. Never make financial, legal, or compliance claims without explicit source citation.\n3. Always gate customer-facing content for human review.\n4. Keep emails under 200 words unless complexity requires more.",
        status: "active",
      },
      {
        name: "Guard",
        role: "risk_gatekeeper",
        model: "llama.cpp:qwen3-27b-q5 (homelab)",
        avatarUrl: "🛡️",
        description:
          "Risk assessment agent. Scans outbound communications for compliance issues, guarantees, and high-risk language.",
        capabilities: ["risk_scanning", "compliance_check", "language_analysis"],
        instructions:
          "You are a risk gatekeeper. Your job is to scan communications for potential risks before they go out.\n\nRules:\n1. Flag any language that could be read as financial, security, or compliance guarantees.\n2. Check for terms like 'guarantees', 'always secure', 'never loses data'.\n3. Suggest safer alternatives for flagged language.\n4. Assign risk levels: low (internal), medium (partner-facing), high (customer/legal).",
        status: "active",
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
      importance: "important",
      urgency: "not-urgent",
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
      importance: "important",
      urgency: "urgent",
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
      importance: "not-important",
      urgency: "urgent",
    })
    .returning();

  // Tactic 4: low priority — not important + not urgent (ELIMINATE quadrant).
  // attemptCount = maxAttempts to demo the escalation notice (Phase 8).
  const [tactic4] = await db
    .insert(tactics)
    .values({
      strategyId: strategy.id,
      agentId: scout.id,
      title: "Audit legacy dashboard telemetry endpoints",
      description:
        "Review unused telemetry endpoints from the v1 dashboard and remove dead code. Low impact, no urgency.",
      steps: [
        "List all telemetry endpoints from v1",
        "Check which ones have traffic in the last 30 days",
        "Remove endpoints with zero traffic",
      ],
      sources: [{ title: "v1 telemetry config", url: "#" }],
      confidence: 40,
      riskLevel: "low",
      status: "needs_review",
      requiresHumanApproval: true,
      source: "simulated",
      attemptCount: 3,
      maxAttempts: 3,
      importance: "not-important",
      urgency: "not-urgent",
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

  // ── Skills Library ────────────────────────────────────────────────────

  const skillRows = await db
    .insert(skills)
    .values([
      {
        name: "Web Research",
        description:
          "Ability to search the web, extract relevant information, and synthesize findings into structured reports.",
        content:
          "You are a research assistant. When asked to research a topic:\n1. Search for authoritative sources.\n2. Extract key facts and data points.\n3. Synthesize findings into a structured summary with citations.\n4. Flag any conflicting information or gaps in available data.",
        tags: ["research", "web", "analysis"],
      },
      {
        name: "Eisenhower Triage",
        description:
          "Classify incoming tasks into the Eisenhower matrix quadrants based on importance and urgency.",
        content:
          "You are a task prioritization assistant. For each task, classify it into one of four quadrants:\n- DO (important + urgent): Handle immediately.\n- SCHEDULE (important + not urgent): Block time for this.\n- DELEGATE (not important + urgent): Assign to an available agent.\n- ELIMINATE (not important + not urgent): Deprioritize or drop.\n\nJustify each classification with a brief reasoning.",
        tags: ["triage", "prioritization", "eisenhower"],
      },
      {
        name: "Task Management",
        description:
          "Break down complex tasks into subtasks, estimate effort, and track dependencies.",
        content:
          "You are a task management assistant. Given a complex task:\n1. Break it into 3-7 concrete subtasks.\n2. Estimate effort (minutes) for each subtask.\n3. Identify dependencies between subtasks.\n4. Flag risks or blockers.\n5. Suggest acceptance criteria for each subtask.",
        tags: ["tasks", "planning", "subtasks"],
      },
      {
        name: "Code Review",
        description:
          "Review code changes for correctness, security, performance, and style compliance.",
        content:
          "You are a code reviewer. For each change:\n1. Check for correctness — does it do what it claims?\n2. Check for security issues — injection, auth bypass, data leaks.\n3. Check for performance — N+1 queries, missing indexes, unbounded loops.\n4. Check for style — matches project conventions.\n5. Provide actionable suggestions, not just criticism.",
        tags: ["code", "review", "security"],
      },
    ])
    .onConflictDoNothing()
    .returning();

  // Link agents to skills
  if (skillRows.length > 0 && scout && drafter && guard) {
    const webResearch = skillRows.find((s) => s.name === "Web Research");
    const eisenhower = skillRows.find((s) => s.name === "Eisenhower Triage");
    const taskMgmt = skillRows.find((s) => s.name === "Task Management");
    const codeReview = skillRows.find((s) => s.name === "Code Review");

    const links: { agentId: string; skillId: string }[] = [];
    if (webResearch) {
      links.push({ agentId: scout.id, skillId: webResearch.id });
    }
    if (eisenhower) {
      links.push(
        { agentId: scout.id, skillId: eisenhower.id },
        { agentId: guard.id, skillId: eisenhower.id },
      );
    }
    if (taskMgmt) {
      links.push({ agentId: drafter.id, skillId: taskMgmt.id });
    }
    if (codeReview) {
      links.push({ agentId: guard.id, skillId: codeReview.id });
    }

    if (links.length > 0) {
      await db.insert(agentSkills).values(links).onConflictDoNothing();
    }
  }

  // ── Subtasks & Dependencies (Phase 7) ──────────────────────────────────

  // Subtasks for tactic 1 (Cross-check memory replay)
  await db
    .insert(tacticSubtasks)
    .values([
      {
        tacticId: tactic1.id,
        title: "Snapshot the last 7 days of mission_runs",
        done: true,
        order: 0,
      },
      {
        tacticId: tactic1.id,
        title: "Replay each run through the memory agent",
        done: true,
        order: 1,
      },
      {
        tacticId: tactic1.id,
        title: "Diff expected vs. observed state rows",
        done: false,
        order: 2,
      },
      {
        tacticId: tactic1.id,
        title: "Emit a per-day accuracy report",
        done: false,
        order: 3,
      },
    ])
    .onConflictDoNothing();

  // Subtasks for tactic 2 (Email ops about retention)
  await db
    .insert(tacticSubtasks)
    .values([
      {
        tacticId: tactic2.id,
        title: "Pull the source for the 90-day retention claim",
        done: false,
        order: 0,
      },
      {
        tacticId: tactic2.id,
        title: "Draft personalized opener per recipient",
        done: false,
        order: 1,
      },
      {
        tacticId: tactic2.id,
        title: "Gate for human approval before send",
        done: false,
        order: 2,
      },
    ])
    .onConflictDoNothing();

  // Subtasks for tactic 3 (Risk scan)
  await db
    .insert(tacticSubtasks)
    .values([
      {
        tacticId: tactic3.id,
        title: "Scan drafts for guarantee language",
        done: true,
        order: 0,
      },
      {
        tacticId: tactic3.id,
        title: "Flag terms like 'guarantees', 'always secure'",
        done: false,
        order: 1,
      },
      {
        tacticId: tactic3.id,
        title: "Suggest safer alternatives",
        done: false,
        order: 2,
      },
    ])
    .onConflictDoNothing();

  // Dependencies: tactic 2 (email) is blocked by tactic 1 (cross-check)
  // tactic 3 (risk scan) is blocked by tactic 2 (email)
  await db
    .insert(tacticDependencies)
    .values([
      { blockerId: tactic1.id, blockedId: tactic2.id },
      { blockerId: tactic2.id, blockedId: tactic3.id },
    ])
    .onConflictDoNothing();

  // Add acceptance criteria and time tracking to some tactics
  await db
    .update(tactics)
    .set({
      acceptanceCriteria: [
        "Replay accuracy >= 95% for all 7 days",
        "No memory row deletions without backup",
        "Per-day report includes confidence intervals",
      ],
      estimatedMinutes: 120,
      actualMinutes: 90,
    })
    .where(eq(tactics.id, tactic1.id));

  await db
    .update(tactics)
    .set({
      acceptanceCriteria: [
        "Two independent sources for 90-day retention claim",
        "No competitor comparison paragraph",
        "Human approval recorded before send",
      ],
      estimatedMinutes: 60,
    })
    .where(eq(tactics.id, tactic2.id));

  await db
    .update(tactics)
    .set({
      estimatedMinutes: 45,
      actualMinutes: 30,
    })
    .where(eq(tactics.id, tactic3.id));

  // ── LLM Usage sample data (Phase 9) ──────────────────────────────────

  const models = ["Qwen3.6-27B-Q5_K_M-mtp.gguf", "qwen3:27b-q5"];
  const sources: Array<"briefing" | "review" | "triage" | "other"> = [
    "briefing",
    "review",
    "triage",
    "other",
  ];

  const usageRows: Array<{
    model: string;
    inputTokens: number;
    outputTokens: number;
    source: "briefing" | "review" | "triage" | "other";
    createdAt: Date;
  }> = [];

  for (let day = 0; day < 7; day++) {
    const date = new Date();
    date.setDate(date.getDate() - day);
    date.setHours(0, 0, 0, 0);

    // 10-20 requests per day, distributed across models and sources
    const requestCount = 10 + Math.floor(Math.random() * 11);
    for (let r = 0; r < requestCount; r++) {
      const hour = 8 + Math.floor(Math.random() * 12); // 8am-8pm
      const ts = new Date(date);
      ts.setHours(hour, Math.floor(Math.random() * 60));

      usageRows.push({
        model: models[Math.floor(Math.random() * models.length)],
        inputTokens: 500 + Math.floor(Math.random() * 3500),
        outputTokens: 100 + Math.floor(Math.random() * 1500),
        source: sources[Math.floor(Math.random() * sources.length)],
        createdAt: ts,
      });
    }
  }

  await db.insert(llmUsage).values(usageRows).onConflictDoNothing();

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
    tactics: [tactic1, tactic2, tactic3, tactic4],
    goals: [longTermGoal, milestone1, milestone2, mediumGoal, completedGoal].filter(Boolean),
    brainDump: brainDumpEntries,
    skills: skillRows,
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