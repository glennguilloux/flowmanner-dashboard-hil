import { db } from "@/db";
import {
  users,
  agents,
  strategies,
  tactics,
  messages,
  approvals,
} from "@/db/schema";

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
        role: "media_researcher",
        model: "gpt-4o-research",
        avatarUrl: "🕵️",
      },
      {
        name: "Pitch",
        role: "outreach_drafter",
        model: "gpt-4o-pitch",
        avatarUrl: "✍️",
      },
      {
        name: "Guard",
        role: "risk_gatekeeper",
        model: "gpt-4o-guard",
        avatarUrl: "🛡️",
      },
    ])
    .onConflictDoNothing()
    .returning();

  const scout =
    agentRows.find((a) => a.name === "Scout") ??
    (await db.query.agents.findFirst({ where: (a, { eq }) => eq(a.name, "Scout") }));
  const pitch =
    agentRows.find((a) => a.name === "Pitch") ??
    (await db.query.agents.findFirst({ where: (a, { eq }) => eq(a.name, "Pitch") }));
  const guard =
    agentRows.find((a) => a.name === "Guard") ??
    (await db.query.agents.findFirst({ where: (a, { eq }) => eq(a.name, "Guard") }));

  if (!defaultUser || !scout || !pitch || !guard) {
    throw new Error("Seed failed: missing required rows");
  }

  const [strategy] = await db
    .insert(strategies)
    .values({
      title: "Product Launch PR Playbook",
      description:
        "Generate credible, high-signal PR coverage for the Q3 product launch while avoiding inflated or unverifiable claims.",
      goal:
        "Find the most relevant, recent, and reliable sources while minimizing hallucination risk, and never finalize a conclusion without human validation when confidence is low.",
      rules:
        "1) Cross-check every claim across at least two independent sources. 2) Never publish a pitch without source links. 3) Pause and ask the human when confidence is below 70% or risk is high.",
      humanGateTriggers:
        "Low confidence (<70%), conflicting sources, medical/legal/financial claims, competitor comparisons, budget overruns.",
      status: "active",
      ownerId: defaultUser.id,
    })
    .returning();

  const [tactic1] = await db
    .insert(tactics)
    .values({
      strategyId: strategy.id,
      agentId: scout.id,
      title: "Target journalist list for SaaS beat",
      description:
        "Curate 15 journalists covering B2B SaaS, productivity, and enterprise tooling who wrote within the last 90 days.",
      steps: [
        "Search recent SaaS/productivity coverage",
        "Rank journalists by recency, authority, and topical fit",
        "Cross-check contact beats against two databases",
      ],
      sources: [
        { title: "TechCrunch SaaS tag", url: "https://techcrunch.com/category/enterprise/" },
        { title: "Journalist database", url: "#" },
      ],
      confidence: 82,
      riskLevel: "low",
      status: "approved",
      requiresHumanApproval: false,
      attemptCount: 1,
      maxAttempts: 3,
    })
    .returning();

  const [tactic2] = await db
    .insert(tactics)
    .values({
      strategyId: strategy.id,
      agentId: pitch.id,
      title: "Draft launch pitch with ROI claims",
      description:
        "Prepare a personalized pitch email that includes a customer ROI statistic and a competitive comparison.",
      steps: [
        "Pull verified customer ROI statistic",
        "Draft personalized opener per journalist",
        "Add competitive comparison paragraph",
        "Gate for human approval before send",
      ],
      sources: [
        { title: "Customer case study", url: "#" },
        { title: "Competitor pricing page", url: "#" },
      ],
      confidence: 58,
      riskLevel: "high",
      status: "needs_review",
      requiresHumanApproval: true,
      uncertaintyNotes:
        "ROI statistic comes from a single case study; competitor comparison could be challenged. Confidence below threshold.",
      attemptCount: 2,
      maxAttempts: 3,
    })
    .returning();

  const [tactic3] = await db
    .insert(tactics)
    .values({
      strategyId: strategy.id,
      agentId: guard.id,
      title: "Risk scan: regulatory language",
      description:
        "Review all outbound messaging for language that could be interpreted as financial or security guarantees.",
      steps: [
        "Scan drafts for guarantee language",
        "Flag terms like 'guarantees', 'always secure'",
        "Suggest safer alternatives",
      ],
      sources: [{ title: "Legal style guide", url: "#" }],
      confidence: 91,
      riskLevel: "medium",
      status: "running",
      requiresHumanApproval: false,
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
      content: "Let's keep every claim backed by at least two sources. No exceptions.",
    },
    {
      parentType: "tactic",
      parentId: tactic2.id,
      authorType: "agent",
      authorId: pitch.id,
      authorName: pitch.name,
      content:
        "Confidence is 58% because the ROI stat only appears in one case study and the competitor claim is unverified. Awaiting your decision.",
    },
    {
      parentType: "tactic",
      parentId: tactic2.id,
      authorType: "human",
      authorId: defaultUser.id,
      authorName: defaultUser.name,
      content:
        "Hold the pitch. Remove the competitor paragraph and find a second source for the ROI claim before resubmitting.",
    },
  ]);

  await db.insert(approvals).values({
    tacticId: tactic1.id,
    decision: "approve",
    notes: "Sources look solid. Proceed.",
    decidedBy: defaultUser.id,
  });

  return { strategy, tactics: [tactic1, tactic2, tactic3] };
}

if (require.main === module) {
  seedDatabase()
    .then((result) => {
      console.log("Seeded:", result);
      process.exit(0);
    })
    .catch((err) => {
      console.error("Seed failed:", err);
      process.exit(1);
    });
}
