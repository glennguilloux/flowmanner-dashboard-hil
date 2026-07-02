# Plan — HIL Control Surface (REAL data, not a demo)

Working folder: `/home/glenn/flowmanner-dashboard-HIL/`
Status: Phase 1 built (Next.js app + `hil_ops` schema + gate UI on seed data). This plan replaces the demo framing with real data delivery.

---

## The honest state of real data (checked 2026-06-19)

| Source | Rows | Actionable? |
|---|---|---|
| `inbox_items` (FM HIL interrupts) | **0** — never used | Infrastructure only — lights up when FM agents start raising interrupts (not built in FM backend yet) |
| Open PRs (gh) | **2** — PR #3 (fix tests), PR #4 (drop audio) | **YES — both have CI FAILING right now** |
| Missions | 65 (4 running, 2 pending, 53 done, 6 failed) | Context — shows what agents are doing, not decisions |

**The only real actionable data today is PRs + CI.** Both open PRs have 4 failing CI checks each. That's the working tool — a CI/CD triage surface for FM PRs. The inbox sync is built and ready but empty until FM wires up interrupt-raising.

---

## What changes from phase 1

Phase 1 gave us: the Next.js app, `hil_ops` schema, gate mechanics, message threads, the approval flow. All on seed data. Good foundation, wrong data source.

**Phase 2 makes it real:**

1. **PRs become first-class tactics** — `gh pr list` → real PR-tactics with live CI status. This is the immediate win: 2 real PRs with 4 failing checks each, right now.
2. **Inbox sync is wired but empty** — read path built, ready for when FM agents start interrupting. Shows "✓ Inbox clear" until then.
3. **Missions panel** — running/pending missions as context ("what agents are doing right now").
4. **Decisions are real actions** — approve a PR-tactic = `gh pr merge`; reject = `gh pr review --request-changes`; more-info = `gh pr comment`. Not just a DB row flip.
5. **CI failures shown inline** — each failing check name + link to the Actions run, so you see *why* CI is red without leaving the page.
6. **Kill the seed-as-primary-view** — seed data stays for dev/onboarding ("Load demo data" button), but the default dashboard reads REAL PRs + missions.

---

## Phase 2: PR + CI sync (the working tool)

### 2a. Read PRs → tactics

`GET /api/prs/sync` runs `gh pr list --json ...` (already authed in Glenn's keyring from `/opt/flowmanner`), upserts `hil_ops.tactics` where `source='pr'`.

PR → tactic mapping:

```
PR field                  → tactic field
─────────────────────────────────────────────
number                    → sourceId
title                     → title
"PR #N: <title>"          → title (display)
body / first 200 chars    → description
statusCheckRollup         → ciState (passing/failing/pending/none)
reviewDecision            → initial status heuristic
  "" / REVIEW_REQUIRED    → needs_review (gate)
  APPROVED                → approved
  CHANGES_REQUESTED       → needs_review
additions + deletions     → risk heuristic (big diff = higher risk)
changedFiles              → steps summary
createdAt                 → createdAt
headRefName / baseRefName → description enrichment
url                       → deep link
```

CI rollup flattening (`lib/github.ts`):

```
statusCheckRollup = [{conclusion: "FAILURE"}, {conclusion: "SKIPPED"}, ...]
→ ciState = "failing" if any FAILURE
→ ciState = "passing" if all SUCCESS or SKIPPED
→ ciState = "pending" if any IN_PROGRESS/QUEUED
→ ciState = "none" if empty
```

Also store the raw check list per tactic so the detail page can show each failing check name + link.

### 2b. CI detail on tactic page

Tactic detail page for a PR-tactic shows a **CI panel** instead of (or alongside) the agent assessment panel:

```
┌─ CI status ───────────────────────────────────────┐
│ ✗ FAILING — 4 of 7 checks failed                  │
│                                                    │
│ ✗ Substrate gates (blocking)     [view run →]     │
│ ✗ Load Tests (k6)                [view run →]     │
│ ✗ Deletion guard + backend sanity [view run →]    │
│ ✗ Frontend (tsc, vitest, build)  [view run →]     │
│ ○ Backend (lint, typecheck)      skipped           │
│ ○ E2E tests (Playwright)         skipped           │
│ ○ Docker build (backend)         skipped           │
└────────────────────────────────────────────────────┘
```

Each check links to its `detailsUrl` (GitHub Actions run).

### 2c. Real decisions on PR-tactics

The `<ApprovalGate>` already exists. For PR-tactics, the decisions map to real `gh` actions:

| decision | DB effect | `gh` action |
|---|---|---|
| approve | status→approved, if CI passing | `gh pr merge --squash --delete-branch` (gated behind explicit toggle, default OFF) |
| reject | status→rejected | `gh pr review --request-changes --body "<notes>"` |
| request_more_info | status stays needs_review | `gh pr comment "<notes>"` |

**Merge safety:** the approve button is split into two:
- "Approve" — marks approved in ops DB, posts `gh pr review --approve`. Does NOT merge.
- "Approve & merge" — only enabled when `ciState === "passing"`. Runs `gh pr merge --squash`. Requires explicit confirmation (separate button click, not a toggle).

This is the "Harness CI/CD" part — you see CI failures, you can't merge red, and when CI goes green the merge button unlocks.

### 2d. The dashboard reads real data

Dashboard default view:

```
┌─ FLOWMANNER HIL ──────────────────────────────────────────┐
│                                                            │
│  [2 open PRs]  [4 CI failing]  [0 inbox]  [4 missions]    │
│                                                            │
│  ┌─ NEEDS YOUR ATTENTION ──────────────────────────────┐  │
│  │ #4  drop(audio): remove 6 audio tools              │  │
│  │     CI: ✗ FAILING (4 checks) · 14 files · -3559    │  │
│  │     [view CI details →]  [approve]  [reject]       │  │
│  │                                                      │  │
│  │ #3  fix(tests): unblock pr-check.yml               │  │
│  │     CI: ✗ FAILING (4 checks) · 3 files · -26       │  │
│  │     [view CI details →]  [approve]  [reject]       │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
│  ┌─ INBOX ──────────────┐  ┌─ MISSIONS IN FLIGHT ──────┐  │
│  │ ✓ No pending         │  │ 4 running · 2 pending     │  │
│  │   interrupts         │  │ [list with status]        │  │
│  └──────────────────────┘  └───────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
```

No demo data by default. The "Load demo data" seed button stays for dev/testing but is not the primary experience.

---

## Phase 3: Inbox sync (ready for when interrupts flow)

### 3a. Read path

`GET /api/inbox/sync` reads `inbox_items` from FM Postgres (same DB, `public` schema, read-only) and upserts `hil_ops.tactics` where `source='inbox'`.

```
inbox_items field     → tactic field
─────────────────────────────────────────────
id                    → sourceId
interrupt_type        → risk heuristic (escalation=high, approval=medium, clarification=low)
title                 → title
description           → description
proposed_action       → steps (parsed from JSONB)
context               → sources / description enrichment
mission_id            → strategy link (1:1 with mission)
status                → tactic status (pending=needs_review, resolved=mapped)
created_at            → createdAt
expires_at            → uncertaintyNotes ("expires in Xh")
```

The read is a direct Postgres query on `inbox_items` (read-only, `public` schema). No FM API auth needed — same DB instance.

### 3b. Write-back (resolve interrupts)

When you approve/reject an inbox-tactic:

| decision | DB effect | FM write-back |
|---|---|---|
| approve | status→approved | `UPDATE inbox_items SET status='approved', resolved_at=now(), resolution_note=<notes> WHERE id=<sourceId>` |
| reject | status→rejected | Same with status='rejected' |
| request_more_info | status stays needs_review | `UPDATE inbox_items SET resolution_note=<notes>` (re-raises for agent) |

This is a direct DB write to `inbox_items` — we're in the same Postgres instance. Cleanest path, no FM API auth headache. The write is scoped: only `status`, `resolved_at`, `resolution_note` columns touched.

**Why not FM API:** the API returns 401 for internal tools. A service token would need a backend change. Direct Postgres write works today and the dashboard already has DB access. When FM adds a service token, we switch to the API — but the dashboard shouldn't be blocked on a backend change.

### 3c. The inbox is empty — and that's fine

Right now `inbox_items` has 0 rows. The inbox panel shows "✓ No pending interrupts." When FM agents start raising interrupts (a FM backend feature), the sync endpoint picks them up automatically — no dashboard change needed. The dashboard is ready; FM's interrupt-raising isn't. Building this now means it's live the moment FM wires it up.

---

## Phase 4: Background reviewer (homelab LLM)

`POST /api/review/score` calls homelab llama.cpp (`:11434`, Qwen3-27B) to score a tactic's confidence/risk from its description + proposed_action + (for PRs) diff summary.

```
POST /api/review/score { tacticId }
→ homelab LLM evaluates
→ { confidence: 0-100, riskLevel, uncertaintyNotes }
→ stored on tactic
→ drives the gate
```

Hard rule: homelab LLM only. Never SaaS. Already reflected in seed data (agent.model = "llama.cpp:qwen3-27b-q5 (homelab)").

This replaces the static confidence values from sync heuristics with LLM-scored ones. For PRs, the reviewer can read the diff and score "how risky is this change?" — big deletions = high risk, test-only changes = low risk.

---

## Phase 5: Polish

- Session-ritual panel (git status / alembic head / unpushed of `/opt/flowmanner`).
- Kanban snapshot from `.hermes/kanban/board.json`.
- Dark theme (scrape FM's `globals.css` tokens).
- Auto-refresh (`<meta http-equiv="refresh" content="60">` or polling).

---

## What's already built (phase 1, keep)

- Next.js 16 app, `hil_ops` schema, Drizzle ORM, all routes render.
- `<ApprovalGate>` — 3-way decision (approve/reject/request-more), writes approval row + message.
- `<MessageThread>` — human↔agent chat with optimistic updates.
- `<SimulateProposal>` — dev tool to test the gate.
- `lib/gate.ts` — single source of truth for the gate rule.
- `hil_ops` schema isolated from FM's `public` (162 tables untouched, verified).
- API routes: health, seed, tactics POST, approve, messages.

## What needs to change

- **Default data source**: PRs + missions, not seed. Seed becomes a dev-only button.
- **`lib/github.ts`**: new — `gh pr list` wrapper, CI rollup flattening, merge/review/comment actions.
- **`lib/inbox.ts`**: new — read `inbox_items` from `public` schema (read-only), write-back resolve.
- **`/api/prs/sync`**: new — upsert PR-tactics.
- **`/api/inbox/sync`**: new — upsert inbox-tactics.
- **`/api/prs/[id]/merge`**: new — `gh pr merge --squash` (CI-gated).
- **Tactic detail page**: add CI panel for PR-tactics, agent assessment panel for inbox-tactics.
- **Dashboard**: real stat cards (open PRs, CI failing, inbox count, missions running).
- **`/prs` page**: replace placeholder with real PR list + CI badges.
- **Approve route**: branch on `tactic.source` — PR-tactics call `gh`, inbox-tactics write to `inbox_items`.

---

## Build order (each step delivers real value)

1. **PR sync + CI badges** (~2h) — the 2 real PRs appear with failing CI shown. Immediate: you see what's broken.
2. **PR decisions = real gh actions** (~1h) — approve/reject/comment via `gh`. You can act on PRs from the dashboard.
3. **Merge with CI gate** (~30m) — `gh pr merge` only when CI passing. The harness: you can't merge red.
4. **Inbox sync read path** (~1h) — reads `inbox_items` (empty now, ready for later). Shows "✓ clear."
5. **Inbox write-back** (~30m) — resolve interrupts directly in Postgres.
6. **Missions panel** (~30m) — running/pending missions as context.
7. **Background reviewer** (~2h) — homelab LLM scores PR risk from diffs.

Steps 1-3 are the working CI/CD tool. That's the priority — real PRs, real CI, real merge decisions.

---

## Acceptance criteria (real, not demo)

1. Dashboard shows PR #3 and PR #4 with real CI status (4 failing checks each).
2. Clicking a PR-tactic shows each failing check name + link to the Actions run.
3. "Reject" on a PR-tactic runs `gh pr review --request-changes` — verified by checking the PR on GitHub.
4. "Approve & merge" is disabled when CI is failing; enabled when passing.
5. Inbox panel shows "✓ No pending interrupts" (because inbox_items is empty).
6. Missions panel shows 4 running + 2 pending from real data.
7. No seed data on the default dashboard — only real PRs + missions + (empty) inbox.
8. Seed button still works for dev/testing but is clearly labeled "demo data."
