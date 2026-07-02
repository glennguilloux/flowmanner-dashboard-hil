# Session Audit — 2026-07-02

**Commit:** `600b3ad` — 135 files, 18,031 insertions
**Stack:** Next.js 16 · React 19 · Tailwind 4 · Drizzle · Postgres
**Validation:** `pnpm typecheck` ✅ · `pnpm lint` ✅ · Browser: 0 console errors

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
├── ExecutiveBriefing
├── SessionRitualPanel (Suspense)
├── MissionHealthPanel (Suspense)
├── SectionErrorBoundary
│   ├── DashboardPrsPanel (props: prTactics)
│   └── DashboardApprovalPanel (props: needsReview)
├── SectionErrorBoundary
│   └── DashboardMissionsPanel (props: missions)
├── SectionErrorBoundary
│   └── KanbanSnapshotPanel (Suspense)
└── SectionErrorBoundary
    └── GovernancePanel (Suspense)
```

---

## Known issues / TODOs

### Low severity

- [ ] `g+t` keyboard shortcut (Go to Tactics) can briefly flash the theme toast before navigating — the `t` handler fires before the `pendingG` check. Would need to add a `pendingG` guard in the `t` handler.
- [ ] Sidebar `SessionRitualChip` doesn't have dark mode styling on the `border-slate-200` (missing from the chip's own wrapper div — it inherits from sidebar but the chip itself has no border).
- [ ] `Example/` directory hasn't been fully updated with dark mode classes.

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
- [ ] Browser test: toggle dark mode with `t` key, verify toast appears
- [ ] Browser test: navigate all pages (Dashboard, Strategies, Tactics, PRs, Agents, Users)
- [ ] Browser test: click "Batch Review" on Tactics page, verify LLM scoring works
- [ ] Browser test: verify session-ritual chip shows branch + status dots
- [ ] Browser test: verify error boundary renders when a panel throws (can test by temporarily breaking a query)
