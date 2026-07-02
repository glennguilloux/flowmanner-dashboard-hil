import {
  uuid,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
  pgSchema,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// All dashboard-owned tables live in the `hil_ops` Postgres schema. This keeps
// a clean boundary from FM's alembic-managed tables in `public` — FM's
// migrations never see these objects, and this app's drizzle-kit never sees
// FM's.
export const hilOps = pgSchema("hil_ops");

export const strategyStatus = hilOps.enum("strategy_status", [
  "draft",
  "active",
  "paused",
  "completed",
]);

export const tacticStatus = hilOps.enum("tactic_status", [
  "proposed",
  "needs_review",
  "approved",
  "rejected",
  "running",
  "completed",
]);

export const riskLevel = hilOps.enum("risk_level", ["low", "medium", "high"]);

export const authorType = hilOps.enum("author_type", ["human", "agent"]);

export const decision = hilOps.enum("decision", [
  "approve",
  "reject",
  "request_more_info",
]);

// Where a tactic came from. `inbox` = FM inbox_items interrupt, `pr` = GitHub
// PR awaiting review, `simulated` = dev/demo proposal via the simulate UI.
export const tacticSource = hilOps.enum("tactic_source", [
  "inbox",
  "pr",
  "simulated",
]);

export const ciState = hilOps.enum("ci_state", ["passing", "failing", "pending", "none"]);

export const users = hilOps.table("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  role: text("role").notNull().default("operator"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const agents = hilOps.table("agents", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  role: text("role").notNull(),
  model: text("model"), // always a self-hosted homelab model — never SaaS
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const strategies = hilOps.table("strategies", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  goal: text("goal").notNull(),
  rules: text("rules").notNull(),
  humanGateTriggers: text("human_gate_triggers").notNull().default(""),
  status: strategyStatus("status").notNull().default("draft"),
  ownerId: uuid("owner_id").references(() => users.id),
  // FM mission id (when this strategy is 1:1 with a FlowManner mission). Nullable
  // so demo/synthetic strategies don't need it.
  missionId: text("mission_id"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const tactics = hilOps.table("tactics", {
  id: uuid("id").primaryKey().defaultRandom(),
  strategyId: uuid("strategy_id")
    .notNull()
    .references(() => strategies.id, { onDelete: "cascade" }),
  agentId: uuid("agent_id").references(() => agents.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  steps: text("steps").array().notNull().default([]),
  sources: jsonb("sources").notNull().default([]),
  confidence: integer("confidence").notNull().default(0),
  riskLevel: riskLevel("risk_level").notNull().default("low"),
  status: tacticStatus("status").notNull().default("proposed"),
  requiresHumanApproval: boolean("requires_human_approval")
    .notNull()
    .default(false),
  humanDecision: decision("human_decision"),
  uncertaintyNotes: text("uncertainty_notes"),
  attemptCount: integer("attempt_count").notNull().default(0),
  maxAttempts: integer("max_attempts").notNull().default(3),
  // New (vs. Example): provenance + CI status for PR-flavored tactics.
  source: tacticSource("source").notNull().default("simulated"),
  sourceId: text("source_id"), // inbox_items.id (uuid) or PR number or random uuid for simulated
  // CI checks detail (array of {name, status, conclusion, url, startedAt, completedAt}).
  // Populated by PR sync; null for non-PR tactics.
  ciChecks: jsonb("ci_checks"),
  // PR mergeability: 'MERGEABLE' | 'CONFLICTING' | 'UNKNOWN' from gh. Null for non-PR.
  prMergeable: text("pr_mergeable"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
}, (table) => ({
  // Upsert key for sync: same source + same sourceId = same tactic. Postgres
  // allows multiple NULLs in a unique index, so simulated tactics (no sourceId)
  // can co-exist.
  sourceSourceIdUnique: uniqueIndex("tactics_source_source_id_unique").on(
    table.source,
    table.sourceId,
  ),
  // Composite index for governance panel filter (needs_review + requiresHumanApproval).
  statusHumanApprovalIdx: index("tactics_status_human_approval_idx").on(
    table.status,
    table.requiresHumanApproval,
  ),
  // Composite index for dashboard ordering (status + updatedAt).
  statusUpdatedAtIdx: index("tactics_status_updated_at_idx").on(
    table.status,
    table.updatedAt,
  ),
  // Index on source for PR/inbox page filters.
  sourceIdx: index("tactics_source_idx").on(table.source),
}));

export const approvals = hilOps.table("approvals", {
  id: uuid("id").primaryKey().defaultRandom(),
  tacticId: uuid("tactic_id")
    .notNull()
    .references(() => tactics.id, { onDelete: "cascade" }),
  decision: decision("decision").notNull(),
  notes: text("notes"),
  decidedBy: uuid("decided_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const messages = hilOps.table("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  parentType: text("parent_type").notNull(), // 'strategy' | 'tactic'
  parentId: uuid("parent_id").notNull(),
  authorType: authorType("author_type").notNull(),
  authorId: uuid("author_id").notNull(),
  authorName: text("author_name").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});