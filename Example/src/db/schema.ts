import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  pgEnum,
  boolean,
  jsonb,
} from "drizzle-orm/pg-core";

export const strategyStatusEnum = pgEnum("strategy_status", [
  "draft",
  "active",
  "paused",
  "completed",
]);

export const tacticStatusEnum = pgEnum("tactic_status", [
  "proposed",
  "needs_review",
  "approved",
  "rejected",
  "running",
  "completed",
]);

export const riskLevelEnum = pgEnum("risk_level", ["low", "medium", "high"]);

export const authorTypeEnum = pgEnum("author_type", ["human", "agent"]);

export const decisionEnum = pgEnum("decision", [
  "approve",
  "reject",
  "request_more_info",
]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  role: text("role").notNull().default("operator"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const agents = pgTable("agents", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  role: text("role").notNull(),
  model: text("model"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const strategies = pgTable("strategies", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  goal: text("goal").notNull(),
  rules: text("rules").notNull(),
  humanGateTriggers: text("human_gate_triggers").notNull().default(""),
  status: strategyStatusEnum("status").notNull().default("draft"),
  ownerId: uuid("owner_id").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const tactics = pgTable("tactics", {
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
  riskLevel: riskLevelEnum("risk_level").notNull().default("low"),
  status: tacticStatusEnum("status").notNull().default("proposed"),
  requiresHumanApproval: boolean("requires_human_approval")
    .notNull()
    .default(false),
  humanDecision: decisionEnum("human_decision"),
  uncertaintyNotes: text("uncertainty_notes"),
  attemptCount: integer("attempt_count").notNull().default(0),
  maxAttempts: integer("max_attempts").notNull().default(3),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const approvals = pgTable("approvals", {
  id: uuid("id").primaryKey().defaultRandom(),
  tacticId: uuid("tactic_id")
    .notNull()
    .references(() => tactics.id, { onDelete: "cascade" }),
  decision: decisionEnum("decision").notNull(),
  notes: text("notes"),
  decidedBy: uuid("decided_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  parentType: text("parent_type").notNull(), // 'strategy' | 'tactic'
  parentId: uuid("parent_id").notNull(),
  authorType: authorTypeEnum("author_type").notNull(),
  authorId: uuid("author_id").notNull(),
  authorName: text("author_name").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
