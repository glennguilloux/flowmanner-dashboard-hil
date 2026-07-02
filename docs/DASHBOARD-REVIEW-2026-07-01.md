# Dashboard Code Review — 2026-07-01

Reviewer: automated (codebuff)
Baseline: `tsc --noEmit` clean · `eslint` 3 errors (settings-panel ×2, executive-briefing ×1)
Codebase: ~4,700 lines across 38 TS/TSX files

---

## What's working

1. **Schema isolation is airtight.** `src/db/schema.ts` puts all 7 tables in `hil_ops` via `pgSchema("hil_ops")`. `drizzle.config.ts:18` uses `schemaFilter: ["hil_ops"]` so drizzle-kit never touches FM's 162-table `public` schema. Verified: no cross-schema references anywhere.

2. **Gate logic is a single function.** `src/lib/gate.ts:11-13` — `needsGate()` is 3 lines, used by the tactic POST route, the approval gate render guard, and the simulate-proposal preview. No duplicate gate logic anywhere.

3. **GitHub CLI integration is solid.** `src/lib/github.ts` shells out to `gh` (already authed via keyring), handles `maxBuffer: 16MB` for large PR lists, and the `flattenCiRollup()` function correctly maps `statusCheckRollup` → `{state, failing, passing, pending, checks}` with proper priority ordering (failure > pending > success > skipped).

4. **PR sync upsert is correct.** `src/app/api/prs/sync/route.ts:55-70` uses `onConflictDoUpdate` with the `(source, sourceId)` unique index from `schema.ts:101-103`. The `onConflictDoUpdate` SET clause preserves CI state across re-syncs. Postgres allows multiple NULLs in the unique index, so simulated tactics co-exist safely.

5. **Approval flow branches on source.** `src/app/api/tactics/[id]/approve/route.ts` correctly dispatches: PR-tactics → `gh pr review` (approve/reject/comment), inbox-tactics → direct `UPDATE public.inbox_items`, simulated → DB write only. Error paths return 502 with the gh error message.

6. **Merge safety has real teeth.** `src/app/api/prs/[id]/merge/route.ts:35-55` gates on CI state (failing → 409, pending → 409), mergeability (CONFLICTING → 409), and requires `confirm: true` in the body. The `<PrMergeButton>` component adds a second click (arm → confirm) with a clear warning about irreversibility.

7. **MessageThread has optimistic updates.** `src/components/message-thread.tsx:36-48` inserts a temp message immediately, rolls back on fetch failure. Clean pattern.

8. **Executive briefing dual-path.** Homelab LLM via server-side `POST /api/briefing`, OpenRouter via browser-direct `orChat()` with BYOK key in localStorage. The key never touches the server. `src/lib/briefing.ts` gathers the structured data, `src/lib/briefing-format.ts` (browser-safe, no DB imports) builds the prompt.

---

## What's rough or broken

### HIGH severity

**H1. No idempotency on approve/reject.** `src/components/approval-gate.tsx:31-56` — clicking "Submit decision" twice fast fires two concurrent POSTs to `/api/tactics/{id}/approve`. The `setSubmitting(true)` at line 40 only prevents a *third* click; the second click races through before state updates. Each POST creates an approval row AND runs `gh pr review`, which will error on the second call (already reviewed). The gh error surfaces as a 502 but the first approval already committed, so the tactic is in an inconsistent state (approved in DB, error toast shown). **Fix:** server-side idempotency check — skip gh call if an identical approval row exists within the last 5 seconds, or use an optimistic lock on `tactic.updatedAt`.

**H2. Approve button missing for PR-tactics on detail page.** `src/app/tactics/[id]/page.tsx:163` — `<ApprovalGate>` renders with condition `!isPr`. For PR-tactics, only the merge button is shown. But merge requires CI passing. If CI is failing, there is **no way to approve the PR** (post `gh pr review --approve`) from the dashboard — you can only reject or request-more-info via the approve route, but those buttons aren't rendered either. The approve route at `api/tactics/[id]/approve/route.ts:31-43` handles PR-tactics correctly, but the UI never calls it for PRs. **Fix:** render a simplified approval control for PR-tactics (approve/reject/comment without the merge option).

**H3. Duplicated CI rollup logic.** `src/app/tactics/[id]/page.tsx:23-53` re-implements `flattenCiRollup()` from `src/lib/github.ts:99-130` as a local `computeCiRollup()` function. `src/app/page.tsx:24-38` has a third copy as `computeCi()`. All three implementations have slightly different types and edge-case handling. The page.tsx version uses `CiCheck[]` without the `url`/`workflow` fields. **Fix:** extract to a shared util, delete the two copies.

### MED severity

**M1. Sync buttons use native form POST — no loading/success/error UX.** `src/app/page.tsx:58-68` and `src/app/prs/page.tsx:30-38` — both use `<form action="/api/..." method="POST">` which triggers a full page reload with no visual feedback during the sync. After the reload, there's no indication of whether the sync succeeded, how many items were synced, or if there was an error. Should be a client component with `useTransition` or `useActionState`.

**M2. Dashboard fires 6-7 sequential DB queries.** `src/app/page.tsx` calls `getTactics()`, `countInbox()`, `countMissions()`, `getMissions()`, plus the MissionHealthPanel and GovernancePanel each call `getTactics()` again and `getMissionHealth()`. That's at least 3 full scans of the tactics table on a single page load. `GovernancePanel` (`src/components/governance-panel.tsx:8`) calls `getTactics()` and then filters in JS — should be a targeted SQL query.

**M3. No loading states anywhere.** Every page is a server component with `force-dynamic`. There are zero loading skeletons, zero `Suspense` boundaries, zero `loading.tsx` files. On a homelab with latency, the page appears blank then pops fully formed. The only loading indicator is the brief "Submitting..." text on the submit button in `approval-gate.tsx:97`.

**M4. No auto-refresh or polling.** Dashboard is fully server-rendered with no client-side data refresh. Glenn must manually click "Sync PRs" and then hard-refresh the page to see updated CI status. For a daily-driver operational tool, this is a significant gap. `force-dynamic` means each page load hits the DB, but there's no mechanism to keep the data fresh while the page is open.

**M5. Zero error boundaries or catch-all error handling.** No `error.tsx` files in any route segment. If the DB is down or `gh` is not authed, every page throws an unhandled 500 with a raw Next.js error page. The only error handling is in individual API routes (which return JSON errors) and in client components (which show inline error text).

**M6. Inbox "0 pending" is ambiguous.** `src/lib/inbox.ts:57-68` counts `WHERE status = 'pending'`. When inbox_items is empty (never used), the dashboard shows "0 inbox interrupts" — same as "synced and all resolved." No distinction between "never synced" and "synced, clean." The `inbox/sync` route doesn't track last-sync-time anywhere.

**M7. Sidebar hidden on mobile with no alternative.** `src/components/sidebar.tsx:42` — `className="hidden w-64 ... lg:flex"`. Below `lg` breakpoint, the sidebar disappears entirely. No hamburger menu, no bottom nav, no mobile nav drawer. The app is unusable on a phone.

**M8. `as unknown as` type casts in inbox.ts.** `src/lib/inbox.ts:51-53` — the `db.execute()` result is cast through `unknown` to reach the rows array. This pattern repeats at lines 51, 82, 116, and 150. Drizzle's `db.execute()` returns `QueryResult<unknown>` but the cast is fragile — if the schema changes, there's no type safety. Should use `db.execute(sql<InboxItem[]>\`...\`)` with a typed result.

### LOW severity

**L1. Three ESLint errors in baseline.**
- `src/components/executive-briefing.tsx:52` — `refreshMode()` called synchronously in `useEffect` triggers `setMode` → cascading render.
- `src/components/settings-panel.tsx:33` — `setKey()` called synchronously in `useEffect` (same pattern).
- `src/components/settings-panel.tsx:133` — unescaped `'` character in JSX.

**L2. No relative + absolute timestamp pairing.** Every timestamp uses `formatDistanceToNow()` (`page.tsx:93`, `message-thread.tsx:74`, `mission-health-panel.tsx:36`) but none show the absolute time on hover (title attribute). For an ops tool, "3m ago" is useful but "3m ago (14:22:07 UTC)" is better.

**L3. `process.env.NEXT_PUBLIC_GH_REPO` reference in client component.** `src/components/pr-merge-button.tsx:76` reads `process.env.NEXT_PUBLIC_GH_REPO` in a `"use client"` component. This works because Next.js inlines it at build time, but it's reading a server-side env var name without the `NEXT_PUBLIC_` prefix in `.env.example` — the variable is `GH_REPO`, not `NEXT_PUBLIC_GH_REPO`. It will always fall back to `"glennguilloux/flowmanner"`.

**L4. `SimulateProposal` requires a strategyId.** `src/components/simulate-proposal.tsx:11` — the component only renders on the strategy detail page (`src/app/strategies/[id]/page.tsx:118`). If there are no strategies (fresh DB, no seed), there's no way to test the gate. Low priority since PRs are the real data source now.

**L5. Hardcoded LLM model name in `src/lib/llm.ts:5-6`.** `LLM_MODEL` defaults to `"Qwen3.6-27B-Q5_K_M-mtp.gguf"` — a static string that doesn't reflect which model the daemon is actually serving. The model swap feature will need to make this dynamic.

**L6. No CSRF protection on POST routes.** All API routes accept plain `POST` without CSRF tokens. For a single-user homelab this is low risk, but the sync buttons use `<form action>` which would be vulnerable to CSRF if the dashboard were ever exposed beyond WireGuard.

**L7. Briefing model label is stale.** `src/components/executive-briefing.tsx:124` — `providerLabel` for homelab mode hardcodes `"Homelab · Qwen3-27B"`. After a model swap, this label won't update. Tied to L5.

---

## What's missing for "proper" dashboard

### 1. Data correctness

| Gap | Status |
|---|---|
| PRs loaded correctly via `gh pr list` | ✅ Working — real PR data, CI rollup correct |
| Stat cards consistent with underlying data | ⚠️ `computeCi()` (page.tsx:24) is a third implementation that may diverge from the canonical `flattenCiRollup()` in github.ts |
| Approve/reject maps to real gh actions | ⚠️ Works for reject/comment, but approve on PR-tactics is unreachable from the UI (H2) |
| Model swap actually swaps | ❌ Not built yet |
| Idempotency on double-click | ❌ Missing (H1) |

### 2. UX polish

| Gap | Status |
|---|---|
| Loading states on every async operation | ❌ None (M3) |
| Error states with actionable messages | ⚠️ Client components show error text, but no error.tsx boundaries (M5) |
| Empty states that are honest | ⚠️ "✓ No pending interrupts" exists but ambiguous (M6); "No PRs synced yet" is good |
| Optimistic UI | ⚠️ MessageThread only; no optimistic status flips on approve/reject |
| Keyboard shortcuts | ❌ None |
| Refresh strategy | ❌ No auto-refresh, no on-focus refetch, no stale-while-revalidate (M4) |
| Consistent design tokens | ⚠️ Mostly consistent (Tailwind slate/indigo/amber/rose scale) but some ad-hoc values |
| Accessibility | ❌ No focus-visible ring, no aria-labels on icon buttons, no role="status" on error/success messages |

### 3. Operational maturity

| Gap | Status |
|---|---|
| Relative + absolute timestamps | ❌ Relative only (L2) |
| Health surface (which model, daemon health) | ❌ No visibility into homelab LLM state |
| Audit trail | ⚠️ Approvals table records decisions, but no audit for syncs, merges, or model swaps |
| Idempotency | ❌ Double-trigger risk (H1) |
| Rate-limit awareness | ⚠️ No debouncing on sync buttons; gh CLI handles its own rate limits but no app-level guard |
| Background refresh | ❌ Page is static between loads |

### 4. Glenn-specific

| Gap | Status |
|---|---|
| Bundle size awareness | ✅ Good — server components for data-heavy pages, client components only where needed |
| Layout density | ✅ Good — compact stat cards, no marketing copy |
| Destructive action confirmation | ⚠️ Merge has 2-click confirm, but approve/reject does not |
| Homelab-only LLM | ✅ Enforced — `src/lib/llm.ts` and `src/lib/openrouter.ts` are the only two LLM paths; OpenRouter is the one legitimate SaaS shortcut |
| Mobile usability | ❌ Sidebar hidden, no alternative nav (M7) |

---

## LLM Model Swap — design spec

### UI placement: persistent sidebar chip (option b)

**Reasoning:** Glenn sits in front of this daily and navigates via the sidebar. A persistent chip showing "⚙ Qwen3.6-27B-MTP" below the user avatar in the sidebar (`src/components/sidebar.tsx:68-77`) is:
- Visible on every page (unlike settings panel or /models route)
- Zero-click to see the current model (unlike a settings panel you have to open)
- Doesn't consume a nav slot (unlike a dedicated /models route)
- Natural placement near the user identity block

```
┌─ Sidebar ─────────────────────────┐
│ 🎯 FlowManner HIL                │
│    Human-in-the-Loop              │
│                                    │
│ [ Dashboard ]                      │
│ [ Strategies ]                     │
│ [ Tactics    ]                     │
│ [ PRs        ]                     │
│ [ Agents     ]                     │
│ [ Users      ]                     │
│                                    │
│ ────────────────────────────────── │
│ 👤 Me                              │
│    Human operator                  │
│                                    │
│ ┌─ ⚙ Qwen3.6-27B-MTP ● ────────┐│
│ │  Click to change model          ││
│ └─────────────────────────────────┘│
└────────────────────────────────────┘
```

Clicking the chip opens a **slide-over panel** (reuses the settings-panel.tsx modal pattern):

```
┌─ LLM Model Manager ──────────────────────────────┐
│                                                    │
│  Daemon: localhost:9723  ● Healthy  latency: 12ms │
│                                                    │
│  ┌─ Qwen3.6-27B-MTP ──────────────────────────┐  │
│  │ Architecture: qwen35 · Q5_K_M · draft-mtp   │  │
│  │ 27B dense, MTP speculative decoding          │  │
│  │ ● Currently active                           │  │
│  │ ● Healthy                                    │  │
│  └──────────────────────────────────────────────┘  │
│                                                    │
│  ┌─ Ornith-35B ────────────────────────────────┐  │
│  │ Architecture: qwen35moe · Q5_K_M · ngram    │  │
│  │ 35B MoE, ~3B active per token               │  │
│  │   [ Activate ]                               │  │
│  │ ● Healthy                                    │  │
│  └──────────────────────────────────────────────┘  │
│                                                    │
│  Last swap: 2h ago (Ornith-35B → Qwen3.6-27B-MTP)│
└────────────────────────────────────────────────────┘
```

### Fetch sequence

1. **On panel open:** `GET http://localhost:9723/models` + `GET http://localhost:9723/status` in parallel
2. **Render:** model list from `/models`, active model from `/status`, health from `/health`
3. **On "Activate" click:** confirmation dialog → `POST http://localhost:9723/activate { model_id }`
4. **During swap:** disable picker, show progress spinner with stage text
5. **Poll:** `GET /status` every 2s with exponential backoff (2→4→8→16s) until health=true or 60s timeout
6. **On success:** toast "Model swapped to {name}" + refresh chip label + `router.refresh()` for any LLM-dependent UI
7. **On failure:** revert picker state, show error with stderr tail if available

### API route (new)

`src/app/api/models/route.ts` — a thin proxy to `http://localhost:9723`:
- `GET /api/models` → proxies `GET localhost:9723/models` + `GET localhost:9723/status`
- `POST /api/models` → proxies `POST localhost:9723/activate` with `{ model_id }`
- `GET /api/models/health` → proxies `GET localhost:9723/health` (used for polling during swap)

Why proxy instead of browser-direct: the daemon is on localhost:9723 but the dashboard may be accessed over WireGuard from a different IP. The Next.js server process is on the same host, so `localhost:9723` always works from the server.

### Error cases to handle

| Error | UI behavior |
|---|---|
| Daemon unreachable (fetch fails) | Red banner: "Model manager unreachable at localhost:9723. Is the daemon running?" |
| Model file missing | Error in activate response: show daemon's error message verbatim |
| systemd daemon-reload rejected | Same — surface the daemon's stderr |
| Health timeout (60s) | "Swap timed out. The model may still be loading. Check daemon logs." + option to retry health check |
| User navigates away mid-swap | AbortController on the polling fetch; no cleanup needed server-side |
| Network error during polling | Pause polling, show "Connection lost — retrying" with manual retry button |

### New files for model swap

| File | Purpose |
|---|---|
| `src/app/api/models/route.ts` | Proxy to model manager daemon |
| `src/components/model-swap-panel.tsx` | Client component — the slide-over panel |
| `src/components/model-swap-chip.tsx` | Client component — sidebar chip (calls /api/models on mount) |

### Modified files for model swap

| File | Change |
|---|---|
| `src/components/sidebar.tsx` | Add `<ModelSwapChip />` below user avatar |
| `src/lib/llm.ts` | Add `getActiveModel()` that reads from daemon status |

---

## Summary by severity

| Severity | Count | Key items |
|---|---|---|
| HIGH | 3 | H1 idempotency, H2 approve button missing for PRs, H3 triple CI logic |
| MED | 8 | M1 no loading UX on sync, M2 N+1 queries, M3 no loading states, M4 no auto-refresh, M5 no error boundaries, M6 ambiguous inbox, M7 no mobile nav, M8 fragile type casts |
| LOW | 7 | L1 lint errors, L2 no absolute timestamps, L3 env var mismatch, L4 simulate needs strategy, L5 hardcoded model name, L6 no CSRF, L7 stale briefing label |
