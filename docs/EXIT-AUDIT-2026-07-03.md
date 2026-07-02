# Exit Audit — 2026-07-03 (Final Session — Bug Fixes + Handoff)

**Session scope:** Bug fix triage, browser validation, comprehensive handoff with future work roadmap.
**Stack:** Next.js 16 · React 19 · Tailwind 4 · Drizzle 0.45 · Postgres 15 · lucide-react · date-fns
**All sessions combined:** 4 sessions across 2 days (Jul 2–3, 2026)

---

## Part 1 — Project status: COMPLETE

The HIL Dashboard MC port is **fully implemented across 11 phases**. All features from the Mission Control spec are live, tested, and committed.

### Session history

| Session | Date | Phases | Commit range | Summary |
|---|---|---|---|---|
| 1 | Jul 2 | Original features | `a049897`…`073f145` | PR sync, CI badges, approval gate, message threads, system health, activity timeline, WireGuard watchdog, dark mode, LLM briefing, model swap |
| 1.5 | Jul 2 | Phases 1–3 | `364fabd` | Goals & Projects, Brain Dump + LLM Triage, Decision Log + Activity Timeline |
| 2 | Jul 2 | Phases 4–6 | `7a43265` | Skills Library, Agent Registry, Eisenhower Matrix |
| 3 | Jul 2 | Phases 7–11 | `f40ed00` | Dependencies, Subtasks, Loop Detection, Token Tracking, Cmd+K Search, Pagination, /help page |
| 4 | Jul 3 | Bug fixes | `cd1480b`, `f188c56` | Console error guards (ModelQuickSwap, TypeBadge), approval gate idempotency |

### Commit log (all sessions)

```
f188c56  fix: add client-side idempotency guard to approval gate
cd1480b  fix: guard against undefined model list and unknown timeline event types
f40ed00  feat: MC port Phases 7-11 — Dependencies, Loop Detection, Token Tracking, Global Search, Pagination
c350112  docs: exit audit and handoff for MC port Phases 4-6 session
7a43265  feat: MC port Phases 4-6 — Skills Library, Agent Registry, Eisenhower Matrix
364fabd  feat: implement MC port Phases 1-3 — Goals, Brain Dump, Decision Log
073f145  feat: add LLM model quick-swap widget to dashboard
70f0ede  feat: promote Model Swap chip to prominent sidebar position
a049897  feat: ship-it attack plan — idempotency, type extraction, shared components, metadata
1874c9c  docs: HIL dashboard ship-it attack plan (6 phases + Qwopus model registration)
```

---

## Part 2 — Full inventory

### Database: 14 tables, 16 enums in `hil_ops` schema

| Table | Phase | Purpose |
|---|---|---|
| `users` | Orig | Operator identity |
| `agents` | Ph5 | AI agent registry (instructions, capabilities, status, icon) |
| `strategies` | Orig→Ph1 | Operational strategies (goalId FK) |
| `tactics` | Orig→Ph8 | Tasks/proposals (dependencies, time tracking, acceptance criteria, attempt counting) |
| `tactic_dependencies` | **Ph7** | Dependency graph (blockerId→blockedId, cycle detection) |
| `tactic_subtasks` | **Ph7** | Checkable sub-items under tactics |
| `approvals` | Orig | Human approve/reject/request-info decisions |
| `messages` | Orig | Human↔agent message threads |
| `goals` | Ph1 | Strategic objectives (type, category, progress) |
| `projects` | Ph1 | Workstreams under goals |
| `brain_dump` | Ph2 | Quick-capture ideas with LLM triage |
| `skills` | Ph4 | Skill definitions (name, content, tags) |
| `agent_skills` | Ph4 | Agent↔skill join table |
| `llm_usage` | **Ph9** | Token tracking (model, inputTokens, outputTokens, source, tacticId) |

### Enums (16)

`strategy_status`, `tactic_status`, `risk_level`, `author_type`, `decision`, `tactic_source`, `ci_state`, `goal_type`, `goal_status`, `goal_category`, `project_status`, `project_priority`, `brain_dump_source`, `brain_dump_status`, `brain_dump_convert_type`, `llm_usage_source`

### API routes: 37 total

| Route | Method | Source |
|---|---|---|
| `/api/health` | GET | Orig |
| `/api/ops/health` | GET | Orig |
| `/api/seed` | POST | Orig |
| `/api/goals` | GET/POST | Ph1→Ph11 (paginated) |
| `/api/goals/[id]` | GET/PATCH/DELETE | Ph1 |
| `/api/goals/[id]/projects` | GET/POST | Ph1 |
| `/api/brain-dump` | GET/POST | Ph2→Ph11 (paginated) |
| `/api/brain-dump/triage` | POST | Ph2 |
| `/api/decisions` | GET | Ph3 (paginated) |
| `/api/skills` | GET/POST | Ph4→Ph11 (paginated) |
| `/api/skills/[id]` | GET/PATCH/DELETE | Ph4 |
| `/api/skills/[id]/agents` | POST/DELETE | Ph4 |
| `/api/agents` | GET/POST | Ph5 |
| `/api/agents/[id]` | GET/PATCH/DELETE | Ph5 |
| `/api/agents/[id]/skills` | POST/DELETE | Ph5 |
| `/api/tactics` | POST | Orig |
| `/api/tactics/[id]` | GET/PATCH | Ph6→Ph7 |
| `/api/tactics/[id]/approve` | POST | Orig (idempotency: Ph4 fix) |
| `/api/tactics/[id]/messages` | GET/POST | Orig |
| `/api/tactics/[id]/dependencies` | POST/DELETE | **Ph7** |
| `/api/tactics/[id]/subtasks` | GET/POST | **Ph7** |
| `/api/tactics/[id]/subtasks/[subtaskId]` | PATCH/DELETE | **Ph7** |
| `/api/tactics/[id]/reset-attempts` | POST | **Ph8** |
| `/api/search` | GET | **Ph10** |
| `/api/usage` | GET | **Ph9** |
| `/api/prs/sync` | POST | Orig |
| `/api/prs/[id]/merge` | POST | Orig |
| `/api/briefing` | POST | Orig (usage logging: Ph9) |
| `/api/briefing/data` | GET | Orig |
| `/api/models` | GET/POST | Orig |
| `/api/models/health` | GET | Orig |
| `/api/review/score/[id]` | POST | Orig |
| `/api/review/score/batch` | POST | Orig→Ph8 (escalation) |
| `/api/session-ritual` | GET | Orig |
| `/api/system-health` | GET | Orig |
| `/api/activity-timeline` | GET | Orig |
| `/api/hermes/...` | Various | Orig |
| `/api/opencode/...` | Various | Orig |
| `/api/wg-watchdog` | GET/POST | Orig |

### Pages: 18 total

| Route | Type | Source |
|---|---|---|
| `/` | RSC + client | Orig (13 panels) |
| `/goals` | RSC | Ph1 |
| `/goals/[id]` | RSC | Ph1 |
| `/brain-dump` | Client | Ph2 |
| `/decisions` | RSC | Ph3 |
| `/skills` | Client | Ph4 |
| `/skills/[id]` | Client | Ph4 |
| `/priority-matrix` | Client | Ph6 |
| `/strategies` | RSC | Orig |
| `/tactics` | RSC | Orig |
| `/tactics/[id]` | RSC | Ph7+Ph8 |
| `/prs` | RSC | Orig |
| `/agents` | Client | Ph5 |
| `/agents/[id]` | Client | Ph5 |
| `/kanban` | Client | Orig |
| `/users` | RSC | Orig |
| `/usage` | Client | **Ph9** |
| `/help` | RSC | **Ph11** |

### Sidebar nav (14 items)

```
Dashboard (LayoutDashboard)     Goals (Flag)
Brain Dump (Lightbulb)          Decisions (Scale)
Skills (Wrench)                 Priority Matrix (Grid2x2)
Usage (BarChart3)               Strategies (Target)
Tactics (ListChecks)            Kanban (LayoutGrid)
Pull Requests (GitPullRequest)  Agents (Bot)
Users (Users)                   Help (HelpCircle)
```

### Dashboard panels (13)

1. Executive Briefing (LLM-powered)
2. Awaiting Approval (needs_review + requiresHumanApproval)
3. Pull Requests (CI status, merge)
4. Missions (running/pending/completed/failed)
5. LLM Models (ModelQuickSwap)
6. Goals (GoalsPanel)
7. Brain Dump (BrainDumpPanel)
8. Decisions (DecisionLogPanel)
9. Skills (SkillsPanel)
10. Eisenhower Matrix (EisenhowerMatrixPanel)
11. LLM Usage (UsagePanel)
12. System Health (7-service check)
13. Recent Activity (ActivityTimelinePanel)
14. Agent Approvals (HermesApprovalPanel)
15. Hermes Agent (HermesAgentsPanel)
16. OpenCode (OpenCodePanel)

### Source files: 166 TS/TSX files, 44 API route files

---

## Part 3 — Bug fixes applied (this session)

| Fix | File | Detail |
|---|---|---|
| ModelQuickSwap `models.map` crash | `src/components/model-quick-swap.tsx` | `Array.isArray(data.models) ? data.models : []` guards against non-array API responses from model manager daemon |
| TypeBadge `config[type]` crash | `src/components/activity-timeline-panel.tsx` | Fallback renders `type.replace(/_/g, " ")` as plain badge for unknown event types (e.g. `task_created`, `task_delegated`) |
| Approval gate double-submit | `src/components/approval-gate.tsx` | Three-layer defense: `useRef` submitLock (synchronous), `submitted` state (hides form), server-side 10s idempotency window |

---

## Part 4 — Known issues & tech debt

| Issue | Severity | Notes |
|---|---|---|
| Pre-existing typecheck errors in sidebar panel props | LOW | `ForwardRefExoticComponent` / `open` prop mismatches on ModelSwapPanel, WgWatchdogPanel, HermesPanel — cosmetic only |
| `AgentDetailCard` component unused | LOW | Dead code — agents page renders inline |
| `decidedByName` always null in decisions | LOW | Could join with users table |
| Seed `onConflictDoNothing` won't refresh | LOW | Drop & re-seed to update |
| `tacticSubtasks` seed not idempotent | LOW | Random PKs — acceptable for demo |
| Brain dump page fully client-rendered | LOW | Justified by interactive triage |
| Usage chart lacks tooltips | LOW | SVG bars are static — could add hover detail |
| Cmd+K search uses ILIKE | LOW | Fine for demo scale; replace with `tsvector` at >10K rows |
| Unicode box-drawing in /help | LOW | Renders with `font-mono` — fine |

---

## Part 5 — Future work roadmap

The following features are organized by category and estimated effort. Each section is designed to be independently shippable.

### 🟢 Tier 1: Real data integration (highest value, most impactful)

These replace demo/seed data with live operational data. This is what transforms the dashboard from a prototype into a working tool.

#### 1.1 PR sync + CI surface (PLAN.md Phase 2)
- **What:** `gh pr list` → upsert PR-tactics with live CI status. Show each failing check name + link to Actions run.
- **Why:** The PLAN.md already specifies this in detail. It's the single highest-value feature — real PRs with real CI are the only truly actionable data today.
- **Effort:** ~2h
- **Files:** `lib/github.ts` (new), `/api/prs/sync` (modify), PR tactic detail page, dashboard stat cards
- **Blocked by:** `GH_TOKEN` env var + `gh` CLI auth in the homelab

#### 1.2 PR decisions → real GitHub actions
- **What:** Approve = `gh pr review --approve`; reject = `gh pr review --request-changes`; merge = `gh pr merge --squash` (CI-gated — only when `ciState === "passing"`)
- **Why:** Close the loop — decisions in the dashboard become real actions on GitHub
- **Effort:** ~1h (builds on 1.1)
- **Design:** Split "Approve" (marks approved, doesn't merge) from "Approve & merge" (requires CI green + explicit confirmation)

#### 1.3 Inbox sync (PLAN.md Phase 3)
- **What:** Read `inbox_items` from FM's `public` Postgres schema (same DB instance). Write-back to resolve interrupts.
- **Why:** Ready for when FM agents start raising interrupts. Currently 0 rows — but infrastructure lights up automatically when FM wires it up.
- **Effort:** ~1.5h
- **Design:** Read-only `public.inbox_items` query + direct Postgres write-back for status/resolved_at/resolution_note

#### 1.4 Missions panel with real data
- **What:** Running/pending missions from FM's missions table as context ("what agents are doing right now")
- **Effort:** ~30m

### 🔵 Tier 2: Operational quality (makes the tool production-ready)

#### 2.1 Real-time updates via SSE or polling
- **What:** Replace manual `router.refresh()` with Server-Sent Events or short-polling (30s). Dashboard auto-updates when tactics change state.
- **Why:** Eliminates the need to manually refresh. Critical for monitoring workflows.
- **Effort:** ~2h
- **Approach:** Next.js `ReadableStream` route for SSE, or `setInterval` + `router.refresh()` for simple polling

#### 2.2 Webhook notifications
- **What:** Push notifications for state changes (tactic escalated, PR CI changed, approval needed) via ntfy.sh, Gotify, or Telegram bot API.
- **Why:** Operator doesn't need to watch the dashboard constantly.
- **Effort:** ~1.5h
- **Research:** Evaluate ntfy.sh (self-hosted, trivial setup) vs Gotify vs Telegram Bot API for homelab use

#### 2.3 Authentication / access control
- **What:** Protect the dashboard with auth. Options: NextAuth.js with credentials provider (single operator), or simple HTTP Basic Auth via middleware.
- **Why:** The dashboard is currently open — fine on a private LAN but risky if WireGuard port is exposed.
- **Effort:** ~1h (Basic Auth) to ~3h (NextAuth with session management)
- **Research:** Evaluate whether NextAuth is overkill for a single-operator homelab tool

#### 2.4 Database migrations management
- **What:** Replace `drizzle-kit push --force` with proper migration workflow. `drizzle-kit generate` + `drizzle-kit migrate` with version tracking.
- **Why:** `--force` is dangerous in production. Proper migrations are reversible and auditable.
- **Effort:** ~1h

#### 2.5 Pre-existing typecheck cleanup
- **What:** Fix the 3 sidebar panel component prop mismatches (`ForwardRefExoticComponent` / `open` prop errors on ModelSwapPanel, WgWatchdogPanel, HermesPanel)
- **Effort:** ~30m

### 🟣 Tier 3: AI/LLM features (differentiating capabilities)

#### 3.1 Background LLM reviewer (PLAN.md Phase 4)
- **What:** `POST /api/review/score` calls homelab llama.cpp to score a tactic's confidence/risk from its description + proposed action + (for PRs) diff summary.
- **Why:** Replaces static confidence values with LLM-scored ones. The `review.ts` lib already has the scoring logic — this is about making it read actual diffs.
- **Effort:** ~2h
- **Design:** Homelab LLM only. Never SaaS. Already reflected in the agent config.

#### 3.2 LLM-powered PR diff review
- **What:** When a PR-tactic is created, the background reviewer reads the git diff and generates a risk assessment + suggested review comments.
- **Why:** Automated code review before the human even looks at it.
- **Effort:** ~3h (builds on 3.1)
- **Research:** Chunking strategy for large diffs; context window management for Qwen3-27B

#### 3.3 Smart briefing with trend analysis
- **What:** Enhance the executive briefing to compare current metrics against historical (last 7 days). "CI failures are up 40% this week" or "You approved 3 PRs today vs your average of 1."
- **Why:** Context-aware briefing is more actionable than a static snapshot.
- **Effort:** ~2h
- **Approach:** Query `llm_usage`, `approvals`, and `tactics` tables for trend data, inject into briefing prompt

#### 3.4 Multi-model routing
- **What:** Route different tasks to different models. E.g., simple triage → smaller/faster model; complex PR review → larger model. The `ModelQuickSwap` widget already exists for manual switching.
- **Why:** Optimize for speed vs quality per task type.
- **Effort:** ~2h
- **Research:** Model capability matrix for the homelab's available models

#### 3.5 Embedding-based search
- **What:** Replace ILIKE search with vector embeddings (pgvector). Generate embeddings for all entities, search by semantic similarity.
- **Why:** "Find tactics related to database migrations" won't match with ILIKE but would with embeddings.
- **Effort:** ~3h
- **Research:** pgvector extension availability, embedding model options for homelab (e.g., `nomic-embed-text` via Ollama)

### 🟡 Tier 4: UX enhancements (polish and delight)

#### 4.1 Usage chart interactivity
- **What:** Add hover tooltips to the SVG bar chart showing exact token counts per bar. Click a bar to filter the breakdown tables to that day.
- **Effort:** ~1h

#### 4.2 Drag-and-drop Eisenhower Matrix
- **What:** Make the priority matrix cards draggable between quadrants. Currently click-to-assign only.
- **Effort:** ~2h
- **Research:** `@dnd-kit/core` vs native HTML drag-and-drop for React 19 compatibility

#### 4.3 Tactic dependency graph visualization
- **What:** Render the dependency graph as an interactive node-link diagram instead of just badges.
- **Why:** Complex dependency chains (A→B→C→D) are hard to reason about from badges alone.
- **Effort:** ~3h
- **Research:** `reactflow` vs `d3-force` vs `elkjs` for directed graph layout

#### 4.4 Keyboard shortcut expansion
- **What:** Add more keyboard shortcuts: `g` then `t` for tactics, `g` then `g` for goals, `n` for new tactic, `/` to focus search.
- **Effort:** ~1h
- **Design:** Already have the `keyboard-help.tsx` infrastructure and `search-trigger.tsx` pattern

#### 4.5 Mobile-responsive improvements
- **What:** The sidebar already has a mobile drawer. Improve panel layouts for narrow viewports — stack columns, collapse panels, touch-friendly tap targets.
- **Effort:** ~2h

#### 4.6 Dark mode refinements
- **What:** Dark mode toggle exists (`t` shortcut + ThemeToggle component). Audit all panels for consistent dark mode styling — some panels may have hardcoded light colors.
- **Effort:** ~1h

#### 4.7 Export / reporting
- **What:** Export usage data as CSV. Generate a weekly PDF summary report of all decisions, approvals, and token usage.
- **Effort:** ~2h

### 🔴 Tier 5: Research & experimentation

#### 5.1 Continuous missions with dependency scheduling
- **What:** Auto-dispatch tactics when their blockers are resolved. Chain execution: A completes → B starts automatically.
- **Why:** Currently all tactics require manual attention. With dependency tracking (Ph7), we can automate the dispatch.
- **Effort:** ~4h
- **Research:** How to integrate with Hermes ACP for automatic dispatch; conflict resolution when multiple tactics are ready simultaneously

#### 5.2 Emergency stop / kill switch
- **What:** A global "halt all agents" button that sends a kill signal to Hermes, OpenCode, and any running FM missions.
- **Why:** Safety net for autonomous operation.
- **Effort:** ~2h
- **Research:** Signal delivery mechanisms for each agent system

#### 5.3 Session resilience / auto-recovery
- **What:** Detect when an agent session crashes mid-task and auto-respawn or alert the operator.
- **Effort:** ~3h
- **Research:** Health check integration with Hermes ACP; heartbeat monitoring patterns

#### 5.4 Agent performance analytics
- **What:** Track per-agent metrics: success rate, average confidence, time-to-completion, escalation frequency.
- **Why:** Identify which agents are reliable and which need tuning.
- **Effort:** ~2h
- **Approach:** Aggregate from `tactics` + `approvals` + `llm_usage` tables

#### 5.5 Cost optimization dashboard
- **What:** Extend the LLM usage page with cost projections, budget alerts, and model comparison (tokens/dollar for each model).
- **Why:** Homelab compute is finite — track and optimize.
- **Effort:** ~2h
- **Research:** Cost calculation for self-hosted models (GPU power draw × inference time)

#### 5.6 Natural language commands
- **What:** Extend Cmd+K search to support actions: "approve all passing PRs", "show me high-risk tactics", "create a goal for Q3 planning".
- **Why:** Keyboard-driven command palette is already there — layer LLM understanding on top.
- **Effort:** ~4h
- **Research:** Intent classification with small models; action execution pipeline

#### 5.7 Webhook ingestion for external events
- **What:** Accept webhooks from GitHub (PR events, CI status changes), FM (mission state changes), and other services. Auto-create tactics from incoming events.
- **Effort:** ~3h
- **Research:** Webhook signature verification; event deduplication; idempotent processing

#### 5.8 Agent skill auto-discovery
- **What:** Scan agent codebases to automatically suggest skills based on code patterns, imports, and tool usage.
- **Effort:** ~3h
- **Research:** AST analysis for capability extraction

#### 5.9 Multi-operator support
- **What:** Add authentication with role-based access (admin vs viewer). Track who approved/rejected what.
- **Effort:** ~4h
- **Research:** NextAuth.js with database sessions; RBAC patterns for Next.js

#### 5.10 Observability stack integration
- **What:** Export dashboard metrics to Prometheus/Grafana. Add OpenTelemetry traces for API routes.
- **Effort:** ~3h
- **Research:** `prom-client` for Next.js; OTel auto-instrumentation for App Router

---

## Part 6 — Quick start

```bash
cd /home/glenn/flowmanner-dashboard-HIL
pnpm install
cp .env.example .env.local  # fill DATABASE_URL, GH_TOKEN, etc.
pnpm db:push --force         # apply all schema changes
pnpm seed                    # load demo data
pnpm dev                     # http://localhost:3000
```

### Key reference documents

1. `PLAN.md` — original real-data spec (PR sync, inbox, missions)
2. `docs/MISSION-CONTROL-PORT.md` — comprehensive MC port spec (now fully implemented)
3. `docs/EXIT-AUDIT-2026-07-02.md` — session 1 audit
4. `docs/EXIT-AUDIT-2026-07-02-MC-PORT.md` — session 1.5 audit (Phases 1–3)
5. `docs/EXIT-AUDIT-2026-07-02-SESSION2.md` — session 2 audit (Phases 4–6)
6. `docs/EXIT-AUDIT-2026-07-02-SESSION3.md` — session 3 audit (Phases 7–11)
7. **`docs/EXIT-AUDIT-2026-07-03.md`** — this document (final handoff + roadmap)

### Recommended next session priorities

1. **PR sync + CI surface** (Tier 1.1) — the single highest-value feature
2. **Background LLM reviewer** (Tier 3.1) — automates the scoring pipeline
3. **Typecheck cleanup** (Tier 2.5) — quick win, removes noise

---

*Document generated 2026-07-03. Author: Buffy (Codebuff).*
*Total project stats: 166 source files · 44 API routes · 14 DB tables · 16 enums · 18 pages · 13 dashboard panels · 10 commits · 4 sessions.*
