# Session Audit — 2026-07-02

**Initial commit:** `600b3ad` — 135 files, 18,031 insertions
**Latest commit:** `6014560` — cumulative +6,152 / -447 lines across 5 follow-up commits
**Stack:** Next.js 16 · React 19 · Tailwind 4 · Drizzle · Postgres
**Validation:** `pnpm typecheck` ✅ · `pnpm lint` ✅ · Browser: 0 console errors · All 5 commits individually validated

---

## Commits this session (5)

| Hash | Message | Files | Summary |
|---|---|---|---|
| `f18a18c` | ✨ feat: system health, activity timeline, WG watchdog, kanban | 20 | Health monitoring, activity feed, WireGuard watchdog, kanban page |
| `b38c6cc` | ✨ feat: Hermes ACP, OpenCode telemetry, auto-refresh polling | 20 | Hermes Agent + OpenCode integrations, server→client panel conversion |
| `2f925ac` | ♻️ refactor: extract shared usePolling hook | 5 | Eliminated ~108 lines of duplicated polling code |
| `7e79005` | 🔧 chore: stat() for OpenCode health, cap scan limits | 2 | Replaced `ls` shell-out with `stat()`, added I/O budget |
| `6014560` | ✨ feat(P2): Hermes HITL approval gates | 8 | Human-in-the-loop approval UI with 4-scope decision model |

**Also modified:** `.env.example` (added `HERMES_URL`, `HERMES_API_KEY`, `OPENCODE_STORAGE_PATH`)

---

## What was built (this session)

### System health + activity timeline

| Feature | Files | Notes |
|---|---|---|
| System health panel | `lib/system-health.ts`, `api/system-health/route.ts`, `system-health-panel.tsx` | 7 services: Postgres, FM API, FM Repo, GitHub, Qwen LLM, Hermes Agent, OpenCode. Latency + detail per service. |
| Activity timeline panel | `lib/activity-timeline.ts`, `api/activity-timeline/route.ts`, `activity-timeline-panel.tsx` | Merges approvals, messages, tactic status changes into a single chronological feed. |
| WG Watchdog | `lib/wg-watchdog.ts`, `api/wg-watchdog/route.ts`, `wg-watchdog-chip.tsx`, `wg-watchdog-panel.tsx` | Monitors WireGuard peer health. Sidebar chip + dedicated panel. |
| Kanban page | `lib/kanban.ts`, `kanban/page.tsx` | Full-page read from `.hermes/kanban/board.json`; status/category columns. |
| Dashboard refactor | `lib/data.ts`, `page.tsx` | Consolidated 8-query `Promise.all` into `getDashboardData()`. Removed `SessionRitualPanel`, `MissionHealthPanel`, `GovernancePanel`. |
| Dashboard approval panel upgrade | `dashboard-approval-panel.tsx` | Sorts gated items first, shows gated/resolved badges. |
| Dashboard missions panel upgrade | `dashboard-missions-panel.tsx` | Inline mission health counters (done/failed/running/pending), recent failures strip. |

### Hermes ACP + OpenCode telemetry

| Feature | Files | Notes |
|---|---|---|
| Hermes ACP client | `lib/hermes-acp.ts` | REST client for sessions, jobs, skills, tools, capabilities. Health + overview endpoints. |
| Hermes dashboard panel | `hermes-agents-panel.tsx` | Sessions, jobs, skills, tools, capabilities with status badges. |
| Hermes slide-over | `hermes-panel.tsx` | Full slide-over with 4 tabs (overview, sessions, jobs, skills + approvals). |
| Hermes sidebar chip | `hermes-chip.tsx` | Online/offline dot + pending approval badge. |
| OpenCode telemetry | `lib/opencode.ts`, `opencode-panel.tsx`, `opencode-chip.tsx`, `api/opencode/route.ts`, `api/opencode/health/route.ts` | Reads flat-file session storage from `~/.local/share/opencode/`. Projects, sessions, models, file paths. |
| Auto-refresh polling | `hooks/use-polling.ts` | Shared `usePolling<T>(url, { intervalS? })` hook. 4 panels converted from server to client components with 30s polling. |
| `stat()` for OpenCode health | `lib/system-health.ts` | Replaced `execFileP("ls", ...)` with `stat()` + `readdir()`. |
| I/O budget cap | `lib/opencode.ts` | `MAX_FILE_READS = 50` per project, 10 project dir cap. |

### P2: Hermes HITL approval gates

| Feature | Files | Notes |
|---|---|---|
| Approval types + fetchers | `lib/hermes-acp.ts` | `HermesApprovalScope` (4 values), `HermesApproval`, `getApprovals()`, `getPendingApprovalCount()`, `submitApprovalDecision()`. |
| Approval API routes | `api/hermes/approvals/route.ts`, `api/hermes/health/route.ts` | GET list + POST submit decision (auth-gated). Health endpoint returns `pendingApprovals` count. |
| Approval panel | `hermes-approval-panel.tsx` | Expandable cards with 4-scope decision UI (allow_once, allow_session, allow_always, deny). Resolved list below. |
| Dashboard integration | `hermes-agents-panel.tsx`, `hermes-panel.tsx`, `hermes-chip.tsx`, `page.tsx` | Pending approvals section in agents panel, ApprovalsTab in slide-over, badge on chip, standalone panel on dashboard. |

---

## What was built

### Critical fixes (from architectural review)

| Fix | Files | Impact |
|---|---|---|
| Transaction boundaries in approve + merge routes | `approve/route.ts`, `merge/route.ts` | Partial failure no longer leaves DB and GitHub out of sync |
| Auth middleware on all `/api/` routes | `middleware.ts`, `lib/auth.ts`, `lib/apiFetch.ts` | Bearer token gate; no-op when `HIL_AUTH_SECRET` unset (dev mode) |
| SQL WHERE clauses in `getTactics()` | `lib/data.ts`, `db/schema.ts` | Phase 5 indexes now actually hit; 3 composite indexes in use |
| Per-section error boundaries | `section-error-boundary.tsx`, `page.tsx` | One panel crashing no longer takes down the full dashboard |
| RefreshBar debounce (5s) | `refresh-bar.tsx` | Rapid tab switching no longer hammers `router.refresh()` |

### New features

| Feature | Files | Notes |
|---|---|---|
| Background LLM reviewer | `api/review/score/[id]/route.ts`, `review.ts`, `llm-review-button.tsx` | Single tactic scoring via homelab Qwen3-27B |
| Batch review mode | `api/review/score/batch/route.ts`, `batch-review-button.tsx` | Scores all unscored tactics in one click; sequential to avoid overloading LLM |
| Session-ritual panel | `lib/session-ritual.ts`, `session-ritual-panel.tsx`, `session-ritual-chip.tsx` | Git status, unpushed commits, alembic head. Full panel on dashboard + compact chip in sidebar |
| Kanban snapshot | `lib/kanban.ts`, `kanban-snapshot-panel.tsx` | Reads `.hermes/kanban/board.json`; status/category breakdown, task list |
| Dark theme | `globals.css`, `theme-toggle.tsx`, `keyboard-help.tsx` + ~30 component files | Tailwind v4 class-based (`@custom-variant dark`); localStorage + system pref fallback |
| Theme keyboard shortcut `t` | `keyboard-help.tsx` | Toggle dark/light with floating toast indicator (1.5s auto-dismiss) |
| RefreshBar on all list pages | `prs/page.tsx`, `tactics/page.tsx` | Consistent auto-refresh + sync UX across Dashboard, PRs, Tactics |

### Refactoring

| Change | Impact |
|---|---|
| Dashboard page split (350→100 lines) | `DashboardStatCards`, `DashboardPrsPanel`, `DashboardApprovalPanel`, `DashboardMissionsPanel` |
| Shared review logic extraction | `lib/review.ts` — `scoreTactic()`, `parseReviewResponse()`, `buildUserPrompt()` |
| Dead code removal | `getDashboardStats()`, `flattenCiRollup`, `PrsSyncButton` |
| Hydration fixes | `ThemeToggle` SSR mismatch, `RefreshBar` timestamp mismatch |

---

## Environment setup

### Required env vars (`.env.local`)

```
DATABASE_URL=postgresql://...
GH_TOKEN=...
GH_REPO=glennguilloux/flowmanner
HIL_AUTH_SECRET=<set to enable API auth>
NEXT_PUBLIC_HIL_AUTH_SECRET=<same value, read by client components>
FM_REPO_PATH=/opt/flowmanner
KANBAN_BOARD_PATH=.hermes/kanban/board.json
HERMES_URL=http://localhost:8642
HERMES_API_KEY=<optional>
OPENCODE_STORAGE_PATH=~/.local/share/opencode
```

### Chrome symlink (for browser-use agent)

Chromium is at `/usr/bin/chromium`. A symlink was created:
```
/opt/google/chrome/chrome → /usr/bin/chromium
```

### Database

New index to apply: `pnpm db:push` to add `tactics_source_idx` on `tactics.source`.

---

## Architecture notes

### Auth flow

```
Client fetch → apiFetch (adds Bearer token) → middleware.ts (validates token)
                                              ↓ (401 if missing/invalid)
                                    Route handler → isUnauthorized() (defense-in-depth)
```

When `HIL_AUTH_SECRET` is unset, all auth checks pass (dev mode).

### Review pipeline

```
Single:  POST /api/review/score/[id]  → scoreTactic(id)     → LLM → DB update + message
Batch:   POST /api/review/score/batch → scoreTactic(each)   → LLM → DB update + message
```

Sequential processing in batch mode (homelab LLM can't handle concurrency).
"Unscored" = confidence at sync default (0), excludes simulated tactics.

### Theme system

```
Blocking <script> in layout.tsx → reads localStorage / system pref → adds .dark to <html>
ThemeToggle → useState("light") → useEffect syncs with DOM after hydration
Keyboard shortcut 't' → toggles .dark class + localStorage + toast indicator
```

### Dashboard component tree

```
page.tsx (data fetch + layout)
├── RefreshBar
├── DashboardStatCards (props: counts)
├── SectionErrorBoundary
│   └── ExecutiveBriefing
├── SectionErrorBoundary
│   └── DashboardApprovalPanel (props: needsReview, resolvedCount)
├── SectionErrorBoundary
│   └── DashboardPrsPanel (props: prTactics)
├── SectionErrorBoundary
│   └── DashboardMissionsPanel (props: missions, health)
│
│  Right sidebar (client panels with 30s polling):
├── SectionErrorBoundary
│   └── SystemHealthPanel → usePolling("/api/system-health")
├── SectionErrorBoundary
│   └── ActivityTimelinePanel → usePolling("/api/activity-timeline")
├── SectionErrorBoundary
│   └── HermesApprovalPanel → usePolling("/api/hermes/approvals")
├── SectionErrorBoundary
│   └── HermesAgentsPanel → usePolling("/api/hermes")
└── SectionErrorBoundary
    └── OpenCodePanel → usePolling("/api/opencode")
```

### Sidebar chip polling

```
sidebar.tsx
├── SystemHealthChip → /api/system-health (30s)
├── WgWatchdogChip → /api/wg-watchdog (30s)
├── HermesChip → /api/hermes/health (30s, includes pendingApprovals)
├── OpenCodeChip → /api/opencode/health (30s)
└── HermesPanel (slide-over, fetch-on-open)
```

### Approval gate architecture

```
Hermes agent → suspends task → emits approval request
                                      ↓
  GET /api/hermes/approvals ← usePolling(30s) ← HermesApprovalPanel
                                      ↓
  POST /api/hermes/approvals → submitApprovalDecision() → Hermes REST API
                                      ↓
  Agent resumes or aborts based on scope (allow_once|allow_session|allow_always|deny)

Existing tactic approval flow (unchanged):
  POST /api/tactics/[id]/approve → DB write + gh pr review + inbox write-back
```

---

## Known issues / TODOs

### Low severity

- [ ] `g+t` keyboard shortcut (Go to Tactics) can briefly flash the theme toast before navigating — the `t` handler fires before the `pendingG` check. Would need to add a `pendingG` guard in the `t` handler.
- [ ] Sidebar `SessionRitualChip` doesn't have dark mode styling on the `border-slate-200` (missing from the chip's own wrapper div — it inherits from sidebar but the chip itself has no border).
- [ ] `Example/` directory hasn't been fully updated with dark mode classes.
- [ ] `relativeTime` import in `hermes-agents-panel.tsx` appears unused (pre-existing).
- [ ] `ApprovalsTab` in `hermes-panel.tsx` duplicates resolved-list rendering from `hermes-approval-panel.tsx`. Could extract a shared component.
- [ ] `HermesApproval` type is defined in 3 places (server lib + 2 client components). Matches existing codebase pattern but could be extracted to a shared types file.

### Not built (from original PLAN.md)

| Feature | Status | Notes |
|---|---|---|
| Kanban board writes (move tasks) | ❌ | Panel is read-only |
| Dark theme for all amber/rose/indigo backgrounds | ⚠️ | Accent colors left as-is; work on both themes but aren't optimized |
| Multi-user auth | ❌ | Single-user homelab; `getDefaultUser()` is hardcoded |
| PR detail view with diff | ❌ | Tactic detail page shows CI panel but no inline diff |

### Postgres indexes in use

| Index | Columns | Query pattern |
|---|---|---|
| `tactics_source_source_id_unique` | (source, sourceId) | Sync upsert key |
| `tactics_status_human_approval_idx` | (status, requiresHumanApproval) | Governance panel |
| `tactics_status_updated_at_idx` | (status, updatedAt) | Dashboard/tactics ordering |
| `tactics_source_idx` | (source) | PR/inbox page filters |

---

## Testing checklist (for next session)

- [ ] `pnpm db:push` — apply new `sourceIdx`
- [ ] Set `HIL_AUTH_SECRET` + `NEXT_PUBLIC_HIL_AUTH_SECRET` in `.env.local` to test auth
- [ ] Set `HERMES_URL` + `HERMES_API_KEY` in `.env.local` for Hermes integration
- [ ] Set `OPENCODE_STORAGE_PATH` in `.env.local` if not at `~/.local/share/opencode`
- [ ] Browser test: toggle dark mode with `t` key, verify toast appears
- [ ] Browser test: navigate all pages (Dashboard, Strategies, Tactics, PRs, Agents, Users, Kanban)
- [ ] Browser test: click "Batch Review" on Tactics page, verify LLM scoring works
- [ ] Browser test: verify all sidebar chips show correct status dots
- [ ] Browser test: verify system health panel shows all 7 services with latency
- [ ] Browser test: verify activity timeline merges approvals, messages, status changes
- [ ] Browser test: verify Hermes approval panel shows pending approvals (if any) with 4-scope decision UI
- [ ] Browser test: verify Hermes slide-over opens, shows sessions/jobs/skills, and Approvals tab appears when approvals are pending
- [ ] Browser test: verify OpenCode panel shows projects and sessions
- [ ] Browser test: verify WG Watchdog chip and panel render correctly
- [ ] Browser test: verify error boundary renders when a panel throws (can test by temporarily breaking a query)
- [ ] Browser test: verify 30s auto-refresh polling works (watch countdown on panels)
- [ ] Remove unused `relativeTime` import from `hermes-agents-panel.tsx`
