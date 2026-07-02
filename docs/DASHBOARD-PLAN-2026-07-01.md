# Dashboard Build Plan — 2026-07-01

Based on `docs/DASHBOARD-REVIEW-2026-07-01.md`. Five phases, each ≤ 2 hours. Each phase is independently deployable and delivers visible value.

---

## Phase 1: Fix correctness bugs + consolidate CI logic

**Why it matters:** H1 (idempotency) and H2 (missing approve button for PRs) are functional bugs that cause incorrect behavior in the primary workflow. H3 (triplicated CI logic) is a maintenance hazard.

**Files affected:**

| File | Change |
|---|---|
| `src/app/api/tactics/[id]/approve/route.ts` | Add idempotency guard: check for an identical approval row created in the last 5 seconds; if found, return the existing result instead of re-running gh commands. Also guard against re-approving an already-approved tactic. |
| `src/app/tactics/[id]/page.tsx` | Render an approval control for PR-tactics (not just merge). Add a simplified approve/reject/comment bar above or alongside the merge button. The existing `<ApprovalGate>` can be adapted — its condition `tactic.status !== "needs_review"` already prevents double-deciding, but the `!isPr` gate at line 163 blocks it entirely for PRs. |
| `src/lib/ci.ts` | NEW — extract `computeCiRollup()` from `src/lib/github.ts` as a shared pure function. Export the `CiCheck` type, the rollup type, and the `computeCiRollup()` function. |
| `src/app/page.tsx` | Delete local `computeCi()` (lines 24-38), import from `@/lib/ci`. |
| `src/app/tactics/[id]/page.tsx` | Delete local `computeCiRollup()` (lines 23-53), import from `@/lib/ci`. |
| `src/lib/github.ts` | Move `flattenCiRollup()` and related types to `src/lib/ci.ts`. Re-export from github.ts for backward compat if needed, or update the one caller in `prs/sync/route.ts`. |

**Order:** (1) Create `src/lib/ci.ts`, move types + function. (2) Update imports in page.tsx, tactics/[id]/page.tsx, github.ts. (3) Add idempotency guard to approve route. (4) Fix the PR-tactic approve button. (5) Run `pnpm typecheck` + `pnpm lint`. (6) Manual test: open a PR-tactic detail page, verify approve/reject/comment buttons appear and work.

---

## Phase 2: LLM Model Swap feature

**Why it matters:** This is the primary new feature requested. Glenn needs to swap between Qwen3.6-27B-MTP and Ornith-35B without SSH. The daemon is already built; the dashboard needs the UI.

**Files affected:**

| File | Change |
|---|---|
| `src/app/api/models/route.ts` | NEW — Proxy API route. `GET` fetches from `localhost:9723/models` + `localhost:9723/status` in parallel, returns merged JSON. `POST` forwards `{ model_id }` to `localhost:9723/activate`. `GET /api/models/health` proxies `localhost:9723/health`. All fetches use `AbortSignal.timeout(10_000)` for the initial call and `AbortSignal.timeout(5_000)` for health polling. Error handling: catch ECONNREFUSED → return `{ ok: false, error: "Daemon unreachable" }` with 502. |
| `src/components/model-swap-chip.tsx` | NEW — Client component. On mount, calls `GET /api/models` to get active model + health. Renders a compact chip (model name + green/gray dot). Clicking opens the panel via a callback prop. Refreshes on `window.focus` event. |
| `src/components/model-swap-panel.tsx` | NEW — Client component (slide-over modal). Shows daemon health, lists all models from `/api/models`, marks active with a badge, shows health per model. "Activate" button → confirm dialog → POST `/api/models` → poll `/api/models/health` with exponential backoff (2s, 4s, 8s, 16s, max 60s) → toast on success/failure. Uses `AbortController` to cancel polling on unmount. Progress states: "Regenerating override..." → "Restarting service..." → "Waiting for health..." (mapped from daemon status if available, or generic spinner). |
| `src/components/sidebar.tsx` | Import and render `<ModelSwapChip>` below the user avatar section (after line 77). Add `onOpenPanel` prop wiring to show the slide-over. |
| `src/components/settings-panel.tsx` | Fix the two lint errors (lines 33, 133) while we're touching nearby code. Move `setKey(getOrKey())` into an event handler or use a ref. Escape the `'` in "User's". |

**Wireframe of sidebar with chip:**

```
│ ────────────────────────────────── │
│ 👤 Me                              │
│    Human operator                  │
│                                    │
│ ⚙ Qwen3.6-27B-MTP ● healthy     │  ← chip (clickable)
└────────────────────────────────────┘
```

**Error handling matrix (from review):**

| Error | Response code | UI |
|---|---|---|
| Daemon ECONNREFUSED | 502 | Red banner: "Model manager unreachable. Is the daemon running on port 9723?" |
| Daemon returns non-200 | 502 | Surface daemon's error message |
| Model file missing | 200 (daemon handles) | Show daemon's response message |
| Health timeout > 60s | N/A (client timeout) | "Swap timed out — model may still be loading. Check daemon logs." + manual retry |
| User navigates away | N/A | AbortController cancels polling; no leaked state |
| Network drop during poll | N/A | Pause + "Connection lost — retrying" + manual retry button |

**Order:** (1) Fix settings-panel lint errors. (2) Create `src/app/api/models/route.ts`. (3) Create `model-swap-chip.tsx` and `model-swap-panel.tsx`. (4) Wire into sidebar. (5) Test: open dashboard, verify chip shows current model, click to open panel, verify model list loads from daemon, test a swap (if daemon is reachable). (6) `pnpm typecheck` + `pnpm lint`.

---

## Phase 3: Loading states, error boundaries, and honest empty states

**Why it matters:** M3, M5, M6 — the dashboard currently shows nothing while loading, a raw Next.js error page on failure, and ambiguous empty states. This phase makes it feel like a real product.

**Files affected:**

| File | Change |
|---|---|
| `src/app/loading.tsx` | NEW — Global loading skeleton with the sidebar layout (shimmer placeholders for stat cards + content areas). |
| `src/app/error.tsx` | NEW — `"use client"` error boundary. Shows a friendly error card with the error message, a "Retry" button (calls `reset()`), and a suggestion to check DB/gh auth. |
| `src/app/tactics/[id]/loading.tsx` | NEW — Skeleton for the tactic detail page (title, CI panel, assessment sidebar). |
| `src/app/prs/loading.tsx` | NEW — Skeleton for the PR list page. |
| `src/app/page.tsx` | Add `<Suspense>` wrappers around `<ExecutiveBriefing>`, `<MissionHealthPanel>`, and `<GovernancePanel>` with inline fallbacks. This prevents the whole page from blocking on one slow query. |
| `src/app/page.tsx` | For the inbox stat card: if `inbox.pending === 0`, distinguish "✓ Inbox clear (last synced: {time})" from "Inbox not yet synced". Requires tracking last-sync-time — add a `lastSyncedAt` field or compute from the inbox strategy's `updatedAt`. |
| `src/components/seed-banner.tsx` | Refine wording: "Database is empty" → "No real data loaded yet. Sync PRs from GitHub to get started, or load demo data for testing." |
| `src/app/api/prs/sync/route.ts` | Return `{ ok: true, count, synced, timestamp: new Date().toISOString() }` so the client can show "Synced {count} PRs at {time}" in a toast. |
| `src/app/api/inbox/sync/route.ts` | Same — return timestamp in response. |

**Order:** (1) Create global `loading.tsx` and `error.tsx`. (2) Add route-level loading skeletons. (3) Add Suspense boundaries on dashboard. (4) Update sync responses to include timestamps. (5) Improve empty states. (6) `pnpm typecheck`.

---

## Phase 4: Accessibility, keyboard shortcuts, and UX polish

**Why it matters:** M7 (mobile nav), L2 (timestamps), and the accessibility gaps. Glenn runs this on a phone occasionally (over WireGuard) and the sidebar disappears on mobile.

**Files affected:**

| File | Change |
|---|---|
| `src/components/sidebar.tsx` | Add mobile hamburger menu. Below `lg` breakpoint, show a fixed top bar with the FlowManner logo + hamburger icon. Clicking opens the sidebar as an overlay drawer. Close on navigation or outside click. |
| `src/components/sidebar.tsx` | Add the model swap chip to the mobile drawer too. |
| `src/app/layout.tsx` | Wrap with a keyboard shortcut provider. Bind `r` to refresh (router.refresh()), `?` to show a help overlay, `j`/`k` to navigate between items on list pages (future). |
| `src/components/keyboard-help.tsx` | NEW — Modal overlay showing available keyboard shortcuts. Triggered by `?` key. |
| `src/components/approval-gate.tsx` | Add `aria-label` to decision option buttons. Add `role="status"` to the error message. Add focus-visible ring to all interactive elements. |
| `src/components/pr-merge-button.tsx` | Add `aria-label="Merge pull request"` and confirmation dialog with `role="dialog"`. |
| `src/components/pr-ci-panel.tsx` | Add `aria-label` to "view run" links. Add `role="list"` to the checks list. |
| `src/components/status-badge.tsx` | These are display-only, but add `aria-label` for the risk/confidence badges (e.g., `aria-label="High risk"`). |
| All components using `formatDistanceToNow` | Add a `title` attribute with the ISO timestamp for hover: `title={new Date(date).toISOString()}`. |
| `src/app/globals.css` | Add focus-visible ring styles: `*:focus-visible { outline: 2px solid theme(--color-indigo-500); outline-offset: 2px; }`. Ensure all buttons and links have visible focus. |

**Order:** (1) Mobile hamburger menu in sidebar. (2) Global focus-visible styles. (3) aria-labels on all icon buttons and interactive elements. (4) Keyboard shortcuts + help modal. (5) Timestamp hover tooltips. (6) `pnpm typecheck` + `pnpm lint`.

---

## Phase 5: Auto-refresh, query optimization, and operational maturity

**Why it matters:** M2 (N+1 queries), M4 (no auto-refresh). This turns the dashboard from a "load once" page into a live operational surface.

**Files affected:**

| File | Change |
|---|---|
| `src/app/page.tsx` | Parallelize the 6-7 sequential DB queries. Use `Promise.all()` for `getTactics()`, `countInbox()`, `countMissions()`, `getMissions()`. The MissionHealthPanel and GovernancePanel should accept data as props rather than fetching independently — pass their data from the parent page query. |
| `src/components/governance-panel.tsx` | Convert from async RSC to a regular component that receives filtered tactics as a prop. The parent page already loads all tactics. |
| `src/components/mission-health-panel.tsx` | Same — receive `MissionHealth` as a prop from the parent. |
| `src/lib/data.ts` | Add a `getDashboardData()` function that runs all dashboard queries in a single `Promise.all()` and returns a typed object. This replaces 6-7 separate function calls with one. |
| `src/app/page.tsx` | Add a client-side auto-refresh wrapper. A `<DashboardRefresh>` component that calls `router.refresh()` every 60 seconds (configurable) while the page is visible. Use `document.visibilityState` to pause when tab is hidden. |
| `src/app/prs/page.tsx` | Add the same auto-refresh pattern. |
| `src/app/tactics/[id]/page.tsx` | Add auto-refresh with a shorter interval (30s) for PR-tactics where CI may be running. |
| `src/app/page.tsx` | Replace the native form POST sync buttons with client components that show loading spinners, success/error toasts, and sync counts. Use `useTransition` for the RSC refresh after sync. |
| `src/components/sync-button.tsx` | NEW — Reusable client component. Props: `endpoint`, `label`, `icon`. Handles POST, loading state, success toast ("Synced 2 PRs"), error toast. Calls `router.refresh()` after success. |

**Order:** (1) Create `getDashboardData()` in data.ts. (2) Refactor page.tsx to use it + pass props to child panels. (3) Create `<SyncButton>` component. (4) Add auto-refresh wrapper. (5) Add auto-refresh to PR and tactic detail pages. (6) `pnpm typecheck` + manual test: open dashboard, verify queries run in parallel (check server logs), verify auto-refresh keeps data current.

---

## Build order summary

| Phase | Time estimate | Value delivered |
|---|---|---|
| 1. Correctness + CI consolidation | ~1.5h | Fixes 3 HIGH bugs; approve works for PRs; no more triple CI logic |
| 2. LLM Model Swap | ~2h | Primary new feature; Glenn can swap models from the UI |
| 3. Loading + errors + empty states | ~1.5h | Dashboard feels like a real product; no more blank pages or raw errors |
| 4. Accessibility + keyboard + mobile | ~1.5h | Usable on phone; keyboard-navigable; accessible |
| 5. Auto-refresh + query optimization | ~1.5h | Live operational surface; no more manual refresh; faster page loads |

Phases 1–2 are the highest priority: Phase 1 fixes real bugs in the daily workflow, Phase 2 delivers the model swap feature that was the original prompt driver.

Phases 3–5 are polish that compounds: once the dashboard is the thing Glenn looks at every day, loading states, keyboard shortcuts, and auto-refresh make it feel like a tool rather than a prototype.

---

## NOT in scope (explicitly excluded)

- **No rewrite.** The existing architecture (server components + Drizzle + gh CLI) is sound. Every phase builds on top.
- **No new dependencies.** The stack is lean (Next.js, React, Tailwind, Drizzle, pg, lucide-react, date-fns). The model swap feature needs zero new packages — it's just `fetch()` to the daemon.
- **No multi-user/auth.** Single operator (Glenn). The `users` table exists but there's no auth layer, and that's fine for a homelab tool behind WireGuard.
- **No FM backend changes.** Everything in this plan works with the FM backend as-is. The inbox write-back (Phase 3 in PLAN.md) is already built in the approve route.
- **No mobile-first redesign.** Phase 4 adds a hamburger menu for occasional phone use, but the primary layout targets desktop/laptop.
