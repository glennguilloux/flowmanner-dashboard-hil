# HIL Dashboard — Agent-Orchestration Enhancement Plan

**Date:** 2026-07-03
**Author:** Hermes (research) + Glenn (review)
**Status:** Planning — pending DeepSeek implementation

## Context

Researched the top repos tagged `agent-orchestration` on GitHub (Mission Control, TAKT, Babysitter, Agor, open-multi-agent, Omnigent, opensessions, AgentsMesh) and mapped their features against:

1. What the HIL dashboard already has (schema in `src/db/schema.ts`, 44 API routes, 50+ components)
2. What the FlowManner backend already exposes (mission CQRS with SSE streams, inbox_items, triggers, webhooks, swarm, HITL config, circuit breakers, observability)

The goal: identify features that (a) add real HITL value, (b) leverage existing FM backend endpoints, and (c) fit the dashboard's Next.js 16 + Drizzle + Postgres `hil_ops` schema architecture.

## What the Dashboard Has Today

- **Core HITL:** Strategies → Tactics → Approval Gate (`confidence<70 || risk=high || explicit`) → LLM Reviewer (Qwen3-27B) → 4-scope approvals → message threads
- **Operations:** System Health (5-service parallel ping), Model Swap (llama-server :9723), Kanban (board.json), PR sync with CI rollup, OpenCode telemetry, Hermes REST (:8642)
- **Planning:** Goals (Eisenhower matrix), Projects, Brain Dump (voice/slack/email→triage), Skills DB, LLM Usage tracking, Search
- **FM Integration:** Reads `public.inbox_items` (read-only), missions panel (read-only), PR sync via `gh`

## What FM Backend Exposes but Dashboard Doesn't Use

| FM Feature | Endpoint | Dashboard Status |
|---|---|---|
| Mission SSE stream | `GET /api/v2/missions/{id}/stream` | Not consumed |
| Mission tasks/logs | `GET /api/v2/missions/{id}/tasks` | Not consumed |
| Triggers (cron/event) | `GET /api/v1/triggers` | Not surfaced |
| Webhooks delivery | `GET /api/v1/webhooks` | Not surfaced |
| Swarm orchestration | `GET /api/v1/swarm` | Not surfaced |
| Circuit breaker state | `GET /api/v1/missions/{id}/circuit-breaker` | Not surfaced |
| Mission improvements | `GET /api/v2/missions/{id}/improvements` | Not surfaced |
| Observability/metrics | `GET /api/v1/observability` | Not surfaced |
| HITL inbox resolution | `POST` (resolve inbox_item) | Dashboard reads only — no writeback |
| Plan candidates | `GET /api/v2/missions/{id}/plan-candidates` | Not surfaced |

---

## Enhancement Phases (Priority Order)

### Phase 1: FM Mission Live Feed (SSE Bridge)

**Source pattern:** open-multi-agent (post-run dashboard), Agor (real-time agent work)
**FM dependency:** `GET /api/v2/missions/{id}/stream` already exists (SSE, `text/event-stream`)
**Dashboard gap:** Missions panel is static read-only; no live execution visibility

**What to build:**
- New API route: `GET /api/missions/[id]/stream` — Next.js Route Handler that proxies the FM SSE stream and re-emits events to the browser
- New component: `MissionLiveFeed` — subscribes to the SSE, shows task-by-task progress, status changes, token counts in real-time
- Wire into the existing `DashboardMissionsPanel` — add a "Live" badge on active missions that opens the feed

**Why first:** Highest impact, lowest effort. FM already produces the stream. The dashboard just needs a thin SSE proxy and a consumer component. This immediately makes the dashboard feel "alive" for mission execution.

**Key files to create:**
- `src/app/api/missions/[id]/stream/route.ts` — SSE proxy
- `src/lib/fm-sse.ts` — FM SSE client helper
- `src/components/mission-live-feed.tsx` — consumer component

---

### Phase 2: Immutable Event Journal

**Source pattern:** Babysitter (immutable journal for every decision), TAKT (traceability)
**Dashboard gap:** Tactic state transitions mutate `updatedAt` — no append-only audit trail. Debugging "why did this tactic get approved/rejected?" is impossible.

**What to build:**
- New table: `hil_ops.tactic_events` (append-only, never UPDATE or DELETE)
  - `id`, `tacticId`, `eventType` (enum: proposed/reviewed/gated/approved/rejected/escalated/executed/completed/failed), `fromStatus`, `toStatus`, `actorType` (human/agent/system), `actorName`, `detail` (jsonb), `metadata` (jsonb: confidence, riskLevel, tokensUsed, etc.), `createdAt`
- New function: `logTacticEvent()` — called from every state transition in the existing API routes (review.ts, approve route, escalation, inbox sync)
- New component: `EventTimeline` — chronological view of all events for a single tactic, shown on the tactic detail page
- Backfill: one-time migration that reconstructs initial events from existing `approvals` and `messages` tables

**Why second:** Enables debugging, audit compliance, and is the foundation for Phase 4 (DAG visualizer needs event timestamps) and Phase 6 (calibration scoring needs transition history).

**Key files to create/modify:**
- `src/db/schema.ts` — add `tacticEvents` table + enums
- `src/lib/event-journal.ts` — `logTacticEvent()` + query helpers
- `src/app/api/tactics/[id]/events/route.ts` — GET endpoint
- `src/components/event-timeline.tsx` — timeline component
- Modify: `src/lib/review.ts`, `src/app/api/tactics/[id]/approve/route.ts`, `src/lib/review.ts` (escalation) — add `logTacticEvent()` calls

---

### Phase 3: Strategy/Tactic YAML Export-Import

**Source pattern:** TAKT (YAML topology), Omnigent (agent YAML spec)
**Dashboard gap:** Strategies and their gate rules live only in Postgres — no version control, no sharing, no declarative review

**What to build:**
- New API routes:
  - `GET /api/strategies/[id]/export` — returns a YAML document
  - `POST /api/strategies/import` — accepts YAML, creates strategy + child tactics
- YAML schema (v1):
  ```yaml
  version: 1
  strategy:
    title: "Database rotation"
    description: "..."
    goal: "..."
    rules: "..."
    human_gate_triggers: "confidence<70 OR risk=high"
    status: active
  tactics:
    - title: "Rotate DB credentials"
      description: "..."
      steps: ["...", "..."]
      risk_level: high
      max_attempts: 3
      acceptance_criteria: ["..."]
  ```
- New component: `StrategyExportButton` + `StrategyImportDialog`
- Store exported YAMLs in a `docs/strategies/` directory for git tracking

**Why third:** Low effort, makes the HITL workflow declarative and version-controlled. Aligns with the "source of truth in code" philosophy.

**Key files to create:**
- `src/app/api/strategies/[id]/export/route.ts`
- `src/app/api/strategies/import/route.ts`
- `src/lib/yaml-strategy.ts` — serialize/parse logic
- `src/components/strategy-export-import.tsx`
- Add `js-yaml` to `package.json` dependencies

---

### Phase 4: Post-Run DAG Visualizer

**Source pattern:** open-multi-agent (task DAG with per-node assignee, status, token breakdown)
**Dashboard gap:** `tactic_dependencies` table exists but there's no visual graph. Understanding parallel vs. serial execution is impossible.

**What to build:**
- New page: `/strategies/[id]/dag` — full-page DAG visualization
- Use React Flow (`@xyflow/react`) to render nodes (tactics) and edges (dependencies)
- Node data: title, status (color-coded), agent assignee, confidence %, risk badge, token cost (from `llm_usage`)
- Edge data: dependency type (blocking)
- Click a node → side panel with tactic detail + event timeline (from Phase 2)
- "Replay" mode: slider that scrubs through events chronologically, highlighting nodes as they transition states

**Why fourth:** Single most visually impactful feature. Depends on Phase 2 (events) for replay mode. React Flow is the industry standard for this.

**Key files to create:**
- `src/app/strategies/[id]/dag/page.tsx` — DAG page
- `src/components/dag-graph.tsx` — React Flow wrapper
- `src/components/dag-node-card.tsx` — custom node renderer
- `src/lib/dag-layout.ts` — graph data builder from tactics + dependencies
- Add `@xyflow/react` to `package.json`

---

### Phase 5: FM Inbox Writeback + HITL Resolution

**Source pattern:** Mission Control (quality gates), Babysitter (deterministic enforcement)
**FM dependency:** `public.inbox_items` table has `status` column (pending→resolved), FM backend has resolution endpoints
**Dashboard gap:** Dashboard reads inbox_items and creates tactics from them, but resolving a tactic doesn't write back to the FM inbox_item — the FM agent stays blocked forever

**What to build:**
- New API route: `POST /api/inbox/[itemId]/resolve` — writes resolution back to FM
  - Updates `public.inbox_items` SET `status = 'resolved'`, `resolved_at = now()`, `resolution = {decision, notes, resolvedBy}`
  - Or calls the FM backend resolution endpoint if one exists (check `app/api/v1/` for inbox resolution route)
- Wire into existing tactic approval flow: when an inbox-sourced tactic is approved/rejected, auto-resolve the corresponding inbox_item
- New component: `InboxResolutionBadge` on tactic detail page showing linked inbox_item status

**Why fifth:** Closes the HITL loop. Currently the dashboard is read-only on FM's inbox — the human decides but FM never learns about it. This makes the dashboard a true two-way HITL surface.

**Key files to create/modify:**
- `src/app/api/inbox/[itemId]/resolve/route.ts`
- `src/lib/fm-inbox.ts` — resolution writeback helper
- Modify: `src/app/api/tactics/[id]/approve/route.ts` — add inbox resolution call for `source='inbox'` tactics

---

### Phase 6: FM Mission Deep Linking

**Source pattern:** Agor (git worktree visualization), AgentsMesh (multi-machine agent steering)
**FM dependency:** Full mission API (`/api/v2/missions/*`) with tasks, logs, improvements, plan candidates
**Dashboard gap:** Missions panel shows basic data; no deep link to mission tasks, logs, or improvements

**What to build:**
- Enhanced missions panel with expandable rows:
  - Task list with status badges
  - Recent mission logs (last 10)
  - Plan candidates (if mission has been planned)
  - Improvement suggestions
  - Circuit breaker status
- "Open in FM" link to the FlowManner frontend mission page
- Mission SSE stream button (links to Phase 1)

**Why sixth:** Leverages a wealth of FM backend data that's already available but invisible. Medium effort, high information density.

**Key files to create:**
- `src/lib/fm-missions.ts` — FM mission API client (v2 envelope-aware)
- `src/components/mission-detail-panel.tsx` — expandable detail view
- Modify: `src/components/dashboard-missions-panel.tsx` — add expand trigger

---

### Phase 7: Agent Sidecar HTTP Protocol

**Source pattern:** opensessions (local HTTP API for agent status push)
**Dashboard gap:** Agent status is pull-only (Hermes REST, OpenCode telemetry). Agents can't push updates to the dashboard.

**What to build:**
- New API route: `POST /api/agent/ping` — accepts structured status updates from any agent
  ```typescript
  {
    agentId: string;
    status: "working" | "idle" | "waiting" | "error" | "done";
    task: string;
    progress?: number; // 0-100
    logLine?: string;
    tone?: "neutral" | "info" | "success" | "warn" | "error";
  }
  ```
- Store pings in new table: `hil_ops.agent_heartbeats` (id, agentId, status, task, progress, logLine, tone, createdAt)
- New component: `AgentHeartbeat` — live-updating card showing each agent's last ping, with color-coded tone
- Expiration: heartbeats older than 5 minutes auto-show as "stale"

**Why seventh:** Enables agents (Hermes, OpenCode, future Codex) to actively report status, turning the dashboard from pull-based to push-based for agent monitoring.

---

### Phase 8: Triggers & Webhooks Panel (FM Surface)

**Source pattern:** Mission Control (recurring tasks, webhooks, alerts)
**FM dependency:** FM has `/api/v1/triggers` and `/api/v1/webhooks` routers
**Dashboard gap:** No visibility into FM's trigger/webhook system

**What to build:**
- New panel: Triggers — list FM triggers (cron + event), show next fire time, last fire result, enable/disable toggle
- New panel: Webhooks — list webhook endpoints, delivery history, retry button for failed deliveries
- Read-only initially; add write operations in a follow-up

---

## Dependency Graph

```
Phase 1 (SSE)          ──→ standalone
Phase 2 (Event Journal) ──→ feeds Phase 4 (replay)
Phase 3 (YAML)          ──→ standalone
Phase 4 (DAG)           ──→ depends on Phase 2
Phase 5 (Inbox Writeback)──→ standalone
Phase 6 (Mission Deep Link)──→ enhanced by Phase 1
Phase 7 (Sidecar)       ──→ standalone
Phase 8 (Triggers)      ──→ standalone
```

**Recommended DeepSeek execution order:** 1 → 2 → 5 → 3 → 6 → 4 → 7 → 8

## Constraints (from AGENTS.md + memory)

- Self-hosted LLM only (Qwen3-27B on llama.cpp :11434) — no SaaS fallback
- Schema isolation: all new tables in `hil_ops` schema, never touch FM's `public` schema
- Next.js 16 App Router, React 19, Drizzle 0.45, Tailwind v4
- No new external services (no Redis, no new Docker containers)
- All FM reads go through the existing Postgres pool or HTTP API
- Verify with `pnpm typecheck && pnpm lint && pnpm build`

## New Dependencies Required

| Phase | Package | Why |
|---|---|---|
| 3 | `js-yaml` + `@types/js-yaml` | YAML serialization |
| 4 | `@xyflow/react` | React Flow DAG renderer |
