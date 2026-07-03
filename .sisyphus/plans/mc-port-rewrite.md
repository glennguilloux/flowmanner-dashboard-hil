# Mission Control Port — Document Rewrite

## TL;DR

> **Quick Summary**: Rewrite `docs/DEEPSEEK-MISSION-CONTROL-PORT.md` into a comprehensive, Qwen3-aligned spec that covers all 32 non-Field-Ops gaps, cross-references the EXIT-AUDIT roadmap, and replaces the single DeepSeek Phase-1 prompt with per-phase Qwen3 prompts.
>
> **Deliverables**:
> - Fully rewritten `docs/MISSION-CONTROL-PORT.md` (renamed from `DEEPSEEK-MISSION-CONTROL-PORT.md`)
> - All 32 gap categories addressed (schema, features, integration)
> - Qwen3 prompt section for every phase (not just Phase 1)
> - EXIT-AUDIT cross-reference section (what's already built, no duplication)
> - Complete Drizzle schema code blocks for every new table
> - Design conventions, verification strategy, rollback plan per phase
>
> **Estimated Effort**: Medium
> **Parallel Execution**: NO — single-file rewrite, sequential edits
> **Critical Path**: T1 skeleton → T2 comparison table → T3 schema → T4-T6 phases → T7 prompts → T8 cross-ref → T9 verification

---

## Context

### Original Request
User wants `docs/DEEPSEEK-MISSION-CONTROL-PORT.md` improved/overwritten — "a lot of missing elements!"

### Interview Summary
**Key Discussions**:
- User confirmed: FULL REWRITE covering all 38 gaps EXCEPT Field Ops (excluded entirely)
- User confirmed: Rewrite DeepSeek prompt section for Qwen3, cover ALL phases
- User confirmed: Cross-reference and align with EXIT-AUDIT-2026-07-02.md roadmap

**Research Findings**:
- Mission Control has 25 UI routes, 19 API groups, 15 data files, 34 components, 13 slash commands, a full daemon
- HIL Dashboard has 7 pages, 18 API routes, 6 DB tables, 38 components, 22 lib files
- 38 gap categories identified; 6 are Field Ops (excluded), leaving 32
- Hermes ACP + OpenCode + Hermes HITL gates already built — must not duplicate
- Dashboard already has `hil_ops.strategies` which occupies similar semantic space to MC's goals

### Metis Review
**Identified Gaps** (addressed):
- Duplication risk: Hermes ACP/OpenCode already shipped → added "Pre-flight: Already Built" section requirement
- Schema boundary: new tables must use `hil_ops` schema + `pnpm db:push` → added as hard constraint
- LLM rule: Qwen3 only, NO DeepSeek → all prompts rewritten for `:11434/v1/chat/completions`
- Goals vs Strategies overlap → added explicit "Goals sit ABOVE strategies" clarification requirement
- Qwen3 prompt reliability (malformed JSON, timeouts) → added structured output + error handling specs
- Need index strategy per table → added to schema section requirement
- Need seed data + rollback plan per phase → added to each phase spec
- Circular dependency risk for `blockedBy` → added cycle detection requirement or explicit exclusion

---

## Work Objectives

### Core Objective
Produce a single comprehensive markdown document that serves as the authoritative spec for porting Mission Control concepts into the HIL Dashboard, with zero ambiguity for any executor agent.

### Concrete Deliverables
- `docs/MISSION-CONTROL-PORT.md` (renamed from `DEEPSEEK-MISSION-CONTROL-PORT.md`)
- Old file deleted or git-mv'd

### Definition of Done
- [ ] Document covers all 32 non-Field-Ops gap categories
- [ ] Zero references to "DeepSeek" anywhere in the document
- [ ] Every new table has full Drizzle schema code block + index specs
- [ ] Every phase has a Qwen3 prompt section with curl example + error handling
- [ ] "Pre-flight: Already Built" section inventories Hermes/OpenCode/model-swap
- [ ] EXIT-AUDIT cross-reference section maps MC phases to roadmap items
- [ ] Each phase has: files to create, files to modify, schema, API routes, components, seed data, rollback plan, verification steps

### Must Have
- All Drizzle schema code must use `hilOps.table()` pattern (matching existing `src/db/schema.ts`)
- All Qwen3 prompts must specify: model name, system prompt, temperature, max_tokens, JSON output schema, timeout, fallback behavior
- Design conventions section must match existing dashboard patterns exactly (rounded-2xl panels, dark mode, RSC, SectionErrorBoundary, lucide-react)
- Goals must be explicitly positioned ABOVE strategies (goals → strategies → tactics hierarchy)
- No new npm dependencies — everything uses existing stack

### Must NOT Have (Guardrails)
- NO Field Ops content (vault, circuit breaker, service catalog, spend limits) — not even a "see also"
- NO references to "DeepSeek" — use "Qwen3" or "homelab LLM" throughout
- NO raw SQL migration files — use `pnpm db:push` (Drizzle push mode)
- NO new npm dependencies (no `cmdk`, no `@dnd-kit`, no `@tanstack/react-query`)
- NO duplication of already-built features (Hermes ACP, OpenCode telemetry, model swap)
- NO `alembic` involvement — hil_ops schema is Drizzle-only
- NO client components for data-fetching panels — all new panels are RSC
- NO shadcn/ui patterns — dashboard uses custom Tailwind v4 components

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed.

### Test Decision
- **Infrastructure exists**: YES (the dashboard has typecheck + lint)
- **Automated tests**: N/A (this is a documentation rewrite, not code)
- **Framework**: N/A

### QA Policy
Every task includes agent-executed QA that verifies the document section is:
1. Syntactically valid markdown (no broken tables, code blocks, links)
2. Internally consistent (file paths exist, table names match schema, API routes follow conventions)
3. Complete (no TODO/placeholder/stub text)
4. Convention-matching (panel classes, color palette, icon library match existing dashboard)

Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.md`.

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Sequential — foundation):
└── Task 1: Write skeleton + intro + hard constraints + pre-flight inventory + design conventions [writing]

Wave 2 (Sequential — core content):
├── Task 2: Write comprehensive feature comparison table [writing]
└── Task 3: Write complete database schema section [writing]

Wave 3 (Sequential — phase specs):
├── Task 4: Write Phases 1-3 detail (Goals, Brain Dump, Decision Log) [writing]
├── Task 5: Write Phases 4-6 detail (Skills, Agent Registry, Eisenhower Matrix) [writing]
├── Task 6: Write Phases 7-9 detail (Dependencies/Subtasks, Continuous Missions, Cost/Token) [writing]
└── Task 7: Write Phases 10-11 detail (Cmd+K Search, API Pagination) [writing]

Wave 4 (Sequential — cross-cutting):
├── Task 8: Write Qwen3 prompt section (all phases) [writing]
└── Task 9: Write EXIT-AUDIT cross-ref + verification + rollback [writing]

Wave FINAL (After ALL tasks — 4 parallel reviews):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Markdown quality + convention check (unspecified-high)
├── Task F3: Gap coverage verification (unspecified-high)
└── Task F4: Cross-reference integrity check (deep)
-> Present results -> Get explicit user okay

Critical Path: T1 → T2 → T3 → T4 → T5 → T6 → T7 → T8 → T9 → F1-F4 → user okay
```

Note: Tasks are sequential because they all edit the same file. Each task uses `Edit` to append its section.

---

## TODOs

- [ ] 1. **Write Document Skeleton + Foundation Sections**

  **What to do**:
  - `git mv docs/DEEPSEEK-MISSION-CONTROL-PORT.md docs/MISSION-CONTROL-PORT.md` (rename, preserve git history)
  - Write the complete document skeleton via `Write` (this REPLACES the entire old content):
    - **Title**: `# Mission Control Port — Comprehensive Spec`
    - **TL;DR** section: 2-3 sentence summary of what this document is
    - **Context** section: Explain MC is a reference app (JSON-based, Next.js 15), dashboard is the target (Postgres, Next.js 16, Drizzle). Note the port stores all new data in `hil_ops` Postgres schema.
    - **Hard Constraints** section (bulleted, prominent):
      - All data in `hil_ops` Postgres schema — never JSON files, never `public` schema (FM-owned)
      - Use `pnpm db:push` (Drizzle push mode) — never raw SQL migration files, never alembic
      - Homelab Qwen3 LLM only (`:11434/v1/chat/completions`) — NO DeepSeek, OpenAI, Anthropic, Google
      - No new npm dependencies — existing stack only (Next.js 16, React 19, Drizzle 0.45, Tailwind 4, lucide-react, date-fns)
      - All new panels are React Server Components (RSC) — client components only for interactivity
      - Do NOT touch `/opt/flowmanner/backend/` or `/opt/flowmanner/config/`
      - Do NOT edit `mission-control/` source files — read-only reference
      - Field Ops is OUT OF SCOPE — no vault, service catalog, spend limits, or external action execution
    - **Pre-flight: Already Built** section — critical anti-duplication inventory. For each item, state what exists and where:
      - Hermes ACP integration → `src/lib/hermes-acp.ts`, `src/components/hermes-agents-panel.tsx`, `src/components/hermes-approval-panel.tsx` (built in commit `b38c6cc`, see `docs/EXIT-AUDIT-2026-07-02.md` §3b)
      - OpenCode telemetry → `src/lib/opencode.ts`, `src/components/opencode-panel.tsx` (built in commit `b38c6cc`)
      - Hermes HITL approval gates → `src/components/hermes-approval-panel.tsx` (built in commit `6014560`)
      - Model swap → `src/components/model-swap-panel.tsx`, `src/components/model-quick-swap.tsx`, `src/app/api/models/`
      - System health → `src/lib/system-health.ts`, `src/components/system-health-panel.tsx`
      - Activity timeline → `src/lib/activity-timeline.ts`, `src/components/activity-timeline-panel.tsx`
      - WG watchdog → `src/lib/wg-watchdog.ts`, `src/components/wg-watchdog-panel.tsx`
      - Executive briefing → `src/lib/briefing.ts`, `src/components/executive-briefing.tsx`
      - Background LLM reviewer → `src/lib/review.ts`, `src/app/api/review/`
      - Existing strategies table → `hil_ops.strategies` (linked to FM missions via `missionId`)
      - Existing tactics table → `hil_ops.tactics` (the core table — PRs, inbox, simulated)
      - Existing approvals table → `hil_ops.approvals` (already serves as decision log data)
    - **Goals vs Strategies Clarification** section — critical conceptual note:
      - Goals = long-term strategic objectives ("Ship FlowManner v2", "Reach 100 users")
      - Strategies = execution plans linked to FM missions (already exist in `hil_ops.strategies`)
      - Tactics = individual agent actions (already exist in `hil_ops.tactics`)
      - Hierarchy: **Goals → Strategies → Tactics** (goals are a NEW layer ABOVE existing strategies)
      - A strategy can optionally link to a goal via a new `goalId` FK column
    - **Design Conventions** section (comprehensive, must match actual codebase):
      - Panel class: `rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 p-6 shadow-sm`
      - Color palette: indigo (primary), emerald (success), amber (warning), rose (danger), sky (info), slate (neutral)
      - Dark mode: `@custom-variant dark (&:where(.dark, .dark *))` — class-based, all new components need `dark:` variants
      - Icons: `lucide-react` exclusively (no other icon libraries)
      - Timestamps: `date-fns/formatDistanceToNow` with `addSuffix: true`, plus `title` attribute with absolute ISO time
      - Server components: async RSCs for data-fetching panels. Client components (`"use client"`) only for forms, toggles, modals, polling
      - Error handling: `<SectionErrorBoundary>` wraps each panel. API routes return `{ ok: boolean, error?: string, data?: T }`
      - Loading states: `<Suspense>` boundaries with `<SkeletonCard>` fallbacks
      - Typography: `text-slate-950 dark:text-slate-50` for headings, `text-slate-600 dark:text-slate-400` for body
      - Nav items: added to `nav` array in `src/components/sidebar.tsx` with lucide icon + href + label

  **Must NOT do**:
  - Do NOT include any Field Ops content
  - Do NOT reference "DeepSeek" — use "Qwen3" or "homelab LLM"
  - Do NOT use shadcn/ui patterns — dashboard uses custom Tailwind v4 components

  **Recommended Agent Profile**:
  - **Category**: `writing`
    - Reason: Pure documentation writing task requiring clear technical prose
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `flowmanner`: Not needed — context already gathered in plan

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 1 (sequential, first task)
  - **Blocks**: Tasks 2-9 (all subsequent tasks append to this document)
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References** (existing code to follow):
  - `docs/EXIT-AUDIT-2026-07-02.md:100-182` — Feature inventory + design conventions (the authoritative reference for what's built and how)
  - `docs/EXIT-AUDIT-2026-07-02.md:185-451` — Future roadmap Part 3 (OpenCode/Hermes/OpenClaw) — must cross-reference
  - `src/components/sidebar.tsx:27-35` — Nav array pattern (how nav items are added)
  - `src/components/system-health-panel.tsx` — Canonical panel component pattern (panel class, dark mode, RSC, error boundary)

  **API/Type References**:
  - `src/db/schema.ts:17` — `hilOps = pgSchema("hil_ops")` — all new tables MUST use this pattern
  - `src/lib/data.ts:178-208` — `getDashboardData()` return type — new data must integrate here

  **External References**:
  - `mission-control/mission-control/README.md` — MC feature list and architecture overview
  - `mission-control/CLAUDE.md` — MC data schema reference (all 15 JSON file structures)

  **WHY Each Reference Matters**:
  - EXIT-AUDIT lines 100-182: This is the authoritative "what's already built" list. The Pre-flight section must match this exactly to prevent duplication.
  - EXIT-AUDIT lines 185-451: The cross-reference section must map MC port phases to these roadmap items.
  - sidebar.tsx nav pattern: Every new phase that adds a page must document adding to this array.
  - system-health-panel.tsx: This is the canonical example of a dashboard panel — new panel specs should reference this as the pattern to follow.

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Document skeleton is valid markdown with all required sections
    Tool: Bash (grep)
    Preconditions: docs/MISSION-CONTROL-PORT.md exists
    Steps:
      1. Run: grep -c "^## " docs/MISSION-CONTROL-PORT.md
      2. Assert: count ≥ 6 (TL;DR, Context, Hard Constraints, Pre-flight, Goals vs Strategies, Design Conventions)
      3. Run: grep -ci "deepseek" docs/MISSION-CONTROL-PORT.md
      4. Assert: count = 0
      5. Run: grep -ci "field.ops\|vault\|service.catalog\|spend.limit" docs/MISSION-CONTROL-PORT.md
      6. Assert: count = 0
    Expected Result: Document has all 6+ sections, zero DeepSeek refs, zero Field Ops content
    Failure Indicators: Missing sections, DeepSeek references, Field Ops leakage
    Evidence: .sisyphus/evidence/task-1-skeleton-validation.md

  Scenario: Old file renamed, new file exists
    Tool: Bash
    Preconditions: git mv completed
    Steps:
      1. Run: test -f docs/MISSION-CONTROL-PORT.md && echo "EXISTS"
      2. Run: test -f docs/DEEPSEEK-MISSION-CONTROL-PORT.md && echo "OLD EXISTS" || echo "OLD REMOVED"
      3. Assert: "EXISTS" printed, "OLD REMOVED" printed
    Expected Result: New file exists, old file does not
    Evidence: .sisyphus/evidence/task-1-file-rename.md
  ```

  **Commit**: NO (groups with all other tasks into single final commit)

---

- [ ] 2. **Write Comprehensive Feature Comparison Table**

  **What to do**:
  - Read the full gap analysis from `.sisyphus/drafts/mc-port-rewrite.md` (32 categories)
  - Edit-append a "Feature Comparison" section to the document (before the phases section)
  - Write a table with columns: `MC Feature | MC Source | HIL Dashboard Status | Port Decision | Phase #`
  - Cover ALL 32 non-Field-Ops features:
    - Goals (hierarchy, milestones, types, timeframe) → BUILD → Phase 1
    - Projects (color, team, tags, status) → BUILD → Phase 1
    - Brain Dump (capture, triage, tags, conversion) → BUILD → Phase 2
    - Decision Log (standalone view) → BUILD → Phase 3 (reuses existing approvals)
    - Skills Library (content, agentIds, tags) → BUILD → Phase 4
    - Agent Registry (instructions, capabilities, status, icon) → BUILD → Phase 5
    - Eisenhower Matrix (Do/Schedule/Delegate/Eliminate) → BUILD → Phase 6
    - Task Dependencies (blockedBy) → BUILD → Phase 7 (with cycle detection)
    - Subtasks & Daily Actions → BUILD → Phase 7
    - Acceptance Criteria → BUILD → Phase 7
    - Time Tracking (estimated/actual minutes) → BUILD → Phase 7
    - Continuous Missions (auto-dispatch, dependency chains) → DEFER → Future (Hermes handles scheduling)
    - Loop Detection (3-attempt escalation) → PARTIAL → Phase 8 (tactics already have attemptCount/maxAttempts)
    - Session Resilience (auto-respawn) → DEFER → Future (Hermes manages sessions)
    - Cost & Token Tracking → BUILD → Phase 9
    - Cmd+K Global Search → BUILD → Phase 10 (using existing deps, no cmdk package)
    - API Pagination (limit/offset/meta) → BUILD → Phase 11
    - Token-Optimized API (sparse fields) → DEFER → Low value for internal dashboard
    - Multi-Agent Tasks (collaborators) → BUILD → Phase 5 (agent registry expansion)
    - Ventures → MAP TO GOALS → Phase 1 (ventures = goals with business tag)
    - Checkpoints → DEFER → Homelab filesystem concern, not dashboard
    - Autopilot Dashboard → DEFER → Hermes manages daemon-like scheduling
    - In-App Guide → BUILD → Phase 11 (simple /help page)
    - Templates → DEFER → Future (needs use case first)
    - Emergency Stop → DEFER → Security-critical, needs Hermes integration
    - Slash Commands → DEFER → CLI/terminal concept, not dashboard UI
    - Activity Log (typed events) → BUILD → Phase 3 (extends existing activity timeline)
    - Inbox Auto-Respond → DEFER → Hermes handles agent communication
    - Kanban Board → ALREADY BUILT → Read-only by design (FM owns writes)
    - Daemon → N/A → Hermes is the daemon equivalent
    - Mission System → ALREADY BUILT → Dashboard reads `public.missions` from FM
    - AI Context Generation → DEFER → Dashboard has executive briefing instead
  - After the table, add a "Deferred Features" subsection explaining WHY each deferred item is deferred (1 sentence each)
  - Add an "Excluded: Field Ops" subsection stating Field Ops is permanently out of scope with a 1-sentence rationale

  **Must NOT do**:
  - Do NOT include Field Ops as anything but "EXCLUDED"
  - Do NOT mark already-built features as "BUILD" (that causes duplication)

  **Recommended Agent Profile**:
  - **Category**: `writing`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2 (after Task 1)
  - **Blocks**: Tasks 3-9
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `docs/DEEPSEEK-MISSION-CONTROL-PORT.md:16-29` — Original comparison table (the one being improved — note its gaps)
  - `.sisyphus/drafts/mc-port-rewrite.md` — The full 32-category gap analysis
  - `docs/EXIT-AUDIT-2026-07-02.md:100-124` — Feature inventory of what's already built (23 items marked ✅)

  **WHY Each Reference Matters**:
  - The draft has the complete gap list; the EXIT-AUDIT has the "already built" list. Cross-referencing both ensures no duplication and no omissions.

  **Acceptance Criteria**:

  **QA Scenarios:**

  ```
  Scenario: Comparison table covers all 32 gaps
    Tool: Bash (grep)
    Steps:
      1. For each gap keyword, grep the document: eisenhower, subtask, blocked, collaborator, token, search, pagination, milestone, capabilities, instructions, acceptance, estimated, venture, checkpoint, autopilot, template, emergency, slash, activity.log, brain.dump, skill, decision, goal, project, agent.registry
      2. Assert: each keyword appears ≥1 time in the comparison table section
    Expected Result: All 32 gap keywords found in document
    Evidence: .sisyphus/evidence/task-2-gap-coverage.md
  ```

  **Commit**: NO

---

- [ ] 3. **Write Complete Database Schema Section**

  **What to do**:
  - Edit-append a "Database Schema" section to the document
  - For EACH new table, provide:
    1. Table name and purpose (1-2 sentences)
    2. Full Drizzle TypeScript code block (using `hilOps.table()` pattern from `src/db/schema.ts`)
    3. Index specifications (which columns, why — based on expected query patterns)
    4. Seed data specification (what demo data to create, idempotent upsert)
    5. Rollback procedure (DROP TABLE statement)
  - Tables to specify:
    - **`hil_ops.goals`** — id, title, description, type (enum: long-term/medium-term), category (Eisenhower: do/schedule/delegate/eliminate/general), status (enum: active/completed/archived), timeframe (text: "Q3 2026" or ISO date), parentGoalId (self-FK for milestone hierarchy, nullable), targetDate (timestamp, nullable), progress (integer 0-100), createdAt, updatedAt. Index on status+updatedAt (dashboard ordering).
    - **`hil_ops.projects`** — id, goalId (FK → goals, nullable), title, description, status (enum: active/paused/completed/archived), priority (enum: critical/high/medium/low), color (text: hex color for UI), tags (text array), createdAt, updatedAt. Index on goalId (project list under goal), index on status.
    - **`hil_ops.brain_dump`** — id, content (text), source (enum: manual/voice/slack/email), status (enum: pending/triaged/converted/dismissed), convertedToId (uuid, nullable), convertedToType (enum: tactic/goal/project, nullable), triageSummary (text, nullable), tags (text array), createdAt, updatedAt. Index on status (filter pending).
    - **`hil_ops.skills`** — id, name, description, content (text: markdown for injection into agent prompts), tags (text array), createdAt, updatedAt. 
    - **`hil_ops.agent_skills`** — agentId (FK → agents), skillId (FK → skills), composite PK. This is a join table for many-to-many agent↔skill.
    - **`hil_ops.tactic_dependencies`** — blockerId (FK → tactics), blockedId (FK → tactics), composite PK. Join table for task dependencies. Note: cycle detection must be implemented in the API route (DFS check before insert).
    - **`hil_ops.tactic_subtasks`** — id, tacticId (FK → tactics), title, done (boolean), order (integer), createdAt, updatedAt. Index on tacticId.
    - **`hil_ops.llm_usage`** — id, model (text), inputTokens (integer), outputTokens (integer), cacheReadTokens (integer), cacheCreationTokens (integer), costUsd (numeric 10,4, nullable — null for self-hosted), source (enum: briefing/review/triage/other), tacticId (FK → tactics, nullable), createdAt. Index on createdAt (time-series queries), index on model+createdAt.
  - Also document modifications to EXISTING tables:
    - **`hil_ops.agents`** — ADD columns: instructions (text, nullable), capabilities (text array, default []), status (text: active/inactive, default 'active'), icon (text: lucide icon name, nullable), description (text, nullable). Note: these are additive ALTERs via `pnpm db:push`.
    - **`hil_ops.tactics`** — ADD columns: goalId (FK → goals, nullable), estimatedMinutes (integer, nullable), actualMinutes (integer, nullable), acceptanceCriteria (text array, default []).
    - **`hil_ops.strategies`** — ADD column: goalId (FK → goals, nullable) — links strategies to goals.
  - Provide enum definitions matching the existing pattern in `src/db/schema.ts` (using `hilOps.enum()`)
  - Note: The existing `src/db/schema.ts` uses `hilOps.table()` and `hilOps.enum()` — ALL new schema code must match this exactly.

  **Must NOT do**:
  - Do NOT create migration files in `src/db/migrations/` — use `pnpm db:push`
  - Do NOT put tables in `public` schema — all in `hil_ops`
  - Do NOT use Prisma or raw SQL — Drizzle ORM TypeScript only

  **Recommended Agent Profile**:
  - **Category**: `writing`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2 (after Task 2)
  - **Blocks**: Tasks 4-9
  - **Blocked By**: Task 2

  **References**:

  **Pattern References**:
  - `src/db/schema.ts:1-176` — THE pattern to follow. Note: `hilOps = pgSchema("hil_ops")`, then `hilOps.enum()` for enums, then `hilOps.table()` for tables. Columns use drizzle-orm/pg-core imports (`uuid`, `text`, `timestamp`, `integer`, `boolean`, `jsonb`, `index`, `uniqueIndex`).
  - `src/db/schema.ts:96-150` — tactics table — most complex existing table, shows array columns, FK references, composite indexes, uniqueIndex pattern
  - `src/db/schema.ts:130-150` — Index pattern: second argument to `.table()` is a callback returning `{ indexName: index(...) }`

  **External References**:
  - `mission-control/CLAUDE.md` — MC data schema (tasks, goals, projects, agents, skills, brain-dump, decisions, activity-log) — these are the field definitions being ported

  **WHY Each Reference Matters**:
  - `src/db/schema.ts` is the exact file the executor will modify. The schema code in the document must be copy-paste ready into this file.

  **Acceptance Criteria**:

  **QA Scenarios:**

  ```
  Scenario: Schema code uses correct hilOps pattern
    Tool: Bash (grep)
    Steps:
      1. Run: grep -c "hilOps.table\|hilOps.enum" docs/MISSION-CONTROL-PORT.md
      2. Assert: count ≥ 15 (8 new tables + 5+ new enums + 2 enum modifications)
      3. Run: grep -c "pgSchema\|public.schema" docs/MISSION-CONTROL-PORT.md
      4. Assert: no raw "public." schema references in CREATE TABLE context
    Expected Result: All schema code uses hilOps.table() / hilOps.enum()
    Evidence: .sisyphus/evidence/task-3-schema-validation.md

  Scenario: Every new table has rollback + seed spec
    Tool: Bash (grep)
    Steps:
      1. Run: grep -ci "DROP TABLE\|rollback" docs/MISSION-CONTROL-PORT.md
      2. Assert: count ≥ 8 (one per new table)
      3. Run: grep -ci "seed" docs/MISSION-CONTROL-PORT.md
      4. Assert: count ≥ 8
    Expected Result: Each table has rollback and seed documentation
    Evidence: .sisyphus/evidence/task-3-rollback-seed.md
  ```

  **Commit**: NO

---

- [ ] 4. **Write Phases 1-3 Detail (Goals, Brain Dump, Decision Log)**

  **What to do**:
  - Edit-append three phase sections to the document. Each phase MUST include ALL of:
    - **Objective**: 2-3 sentences
    - **New files table**: file path + purpose (every file)
    - **Modified files table**: file path + specific change
    - **Schema reference**: "See Database Schema §{table names}" (cross-link, don't repeat code)
    - **API routes**: method + path + request/response body shape
    - **Components**: component name + type (RSC/client) + props
    - **Sidebar nav**: exact nav array entry to add
    - **Dashboard integration**: what to add to `getDashboardData()` and `page.tsx`
    - **Seed data**: what demo data, idempotent upsert approach
    - **Rollback**: `DROP TABLE` + remove files + remove nav items
    - **Verification**: `pnpm typecheck && pnpm lint` + manual test steps
  - **Phase 1 — Goals & Projects**:
    - Tables: `hil_ops.goals`, `hil_ops.projects` (+ modify strategies/tactics to add `goalId`)
    - API: `GET/POST /api/goals`, `PATCH/DELETE /api/goals/[id]`, `GET/POST /api/goals/[id]/projects`
    - Pages: `/goals` (full list, grouped by status, expandable projects)
    - Components: `GoalsPanel` (dashboard card, top 3 active goals + progress bars), `GoalProgressBar` (reusable, color-coded), `GoalDetailPanel`
    - Goal hierarchy: explain `parentGoalId` for milestones under long-term goals
    - Projects: explain `color` for UI, `tags` for filtering, `status` lifecycle
    - Nav: `{ href: "/goals", label: "Goals", icon: Target }`
    - Eisenhower integration: `category` field maps to Do/Schedule/Delegate/Eliminate
    - Seed: 3 goals (1 long-term with 2 milestones, 1 medium-term, 1 completed), 3 projects across goals
  - **Phase 2 — Brain Dump & Triage**:
    - Table: `hil_ops.brain_dump`
    - API: `GET/POST /api/brain-dump`, `POST /api/brain-dump/triage`
    - Pages: `/brain-dump` (full list with quick-add input)
    - Components: `BrainDumpPanel` (dashboard card, top 5 pending + input), `BrainDumpTriageButton`
    - Triage flow: detailed step-by-step (entry → pending → LLM call → converted/dismissed)
    - LLM integration: `POST :11434/v1/chat/completions` with system prompt asking to classify entries as actionable/not-actionable and return structured JSON. Specify: model name (`qwen3:27b` or whatever is active), temperature 0.3, max_tokens 2000, JSON output schema `{ entries: [{ id, actionable: boolean, suggestedType: "tactic"|"goal"|"dismiss", reasoning: string }] }`, timeout 30s, fallback (LLM down = entries stay pending, show toast "LLM unreachable")
    - Seed: 5 entries (3 pending, 1 triaged, 1 converted)
  - **Phase 3 — Decision Log (Standalone View)**:
    - NO new table — reuses `hil_ops.approvals` (already exists)
    - But ALSO add typed activity log: modify existing activity timeline to include more event types (task_created, task_delegated, brain_dump_triaged, goal_completed, decision_requested). This extends `src/lib/activity-timeline.ts`.
    - API: `GET /api/decisions` (paginated, joins tactics + agents + strategies)
    - Pages: `/decisions` (filterable by agent, tactic, date range, decision type)
    - Components: `DecisionLogPanel` (dashboard card, last 5), `DecisionDetail` (expandable row)
    - Dedup strategy: show LATEST decision per tactic by default, with toggle to show all attempts
    - Seed: no new data needed (uses existing approvals)

  **Must NOT do**:
  - Do NOT repeat full schema code (reference the Schema section instead)
  - Do NOT specify client components for data-fetching panels — all RSC

  **Recommended Agent Profile**:
  - **Category**: `writing`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (after Task 3)
  - **Blocks**: Tasks 5-9
  - **Blocked By**: Task 3

  **References**:

  **Pattern References**:
  - `src/app/api/tactics/route.ts` — Existing POST API route pattern (Zod validation, `{ ok, data }` response)
  - `src/app/api/tactics/[id]/approve/route.ts` — Existing decision API pattern
  - `src/components/dashboard-approval-panel.tsx` — Canonical dashboard panel with data props
  - `src/app/strategies/page.tsx` — Existing list page pattern (RSC, data fetch, card grid)
  - `src/lib/data.ts:20-22` — `getStrategies()` query pattern (Drizzle select + orderBy)

  **External References**:
  - `mission-control/CLAUDE.md` — goals.json schema (7 fields), brain-dump.json schema (6 fields), decisions.json schema (10 fields)
  - `mission-control/mission-control/data/agents.json` — agent structure with instructions + capabilities

  **Acceptance Criteria**:

  **QA Scenarios:**

  ```
  Scenario: Each phase has all required subsections
    Tool: Bash (grep)
    Steps:
      1. For each phase section, verify presence of: "New files", "Modified files", "API", "Components", "Nav", "Seed", "Rollback", "Verification"
      2. Run: grep -c "New files\|Modified files\|Rollback\|Seed\|Verification" docs/MISSION-CONTROL-PORT.md
      3. Assert: count ≥ 24 (8 keywords × 3 phases)
    Expected Result: All phases fully specified
    Evidence: .sisyphus/evidence/task-4-phase-completeness.md
  ```

  **Commit**: NO

---

- [ ] 5. **Write Phases 4-6 Detail (Skills, Agent Registry, Eisenhower Matrix)**

  **What to do**:
  - Edit-append three phase sections following the same structure as Task 4.
  - **Phase 4 — Skills Library**:
    - Tables: `hil_ops.skills`, `hil_ops.agent_skills` (join table)
    - API: `GET/POST /api/skills`, `PATCH/DELETE /api/skills/[id]`, `POST /api/skills/[id]/agents` (link skill to agent)
    - Pages: `/skills` (browser grid with cards: name, description, tags, linked agents)
    - Components: `SkillsPanel` (dashboard card, skill count + top 3), `SkillCard`
    - Cross-ref: "Hermes ACP already surfaces real agent capabilities at `/api/hermes`. This phase adds a local fallback for when Hermes is unreachable. See EXIT-AUDIT §3b."
    - Agent linking: explain `agent_skills` join table, many-to-many bidirectional
    - Content injection: skill `content` field is markdown injected into agent prompts (like MC's pattern)
    - Seed: 4 skills (matching MC's demo: Web Research, Eisenhower Triage, Task Management, + 1 custom)
  - **Phase 5 — Agent Registry Management**:
    - Tables: modify existing `hil_ops.agents` (add: instructions, capabilities[], status, icon, description) + `hil_ops.agent_skills` (from Phase 4)
    - Multi-agent collaborators: add `collaborators` text array to `hil_ops.tactics` (agent IDs alongside existing `agentId` lead)
    - API: `GET/POST /api/agents`, `PATCH/DELETE /api/agents/[id]` (full CRUD — currently only GET exists)
    - Pages: enhance `/agents` from view-only to editable registry
    - Components: `AgentEditor` (form: name, role, instructions, capabilities, icon, skills), `AgentDetailCard`
    - Cross-ref: "Hermes ACP panel already shows live agent state. This phase adds local CRUD for agent metadata. See EXIT-AUDIT §3b."
    - Migration strategy: existing agents get default values (instructions=null, capabilities=[], status='active')
    - Seed: update existing 3 agents with instructions + capabilities
  - **Phase 6 — Eisenhower Matrix & Task Prioritization**:
    - NO new table — uses `category` field on `hil_ops.goals` (from Phase 1) + existing `riskLevel` on tactics
    - But ADD importance/urgency fields to tactics: `importance` (enum: important/not-important), `urgency` (enum: urgent/not-urgent)
    - API: `PATCH /api/tactics/[id]` (add importance/urgency to update body)
    - Pages: `/priority-matrix` (4-quadrant grid view of tactics)
    - Components: `EisenhowerMatrixPanel` (dashboard card, 4 counts), `PriorityMatrix` (full page 4-quadrant layout)
    - Quadrant logic: Do (important+urgent), Schedule (important+not-urgent), Delegate (not-important+urgent), Eliminate (not-important+not-urgent)
    - NO `@dnd-kit` — use simple drag using HTML5 drag API or click-to-assign quadrant buttons (no new deps)
    - Seed: assign importance/urgency to existing tactics

  **Must NOT do**:
  - Do NOT specify `@dnd-kit` or `cmdk` — no new deps. Use HTML5 drag or button-based quadrant assignment.
  - Do NOT duplicate Hermes ACP agent monitoring — this phase is LOCAL CRUD only

  **Recommended Agent Profile**:
  - **Category**: `writing`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (after Task 4)
  - **Blocks**: Tasks 6-9
  - **Blocked By**: Task 4

  **References**:

  **Pattern References**:
  - `src/app/agents/page.tsx` — Existing agents page (being enhanced in Phase 5)
  - `src/components/hermes-agents-panel.tsx` — Existing agent display (cross-ref for Hermes integration)
  - `src/components/dashboard-stat-cards.tsx` — Stat card pattern

  **External References**:
  - `mission-control/mission-control/data/skills-library.json` — 4 skill definitions with content + agentIds
  - `mission-control/mission-control/data/agents.json` — 6 agents with instructions + capabilities + skillIds

  **Acceptance Criteria**:

  **QA Scenarios:**

  ```
  Scenario: No new dependencies specified
    Tool: Bash (grep)
    Steps:
      1. Run: grep -ci "cmdk\|@dnd-kit\|@tanstack\|shadcn\|prisma" docs/MISSION-CONTROL-PORT.md
      2. Assert: count = 0 (or only in "NOT to use" context)
    Expected Result: No forbidden dependencies
    Evidence: .sisyphus/evidence/task-5-no-new-deps.md
  ```

  **Commit**: NO

---

- [ ] 6. **Write Phases 7-9 Detail (Dependencies/Subtasks, Continuous Missions, Cost/Token)**

  **What to do**:
  - Edit-append three phase sections.
  - **Phase 7 — Task Dependencies, Subtasks & Acceptance Criteria**:
    - Tables: `hil_ops.tactic_dependencies` (blockerId, blockedId), `hil_ops.tactic_subtasks` (id, tacticId, title, done, order). Modify `hil_ops.tactics` to add `estimatedMinutes`, `actualMinutes`, `acceptanceCriteria[]`.
    - API: `POST/DELETE /api/tactics/[id]/dependencies` (add/remove blocker), `GET/POST/PATCH/DELETE /api/tactics/[id]/subtasks`, `PATCH /api/tactics/[id]` (add time tracking + acceptance criteria fields)
    - Cycle detection: API route must implement DFS cycle check before allowing a dependency. Explain the algorithm: "Before inserting (A blockedBy B), traverse B's dependency chain. If A appears in the chain, reject with 409 Conflict."
    - Pages: enhance `/tactics/[id]` detail page to show subtasks checklist, dependency badges, acceptance criteria, time tracking
    - Components: `SubtaskList` (checkable items), `DependencyBadge` (shows blockedBy count), `AcceptanceCriteriaList`, `TimeTrackingDisplay`
    - Seed: add subtasks + dependencies to existing demo tactics
  - **Phase 8 — Loop Detection & Mission Health Enhancement**:
    - NO new table — enhances existing `attemptCount`/`maxAttempts` on tactics + existing mission health queries
    - Logic: when `attemptCount >= maxAttempts`, auto-set status to `needs_review` with a note "Escalated: max attempts reached". This extends `src/lib/review.ts` or adds to the approval flow.
    - API: `POST /api/tactics/[id]/reset-attempts` (manual reset after human review)
    - Pages: enhance `/tactics/[id]` to show attempt history + escalation badge
    - Components: `AttemptBadge` (shows X/max attempts, color-coded), `EscalationNotice`
    - Cross-ref: "Hermes manages session resilience and auto-continuation. This phase adds dashboard-side escalation when attempts are exhausted. See EXIT-AUDIT §3b."
    - Continuous missions: DEFER to Hermes (state this explicitly — Hermes handles auto-dispatch, dependency chains, parallel agent scheduling). Dashboard only READS mission state.
  - **Phase 9 — Cost & Token Tracking**:
    - Table: `hil_ops.llm_usage` (model, inputTokens, outputTokens, cacheReadTokens, cacheCreationTokens, costUsd, source, tacticId, createdAt)
    - API: `GET /api/usage` (aggregated: tokens by day/week/model, total cost)
    - Integration: modify `src/lib/llm.ts` to log usage after each `chat()` call. Modify `src/lib/review.ts` to log scoring tokens. Modify `src/lib/briefing.ts` to log briefing tokens. Modify brain dump triage to log triage tokens.
    - Pages: `/usage` (charts: tokens over time, cost breakdown by source)
    - Components: `UsagePanel` (dashboard card: tokens today, this week), `UsageChart` (simple bar chart using SVG or CSS — no chart library)
    - Note: `costUsd` is null/0 for self-hosted Qwen3 (free to run). Token counts come from llama.cpp response metadata.
    - Cross-ref: "This enables the Token Tracking idea from the original doc's brainstorm section, now grounded in a real schema."
    - Seed: generate sample usage data (100 rows across 7 days, 2 models)

  **Must NOT do**:
  - Do NOT implement a full DAG visualization — dependency badges + simple lists only
  - Do NOT use a charting library — simple CSS/SVG bars only
  - Do NOT spec continuous missions as a BUILD item — it's DEFERRED to Hermes

  **Recommended Agent Profile**:
  - **Category**: `writing`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (after Task 5)
  - **Blocks**: Tasks 7-9
  - **Blocked By**: Task 5

  **References**:

  **Pattern References**:
  - `src/lib/review.ts` — LLM call pattern (where token logging hooks in for Phase 9)
  - `src/lib/llm.ts` — Homelab LLM client (the `chat()` function to instrument)
  - `src/lib/missions.ts` — Mission health query pattern (Phase 8 extends this)
  - `src/db/schema.ts:114-115` — Existing `attemptCount` / `maxAttempts` on tactics (Phase 8 uses these)

  **Acceptance Criteria**:

  **QA Scenarios:**

  ```
  Scenario: Cycle detection documented
    Tool: Bash (grep)
    Steps:
      1. Run: grep -ci "cycle\|circular\|DFS\|depth.first" docs/MISSION-CONTROL-PORT.md
      2. Assert: count ≥ 1
    Expected Result: Cycle detection algorithm documented for dependencies
    Evidence: .sisyphus/evidence/task-6-cycle-detection.md
  ```

  **Commit**: NO

---

- [ ] 7. **Write Phases 10-11 Detail (Cmd+K Search, API Pagination, In-App Guide)**

  **What to do**:
  - Edit-append three phase sections.
  - **Phase 10 — Cmd+K Global Search**:
    - NO new table — uses Postgres full-text search or ILIKE across existing tables (goals, projects, tactics, brain_dump, agents, skills)
    - API: `GET /api/search?q={query}` — searches title/name/content fields across tables, returns unified results `{ goals: [...], tactics: [...], brainDump: [...], agents: [...], skills: [...] }`
    - Implementation: Use Postgres `ILIKE '%query%'` for simplicity (no new deps, no pg_trgm extension needed). If performance becomes an issue, add `CREATE INDEX ... USING gin (to_tsvector(...))` later.
    - Components: `SearchDialog` (client component, keyboard-driven overlay). Listens for `Cmd+K` / `Ctrl+K`. Debounced input (300ms). Results grouped by entity type. Arrow-key navigation. Enter to navigate.
    - NO `cmdk` package — build with custom React + `useEffect` keyboard listener + Tailwind overlay. This matches the dashboard's existing keyboard shortcut pattern (`src/components/keyboard-help.tsx`).
    - Keyboard integration: register in existing keyboard shortcut system (see `src/app/layout.tsx` for keyboard handler pattern)
  - **Phase 11 — API Pagination + In-App Guide**:
    - Pagination: modify existing GET API routes to accept `?limit=N&offset=M` and return `{ data: [...], meta: { total, filtered, returned, limit, offset } }`. Routes to update: `/api/tactics`, `/api/decisions`, `/api/brain-dump`, `/api/goals`, `/api/skills`.
    - Token optimization: add `?fields=field1,field2` support to `/api/tactics` GET (sparse field selection). This mirrors MC's token-optimized API pattern. Low priority but documented.
    - In-App Guide: `/help` page with: keyboard shortcuts reference, panel descriptions, gate rule explanation, architecture diagram, link to docs.
    - Components: `GuidePage` (static RSC with reference content), reuse `KeyboardHelp` component content
  - After all phases, add a **"Deferred to Hermes / Future"** subsection listing everything NOT being built:
    - Continuous missions → Hermes handles (EXIT-AUDIT §3b)
    - Session resilience → Hermes manages (EXIT-AUDIT §3b)
    - Daemon/scheduler → Hermes is the daemon (EXIT-AUDIT §3b)
    - Inbox auto-respond → Hermes handles agent communication (EXIT-AUDIT §3b)
    - Slash commands → CLI/terminal concept, not dashboard
    - Checkpoints → Homelab filesystem concern
    - Autopilot dashboard → Hermes monitoring panel covers this
    - Templates → Needs use case first
    - Emergency stop → Security-critical, needs Hermes kill-signal integration
    - AI context generation → Dashboard has executive briefing instead
    - Token-optimized API (sparse fields) → Low value for internal dashboard, Phase 11 stub only

  **Must NOT do**:
  - Do NOT specify `cmdk` npm package — custom keyboard overlay only
  - Do NOT spec slash commands as a dashboard feature — they're terminal UX

  **Recommended Agent Profile**:
  - **Category**: `writing`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (after Task 6)
  - **Blocks**: Tasks 8-9
  - **Blocked By**: Task 6

  **References**:

  **Pattern References**:
  - `src/components/keyboard-help.tsx` — Existing keyboard shortcut handler pattern (for Cmd+K registration)
  - `src/app/layout.tsx` — Where keyboard handlers are registered
  - `src/app/api/activity-timeline/route.ts` — Existing API route pattern (for pagination addition)

  **Acceptance Criteria**:

  **QA Scenarios:**

  ```
  Scenario: Deferred features section exists with rationale
    Tool: Bash (grep)
    Steps:
      1. Run: grep -ci "deferred\|hermes handles\|future work" docs/MISSION-CONTROL-PORT.md
      2. Assert: count ≥ 5
    Expected Result: Deferred features clearly documented
    Evidence: .sisyphus/evidence/task-7-deferred-section.md
  ```

  **Commit**: NO

---

- [ ] 8. **Write Qwen3 Prompt Section (All Phases)**

  **What to do**:
  - Edit-append a "Qwen3 Implementation Prompts" section to the document
  - This section REPLACES the old "DeepSeek Prompt Text" section entirely
  - For EACH phase (1-11), write a self-contained prompt that an executor agent can paste directly
  - Each prompt must include:
    1. **Context block**: "You are a senior software engineer working on the FlowManner HIL Dashboard — a Next.js 16 + React 19 + Drizzle ORM + Postgres operational dashboard for human-in-the-loop agent supervision."
    2. **Project path**: `/home/glenn/flowmanner-dashboard-HIL/`
    3. **Mission**: What to build for this specific phase
    4. **Deliverables**: Specific files to create/modify (reference the phase detail above)
    5. **Schema**: "See Database Schema section" + key table names
    6. **Design conventions**: "Match EXISTING code exactly — see Design Conventions section"
    7. **Hard constraints**: (reference the constraints section)
    8. **Verification**: `pnpm typecheck && pnpm lint` + manual test
    9. **Completion**: "Print summary of files created/modified + typecheck result"
  - Also include a **"Qwen3 API Reference"** subsection at the top:
    - Endpoint: `POST http://localhost:11434/v1/chat/completions`
    - Model: active model on homelab (check via `GET http://localhost:9723/models` — the model manager daemon)
    - Auth: none (local network only, WireGuard-gated)
    - Request body: `{ model: "...", messages: [{ role: "system", content: "..." }, { role: "user", content: "..." }], temperature: 0.3, max_tokens: 4000 }`
    - Response: standard OpenAI-compatible format `{ choices: [{ message: { content: "..." } }], usage: { prompt_tokens, completion_tokens, total_tokens } }`
    - Timeout: 30s via `AbortSignal.timeout(30_000)`
    - Fallback: if LLM unreachable, feature degrades gracefully (brain dump entries stay pending, briefing shows "LLM offline")
    - Curl example:
      ```bash
      curl -X POST http://localhost:11434/v1/chat/completions \
        -H "Content-Type: application/json" \
        -d '{"model":"qwen3:27b","messages":[{"role":"user","content":"Hello"}],"temperature":0.3,"max_tokens":100}'
      ```
  - For Phase 2 (Brain Dump Triage), include the FULL system prompt for the triage LLM call:
    - System: "You are a triage assistant. Classify each entry as actionable or not. For actionable entries, suggest converting to a tactic or goal. Return JSON: `{ entries: [{ id, actionable, suggestedType, reasoning }] }`"
    - Include JSON validation requirement: "Parse LLM output as JSON. If invalid JSON, retry once. If still invalid, mark entries as 'triage_error'."
    - Include conversion limit: "Maximum 5 conversions per triage run to prevent runaway."

  **Must NOT do**:
  - Do NOT reference "DeepSeek" anywhere — this section is "Qwen3 Implementation Prompts"
  - Do NOT use function calling / tool calling — Qwen3 via llama.cpp may not support it reliably; use structured JSON in system prompt instead

  **Recommended Agent Profile**:
  - **Category**: `writing`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 4 (after Task 7)
  - **Blocks**: Task 9
  - **Blocked By**: Task 7

  **References**:

  **Pattern References**:
  - `src/lib/llm.ts` — Existing homelab LLM client (`chat()` function) — the prompts must be compatible with this client's interface
  - `src/lib/review.ts` — Existing LLM scoring pattern (system prompt → JSON output) — the triage prompt should follow this pattern
  - `src/lib/briefing.ts` — Existing LLM briefing pattern
  - `docs/DEEPSEEK-MISSION-CONTROL-PORT.md:209-325` — The OLD DeepSeek prompt section being replaced (reference for structure, not content)

  **Acceptance Criteria**:

  **QA Scenarios:**

  ```
  Scenario: Qwen3 reference with curl example
    Tool: Bash (grep)
    Steps:
      1. Run: grep -c "11434" docs/MISSION-CONTROL-PORT.md
      2. Assert: count ≥ 3 (API ref + at least 2 phase prompts)
      3. Run: grep -c "curl" docs/MISSION-CONTROL-PORT.md
      4. Assert: count ≥ 1
      5. Run: grep -ci "deepseek" docs/MISSION-CONTROL-PORT.md
      6. Assert: count = 0
    Expected Result: Qwen3 endpoint referenced, curl example present, zero DeepSeek refs
    Evidence: .sisyphus/evidence/task-8-qwen3-prompts.md
  ```

  **Commit**: NO

---

- [ ] 9. **Write EXIT-AUDIT Cross-Reference + Verification Strategy + Rollback Plan**

  **What to do**:
  - Edit-append two final sections:
  - **"Cross-Reference: EXIT-AUDIT Roadmap"** section:
    - Table mapping MC port phases to EXIT-AUDIT §3 roadmap items:
      - MC Phase 4 (Skills Library) ↔ EXIT-AUDIT P4 (Hermes skill library UI) — "Build local fallback first, integrate with Hermes skill extraction later"
      - MC Phase 5 (Agent Registry) ↔ EXIT-AUDIT P0 (Hermes ACP agent monitoring) — "Already built. Phase 5 adds local CRUD as complement."
      - MC Phase 8 (Loop Detection) ↔ Hermes session resilience — "Dashboard-side escalation complements Hermes auto-continuation"
      - MC Phase 3 (Decision Log) ↔ EXIT-AUDIT P2 (Hermes HITL approval) — "Already built. Phase 3 adds standalone browse view."
      - MC Phase 9 (Cost/Token) ↔ OpenCode token telemetry (EXIT-AUDIT §3a) — "Unify token tracking across homelab LLM + OpenCode"
      - MC Phase 10 (Cmd+K Search) ↔ EXIT-AUDIT P7 (Unified cross-tool timeline) — "Search is the entry point; timeline is one search destination"
      - Deferred items (continuous missions, daemon, session resilience) ↔ Hermes — "Hermes IS the daemon/mission/session manager"
    - Add a "Sequencing Recommendation" note: "Build MC port Phases 1-7 first (Postgres-backed features), then resume EXIT-AUDIT P3-P7 (OpenClaw integration). MC port is self-contained; EXIT-AUDIT P3+ depends on OpenClaw being deployed."
  - **"Verification Strategy"** section:
    - Per-phase verification checklist: `pnpm typecheck` + `pnpm lint` + `pnpm build` (not just dev mode) + manual browser test
    - Schema isolation test: verify `pnpm db:push` only affects `hil_ops` schema, never `public`
    - Seed idempotency test: run seed twice, verify no duplicate rows
    - Dark mode test: toggle theme, verify all new panels render correctly in dark mode
    - RSC test: verify data-fetching panels work without client-side JS (disable JS in browser, page should still render via RSC)
    - LLM offline test: stop llama-server (`sudo systemctl stop llama-server`), verify brain dump triage and briefing degrade gracefully
    - Rollback procedure per phase: `DROP TABLE hil_ops.{table}` + remove files + revert nav items
  - Finally, add a **"When Done"** section (matching the original doc's ending):
    - Print summary: files created/modified, typecheck/lint result, which features are visible in browser
    - Do NOT push to origin — Glenn reviews, Hermes verifies and commits

  **Must NOT do**:
  - Do NOT spec OpenClaw integration (that's EXIT-AUDIT territory, not MC port)

  **Recommended Agent Profile**:
  - **Category**: `writing`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 4 (after Task 8)
  - **Blocks**: F1-F4 (verification wave)
  - **Blocked By**: Task 8

  **References**:

  **Pattern References**:
  - `docs/EXIT-AUDIT-2026-07-02.md:185-451` — The full OpenCode/Hermes/OpenClaw roadmap (must cross-reference accurately)
  - `docs/EXIT-AUDIT-2026-07-02.md:415-427` — Implementation priority table (P0-P7)
  - `package.json` scripts — verification commands (`typecheck`, `lint`, `build`, `db:push`, `seed`)

  **Acceptance Criteria**:

  **QA Scenarios:**

  ```
  Scenario: EXIT-AUDIT cross-reference present and accurate
    Tool: Bash (grep)
    Steps:
      1. Run: grep -ci "exit-audit" docs/MISSION-CONTROL-PORT.md
      2. Assert: count ≥ 3
      3. Run: grep -ci "hermes" docs/MISSION-CONTROL-PORT.md
      4. Assert: count ≥ 5 (multiple cross-references)
    Expected Result: EXIT-AUDIT and Hermes referenced throughout
    Evidence: .sisyphus/evidence/task-9-cross-ref.md

  Scenario: Verification strategy is comprehensive
    Tool: Bash (grep)
    Steps:
      1. Run: grep -ci "pnpm build\|pnpm typecheck\|pnpm lint\|db:push\|dark mode\|RSC\|LLM offline" docs/MISSION-CONTROL-PORT.md
      2. Assert: count ≥ 6
    Expected Result: All verification dimensions covered
    Evidence: .sisyphus/evidence/task-9-verification.md
  ```

  **Commit**: YES (single final commit for entire rewrite)
  - Message: `docs: rewrite Mission Control Port spec — comprehensive gap coverage, Qwen3 prompts, EXIT-AUDIT alignment`
  - Files: `docs/MISSION-CONTROL-PORT.md` (renamed from `DEEPSEEK-MISSION-CONTROL-PORT.md`)
  - Pre-commit: `grep -ri deepseek docs/MISSION-CONTROL-PORT.md` must return nothing

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Read the rewritten document end-to-end. Verify all 32 gap categories are addressed. Verify zero DeepSeek references. Verify every phase has schema + API + components + prompt. Check "Pre-flight: Already Built" section exists and is accurate against actual codebase state. Verify EXIT-AUDIT cross-reference maps correctly.
  Output: `Gaps [32/32] | DeepSeek refs [0] | Phases [N/N complete] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Markdown Quality + Convention Check** — `unspecified-high`
  Verify all markdown is syntactically valid (tables render, code blocks have language tags, no broken links). Verify design conventions section matches actual `src/components/` patterns (check `system-health-panel.tsx`, `activity-timeline-panel.tsx` for panel class strings). Verify all Drizzle schema code uses `hilOps.table()` pattern. Check Qwen3 prompts have model name, temperature, max_tokens, JSON schema, timeout, fallback.
  Output: `Markdown [VALID/INVALID] | Conventions [MATCH/MISMATCH] | Schema [CORRECT/WRONG] | VERDICT`

- [ ] F3. **Gap Coverage Verification** — `unspecified-high`
  For each of the 32 non-Field-Ops gaps from the draft: search the document for coverage. Gaps: Eisenhower Matrix, multi-agent collaborators, task dependencies, subtasks, acceptance criteria, time tracking, cost/token tracking, continuous missions, loop detection, session resilience, Cmd+K search, API pagination, token-optimized API, ventures, checkpoints, autopilot dashboard, guide, templates, emergency stop, slash commands, activity log table, agent instructions/capabilities/skills/status, goal hierarchy/milestones/types, project color/team/tags. Report any gap that has no coverage in the document.
  Output: `Covered [N/32] | Missing [list] | VERDICT`

- [ ] F4. **Cross-Reference Integrity Check** — `deep`
  Verify all file paths referenced in the document exist in the actual codebase (`src/db/schema.ts`, `src/lib/data.ts`, `src/app/page.tsx`, etc.). Verify EXIT-AUDIT references (section numbers, feature names) match the actual `docs/EXIT-AUDIT-2026-07-02.md`. Verify MC reference paths point to real files in `mission-control/mission-control/`. Verify table names in schema code match names in prose. Verify API route paths follow existing convention (`/api/{resource}/route.ts`).
  Output: `Paths [N/N exist] | EXIT-AUDIT refs [N/N valid] | MC refs [N/N valid] | VERDICT`

---

## Commit Strategy

- **Single commit**: `docs: rewrite Mission Control Port spec — comprehensive gap coverage, Qwen3 prompts, EXIT-AUDIT alignment`
  - Files: `docs/MISSION-CONTROL-PORT.md` (new), `docs/DEEPSEEK-MISSION-CONTROL-PORT.md` (deleted via git mv)
  - Pre-commit: verify markdown renders, verify no DeepSeek references

---

## Success Criteria

### Verification Commands
```bash
# No DeepSeek references remain
grep -ri "deepseek" docs/MISSION-CONTROL-PORT.md  # Expected: no matches

# All 32 gap keywords appear in document
grep -ci "eisenhower" docs/MISSION-CONTROL-PORT.md  # Expected: ≥1
grep -ci "subtask" docs/MISSION-CONTROL-PORT.md     # Expected: ≥1
grep -ci "blocked" docs/MISSION-CONTROL-PORT.md     # Expected: ≥1
grep -ci "token" docs/MISSION-CONTROL-PORT.md       # Expected: ≥1

# Qwen3 referenced (not DeepSeek)
grep -ci "qwen3\|homelab llm\|:11434" docs/MISSION-CONTROL-PORT.md  # Expected: ≥5

# EXIT-AUDIT cross-referenced
grep -ci "exit-audit" docs/MISSION-CONTROL-PORT.md  # Expected: ≥1
```

### Final Checklist
- [ ] All 32 non-Field-Ops gaps covered
- [ ] Zero DeepSeek references
- [ ] Every phase has Qwen3 prompt with curl + error handling
- [ ] Pre-flight "Already Built" section accurate
- [ ] EXIT-AUDIT cross-reference present and correct
- [ ] All Drizzle schema uses `hilOps.table()` pattern
- [ ] Design conventions match actual codebase
- [ ] No Field Ops content anywhere
- [ ] No new npm dependencies mentioned
