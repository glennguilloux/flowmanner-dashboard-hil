# Mission Control Port — Comprehensive Spec

> **TL;DR:** This document is the authoritative specification for porting Mission Control's
> AI-agent-management concepts into the FlowManner HIL Dashboard. It covers all 32
> non-Field-Ops feature gaps, provides complete Drizzle schema code blocks, Qwen3 prompt
> sections for every phase, and cross-references the EXIT-AUDIT roadmap to prevent
> duplication of already-built features.

---

## Context

**Mission Control** (`mission-control/`) is a reference Next.js 15 application that stores
all data in local JSON files. It has rich AI-agent-management patterns: agent registry with
roles and instructions, goals/projects hierarchy, brain dump triage, decision log, skills
library, Eisenhower matrix prioritization, and task dependencies.

**The FlowManner HIL Dashboard** (`/`) is the production target — a Next.js 16 + React 19 +
Drizzle ORM + Postgres operational dashboard for human-in-the-loop agent supervision. It
already has 7 pages, 18 API routes, 6 DB tables, 38 components, and 22 lib files.

**This document specifies how to port MC's concepts into the dashboard using Postgres.**
All new data lives in the `hil_ops` Postgres schema. Mission Control source files are
read-only reference — never modified.

---

## Hard Constraints

> **These are non-negotiable. Violating any constraint invalidates the deliverable.**

- **All data in `hil_ops` Postgres schema** — never JSON files, never `public` schema (FM-owned)
- **Use `pnpm db:push`** (Drizzle push mode) — never raw SQL migration files, never alembic
- **Homelab Qwen3 LLM only** (`:11434/v1/chat/completions`) — no external LLM providers (OpenAI, Anthropic, Google, etc.)
- **No new npm dependencies** — existing stack only (Next.js 16, React 19, Drizzle 0.45, Tailwind 4, lucide-react, date-fns)
- **All new panels are React Server Components (RSC)** — client components only for interactivity (forms, toggles, modals, polling)
- **Do NOT touch `/opt/flowmanner/backend/`** or `/opt/flowmanner/config/`
- **Do NOT edit `mission-control/` source files** — read-only reference
- **Field Ops is OUT OF SCOPE** — no vault, service catalog, spend limits, or external action execution

---

## Pre-flight: Already Built

> **Critical anti-duplication inventory.** The following features already exist in the
> dashboard. Do NOT rebuild them.

| Feature | Files | Notes |
|---------|-------|-------|
| **Hermes ACP integration** | `src/lib/hermes-acp.ts`, `src/components/hermes-agents-panel.tsx`, `src/components/hermes-approval-panel.tsx` | ACP client, agent monitoring, approval panel |
| **OpenCode telemetry** | `src/lib/opencode.ts`, `src/components/opencode-panel.tsx` | Session telemetry from OpenCode SQLite |
| **Hermes HITL approval gates** | `src/components/hermes-approval-panel.tsx`, `src/components/hermes-resolved-list.tsx` | Human-in-the-loop approval via ACP |
| **Model swap** | `src/components/model-swap-panel.tsx`, `src/components/model-quick-swap.tsx`, `src/app/api/models/` | Daemon proxy, health polling, sidebar chip |
| **System health** | `src/lib/system-health.ts`, `src/components/system-health-panel.tsx` | 5 services, parallel pings, latency |
| **Activity timeline** | `src/lib/activity-timeline.ts`, `src/components/activity-timeline-panel.tsx` | Approvals + tactics + missions merged |
| **WG watchdog** | `src/lib/wg-watchdog.ts`, `src/components/wg-watchdog-panel.tsx`, `src/components/wg-watchdog-chip.tsx` | SSH toggle, audit trail |
| **Executive briefing** | `src/lib/briefing.ts`, `src/components/executive-briefing.tsx` | Homelab LLM or OpenRouter BYOK |
| **Background LLM reviewer** | `src/lib/review.ts`, `src/app/api/review/score/[id]/route.ts`, `src/app/api/review/score/batch/route.ts` | Single + batch scoring via Qwen3 |
| **Existing strategies table** | `hil_ops.strategies` | Linked to FM missions via `missionId` |
| **Existing tactics table** | `hil_ops.tactics` | The core table — PRs, inbox, simulated |
| **Existing approvals table** | `hil_ops.approvals` | Already serves as decision log data |
| **Kanban board** | `src/app/kanban/page.tsx` | Read-only by design (FM owns writes) |
| **Keyboard shortcuts** | `src/components/keyboard-help.tsx` | `?` help, `t` theme, `g+{page}` nav, `r` refresh |
| **Dark theme** | Class-based, `@custom-variant dark` | localStorage + system pref |

See `docs/EXIT-AUDIT-2026-07-02.md` §1–2 for the complete feature inventory.

---

## Goals vs Strategies Clarification

> **This hierarchy is critical to understand before building.**

| Layer | Definition | Status |
|-------|-----------|--------|
| **Goals** | Long-term strategic objectives ("Ship FlowManner v2", "Reach 100 users") | **NEW — Phase 1** |
| **Strategies** | Execution plans linked to FM missions | Already exist in `hil_ops.strategies` |
| **Tactics** | Individual agent actions (PRs, inbox, simulated) | Already exist in `hil_ops.tactics` |

**Hierarchy: Goals → Strategies → Tactics**

Goals are a **new layer ABOVE** existing strategies. A strategy can optionally link to a
goal via a new `goalId` FK column. This is conceptually different from Mission Control's
flat task→goal linking — the dashboard adds a proper hierarchy layer.

---

## Design Conventions

> **All new components must match existing code exactly.**

| Convention | Specification |
|-----------|---------------|
| **Panel class** | `rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 p-6 shadow-sm` |
| **Color palette** | indigo (primary), emerald (success), amber (warning), rose (danger), sky (info), slate (neutral) |
| **Dark mode** | `@custom-variant dark (&:where(.dark, .dark *))` — class-based, all new components need `dark:` variants |
| **Icons** | `lucide-react` exclusively (no other icon libraries) |
| **Timestamps** | `date-fns/formatDistanceToNow` with `addSuffix: true`, plus `title` attribute with absolute ISO time |
| **Server components** | async RSCs for data-fetching panels. Client components (`"use client"`) only for forms, toggles, modals, polling |
| **Error handling** | `<SectionErrorBoundary>` wraps each panel. API routes return `{ ok: boolean, error?: string, data?: T }` |
| **Loading states** | `<Suspense>` boundaries with `<SkeletonCard>` fallbacks |
| **Typography** | `text-slate-950 dark:text-slate-50` for headings, `text-slate-600 dark:text-slate-400` for body |
| **Nav items** | Added to `nav` array in `src/components/sidebar.tsx` with lucide icon + href + label |

**Canonical panel pattern:** See `src/components/system-health-panel.tsx` — it demonstrates
the panel class, dark mode variants, lucide icons, RSC-compatible structure, and error
boundary wrapping.

**Nav array pattern:**
```ts
// In src/components/sidebar.tsx
const nav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/strategies", label: "Strategies", icon: Target },
  // ... add new items here
];
```

---

## Feature Comparison

> **32 non-Field-Ops features** compared between Mission Control and the HIL Dashboard.

| MC Feature | MC Source | HIL Dashboard Status | Port Decision | Phase # |
|-----------|-----------|---------------------|---------------|---------|
| **Goals** (hierarchy, milestones, types, timeframe) | `goals.json` | Missing | BUILD | 1 |
| **Projects** (color, team, tags, status) | `projects.json` | Missing | BUILD | 1 |
| **Brain Dump** (capture, triage, tags, conversion) | `brain-dump.json` | Missing | BUILD | 2 |
| **Decision Log** (standalone view) | `decisions.json` | Data exists in `hil_ops.approvals`, no browse view | BUILD | 3 |
| **Activity Log** (typed events) | `activity-log.json` | Partial — `activity-timeline.ts` exists but limited event types | BUILD | 3 |
| **Skills Library** (content, agentIds, tags) | `skills-library.json` | Missing | BUILD | 4 |
| **Agent Registry** (instructions, capabilities, status, icon) | `agents.json` | `hil_ops.agents` exists but no management UI, missing fields | BUILD | 5 |
| **Multi-Agent Tasks** (collaborators) | `tasks.json` → `collaborators` | Missing | BUILD | 5 |
| **Eisenhower Matrix** (Do/Schedule/Delegate/Eliminate) | `tasks.json` → importance/urgency | Missing | BUILD | 6 |
| **Task Dependencies** (blockedBy) | `tasks.json` → `blockedBy` | Missing | BUILD | 7 |
| **Subtasks & Daily Actions** | `tasks.json` → `subtasks`, `dailyActions` | Missing | BUILD | 7 |
| **Acceptance Criteria** | `tasks.json` → `acceptanceCriteria` | Missing | BUILD | 7 |
| **Time Tracking** (estimated/actual minutes) | `tasks.json` → `estimatedMinutes`, `actualMinutes` | Missing | BUILD | 7 |
| **Loop Detection** (3-attempt escalation) | Daemon logic | Partial — `attemptCount`/`maxAttempts` exist on tactics, no auto-escalation | PARTIAL | 8 |
| **Cost & Token Tracking** | N/A | Missing | BUILD | 9 |
| **Cmd+K Global Search** | UI feature | Missing | BUILD | 10 |
| **API Pagination** (limit/offset/meta) | API feature | Missing | BUILD | 11 |
| **In-App Guide** | N/A | Missing | BUILD | 11 |
| **Ventures** | `goals.json` with business tags | Maps to Goals with category tag | MAP | 1 |
| **Continuous Missions** (auto-dispatch, dependency chains) | Daemon logic | Hermes handles scheduling | DEFER | — |
| **Session Resilience** (auto-respawn) | Daemon logic | Hermes manages sessions | DEFER | — |
| **Token-Optimized API** (sparse fields) | API feature | Low value for internal dashboard | DEFER | — |
| **Checkpoints** | Filesystem concept | Homelab filesystem concern, not dashboard | DEFER | — |
| **Autopilot Dashboard** | Daemon UI | Hermes monitoring panel covers this | DEFER | — |
| **Templates** | N/A | Needs use case first | DEFER | — |
| **Emergency Stop** | Security feature | Security-critical, needs Hermes integration | DEFER | — |
| **Slash Commands** | CLI concept | Terminal/CLI UX, not dashboard UI | DEFER | — |
| **Inbox Auto-Respond** | Agent comm | Hermes handles agent communication | DEFER | — |
| **AI Context Generation** | `ai-context.md` | Dashboard has executive briefing instead | DEFER | — |
| **Kanban Board** | `tasks.json` + UI | **ALREADY BUILT** — read-only by design (FM owns writes) | — | — |
| **Daemon** | `scripts/daemon/` | **N/A** — Hermes is the daemon equivalent | — | — |
| **Mission System** | FM backend | **ALREADY BUILT** — dashboard reads `public.missions` from FM | — | — |

### Deferred Features — Rationale

| Feature | Why Deferred |
|---------|-------------|
| Continuous Missions | Hermes handles auto-dispatch, dependency chains, and parallel agent scheduling. Dashboard only READS mission state. |
| Session Resilience | Hermes manages agent session lifecycle, auto-respawn, and recovery. |
| Token-Optimized API | Low value for an internal dashboard — full payloads are fine on a local network. |
| Checkpoints | Homelab filesystem concern — not a dashboard responsibility. |
| Autopilot Dashboard | Hermes monitoring panel (`hermes-agents-panel.tsx`) already covers agent status. |
| Templates | Needs a concrete use case before building — no current demand. |
| Emergency Stop | Security-critical feature that needs Hermes kill-signal integration first. |
| Slash Commands | CLI/terminal concept — not applicable to a web dashboard UI. |
| Inbox Auto-Respond | Hermes handles inter-agent communication via ACP. |
| AI Context Generation | The dashboard's executive briefing (`src/lib/briefing.ts`) serves this purpose. |

### Excluded: Field Ops

Field Ops (vault, circuit breaker, service catalog, spend limits, external action execution)
is **permanently out of scope** for the HIL Dashboard. It requires external service
integrations, credential management, and security infrastructure that are beyond the
dashboard's operational monitoring mandate.

---

## Database Schema

> **All new tables use the `hilOps` pattern from `src/db/schema.ts`.**
> Deploy with `pnpm db:push` — never raw SQL migrations.

### New Enums

> **Note:** Add `numeric` and `primaryKey` to the existing import from `drizzle-orm/pg-core`
> in `src/db/schema.ts` before adding any of the code below.

```typescript
// Add to src/db/schema.ts

export const goalType = hilOps.enum("goal_type", ["long-term", "medium-term"]);

export const goalStatus = hilOps.enum("goal_status", [
  "active",
  "completed",
  "archived",
]);

export const goalCategory = hilOps.enum("goal_category", [
  "do",
  "schedule",
  "delegate",
  "eliminate",
  "general",
]);

export const projectStatus = hilOps.enum("project_status", [
  "active",
  "paused",
  "completed",
  "archived",
]);

export const projectPriority = hilOps.enum("project_priority", [
  "critical",
  "high",
  "medium",
  "low",
]);

export const brainDumpSource = hilOps.enum("brain_dump_source", [
  "manual",
  "voice",
  "slack",
  "email",
]);

export const brainDumpStatus = hilOps.enum("brain_dump_status", [
  "pending",
  "triaged",
  "converted",
  "dismissed",
]);

export const brainDumpConvertType = hilOps.enum("brain_dump_convert_type", [
  "tactic",
  "goal",
  "project",
]);

export const llmUsageSource = hilOps.enum("llm_usage_source", [
  "briefing",
  "review",
  "triage",
  "other",
]);

export const importanceLevel = hilOps.enum("importance_level", [
  "important",
  "not-important",
]);

export const urgencyLevel = hilOps.enum("urgency_level", [
  "urgent",
  "not-urgent",
]);
```

---

### `hil_ops.goals`

**Purpose:** Long-term strategic objectives and milestones. Goals sit ABOVE strategies in
the hierarchy. A goal can have child milestones via `parentGoalId` (self-referencing FK).

```typescript
export const goals = hilOps.table(
  "goals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    type: goalType("type").notNull().default("medium-term"),
    category: goalCategory("category").notNull().default("general"),
    status: goalStatus("status").notNull().default("active"),
    timeframe: text("timeframe"), // "Q3 2026" or ISO date string
    parentGoalId: uuid("parent_goal_id"), // self-FK for milestone hierarchy
    targetDate: timestamp("target_date", { withTimezone: true }),
    progress: integer("progress").notNull().default(0), // 0-100
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    parentGoalIdx: index("goals_parent_goal_id_idx").on(table.parentGoalId),
    statusUpdatedIdx: index("goals_status_updated_at_idx").on(
      table.status,
      table.updatedAt,
    ),
  }),
);
```

**Indexes:**
- `status + updatedAt` — dashboard ordering (active goals sorted by recency)
- `parentGoalId` — milestone lookup under a parent goal

**Seed data:** 3 goals (1 long-term with 2 milestones, 1 medium-term, 1 completed).

**Rollback:** `DROP TABLE hil_ops.goals; DROP TYPE hil_ops.goal_type; DROP TYPE hil_ops.goal_status; DROP TYPE hil_ops.goal_category;`

---

### `hil_ops.projects`

**Purpose:** Projects belong to goals. They represent concrete workstreams with visual
color coding and tag-based filtering.

```typescript
export const projects = hilOps.table(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    goalId: uuid("goal_id").references(() => goals.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    status: projectStatus("status").notNull().default("active"),
    priority: projectPriority("priority").notNull().default("medium"),
    color: text("color").notNull().default("#6366f1"), // hex color for UI
    tags: text("tags").array().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    goalIdx: index("projects_goal_id_idx").on(table.goalId),
    statusIdx: index("projects_status_idx").on(table.status),
  }),
);
```

**Indexes:**
- `goalId` — project list under a goal
- `status` — filter active/paused/completed projects

**Seed data:** 3 projects across different goals.

**Rollback:** `DROP TABLE hil_ops.projects; DROP TYPE hil_ops.project_status; DROP TYPE hil_ops.project_priority;`

---

### `hil_ops.brain_dump`

**Purpose:** Quick-capture ideas that get triaged by the homelab LLM. Entries start as
`pending`, get classified as actionable (→ tactic/goal) or not (→ dismissed).

```typescript
export const brainDump = hilOps.table(
  "brain_dump",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    content: text("content").notNull(),
    source: brainDumpSource("source").notNull().default("manual"),
    status: brainDumpStatus("status").notNull().default("pending"),
    convertedToId: uuid("converted_to_id"), // FK to tactics/goals/projects
    convertedToType: brainDumpConvertType("converted_to_type"),
    triageSummary: text("triage_summary"), // LLM output
    tags: text("tags").array().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    statusIdx: index("brain_dump_status_idx").on(table.status),
  }),
);
```

**Indexes:**
- `status` — filter pending entries for triage

**Seed data:** 5 entries (3 pending, 1 triaged, 1 converted).

**Rollback:** `DROP TABLE hil_ops.brain_dump; DROP TYPE hil_ops.brain_dump_source; DROP TYPE hil_ops.brain_dump_status; DROP TYPE hil_ops.brain_dump_convert_type;`

---

### `hil_ops.skills`

**Purpose:** Reusable skill definitions (markdown content) that can be linked to agents.
Content is injected into agent prompts when the skill is active.

```typescript
export const skills = hilOps.table("skills", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  description: text("description").notNull().default(""),
  content: text("content").notNull().default(""), // markdown for agent prompts
  tags: text("tags").array().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
```

**Indexes:**
- `name` — unique constraint (implicit index)

**Seed data:** 4 skills (Web Research, Eisenhower Triage, Task Management, Code Review).

**Rollback:** `DROP TABLE hil_ops.skills;`

---

### `hil_ops.agent_skills`

**Purpose:** Join table for many-to-many relationship between agents and skills.

```typescript
export const agentSkills = hilOps.table(
  "agent_skills",
  {
    agentId: uuid("agent_id")
      .notNull()
      .references(() => agents.id, { onDelete: "cascade" }),
    skillId: uuid("skill_id")
      .notNull()
      .references(() => skills.id, { onDelete: "cascade" }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.agentId, table.skillId] }),
    skillIdx: index("agent_skills_skill_id_idx").on(table.skillId),
  }),
);
```

**Indexes:**
- `agentId + skillId` — composite lookup
- `skillId` — reverse lookup (which agents have this skill?)

**Seed data:** Link existing agents to skills.

**Rollback:** `DROP TABLE hil_ops.agent_skills;`

---

### `hil_ops.tactic_dependencies`

**Purpose:** Join table for task dependency graph. `blockerId` must complete before
`blockedId` can proceed. Cycle detection is implemented in the API route (DFS check
before insert).

```typescript
export const tacticDependencies = hilOps.table(
  "tactic_dependencies",
  {
    blockerId: uuid("blocker_id")
      .notNull()
      .references(() => tactics.id, { onDelete: "cascade" }),
    blockedId: uuid("blocked_id")
      .notNull()
      .references(() => tactics.id, { onDelete: "cascade" }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.blockerId, table.blockedId] }),
    blockedIdx: index("tactic_deps_blocked_id_idx").on(table.blockedId),
  }),
);
```

**Indexes:**
- `blockerId + blockedId` — composite lookup
- `blockedId` — "what blocks this tactic?" queries

**Cycle detection:** Before inserting (A blockedBy B), the API route traverses B's
dependency chain via DFS. If A appears in the chain, reject with 409 Conflict.

**Seed data:** Add 2-3 dependency relationships between existing demo tactics.

**Rollback:** `DROP TABLE hil_ops.tactic_dependencies;`

---

### `hil_ops.tactic_subtasks`

**Purpose:** Checkable sub-items under a tactic. Ordered by `order` field.

```typescript
export const tacticSubtasks = hilOps.table(
  "tactic_subtasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tacticId: uuid("tactic_id")
      .notNull()
      .references(() => tactics.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    done: boolean("done").notNull().default(false),
    order: integer("order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    tacticIdx: index("tactic_subtasks_tactic_id_idx").on(table.tacticId),
  }),
);
```

**Indexes:**
- `tacticId` — subtask list under a tactic

**Seed data:** Add 2-3 subtasks to existing demo tactics.

**Rollback:** `DROP TABLE hil_ops.tactic_subtasks;`

---

### `hil_ops.llm_usage`

**Purpose:** Track LLM token consumption across all dashboard features (briefing, review,
triage). Enables cost monitoring and usage analytics.

```typescript
export const llmUsage = hilOps.table(
  "llm_usage",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    model: text("model").notNull(),
    inputTokens: integer("input_tokens").notNull(),
    outputTokens: integer("output_tokens").notNull(),
    cacheReadTokens: integer("cache_read_tokens").notNull().default(0),
    cacheCreationTokens: integer("cache_creation_tokens").notNull().default(0),
    costUsd: numeric("cost_usd", { precision: 10, scale: 4 }), // null for self-hosted
    source: llmUsageSource("source").notNull().default("other"),
    tacticId: uuid("tactic_id").references(() => tactics.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    createdAtIdx: index("llm_usage_created_at_idx").on(table.createdAt),
    modelCreatedIdx: index("llm_usage_model_created_at_idx").on(
      table.model,
      table.createdAt,
    ),
  }),
);
```

**Indexes:**
- `createdAt` — time-series queries (tokens by day/week)
- `model + createdAt` — per-model usage breakdown

**Seed data:** 100 rows across 7 days, 2 models.

**Rollback:** `DROP TABLE hil_ops.llm_usage; DROP TYPE hil_ops.llm_usage_source;`

---

### Modifications to Existing Tables

#### `hil_ops.agents` — ADD columns

```typescript
// Add these columns to the existing agents table definition:
instructions: text("instructions"),        // full system prompt (markdown)
capabilities: text("capabilities").array().notNull().default([]), // what this agent can do
status: text("status").notNull().default("active"), // active | inactive
icon: text("icon"),                        // lucide icon name (e.g. "Brain")
description: text("description"),          // what this agent handles
```

These are additive changes — `pnpm db:push` will add columns without dropping existing data.
Existing agents get default values (`instructions=null`, `capabilities=[]`, `status='active'`).

#### `hil_ops.tactics` — ADD columns

```typescript
// Add these columns to the existing tactics table definition:
goalId: uuid("goal_id").references(() => goals.id, { onDelete: "set null" }),
estimatedMinutes: integer("estimated_minutes"),
actualMinutes: integer("actual_minutes"),
acceptanceCriteria: text("acceptance_criteria").array().notNull().default([]),
importance: importanceLevel("importance"),
urgency: urgencyLevel("urgency"),
collaborators: text("collaborators").array().notNull().default([]), // agent IDs
```

#### `hil_ops.strategies` — ADD column

```typescript
// Add this column to the existing strategies table definition:
goalId: uuid("goal_id").references(() => goals.id, { onDelete: "set null" }),
```

Links strategies to goals, completing the Goals → Strategies → Tactics hierarchy.

---

## Phase 1 — Goals & Projects

### Objective

Add a strategic goals layer above the existing tactics/strategies system. Goals represent
long-term objectives; projects are concrete workstreams under goals. This fills the
"why are we doing this?" gap in the dashboard.

### New Files

| File | Purpose |
|------|---------|
| `src/lib/goals.ts` | Query functions: `getGoals()`, `getActiveGoals()`, `createGoal()`, `updateGoal()`, `deleteGoal()`, `getProjectsByGoal()`, `createProject()` |
| `src/app/goals/page.tsx` | Full goals list page (RSC). Grouped by status, expandable projects. |
| `src/app/api/goals/route.ts` | `GET` — list goals with project counts. `POST` — create a goal. |
| `src/app/api/goals/[id]/route.ts` | `PATCH` — update goal. `DELETE` — remove goal. |
| `src/app/api/goals/[id]/projects/route.ts` | `GET` — list projects. `POST` — create project. |
| `src/components/goals-panel.tsx` | Dashboard card (RSC). Top 3 active goals with progress bars. |
| `src/components/goal-progress-bar.tsx` | Reusable progress bar (0-100, color-coded: <30 rose, <70 amber, >=70 emerald). |
| `src/components/goal-detail-panel.tsx` | Goal detail with linked strategies, tactics, and projects. |

### Modified Files

| File | Change |
|------|--------|
| `src/db/schema.ts` | Add `goalType`, `goalStatus`, `goalCategory` enums + `goals` + `projects` tables + columns on `tactics`, `strategies` |
| `src/app/page.tsx` | Add `<GoalsPanel>` in right sidebar, after System Health |
| `src/components/sidebar.tsx` | Add `{ href: "/goals", label: "Goals", icon: Target }` to nav array |
| `src/lib/data.ts` | Add `activeGoals: await getActiveGoals()` to `getDashboardData()` |
| `src/db/seed.ts` | Add sample goals + projects |

### Schema Reference

See Database Schema §`hil_ops.goals`, §`hil_ops.projects`.

### API Routes

| Method | Path | Request Body | Response |
|--------|------|-------------|----------|
| `GET` | `/api/goals` | — | `{ ok: true, data: Goal[] }` |
| `POST` | `/api/goals` | `{ title, description?, type?, category?, timeframe?, targetDate? }` | `{ ok: true, data: Goal }` |
| `PATCH` | `/api/goals/[id]` | `{ title?, description?, status?, progress?, category? }` | `{ ok: true, data: Goal }` |
| `DELETE` | `/api/goals/[id]` | — | `{ ok: true }` |
| `GET` | `/api/goals/[id]/projects` | — | `{ ok: true, data: Project[] }` |
| `POST` | `/api/goals/[id]/projects` | `{ title, description?, priority?, color?, tags? }` | `{ ok: true, data: Project }` |

### Components

| Component | Type | Props |
|-----------|------|-------|
| `GoalsPanel` | RSC | `goals: Goal[]` — dashboard card, top 3 active goals + progress |
| `GoalProgressBar` | RSC | `progress: number` — reusable, color-coded |
| `GoalDetailPanel` | RSC | `goal: Goal, projects: Project[], strategies: Strategy[]` |

### Sidebar Nav

```typescript
{ href: "/goals", label: "Goals", icon: Target }
```

### Dashboard Integration

Add to `getDashboardData()` return type and body:
```typescript
// In the return type, add:
activeGoals: Awaited<ReturnType<typeof getActiveGoals>>;

// In the Promise.all, add:
getActiveGoals(),

// In the return, add:
activeGoals,
```

Add to `page.tsx` right sidebar:
```tsx
<SectionErrorBoundary label="Goals">
  <GoalsPanel goals={data.activeGoals} />
</SectionErrorBoundary>
```

### Goal Hierarchy

`parentGoalId` enables milestones under long-term goals:
- A long-term goal ("Ship FlowManner v2") can have milestone children ("Complete auth", "Launch beta")
- Milestones are goals with `type: "medium-term"` and `parentGoalId` pointing to the parent
- The goals page shows milestones nested under their parent with indent

### Eisenhower Integration

The `category` field on goals maps to Eisenhower quadrants:
- `do` — important + urgent
- `schedule` — important + not-urgent
- `delegate` — not-important + urgent
- `eliminate` — not-important + not-urgent
- `general` — uncategorized

### Seed Data

- 3 goals: 1 long-term with 2 milestones, 1 medium-term, 1 completed
- 3 projects distributed across goals
- Idempotent upsert via `ON CONFLICT (id) DO UPDATE`

### Rollback

```sql
DROP TABLE IF EXISTS hil_ops.projects;
DROP TABLE IF EXISTS hil_ops.goals;
-- Then remove new columns from tactics/strategies via pnpm db:push after schema revert
-- Remove files: src/lib/goals.ts, src/app/goals/, src/components/goals-panel.tsx, etc.
-- Remove nav item from sidebar.tsx
```

### Verification

```bash
pnpm typecheck && pnpm lint
pnpm db:push  # verify schema changes applied to hil_ops only
pnpm seed     # verify seed data inserted
pnpm dev      # browser test: /goals page, Goals panel on dashboard
```

---

## Phase 2 — Brain Dump & Triage

### Objective

Port MC's brain-dump-to-task pipeline. A quick-capture panel on the dashboard for
raw ideas, with LLM-powered triage to classify entries as actionable (→ create tactic/goal)
or not (→ dismiss).

### New Files

| File | Purpose |
|------|---------|
| `src/lib/brain-dump.ts` | CRUD + LLM triage logic |
| `src/app/brain-dump/page.tsx` | Full brain dump list page (RSC) with quick-add input |
| `src/app/api/brain-dump/route.ts` | `GET` — list entries. `POST` — create entry. |
| `src/app/api/brain-dump/triage/route.ts` | `POST` — run LLM triage on pending entries |
| `src/components/brain-dump-panel.tsx` | Dashboard card (RSC), top 5 pending entries + input |
| `src/components/brain-dump-triage-button.tsx` | "Triage with LLM" button (client component) |

### Modified Files

| File | Change |
|------|--------|
| `src/db/schema.ts` | Add `brainDumpSource`, `brainDumpStatus`, `brainDumpConvertType` enums + `brain_dump` table |
| `src/app/page.tsx` | Add `<BrainDumpPanel>` in right sidebar |
| `src/components/sidebar.tsx` | Add `{ href: "/brain-dump", label: "Brain Dump", icon: Lightbulb }` |
| `src/lib/data.ts` | Add `brainDumpPending: await countPendingBrainDump()` |
| `src/db/seed.ts` | Add sample brain dump entries |

### Schema Reference

See Database Schema §`hil_ops.brain_dump`.

### API Routes

| Method | Path | Request Body | Response |
|--------|------|-------------|----------|
| `GET` | `/api/brain-dump` | — | `{ ok: true, data: BrainDumpEntry[] }` |
| `POST` | `/api/brain-dump` | `{ content, source?, tags? }` | `{ ok: true, data: BrainDumpEntry }` |
| `POST` | `/api/brain-dump/triage` | — | `{ ok: true, data: { processed: number, converted: number, dismissed: number } }` |

### Components

| Component | Type | Props |
|-----------|------|-------|
| `BrainDumpPanel` | RSC | `entries: BrainDumpEntry[], pendingCount: number` — dashboard card |
| `BrainDumpTriageButton` | Client | `onTriage: () => void` — triggers triage API call |

### Sidebar Nav

```typescript
{ href: "/brain-dump", label: "Brain Dump", icon: Lightbulb }
```

### Triage Flow

1. User types a thought into the Brain Dump panel input
2. Entry saved with status `pending`
3. "Triage with LLM" button calls `POST /api/brain-dump/triage`
4. Server sends pending entries to homelab LLM (`:11434/v1/chat/completions`)
5. LLM returns classification: actionable → create tactic/goal, not-actionable → dismiss
6. New tactics/goals created, brain dump entries marked `converted` or `dismissed`
7. User sees: "3 entries → 2 tactics created, 1 dismissed"

### LLM Integration

- **Endpoint:** `POST http://localhost:11434/v1/chat/completions`
- **Model:** active model on homelab (check via model manager)
- **Temperature:** 0.3
- **Max tokens:** 2000
- **Timeout:** 30s via `AbortSignal.timeout(30_000)`
- **Fallback:** If LLM unreachable, entries stay `pending`, show toast "LLM unreachable"
- **Conversion limit:** Maximum 5 conversions per triage run to prevent runaway
- **JSON validation:** Parse LLM output as JSON. If invalid, retry once. If still invalid, mark entries as `triage_error`.

### Seed Data

- 5 entries: 3 pending, 1 triaged (with reasoning), 1 converted (linked to tactic)

### Rollback

```sql
DROP TABLE IF EXISTS hil_ops.brain_dump;
-- Remove files, nav item, dashboard panel
```

### Verification

```bash
pnpm typecheck && pnpm lint
pnpm dev  # browser test: /brain-dump page, Brain Dump panel, triage button
# Test triage with LLM running
# Test triage degradation with LLM stopped
```

---

## Phase 3 — Decision Log (Standalone View) + Activity Log Extension

### Objective

The dashboard already has `hil_ops.approvals` with full decision data. Phase 3 adds a
dedicated browse view and extends the activity timeline with more event types.

### New Files

| File | Purpose |
|------|---------|
| `src/app/decisions/page.tsx` | Full decision log (RSC), filterable by agent, tactic, date range |
| `src/app/api/decisions/route.ts` | `GET` — paginated decisions (joins tactics + agents + strategies) |
| `src/components/decision-log-panel.tsx` | Dashboard card (RSC), last 5 decisions |
| `src/components/decision-detail.tsx` | Expandable row with reasoning + linked messages |

### Modified Files

| File | Change |
|------|--------|
| `src/app/page.tsx` | Add `<DecisionLogPanel>` in right sidebar |
| `src/components/sidebar.tsx` | Add `{ href: "/decisions", label: "Decisions", icon: Scale }` |
| `src/lib/data.ts` | Add `recentDecisions: await getRecentDecisions()` |
| `src/lib/activity-timeline.ts` | Extend event types: `task_created`, `task_delegated`, `brain_dump_triaged`, `goal_completed`, `decision_requested` |

### Schema Reference

No new tables — reuses `hil_ops.approvals` (existing).

### API Routes

| Method | Path | Request Body | Response |
|--------|------|-------------|----------|
| `GET` | `/api/decisions` | `?limit=N&offset=M&agentId=X&tacticId=Y` | `{ ok: true, data: DecisionLogEntry[], meta: { total, returned } }` |

### Components

| Component | Type | Props |
|-----------|------|-------|
| `DecisionLogPanel` | RSC | `decisions: DecisionLogEntry[]` — dashboard card, last 5 |
| `DecisionDetail` | Client | `decision: DecisionLogEntry` — expandable row |

### Sidebar Nav

```typescript
{ href: "/decisions", label: "Decisions", icon: Scale }
```

### Dedup Strategy

Show LATEST decision per tactic by default, with toggle to show all attempts.

### Activity Log Extension

Extend `src/lib/activity-timeline.ts` to include additional event types from the
brain dump triage and goal completion flows. This enhances the existing timeline
without requiring a new table.

### Seed Data

No new data needed — uses existing approvals from `hil_ops.approvals`.

### Rollback

No schema changes to revert. Remove files, nav item, and dashboard panel:
```bash
rm src/app/decisions/page.tsx src/app/api/decisions/route.ts
rm src/components/decision-log-panel.tsx src/components/decision-detail.tsx
# Remove nav entry from sidebar.tsx
# Remove DecisionLogPanel from page.tsx
```

### Verification

```bash
pnpm typecheck && pnpm lint
pnpm dev  # browser test: /decisions page, Decision Log panel, expandable rows
```

---

## Phase 4 — Skills Library

### Objective

Port MC's skills-library concept. Agents have capabilities defined as markdown content
that can be injected into agent prompts. This provides a local fallback for when
Hermes ACP is unreachable.

### New Files

| File | Purpose |
|------|---------|
| `src/lib/skills.ts` | CRUD queries for skills + agent linking |
| `src/app/skills/page.tsx` | Skills browser page (RSC) with card grid |
| `src/app/api/skills/route.ts` | `GET` — list skills. `POST` — create skill. |
| `src/app/api/skills/[id]/route.ts` | `PATCH` — update skill. `DELETE` — remove skill. |
| `src/app/api/skills/[id]/agents/route.ts` | `POST` — link skill to agent. `DELETE` — unlink. |
| `src/components/skills-panel.tsx` | Dashboard card (RSC), skill count + top 3 |
| `src/components/skill-card.tsx` | Reusable skill card with name, description, tags, linked agents |

### Modified Files

| File | Change |
|------|--------|
| `src/db/schema.ts` | Add `skills` + `agent_skills` tables |
| `src/app/page.tsx` | Add `<SkillsPanel>` to dashboard |
| `src/components/sidebar.tsx` | Add `{ href: "/skills", label: "Skills", icon: Wrench }` |
| `src/lib/data.ts` | Add `skillCount: await countSkills()` |
| `src/db/seed.ts` | Add sample skills |

### Schema Reference

See Database Schema §`hil_ops.skills`, §`hil_ops.agent_skills`.

### API Routes

| Method | Path | Request Body | Response |
|--------|------|-------------|----------|
| `GET` | `/api/skills` | — | `{ ok: true, data: Skill[] }` |
| `POST` | `/api/skills` | `{ name, description?, content?, tags? }` | `{ ok: true, data: Skill }` |
| `PATCH` | `/api/skills/[id]` | `{ name?, description?, content?, tags? }` | `{ ok: true, data: Skill }` |
| `DELETE` | `/api/skills/[id]` | — | `{ ok: true }` |
| `POST` | `/api/skills/[id]/agents` | `{ agentId }` | `{ ok: true }` |
| `DELETE` | `/api/skills/[id]/agents` | `{ agentId }` | `{ ok: true }` |

### Components

| Component | Type | Props |
|-----------|------|-------|
| `SkillsPanel` | RSC | `skills: Skill[], count: number` — dashboard card |
| `SkillCard` | RSC | `skill: Skill, agents: Agent[]` — browser card |

### Cross-reference

> Hermes ACP already surfaces real agent capabilities at `/api/hermes`. This phase adds
> a local fallback for when Hermes is unreachable. See EXIT-AUDIT §3b.

### Content Injection

The `content` field on skills is markdown that gets injected into agent system prompts
when the skill is active. This follows MC's pattern where skills enhance agent behavior.

### Seed Data

4 skills matching MC's demo: Web Research, Eisenhower Triage, Task Management, Code Review.

### Rollback

```sql
DROP TABLE IF EXISTS hil_ops.agent_skills;
DROP TABLE IF EXISTS hil_ops.skills;
-- Remove files, nav item
```

### Verification

```bash
pnpm typecheck && pnpm lint
pnpm dev  # browser test: /skills page, Skills panel, skill-agent linking
```

---

## Phase 5 — Agent Registry Management

### Objective

Enhance the existing `hil_ops.agents` table with instructions, capabilities, status, icon,
and description fields. Add full CRUD UI. Add multi-agent collaborator support on tactics.

### New Files

| File | Purpose |
|------|---------|
| `src/app/api/agents/[id]/route.ts` | `PATCH` — update agent. `DELETE` — remove agent. (CRUD enhancement) |
| `src/components/agent-editor.tsx` | Form to create/edit agent (client component) |
| `src/components/agent-detail-card.tsx` | View mode for agent registry (RSC) |

### Modified Files

| File | Change |
|------|--------|
| `src/db/schema.ts` | Add `instructions`, `capabilities`, `status`, `icon`, `description` columns to `agents` table. Add `collaborators` to `tactics`. |
| `src/app/agents/page.tsx` | Enhance from list-only to editable registry |
| `src/app/api/agents/route.ts` | Add `POST` for creating agents |
| `src/lib/data.ts` | Update agent queries to include new fields |

### Schema Reference

See Database Schema §modifications to `hil_ops.agents`, `hil_ops.tactics`.

### API Routes

| Method | Path | Request Body | Response |
|--------|------|-------------|----------|
| `GET` | `/api/agents` | — | `{ ok: true, data: Agent[] }` |
| `POST` | `/api/agents` | `{ name, role, instructions?, capabilities?, icon?, description? }` | `{ ok: true, data: Agent }` |
| `PATCH` | `/api/agents/[id]` | `{ name?, role?, instructions?, capabilities?, status?, icon?, description? }` | `{ ok: true, data: Agent }` |
| `DELETE` | `/api/agents/[id]` | — | `{ ok: true }` |

### Components

| Component | Type | Props |
|-----------|------|-------|
| `AgentEditor` | Client | `agent?: Agent, onSave: (agent) => void` — create/edit form |
| `AgentDetailCard` | RSC | `agent: Agent, skills: Skill[]` — view mode with linked skills |

### Cross-reference

> Hermes ACP panel already shows live agent state. This phase adds local CRUD for agent
> metadata as a complement. See EXIT-AUDIT §3b.

### Migration Strategy

Existing agents get default values:
- `instructions` → `null`
- `capabilities` → `[]`
- `status` → `'active'`
- `icon` → `null`
- `description` → `null`

### Multi-Agent Collaborators

Add `collaborators` text array to `hil_ops.tactics`. This stores agent IDs alongside the
existing `agentId` (lead agent). UI shows stacked collaborator avatars on tactic cards.

### Seed Data

Update existing 3 agents with instructions + capabilities.

### Rollback

Remove new columns from `agents` via schema revert + `pnpm db:push`. Remove files.

### Verification

```bash
pnpm typecheck && pnpm lint
pnpm dev  # browser test: /agents page editable, AgentEditor form, collaborator display
```

---

## Phase 6 — Eisenhower Matrix & Task Prioritization

### Objective

Add importance/urgency fields to tactics and build a 4-quadrant Eisenhower Matrix view.
No new tables — uses new columns on `hil_ops.tactics` + `category` on `hil_ops.goals`.

### New Files

| File | Purpose |
|------|---------|
| `src/app/priority-matrix/page.tsx` | 4-quadrant grid view of tactics (RSC) |
| `src/components/eisenhower-matrix-panel.tsx` | Dashboard card (RSC), 4 quadrant counts |
| `src/components/priority-matrix.tsx` | Full page 4-quadrant layout with tactic cards |

### Modified Files

| File | Change |
|------|--------|
| `src/db/schema.ts` | Add `importanceLevel`, `urgencyLevel` enums + columns on `tactics` |
| `src/app/api/tactics/[id]/route.ts` | Add `importance`/`urgency` to PATCH body |
| `src/app/page.tsx` | Add `<EisenhowerMatrixPanel>` to dashboard |
| `src/components/sidebar.tsx` | Add `{ href: "/priority-matrix", label: "Priority Matrix", icon: Grid2x2 }` |
| `src/db/seed.ts` | Assign importance/urgency to existing tactics |

### Schema Reference

See Database Schema §modifications to `hil_ops.tactics` (`importance`, `urgency`).

### API Routes

| Method | Path | Request Body | Response |
|--------|------|-------------|----------|
| `PATCH` | `/api/tactics/[id]` | `{ importance?, urgency? }` | `{ ok: true, data: Tactic }` |

### Quadrant Logic

| | Urgent | Not Urgent |
|---|--------|-----------|
| **Important** | DO — work immediately | SCHEDULE — block time |
| **Not Important** | DELEGATE — assign to agent | ELIMINATE — drop or defer |

### Components

| Component | Type | Props |
|-----------|------|-------|
| `EisenhowerMatrixPanel` | RSC | `counts: { do: number, schedule: number, delegate: number, eliminate: number }` |
| `PriorityMatrix` | RSC | `tactics: Tactic[]` — 4-quadrant grid, click-to-assign buttons |

### Drag & Drop

**No new dependencies.** Use HTML5 drag API (`draggable`, `onDragStart`, `onDrop`) or
click-to-assign quadrant buttons. The existing keyboard shortcut system can also support
`1/2/3/4` keys to move selected tactics between quadrants.

### Sidebar Nav

```typescript
{ href: "/priority-matrix", label: "Priority Matrix", icon: Grid2x2 }
```

### Seed Data

Assign importance/urgency to existing demo tactics.

### Rollback

Remove columns from `tactics` via schema revert. Remove files, nav item.

### Verification

```bash
pnpm typecheck && pnpm lint
pnpm dev  # browser test: /priority-matrix page, quadrant counts on dashboard
```

---

## Phase 7 — Task Dependencies, Subtasks & Acceptance Criteria

### Objective

Add dependency tracking between tactics, checkable subtasks, acceptance criteria, and
time tracking. This is the most feature-dense phase.

### New Files

| File | Purpose |
|------|---------|
| `src/app/api/tactics/[id]/dependencies/route.ts` | `POST` — add blocker. `DELETE` — remove blocker. |
| `src/app/api/tactics/[id]/subtasks/route.ts` | `GET/POST/PATCH/DELETE` — full subtask CRUD |
| `src/components/subtask-list.tsx` | Checkable subtask items (client component) |
| `src/components/dependency-badge.tsx` | Shows blockedBy count with tooltip |
| `src/components/acceptance-criteria-list.tsx` | Display acceptance criteria checklist |
| `src/components/time-tracking-display.tsx` | Estimated vs actual minutes display |

### Modified Files

| File | Change |
|------|--------|
| `src/db/schema.ts` | Add `tactic_dependencies`, `tactic_subtasks` tables + columns on `tactics` |
| `src/app/tactics/[id]/page.tsx` | Add subtasks, dependencies, acceptance criteria, time tracking sections |
| `src/app/api/tactics/[id]/route.ts` | Add `estimatedMinutes`, `actualMinutes`, `acceptanceCriteria` to PATCH body |
| `src/db/seed.ts` | Add subtasks + dependencies to demo tactics |

### Schema Reference

See Database Schema §`hil_ops.tactic_dependencies`, §`hil_ops.tactic_subtasks`,
§modifications to `hil_ops.tactics`.

### API Routes

| Method | Path | Request Body | Response |
|--------|------|-------------|----------|
| `POST` | `/api/tactics/[id]/dependencies` | `{ blockerId }` | `{ ok: true }` (409 if cycle detected) |
| `DELETE` | `/api/tactics/[id]/dependencies` | `{ blockerId }` | `{ ok: true }` |
| `GET` | `/api/tactics/[id]/subtasks` | — | `{ ok: true, data: Subtask[] }` |
| `POST` | `/api/tactics/[id]/subtasks` | `{ title, order? }` | `{ ok: true, data: Subtask }` |
| `PATCH` | `/api/tactics/[id]/subtasks/[subtaskId]` | `{ title?, done?, order? }` | `{ ok: true, data: Subtask }` |
| `DELETE` | `/api/tactics/[id]/subtasks/[subtaskId]` | — | `{ ok: true }` |
| `PATCH` | `/api/tactics/[id]` | `{ estimatedMinutes?, actualMinutes?, acceptanceCriteria? }` | `{ ok: true, data: Tactic }` |

### Cycle Detection

Before inserting a dependency (A blockedBy B):
1. Traverse B's dependency chain via DFS (follow `blockerId` edges)
2. If A appears in the chain, reject with `409 Conflict` and message "Circular dependency detected"
3. If A does not appear, insert the dependency

```typescript
async function wouldCreateCycle(blockerId: string, blockedId: string): Promise<boolean> {
  const visited = new Set<string>();
  const stack = [blockerId];
  while (stack.length > 0) {
    const current = stack.pop()!;
    if (current === blockedId) return true; // cycle!
    if (visited.has(current)) continue;
    visited.add(current);
    // Find what blocks current
    const blockers = await db.select().from(tacticDependencies)
      .where(eq(tacticDependencies.blockedId, current));
    for (const b of blockers) stack.push(b.blockerId);
  }
  return false;
}
```

### Components

| Component | Type | Props |
|-----------|------|-------|
| `SubtaskList` | Client | `tacticId: string, subtasks: Subtask[]` — checkable items |
| `DependencyBadge` | RSC | `blockedByCount: number, blockingCount: number` — badge with tooltip |
| `AcceptanceCriteriaList` | RSC | `criteria: string[]` — checklist display |
| `TimeTrackingDisplay` | RSC | `estimated: number | null, actual: number | null` |

### Seed Data

Add subtasks (2-3 per tactic) and dependencies (2-3 relationships) to existing demo tactics.

### Rollback

```sql
DROP TABLE IF EXISTS hil_ops.tactic_subtasks;
DROP TABLE IF EXISTS hil_ops.tactic_dependencies;
-- Remove columns from tactics
-- Remove files
```

### Verification

```bash
pnpm typecheck && pnpm lint
pnpm dev  # browser test: tactic detail page with subtasks, dependencies, criteria, time
# Test cycle detection: try to create A→B→A, verify 409
```

---

## Phase 8 — Loop Detection & Mission Health Enhancement

### Objective

Enhance the existing `attemptCount`/`maxAttempts` mechanism on tactics with automatic
escalation when attempts are exhausted. No new tables.

### New Files

| File | Purpose |
|------|---------|
| `src/app/api/tactics/[id]/reset-attempts/route.ts` | `POST` — manual reset after human review |
| `src/components/attempt-badge.tsx` | Shows X/max attempts, color-coded |
| `src/components/escalation-notice.tsx` | Banner when max attempts reached |

### Modified Files

| File | Change |
|------|--------|
| `src/app/tactics/[id]/page.tsx` | Add attempt history + escalation badge |
| `src/lib/review.ts` | Add auto-escalation logic: when `attemptCount >= maxAttempts`, set status to `needs_review` |
| `src/db/seed.ts` | Set `attemptCount` on some demo tactics |

### Schema Reference

No new tables. Uses existing `attemptCount`/`maxAttempts` on `hil_ops.tactics`.

### API Routes

| Method | Path | Request Body | Response |
|--------|------|-------------|----------|
| `POST` | `/api/tactics/[id]/reset-attempts` | — | `{ ok: true, data: Tactic }` (resets `attemptCount` to 0) |

### Escalation Logic

When `attemptCount >= maxAttempts`:
1. Auto-set tactic status to `needs_review`
2. Add message to tactic thread: "Escalated: max attempts ({maxAttempts}) reached"
3. Set `requiresHumanApproval = true`
4. Human reviews, then can reset attempts via API

### Components

| Component | Type | Props |
|-----------|------|-------|
| `AttemptBadge` | RSC | `attemptCount: number, maxAttempts: number` — color-coded (green < 50%, amber 50-90%, red >= 90%) |
| `EscalationNotice` | RSC | `tactic: Tactic` — banner with reset button |

### Cross-reference

> Hermes manages session resilience and auto-continuation. This phase adds dashboard-side
> escalation when attempts are exhausted. See EXIT-AUDIT §3b.
>
> Continuous missions (auto-dispatch, dependency chains, parallel agent scheduling) are
> **DEFERRED to Hermes**. The dashboard only READS mission state.

### Seed Data

Set `attemptCount: 2, maxAttempts: 3` on one demo tactic to show escalation.

### Rollback

Remove files. No schema changes to revert.

### Verification

```bash
pnpm typecheck && pnpm lint
pnpm dev  # browser test: attempt badge on tactic detail, escalation notice
# Test: increment attempts to max, verify auto-escalation
```

---

## Phase 9 — Cost & Token Tracking

### Objective

Track LLM token consumption across all dashboard features. Enables usage monitoring and
cost analysis. For self-hosted Qwen3, `costUsd` is null (free to run) but token counts
are valuable for capacity planning.

### New Files

| File | Purpose |
|------|---------|
| `src/lib/usage.ts` | Aggregation queries: tokens by day/week/model/source |
| `src/app/usage/page.tsx` | Usage analytics page (RSC) with charts |
| `src/app/api/usage/route.ts` | `GET` — aggregated usage data |
| `src/components/usage-panel.tsx` | Dashboard card (RSC): tokens today, this week |
| `src/components/usage-chart.tsx` | Simple bar chart using SVG (no chart library) |

### Modified Files

| File | Change |
|------|--------|
| `src/db/schema.ts` | Add `llmUsageSource` enum + `llm_usage` table |
| `src/lib/llm.ts` | Log usage after each `chat()` call |
| `src/lib/review.ts` | Log scoring tokens to `llm_usage` |
| `src/lib/briefing.ts` | Log briefing tokens to `llm_usage` |
| `src/lib/brain-dump.ts` | Log triage tokens to `llm_usage` |
| `src/app/page.tsx` | Add `<UsagePanel>` to dashboard |
| `src/components/sidebar.tsx` | Add `{ href: "/usage", label: "Usage", icon: BarChart3 }` |
| `src/db/seed.ts` | Generate 100 sample usage rows across 7 days |

### Schema Reference

See Database Schema §`hil_ops.llm_usage`.

### API Routes

| Method | Path | Request Body | Response |
|--------|------|-------------|----------|
| `GET` | `/api/usage` | `?period=day\|week\|month&model=X&source=Y` | `{ ok: true, data: { byDay: [...], byModel: [...], bySource: [...], total: {...} } }` |

### LLM Instrumentation

Modify `src/lib/llm.ts` `chat()` function to return usage data. Each caller
(`review.ts`, `briefing.ts`, `brain-dump.ts`) logs to `llm_usage` after the call:

```typescript
// After chat() returns
await db.insert(llmUsage).values({
  model: LLM_MODEL,
  inputTokens: usage.prompt_tokens,
  outputTokens: usage.completion_tokens,
  cacheReadTokens: 0, // llama.cpp doesn't separate cache tokens yet
  cacheCreationTokens: 0,
  costUsd: null, // self-hosted, free
  source: "review", // or "briefing", "triage"
  tacticId: tacticId, // if applicable
});
```

### Components

| Component | Type | Props |
|-----------|------|-------|
| `UsagePanel` | RSC | `today: UsageSummary, week: UsageSummary` — dashboard card |
| `UsageChart` | RSC | `data: UsageByDay[]` — SVG bar chart (no chart library) |

### Charts

**No charting library.** Use simple SVG `<rect>` elements for bar charts or CSS flexbox
bars. Colors: indigo for input tokens, emerald for output tokens.

### Sidebar Nav

```typescript
{ href: "/usage", label: "Usage", icon: BarChart3 }
```

### Seed Data

Generate 100 rows across 7 days, 2 models (Qwen3, Ornith), varied sources.

### Rollback

```sql
DROP TABLE IF EXISTS hil_ops.llm_usage;
DROP TYPE IF EXISTS hil_ops.llm_usage_source;
-- Remove instrumentation from llm.ts, review.ts, briefing.ts
-- Remove files, nav item
```

### Verification

```bash
pnpm typecheck && pnpm lint
pnpm dev  # browser test: /usage page, Usage panel, chart renders
# Test: run a briefing, verify llm_usage row created
```

---

## Phase 10 — Cmd+K Global Search

### Objective

Add a keyboard-driven global search across all dashboard entities. Uses Postgres
`ILIKE` for simplicity — no new dependencies, no extensions.

### New Files

| File | Purpose |
|------|---------|
| `src/app/api/search/route.ts` | `GET /api/search?q={query}` — cross-table search |
| `src/components/search-dialog.tsx` | Client component, keyboard-driven overlay |

### Modified Files

| File | Change |
|------|--------|
| `src/components/keyboard-help.tsx` | Add `Cmd+K` / `Ctrl+K` to shortcuts list |
| `src/app/layout.tsx` | Register `Cmd+K` keyboard handler |

### API Routes

| Method | Path | Query Params | Response |
|--------|------|-------------|----------|
| `GET` | `/api/search` | `q={query}` | `{ ok: true, data: { goals: [...], tactics: [...], brainDump: [...], agents: [...], skills: [...] } }` |

### Implementation

- Search across: `goals.title`, `tactics.title`, `brain_dump.content`, `agents.name`, `skills.name`
- Use `ILIKE '%query%'` for simplicity
- If performance becomes an issue later, add `CREATE INDEX ... USING gin (to_tsvector(...))`
- Limit results to 5 per entity type
- Return `{ type, id, title, subtitle }` for each result

### Components

| Component | Type | Props |
|-----------|------|-------|
| `SearchDialog` | Client | — (self-contained, listens for Cmd+K). Debounced input (300ms). Results grouped by entity type. Arrow-key navigation. Enter to navigate. |

### Keyboard Integration

- Register `Cmd+K` / `Ctrl+K` in the existing keyboard handler (`src/components/keyboard-help.tsx`)
- This matches the dashboard's existing keyboard shortcut pattern
- **No `cmdk` package** — build with custom React + `useEffect` keyboard listener + Tailwind overlay

### Sidebar Nav

No nav item — search is triggered by keyboard shortcut only.

### Seed Data

None needed — searches existing data.

### Rollback

Remove files. No schema changes.

### Verification

```bash
pnpm typecheck && pnpm lint
pnpm dev  # browser test: Cmd+K opens dialog, search returns results, Enter navigates
```

---

## Phase 11 — API Pagination + In-App Guide

---

## Phase 11 — API Pagination + In-App Guide

### Objective

Add pagination to existing GET API routes and build a `/help` page with keyboard shortcuts
reference and architecture overview.

### New Files

| File | Purpose |
|------|---------|
| `src/app/help/page.tsx` | In-app guide (RSC): shortcuts, panel descriptions, architecture |

### Modified Files

| File | Change |
|------|--------|
| `src/app/api/tactics/route.ts` | Add `?limit=N&offset=M` support, return `{ data, meta }` |
| `src/app/api/decisions/route.ts` | Add pagination (already specified in Phase 3) |
| `src/app/api/brain-dump/route.ts` | Add pagination |
| `src/app/api/goals/route.ts` | Add pagination |
| `src/app/api/skills/route.ts` | Add pagination |
| `src/components/sidebar.tsx` | Add `{ href: "/help", label: "Help", icon: HelpCircle }` |

### Pagination Format

All paginated GET routes return:
```typescript
{
  ok: true,
  data: T[],
  meta: {
    total: number,    // total matching rows
    filtered: number, // after any filters
    returned: number, // rows in this response
    limit: number,
    offset: number,
  }
}
```

### Token-Optimized API (Low Priority)

Add `?fields=field1,field2` support to `/api/tactics` GET for sparse field selection.
This mirrors MC's token-optimized API pattern. Low priority — documented but not
essential for an internal dashboard.

### In-App Guide Content

- Keyboard shortcuts reference (from `keyboard-help.tsx`)
- Panel descriptions (what each dashboard panel shows)
- Gate rule explanation (how approval gates work)
- Architecture diagram (simplified version of the one in EXIT-AUDIT)
- Link to external docs

### Components

| Component | Type | Props |
|-----------|------|-------|
| `GuidePage` | RSC | — (static content, no props) |

### Sidebar Nav

```typescript
{ href: "/help", label: "Help", icon: HelpCircle }
```

### Seed Data

None needed.

### Rollback

Remove files, nav item. No schema changes.

### Verification

```bash
pnpm typecheck && pnpm lint
pnpm dev  # browser test: /help page renders, paginated API returns meta
```

---

## Deferred to Hermes / Future

The following features are explicitly **not being built** in the HIL Dashboard:

| Feature | Reason | Owner |
|---------|--------|-------|
| Continuous Missions | Hermes handles auto-dispatch, dependency chains, parallel agent scheduling. Dashboard only READS mission state. | Hermes |
| Session Resilience | Hermes manages agent session lifecycle, auto-respawn, and recovery. | Hermes |
| Daemon/Scheduler | Hermes IS the daemon — it replaces MC's `scripts/daemon/` entirely. | Hermes |
| Inbox Auto-Respond | Hermes handles inter-agent communication via ACP protocol. | Hermes |
| Slash Commands | CLI/terminal concept — not applicable to a web dashboard UI. | N/A |
| Checkpoints | Homelab filesystem concern — not a dashboard responsibility. | Infra |
| Autopilot Dashboard | Hermes monitoring panel (`hermes-agents-panel.tsx`) already covers agent status. | Hermes |
| Templates | Needs a concrete use case before building — no current demand. | Future |
| Emergency Stop | Security-critical feature that needs Hermes kill-signal integration first. | Hermes |
| AI Context Generation | The dashboard's executive briefing (`src/lib/briefing.ts`) serves this purpose. | Built |
| Token-Optimized API | Low value for internal dashboard. Phase 11 documents the pattern but implementation is low priority. | Future |

---

## Qwen3 Implementation Prompts

> **This section provides self-contained prompts for each phase.** An executor agent
> can paste these directly to build each phase.

### Qwen3 API Reference

| Property | Value |
|----------|-------|
| **Endpoint** | `POST http://localhost:11434/v1/chat/completions` |
| **Model** | Active model on homelab (check via `GET http://localhost:9723/models` — the model manager daemon) |
| **Auth** | None (local network only, WireGuard-gated) |
| **Request body** | `{ model: "...", messages: [{ role: "system", content: "..." }, { role: "user", content: "..." }], temperature: 0.3, max_tokens: 4000 }` |
| **Response** | Standard OpenAI-compatible: `{ choices: [{ message: { content: "..." } }], usage: { prompt_tokens, completion_tokens, total_tokens } }` |
| **Timeout** | 30s via `AbortSignal.timeout(30_000)` |
| **Fallback** | If LLM unreachable, feature degrades gracefully (brain dump entries stay pending, briefing shows "LLM offline") |

**Curl example:**
```bash
curl -X POST http://localhost:11434/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"qwen3:27b","messages":[{"role":"user","content":"Hello"}],"temperature":0.3,"max_tokens":100}'
```

---

### Phase 1 Prompt — Goals & Projects

```
You are a senior software engineer working on the FlowManner HIL Dashboard —
a Next.js 16 + React 19 + Drizzle ORM + Postgres operational dashboard for
human-in-the-loop agent supervision.

Project path: /home/glenn/flowmanner-dashboard-HIL/

Mission: Build a Goals & Projects tracking system. Goals are strategic objectives
that sit ABOVE existing strategies in the hierarchy (Goals → Strategies → Tactics).
Projects are concrete workstreams under goals.

Deliverables:
- See the "Phase 1 — Goals & Projects" section in docs/MISSION-CONTROL-PORT.md
  for complete file list, API routes, components, and schema.

Schema: See Database Schema section — tables hil_ops.goals, hil_ops.projects.
Also add goalId FK to hil_ops.tactics and hil_ops.strategies.

Design conventions: Match EXISTING code exactly — see Design Conventions section.
Panel class: rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 p-6 shadow-sm.
Icons: lucide-react exclusively. All new panels are RSC.

Hard constraints:
- All data in hil_ops Postgres schema
- Use pnpm db:push (not raw SQL migrations)
- Homelab Qwen3 LLM only (:11434)
- No new npm dependencies
- Do NOT touch /opt/flowmanner/backend/ or mission-control/ source files

Verification: pnpm typecheck && pnpm lint && pnpm dev

When done: Print summary of files created/modified + typecheck result.
```

### Phase 2 Prompt — Brain Dump & Triage

```
You are a senior software engineer working on the FlowManner HIL Dashboard.

Project path: /home/glenn/flowmanner-dashboard-HIL/

Mission: Build a Brain Dump & Triage system. Quick-capture ideas on the dashboard,
with LLM-powered triage to classify entries as actionable (→ create tactic/goal)
or not (→ dismiss).

Deliverables: See Phase 2 section in docs/MISSION-CONTROL-PORT.md.

Schema: hil_ops.brain_dump table. See Database Schema section.

LLM integration for triage:
- Endpoint: POST http://localhost:11434/v1/chat/completions
- System prompt: "You are a triage assistant for an operations dashboard. Given
  a list of brain dump entries, classify each as actionable or not. For actionable
  entries, suggest converting to a tactic or goal. Return ONLY JSON:
  { entries: [{ id, actionable: boolean, suggestedType: 'tactic'|'goal'|'dismiss',
  reasoning: string }] }"
- Temperature: 0.3, max_tokens: 2000, timeout: 30s
- JSON validation: Parse output as JSON. If invalid, retry once. If still invalid,
  mark entries as 'triage_error'. Max 5 conversions per run.
- Fallback: If LLM unreachable, entries stay 'pending', show toast "LLM unreachable".

Design conventions: Match existing code exactly. All panels RSC except triage button.

Hard constraints: Same as Phase 1.

Verification: pnpm typecheck && pnpm lint && pnpm dev
```

### Phase 3 Prompt — Decision Log

```
You are a senior software engineer working on the FlowManner HIL Dashboard.

Project path: /home/glenn/flowmanner-dashboard-HIL/

Mission: Build a standalone Decision Log browse view. The data already exists in
hil_ops.approvals — this phase adds a dedicated page and dashboard panel. Also
extend the activity timeline with more event types.

Deliverables: See Phase 3 section in docs/MISSION-CONTROL-PORT.md.

Schema: No new tables — reuses hil_ops.approvals.

Design conventions: Match existing code exactly.

Hard constraints: Same as Phase 1.

Verification: pnpm typecheck && pnpm lint && pnpm dev
```

### Phase 4 Prompt — Skills Library

```
You are a senior software engineer working on the FlowManner HIL Dashboard.

Project path: /home/glenn/flowmanner-dashboard-HIL/

Mission: Build a Skills Library. Skills are reusable markdown content blocks that
can be linked to agents. This provides a local fallback for when Hermes ACP is
unreachable.

Deliverables: See Phase 4 section in docs/MISSION-CONTROL-PORT.md.

Schema: hil_ops.skills, hil_ops.agent_skills (join table). See Database Schema.

Design conventions: Match existing code exactly.

Hard constraints: Same as Phase 1.

Verification: pnpm typecheck && pnpm lint && pnpm dev
```

### Phase 5 Prompt — Agent Registry

```
You are a senior software engineer working on the FlowManner HIL Dashboard.

Project path: /home/glenn/flowmanner-dashboard-HIL/

Mission: Enhance the existing agent registry with instructions, capabilities,
status, icon, and description fields. Add full CRUD UI. Add multi-agent
collaborator support on tactics.

Deliverables: See Phase 5 section in docs/MISSION-CONTROL-PORT.md.

Schema: Modify hil_ops.agents (add columns) + hil_ops.tactics (add collaborators).
See Database Schema section.

Design conventions: Match existing code exactly.

Hard constraints: Same as Phase 1.

Verification: pnpm typecheck && pnpm lint && pnpm dev
```

### Phase 6 Prompt — Eisenhower Matrix

```
You are a senior software engineer working on the FlowManner HIL Dashboard.

Project path: /home/glenn/flowmanner-dashboard-HIL/

Mission: Add importance/urgency fields to tactics and build a 4-quadrant
Eisenhower Matrix view. No new tables — uses new columns on hil_ops.tactics.

Quadrants: Do (important+urgent), Schedule (important+not-urgent),
Delegate (not-important+urgent), Eliminate (not-important+not-urgent).

NO new dependencies — use HTML5 drag API or click-to-assign buttons.

Deliverables: See Phase 6 section in docs/MISSION-CONTROL-PORT.md.

Schema: Modify hil_ops.tactics (add importance, urgency). See Database Schema.

Design conventions: Match existing code exactly.

Hard constraints: Same as Phase 1.

Verification: pnpm typecheck && pnpm lint && pnpm dev
```

### Phase 7 Prompt — Dependencies & Subtasks

```
You are a senior software engineer working on the FlowManner HIL Dashboard.

Project path: /home/glenn/flowmanner-dashboard-HIL/

Mission: Add task dependencies (blocker/blocked), checkable subtasks, acceptance
criteria, and time tracking to tactics. Includes cycle detection for dependencies.

Cycle detection: Before inserting (A blockedBy B), traverse B's dependency chain
via DFS. If A appears in the chain, reject with 409 Conflict.

Deliverables: See Phase 7 section in docs/MISSION-CONTROL-PORT.md.

Schema: hil_ops.tactic_dependencies, hil_ops.tactic_subtasks + modify hil_ops.tactics.
See Database Schema.

Design conventions: Match existing code exactly.

Hard constraints: Same as Phase 1.

Verification: pnpm typecheck && pnpm lint && pnpm dev
```

### Phase 8 Prompt — Loop Detection

```
You are a senior software engineer working on the FlowManner HIL Dashboard.

Project path: /home/glenn/flowmanner-dashboard-HIL/

Mission: Enhance the existing attemptCount/maxAttempts mechanism with automatic
escalation when attempts are exhausted. No new tables.

When attemptCount >= maxAttempts: auto-set status to needs_review, add message
"Escalated: max attempts reached", set requiresHumanApproval = true.

Continuous missions are DEFERRED to Hermes — do not build auto-dispatch.

Deliverables: See Phase 8 section in docs/MISSION-CONTROL-PORT.md.

Design conventions: Match existing code exactly.

Hard constraints: Same as Phase 1.

Verification: pnpm typecheck && pnpm lint && pnpm dev
```

### Phase 9 Prompt — Cost & Token Tracking

```
You are a senior software engineer working on the FlowManner HIL Dashboard.

Project path: /home/glenn/flowmanner-dashboard-HIL/

Mission: Track LLM token consumption across all dashboard features. Instrument
llm.ts, review.ts, briefing.ts, and brain-dump.ts to log usage. Build usage
analytics page with simple SVG charts (no charting library).

Note: costUsd is null for self-hosted Qwen3 (free to run). Token counts come
from llama.cpp response metadata.

Deliverables: See Phase 9 section in docs/MISSION-CONTROL-PORT.md.

Schema: hil_ops.llm_usage. See Database Schema.

Design conventions: Match existing code exactly.

Hard constraints: Same as Phase 1.

Verification: pnpm typecheck && pnpm lint && pnpm dev
```

### Phase 10 Prompt — Cmd+K Search

```
You are a senior software engineer working on the FlowManner HIL Dashboard.

Project path: /home/glenn/flowmanner-dashboard-HIL/

Mission: Add a keyboard-driven global search (Cmd+K / Ctrl+K) across all
dashboard entities. Uses Postgres ILIKE — no new dependencies.

NO cmdk package — build with custom React + useEffect keyboard listener +
Tailwind overlay. Match the existing keyboard shortcut pattern.

Deliverables: See Phase 10 section in docs/MISSION-CONTROL-PORT.md.

Design conventions: Match existing code exactly.

Hard constraints: Same as Phase 1.

Verification: pnpm typecheck && pnpm lint && pnpm dev
```

### Phase 11 Prompt — Pagination + Help

```
You are a senior software engineer working on the FlowManner HIL Dashboard.

Project path: /home/glenn/flowmanner-dashboard-HIL/

Mission: Add pagination (limit/offset/meta) to existing GET API routes and
build a /help page with keyboard shortcuts reference and architecture overview.

Pagination format: { data: [...], meta: { total, filtered, returned, limit, offset } }

Deliverables: See Phase 11 section in docs/MISSION-CONTROL-PORT.md.

Design conventions: Match existing code exactly.

Hard constraints: Same as Phase 1.

Verification: pnpm typecheck && pnpm lint && pnpm dev
```

---

## Cross-Reference: EXIT-AUDIT Roadmap

> **Prevents duplication** between MC port phases and the EXIT-AUDIT integration roadmap.

| MC Port Phase | EXIT-AUDIT Roadmap Item | Relationship |
|--------------|------------------------|-------------|
| Phase 3 (Decision Log) | P2 — Hermes HITL approval | **Already built.** Phase 3 adds standalone browse view. |
| Phase 4 (Skills Library) | P4 — Hermes skill library UI | Build local fallback first, integrate with Hermes skill extraction later. |
| Phase 5 (Agent Registry) | P0 — Hermes ACP agent monitoring | **Already built.** Phase 5 adds local CRUD as complement. |
| Phase 8 (Loop Detection) | Hermes session resilience | Dashboard-side escalation complements Hermes auto-continuation. |
| Phase 9 (Cost/Token) | OpenCode token telemetry (§3a) | Unify token tracking across homelab LLM + OpenCode. |
| Phase 10 (Cmd+K Search) | P7 — Unified cross-tool timeline | Search is the entry point; timeline is one search destination. |
| Deferred (continuous missions, daemon, session resilience) | Hermes integration (§3b) | Hermes IS the daemon/mission/session manager. |

### Sequencing Recommendation

> Build MC port Phases 1-7 first (Postgres-backed features), then resume EXIT-AUDIT
> P3-P7 (OpenClaw integration). MC port is self-contained; EXIT-AUDIT P3+ depends on
> OpenClaw being deployed.

---

## Verification Strategy

### Per-Phase Verification Checklist

For every phase:
- [ ] `pnpm typecheck` — passes
- [ ] `pnpm lint` — passes
- [ ] `pnpm build` — passes (not just dev mode)
- [ ] Browser test — new page renders, dashboard panel shows data
- [ ] Dark mode — toggle theme, verify all new panels render correctly
- [ ] Mobile — verify responsive layout on narrow viewport

### Schema Isolation Test

After each `pnpm db:push`:
```bash
# Verify only hil_ops schema was affected
psql $DATABASE_URL -c "SELECT schemaname, tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;"
# Should show no new tables in public schema
```

### Seed Idempotency Test

```bash
pnpm seed
pnpm seed  # run twice
# Verify no duplicate rows — check counts match expected
psql $DATABASE_URL -c "SELECT count(*) FROM hil_ops.goals;"
```

### RSC Test

Disable JavaScript in browser devtools. Data-fetching panels should still render
via React Server Components. Client-only components (forms, toggles) will not
function, but the page structure should be visible.

### LLM Offline Test

```bash
sudo systemctl stop llama-server
# Verify brain dump triage shows "LLM unreachable" toast
# Verify briefing shows "LLM offline" message
# Verify review scoring returns graceful error
sudo systemctl start llama-server
```

### Rollback Procedure Per Phase

For each phase:
1. `DROP TABLE hil_ops.{new_tables}` if applicable
2. Remove new files created in that phase
3. Remove nav items from `sidebar.tsx`
4. Remove dashboard panel imports from `page.tsx`
5. `pnpm db:push` to sync schema state

---

## When Done

Print a summary:
- List all files created and modified
- Outcome of `pnpm typecheck` and `pnpm lint`
- Which features are visible in browser (pages, panels, nav items)
- Which API routes respond correctly

**Do NOT push to origin.** Glenn reviews, Hermes verifies and commits.

---

*Document generated 2026-07-02. Author: Buffy (Codebuff).*
*Rewritten from the original Mission Control Port spec.*
