# DeepSeek Prompt — HIL Dashboard Agent-Orchestration Enhancements

## How to use this prompt

Paste everything between the `---PROMPT START---` and `---PROMPT END---` markers into
DeepSeek. It is self-contained and does not require any prior conversation context.

---

---PROMPT START---

You are a senior TypeScript/React engineer working on the FlowManner HIL Dashboard — a Next.js 16
control surface for agent tactics, human approval gates, and homelab operations.

## Project context

**Location:** `/home/glenn/flowmanner-dashboard-HIL/`
**Stack:** Next.js 16 (App Router, RSC + client) · React 19 · Drizzle ORM 0.45 · Postgres 15 ·
Tailwind v4 · lucide-react · date-fns

**What the dashboard does:** Strategies contain Tactics (proposed actions). Each tactic is scored by
a self-hosted LLM (Qwen3-27B on llama.cpp :11434) for confidence + risk. If confidence < 70 OR
risk = high OR the tactic explicitly requires human approval, it enters a human gate. The operator
approves/rejects/requests-more-info. PR-sourced tactics also trigger `gh pr review` actions.
Inbox-sourced tactics come from FlowManner's `public.inbox_items` table.

**Schema isolation rule:** ALL dashboard tables live in the `hil_ops` Postgres schema. NEVER create
tables in the `public` schema — that belongs to FlowManner's alembic-managed backend. When you need
to read FM data (inbox_items, missions), use read-only raw SQL via `db.execute(sql\`...\`)`.

**Self-hosted LLM rule:** Any AI feature uses the homelab llama.cpp server (:11434, Qwen3-27B).
NEVER use OpenAI, Anthropic, Google, or DeepSeek APIs. The existing `src/lib/llm.ts` handles this.

**Verification:** After all changes, run `pnpm typecheck && pnpm lint && pnpm build`. Fix any errors
before reporting done. Do NOT run `pnpm db:push` — the user handles schema migrations manually.

**Do NOT commit.** Write code, run verification, report results. The user reviews and commits.

## Key files to read first (understand before coding)

Before writing ANY code, read these files to understand conventions:

1. `src/db/schema.ts` — all table definitions, enum patterns, index patterns. Note how tables use
   `hilOps.table("name", {...})` and enums use `hilOps.enum("name", [...])`.
2. `src/db/index.ts` — Drizzle + pg Pool setup. `db` is the Drizzle instance with schema.
3. `src/lib/gate.ts` — the gate rule (single source of truth for human approval triggers).
4. `src/lib/review.ts` — LLM scoring function + escalation logic. Follow this pattern for new
   background logic.
5. `src/app/api/tactics/[id]/approve/route.ts` — POST handler pattern, auth check (`isUnauthorized()`),
   `getDefaultUser()`, idempotency guard, message insertion.
6. `src/app/api/decisions/route.ts` — simple GET route with pagination pattern.
7. `src/lib/inbox.ts` — raw SQL reader for FM's `public.inbox_items` table.
8. `src/lib/hermes-acp.ts` — external API client pattern (fetch with timeout, error handling).
9. `src/app/api/system-health/route.ts` — GET endpoint that delegates to lib function.
10. `src/components/approval-gate.tsx` — client component pattern with loading states.

## API route conventions

- Every route file starts with `export const dynamic = "force-dynamic";`
- Auth check: `if (await isUnauthorized()) { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }`
- GET endpoints return `NextResponse.json({ ok: true, data, meta: {...} })`
- Error responses: `NextResponse.json({ ok: false, error: "message" }, { status: 4XX|5XX })`
- Import `db` from `@/db`, schema from `@/db/schema`, lib functions from `@/lib/*`

## Component conventions

- Client components: `"use client"` directive, `useEffect` for data fetching, loading/error states
- Use lucide-react icons (already a dependency)
- Use date-fns for date formatting (already a dependency)
- Tailwind v4 for styling — match existing component patterns

## Enhancement plan

Implement these phases IN ORDER. Complete each phase fully (code + typecheck + build) before
starting the next. After each phase, report what you built and any issues.

### PHASE 1: FM Mission Live Feed (SSE Bridge)

The FlowManner backend exposes an SSE stream at `GET /api/v2/missions/{id}/stream` that emits
mission status changes and task updates in real-time. The dashboard should consume this.

**Build:**

1. `src/lib/fm-missions.ts` — FM API client:
   - `FM_BASE_URL` from `process.env.FM_API_URL ?? "http://localhost:8000"`
   - `streamMission(missionId: string): ReadableStream<Uint8Array>` — proxies the FM SSE endpoint,
     returns a ReadableStream that the route handler can pipe to the response
   - `getMission(missionId: string)` — GET `/api/v2/missions/{id}`, unwrap v2 envelope
     (`response.data`), return mission object or null
   - `getMissionTasks(missionId: string)` — GET `/api/v2/missions/{id}/tasks`
   - Handle 404 and connection-refused gracefully (return null, don't throw)

2. `src/app/api/missions/[id]/stream/route.ts` — SSE proxy route handler:
   - `export const dynamic = "force-dynamic"`
   - GET handler that calls `streamMission(id)`, returns a `Response` with
     `headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "Connection": "keep-alive" }`
   - If FM is unreachable, return a single SSE event `data: {"type":"error","message":"FM backend unreachable"}\n\n` then close

3. `src/components/mission-live-feed.tsx` — client component:
   - `"use client"`
   - Props: `{ missionId: string }`
   - Uses `EventSource` to connect to `/api/missions/${missionId}/stream`
   - Shows: mission status badge, task progress (completed/total), per-task status list
   - Auto-reconnects on disconnect (EventSource does this natively)
   - Shows "Connecting..." / "Live" / "Disconnected" indicator
   - Clean up EventSource on unmount

4. Modify `src/components/dashboard-missions-panel.tsx`:
   - Add a "Live" button on each active mission that opens the `MissionLiveFeed` in a collapsible
     section below the mission row

### PHASE 2: Immutable Event Journal

Currently tactic state transitions are invisible — `updatedAt` is mutated, history is lost. Build
an append-only event journal.

**Build:**

1. In `src/db/schema.ts`, add:

```typescript
export const tacticEventType = hilOps.enum("tactic_event_type", [
  "proposed",
  "reviewed",
  "gated",
  "approved",
  "rejected",
  "requested_info",
  "escalated",
  "execution_started",
  "completed",
  "failed",
  "reset",
]);

export const tacticEvents = hilOps.table(
  "tactic_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tacticId: uuid("tactic_id")
      .notNull()
      .references(() => tactics.id, { onDelete: "cascade" }),
    eventType: tacticEventType("event_type").notNull(),
    fromStatus: text("from_status"),
    toStatus: text("to_status"),
    actorType: authorType("actor_type").notNull(),
    actorName: text("actor_name").notNull(),
    detail: text("detail"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    tacticIdx: index("tactic_events_tactic_id_idx").on(table.tacticId),
    tacticCreatedIdx: index("tactic_events_tactic_created_idx").on(
      table.tacticId,
      table.createdAt,
    ),
  }),
);
```

2. `src/lib/event-journal.ts`:
   - `logTacticEvent(params): Promise<void>` — INSERT into tactic_events. Fire-and-forget
     (don't block the caller; use `.catch(console.error)` pattern). Never throws.
   - `getTacticEvents(tacticId): Promise<TacticEvent[]>` — SELECT all events for a tactic,
     ordered by createdAt ASC
   - `getRecentEvents(limit): Promise<TacticEvent[]>` — most recent events across all tactics

3. `src/app/api/tactics/[id]/events/route.ts` — GET endpoint returning events for a tactic

4. Wire `logTacticEvent()` calls into existing transitions:
   - `src/lib/review.ts` `scoreTactic()` — log "reviewed" event after scoring, "gated" event if
     needsGate returns true
   - `src/app/api/tactics/[id]/approve/route.ts` — log "approved" / "rejected" / "requested_info"
     event
   - `src/lib/review.ts` `escalateExhaustedTactics()` — log "escalated" event
   - `src/app/api/tactics/[id]/reset-attempts/route.ts` — log "reset" event

5. `src/components/event-timeline.tsx` — client component:
   - Vertical timeline showing each event with icon (per eventType), actor, timestamp, detail
   - Color-coded: green for approved/completed, red for rejected/failed, amber for gated/escalated

6. Add the timeline to the tactic detail page (`src/app/tactics/[id]/page.tsx`) below the
   existing message thread

### PHASE 3: Strategy YAML Export-Import

Make strategies declarative and version-controllable via YAML.

**Build:**

1. `pnpm add js-yaml && pnpm add -D @types/js-yaml`

2. `src/lib/yaml-strategy.ts`:
   - `exportStrategyToYaml(strategyId): Promise<string>` — loads strategy + child tactics, builds
     a plain object, returns `yaml.dump()` string
   - `parseStrategyYaml(yamlString): ParsedStrategy` — `yaml.load()`, validate shape
   - `importStrategyFromYaml(yamlString): Promise<Strategy>` — parse, INSERT strategy, INSERT
     child tactics in a transaction

3. YAML schema (v1):
```yaml
version: 1
strategy:
  title: "..."
  description: "..."
  goal: "..."
  rules: "..."
  human_gate_triggers: "..."
  status: active
tactics:
  - title: "..."
    description: "..."
    steps: ["...", "..."]
    risk_level: medium
    max_attempts: 3
    acceptance_criteria: ["..."]
    confidence: 0
```

4. `src/app/api/strategies/[id]/export/route.ts` — GET, returns YAML with
   `Content-Type: application/x-yaml`, `Content-Disposition: attachment; filename="strategy-{id}.yaml"`

5. `src/app/api/strategies/import/route.ts` — POST, accepts YAML body, calls
   `importStrategyFromYaml()`, returns created strategy

6. `src/components/strategy-export-import.tsx` — client component with:
   - Export button on strategy detail page (triggers download)
   - Import button + file picker + YAML textarea preview

7. Add to the strategy detail page or strategy list page

### PHASE 4: Post-Run DAG Visualizer

Visualize tactic dependencies as a directed acyclic graph.

**Build:**

1. `pnpm add @xyflow/react`

2. `src/lib/dag-layout.ts`:
   - `buildDagData(strategyId)` — loads tactics + tactic_dependencies, returns
     `{ nodes: Node[], edges: Edge[] }` for React Flow
   - Node data: `{ id, label, status, confidence, riskLevel, agentName, tokensUsed }`
   - Edge data: from blockerId to blockedId

3. `src/components/dag-node-card.tsx` — custom React Flow node:
   - Shows tactic title, status color bar, confidence %, risk badge
   - Color: green=completed/approved, blue=running, amber=needs_review, gray=proposed,
     red=rejected/failed

4. `src/components/dag-graph.tsx` — React Flow wrapper:
   - `"use client"` (React Flow needs client-side)
   - Renders the graph with controls (zoom, fit-view)
   - Node click → callback that opens side panel

5. `src/app/strategies/[id]/dag/page.tsx` — full-page DAG view:
   - Server component that loads initial data, passes to client `DagGraph`
   - Side panel showing selected tactic detail (reuse existing tactic detail components)
   - "Open strategy" link back to the strategy detail page

6. Add a "View DAG" button on the strategy detail page linking to `/strategies/[id]/dag`

### PHASE 5: FM Inbox Writeback

Close the HITL loop — resolving a tactic in the dashboard should write back to FM's inbox_items.

**Build:**

1. `src/lib/fm-inbox.ts`:
   - `resolveInboxItem(itemId: string, resolution: { decision: string, notes: string })`:
     - Runs `UPDATE public.inbox_items SET status = 'resolved', resolved_at = NOW(),
       resolution = '${JSON string}' WHERE id = '${itemId}'` via `db.execute(sql\`...\`)`
     - Use parameterized queries, NEVER string interpolation for values — use
       `sql.raw()` or Drizzle's `sql` template with proper parameter binding
     - Returns `{ ok: boolean, error?: string }`

2. `src/app/api/inbox/[itemId]/resolve/route.ts` — POST endpoint:
   - Auth check
   - Calls `resolveInboxItem(itemId, body)`
   - Logs a tactic event (Phase 2) linking the inbox item to the resolution
   - Returns the result

3. Modify `src/app/api/tactics/[id]/approve/route.ts`:
   - After the existing approval logic, if `tactic.source === 'inbox'` and
     `tactic.sourceId` is set, call `resolveInboxItem(tactic.sourceId, { decision, notes })`
   - Wrap in try/catch — inbox resolution failure should NOT block the approval
   - Log success/failure to console

### PHASE 6: Enhanced Mission Detail Panel

Surface more FM mission data (tasks, logs, improvements, circuit breaker).

**Build:**

1. Add to `src/lib/fm-missions.ts` (from Phase 1):
   - `getMissionLogs(missionId, limit=10)` — GET `/api/v2/missions/{id}/logs`
   - `getMissionImprovements(missionId)` — GET `/api/v2/missions/{id}/improvements`
   - Unwrap v2 envelope on each (`response.data`)

2. `src/components/mission-detail-panel.tsx` — expandable panel:
   - Fetches tasks, logs, improvements on expand (lazy load)
   - Renders: task list with status badges, recent logs (code-block style), improvement suggestions
   - Links to Phase 1 SSE stream + FM frontend "open in FM" link
   - Error state if FM backend is down

3. Modify `src/components/dashboard-missions-panel.tsx` — replace static mission row with
   expandable `MissionDetailPanel` trigger

### PHASE 7: Agent Sidecar HTTP Protocol

Allow agents to push status updates to the dashboard.

**Build:**

1. In `src/db/schema.ts`, add:

```typescript
export const agentHeartbeats = hilOps.table(
  "agent_heartbeats",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    agentId: text("agent_id").notNull(),
    status: text("status").notNull(), // working|idle|waiting|error|done
    task: text("task").notNull(),
    progress: integer("progress"),
    logLine: text("log_line"),
    tone: text("tone").notNull().default("neutral"), // neutral|info|success|warn|error
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    agentCreatedIdx: index("agent_heartbeats_agent_created_idx").on(
      table.agentId,
      table.createdAt,
    ),
  }),
);
```

2. `src/app/api/agent/ping/route.ts` — POST endpoint:
   - Accepts `{ agentId, status, task, progress?, logLine?, tone? }`
   - No auth check (intranet-only, agents push from localhost)
   - INSERT into agent_heartbeats
   - Return `{ ok: true }`

3. `src/app/api/agent/heartbeats/route.ts` — GET endpoint:
   - Returns latest heartbeat per agentId (DISTINCT ON agentId ORDER BY createdAt DESC)
   - Include a `stale` boolean (true if createdAt older than 5 minutes)

4. `src/components/agent-heartbeat-panel.tsx` — client component:
   - Polls `/api/agent/heartbeats` every 10 seconds
   - Shows each agent as a card with: name/icon, status indicator, current task, progress bar,
     last log line, tone-colored border (green=success, red=error, amber=warn)
   - Stale agents shown faded with "stale" badge

5. Add the panel to the sidebar or dashboard as a new section

## Final checklist (run after ALL phases)

```bash
pnpm typecheck   # must pass with 0 errors
pnpm lint        # must pass with 0 errors
pnpm build       # must succeed
```

Report a summary of:
- Files created (with full paths)
- Files modified (with full paths)
- Any new dependencies added
- Any decisions you made that deviate from this plan (and why)
- Typecheck / lint / build results

## STOP RULES

1. Do NOT commit or push — leave changes in the working tree for human review
2. Do NOT run `pnpm db:push` — the user runs schema migrations manually
3. Do NOT modify anything under `/opt/flowmanner/backend/` — that is a separate codebase
4. Do NOT use any SaaS LLM APIs — only the homelab llama.cpp at :11434
5. Do NOT create tables in the `public` Postgres schema — only `hil_ops`

---PROMPT END---

