# FlowManner HIL Dashboard — "Ship It" Attack Plan

**Status:** Ready
**Owner:** DeepSeek (with Hermes verification)
**Priority:** HIGH — Glenn wants this as a public GitHub repo with all known
remaining issues closed.
**Estimated effort:** ~4–6 hours total across 6 phases.

> **Important:** This is a **ship-the-existing-code** plan, not a build plan.
> The dashboard was built across multiple sessions from 2026-06-19 through
> 2026-07-02. There are **9 commits, 18,500+ LOC** already in
> `/home/glenn/flowmanner-dashboard-HIL/`. The work here is (a) get it onto
> GitHub, (b) close the remaining known issues from the audits, (c) register
> the new Qwopus Coder MTP model so it appears in the model-swap UI.

---

## Context — what already exists (DO NOT rebuild)

### Repo state (verified 2026-07-02)
- **Local path:** `/home/glenn/flowmanner-dashboard-HIL/`
- **Branch:** `master`, **9 commits**, no remote configured
- **Latest commit:** `d02a846` (docs: SESSION-AUDIT-2026-07-02 update)
- **Stack:** Next.js 16 · React 19 · Tailwind 4 · Drizzle 0.45 · Postgres 15
- **DB:** shares the FM Postgres DB on the homelab; lives in `hil_ops` schema
  (does NOT touch FM's `public` schema or alembic migrations)
- **Working tree:** clean (no uncommitted changes)

### What was built across sessions (verified by file count)

| Subsystem | Status | Files |
|---|---|---|
| Phase 1–5 of original PLAN.md | ✅ Complete | 135 files in initial commit `600b3ad` |
| System Health panel | ✅ Complete | `src/lib/system-health.ts`, `src/app/api/system-health/route.ts`, `src/components/system-health-panel.tsx` (5 services parallel-pinged, `usePolling`) |
| Activity Timeline panel | ✅ Complete | `src/lib/activity-timeline.ts`, `src/app/api/activity-timeline/route.ts`, `src/components/activity-timeline-panel.tsx` |
| WireGuard watchdog | ✅ Complete | `src/lib/wg-watchdog.ts`, `src/app/api/wg-watchdog/route.ts`, `src/components/wg-watchdog-{chip,panel}.tsx` |
| Kanban page + snapshot | ✅ Complete | `src/app/kanban/page.tsx`, `src/lib/kanban.ts`, `src/components/kanban-snapshot-panel.tsx` |
| Hermes ACP integration | ✅ Complete | `src/lib/hermes-acp.ts`, `src/components/hermes-{chip,panel,agents-panel,approval-panel}.tsx` |
| OpenCode telemetry | ✅ Complete | `src/lib/opencode.ts`, `src/components/opencode-{chip,panel}.tsx` |
| Hermes HITL approval gates | ✅ Complete | `src/app/api/hermes/approvals/route.ts`, `src/components/hermes-approval-panel.tsx` (4-scope decision: allow_once/allow_session/allow_always/deny) |
| Background LLM reviewer | ✅ Complete | `src/app/api/review/score/[id]/route.ts`, `src/lib/review.ts`, `src/components/{llm,batch}-review-button.tsx` |
| Model swap (UI + proxy) | ✅ Complete | `src/app/api/models/{route.ts,health/route.ts}`, `src/components/model-swap-{chip,panel}.tsx` |
| Dark theme + `t` shortcut | ✅ Complete | `src/components/{theme-toggle,keyboard-help}.tsx`, `globals.css` |
| Auto-refresh polling | ✅ Complete | `src/hooks/use-polling.ts`, `usePolling` in 5 client panels |
| Section error boundaries | ✅ Complete | `src/components/section-error-boundary.tsx` |
| Auth middleware | ✅ Complete | `src/middleware.ts`, `src/lib/auth.ts` (Bearer, dev-mode no-op) |
| Session ritual | ✅ Complete | `src/lib/session-ritual.ts`, `src/components/session-ritual-{chip,panel}.tsx` |
| Executive briefing | ✅ Complete | `src/components/executive-briefing.tsx` (homelab LLM or OpenRouter BYOK) |
| Mobile hamburger menu | ✅ Complete | in `src/components/sidebar.tsx` |

### What is still missing or broken (verified from audits 2026-07-02)

| # | Issue | Severity | Source |
|---|---|---|---|
| 1 | **No GitHub remote** — repo is local-only at `/home/glenn/flowmanner-dashboard-HIL/`. Glenn wants it on github.com. | HIGH | This plan |
| 2 | **No idempotency on approve double-click** — re-clicking Approve can double-fire `gh pr merge` or duplicate DB rows. | HIGH | `docs/EXIT-AUDIT-2026-07-02.md` §4 |
| 3 | **3 ESLint errors** in `src/components/settings-panel.tsx` + `src/components/executive-briefing.tsx` | LOW | Same §4 |
| 4 | **New Qwopus Coder MTP model** (24 GB, `/mnt/apps/llama.cpp-mtp/Qwopus3.6-35B-A3B-Coder-MTP-Q5_K_M.gguf`) is NOT in `/opt/flowmanner/config/llm-models.yaml` — so it doesn't appear in the dashboard's model-swap panel | MED | Live verification 2026-07-02 (curl /models lists only 2 models) |
| 5 | **`ApprovalsTab` in `hermes-panel.tsx` duplicates resolved-list rendering** from `hermes-approval-panel.tsx`. Extract shared component. | LOW | `docs/SESSION-AUDIT-2026-07-02.md` Known Issues |
| 6 | **`HermesApproval` type defined in 3 places** (server lib + 2 client components). Extract to `src/types/hermes.ts`. | LOW | Same |
| 7 | **Kanban board is read-only** (no task moves). Marked "by design — FM owns writes" in 2026-07-02 audit. **Decide in this plan: keep read-only, or expose write API?** | DECISION | Same |
| 8 | **`Example/` directory** hasn't been fully updated with dark mode | LOW | Same |
| 9 | **Unused `relativeTime` import** in `hermes-agents-panel.tsx` | LOW | Same |
| 10 | **PR detail view with inline diff** — tactic detail page shows CI but no diff. Flagged in original PLAN.md but not built. | OPTIONAL | `docs/EXIT-AUDIT-2026-07-02.md` §2 Not Built |

### Future-integration roadmap (in `docs/EXIT-AUDIT-2026-07-02.md` §3)
The 8-phase OpenCode + Hermes + OpenClaw integration plan exists but is
**NOT in scope for this attack plan**. It's the next major workstream after
this one ships. Reference: `docs/EXIT-AUDIT-2026-07-02.md:185-450`.

---

## Phases

### Phase 0: GitHub repo creation + initial push

**Why first:** Nothing else matters until the code is on GitHub. Glenn
deploys from there; subagents and external reviewers work from there.

**Steps:**

1. Ask Glenn which GitHub org/owner to create under (default:
   `glennguilloux/flowmanner-dashboard-hil`). Use the `gh` CLI if available:
   ```bash
   gh repo create glennguilloux/flowmanner-dashboard-hil \
     --public \
     --description "FlowManner HIL & PR control surface — agent tactics, human gates, message threads. Next.js 16 + React 19 + Tailwind 4 + Drizzle." \
     --source /home/glenn/flowmanner-dashboard-HIL \
     --remote origin \
     --push
   ```
   **OR** if `gh` is unavailable or Glenn prefers the web UI:
   - Open https://github.com/new, create the repo empty (no README/.gitignore/license)
   - Then from the local repo:
     ```bash
     cd /home/glenn/flowmanner-dashboard-HIL
     git remote add origin git@github.com:glennguilloux/flowmanner-dashboard-hil.git
     git push -u origin master
     ```

2. Verify push:
   ```bash
   git remote -v
   # Expected: origin → git@github.com:glennguilloux/flowmanner-dashboard-hil.git
   git fetch origin
   git log --oneline origin/master..master
   # Expected: empty (nothing ahead/behind)
   ```

3. Add a GitHub Actions CI workflow at `.github/workflows/ci.yml`:
   ```yaml
   name: CI
   on: [push, pull_request]
   jobs:
     verify:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - uses: pnpm/action-setup@v4
           with: { version: 9 }
         - uses: actions/setup-node@v4
           with: { node-version: 20, cache: pnpm }
         - run: pnpm install --frozen-lockfile
         - run: pnpm typecheck
         - run: pnpm lint
         - run: pnpm build
   ```
   (Postgres-dependent integration tests stay local; CI runs gates only.)

**Acceptance:**
- [ ] Repo exists at the chosen URL, public
- [ ] `git push` shows 9 commits pushed
- [ ] CI workflow file committed, action runs green on first push

---

### Phase 1: Register the new Qwopus Coder MTP model

**Why:** The 24 GB Qwopus file is sitting on disk but not in the model
registry. The dashboard's model-swap panel reads the YAML, so adding a model
block is a single-file edit — the UI updates automatically.

**File:** `/opt/flowmanner/config/llm-models.yaml` (in the
`/opt/flowmanner` repo, NOT in the dashboard repo)

**Append a third model block** under `models:`:

```yaml
  qwopus3.6-35b-a3b-coder-mtp:
    display_name: "Qwopus3.6-35B-A3B (Coder MTP)"
    model_path: /mnt/apps/llama.cpp-mtp/Qwopus3.6-35B-A3B-Coder-MTP-Q5_K_M.gguf
    ctx_size: 32768
    gpu_layers: 99
    flash_attn: on
    parallel: 1
    # MTP speculative decoding (requires MTP-baked GGUF)
    spec_type: draft-mtp
    spec_draft_n_max: 3
    spec_p_min: 0.75
    description: "Coder-specialized 35B-A3B MoE with MTP draft heads. Architecture matches Qwen3.6 35B-A3B but tuned for code generation."
    architecture: qwen36moe
    quantization: Q5_K_M
```

> **Note on architecture key:** the existing YAML uses `qwen35` and `qwen35moe`.
> The dashboard's model-swap panel renders `model.architecture` as a label
> string (`src/components/model-swap-panel.tsx:413-419`) — it does NOT validate
> the value. So `qwen36moe` will display as-is. If Glenn wants it normalized
> to `qwen36-moe`, change the string here.

**Verify the daemon picks it up:**

```bash
curl -s http://127.0.0.1:9723/models | python3 -m json.tool
# Expected: 3 models, qwen3.6-27b-mtp is_active=true (still),
#   qwopus3.6-35b-a3b-coder-mtp is_active=false (newly listed)
```

**Do NOT activate it.** Activation is a separate manual action — switching
the live llama-server to a new model is a 30–120s downtime event. Glenn will
trigger it via the dashboard's model-swap UI when ready.

**Acceptance:**
- [ ] YAML block added, daemon `GET /models` returns 3 models
- [ ] Dashboard's `GET /api/models` (proxied) returns 3 models
- [ ] Model-swap panel renders the new row with `qwen36moe · Q5_K_M · draft-mtp` chip
- [ ] Active model unchanged (qwen3.6-27b-mtp)

---

### Phase 2: Approve-route idempotency (HIGH severity bug)

**Why:** Two clicks on Approve can double-fire `gh pr merge` and double-write
the DB row. Glenn's daily workflow hits this.

**File:** `src/app/api/tactics/[id]/approve/route.ts`

**Strategy:** Look up approvals created in the last 10 seconds for the same
tactic with the same decision. If one exists, return its result instead of
re-running the workflow.

**Pseudo-logic:**

```typescript
// At the top of the POST handler, after auth + DB session:
const RECENT_WINDOW_S = 10;

const recent = await db
  .select()
  .from(approvals)
  .where(and(
    eq(approvals.tacticId, tacticId),
    eq(approvals.decision, body.decision),         // approve | reject | request_more_info
    gte(approvals.createdAt, sql`now() - interval '${sql.raw(String(RECENT_WINDOW_S))} seconds'`),
  ))
  .orderBy(desc(approvals.createdAt))
  .limit(1);

if (recent.length > 0) {
  return Response.json({
    ok: true,
    idempotent: true,                              // client UI can recognize this
    approval: recent[0],
    message: `Decision recorded ${RECENT_WINDOW_S}s ago; ignoring duplicate click.`,
  });
}
```

**Also:** check the tactic's current status. If `status === "approved"` and
the user is trying to approve again, return the same idempotent response.

**Client-side UX:** In `src/components/approval-gate.tsx`, debounce the
submit button (`disabled={submitting}` already exists — verify it's set
during the entire POST roundtrip, not just the optimistic state).

**Verify with a manual test:**
```bash
# Start dev server: pnpm dev
# In browser: open a tactic, click Approve twice in rapid succession
# Network tab: two POST /api/tactics/{id}/approve
# Second response: { ok: true, idempotent: true }
# DB: only one approval row
# gh: only one pr review or merge command
```

**Acceptance:**
- [ ] Double-click on Approve results in exactly ONE gh + DB write
- [ ] Second POST returns `{ ok: true, idempotent: true }`
- [ ] Outside the 10s window, a fresh Approve works normally
- [ ] Idempotency works for both approve and reject decisions
- [ ] `pnpm typecheck` + `pnpm lint` clean

---

### Phase 3: ESLint cleanup + small refactors (LOW severity)

**Why:** Quick wins, ~30 minutes total. Clean up technical debt.

**3a. Fix ESLint errors** in `settings-panel.tsx` and `executive-briefing.tsx`:

```bash
cd /home/glenn/flowmanner-dashboard-HIL
pnpm lint -- --format=unix
```

Read each error, apply the obvious fix (unescape apostrophe in `'User's`,
move `setKey(getOrKey())` into an effect or event handler, etc.). Do NOT
refactor beyond what lint demands.

**3b. Remove unused `relativeTime` import** in `src/components/hermes-agents-panel.tsx`:

```typescript
// Delete the import line, save the file, run `pnpm lint` to confirm clean.
```

**3c. Extract shared `HermesApproval` type to `src/types/hermes.ts`:**

```typescript
// New file: src/types/hermes.ts
export type HermesApprovalScope =
  | "allow_once"
  | "allow_session"
  | "allow_always"
  | "deny";

export interface HermesApproval {
  id: string;
  scope: HermesApprovalScope;
  reason: string;
  agent_id?: string;
  created_at: string;
  // ... whatever the dashboard needs; mirror the server lib for now
}
```

Then in `src/lib/hermes-acp.ts`, `src/components/hermes-approval-panel.tsx`,
and `src/components/hermes-panel.tsx`:
- Replace local interface with `import type { HermesApproval } from "@/types/hermes"`
- Delete the local interfaces

**3d. Extract shared `ApprovalsList` component** (the resolved-list rendering
duplicated in `hermes-panel.tsx` and `hermes-approval-panel.tsx`):

```typescript
// New file: src/components/hermes-resolved-list.tsx
"use client";
import type { HermesApproval } from "@/types/hermes";
// Take the existing list-rendering JSX from hermes-approval-panel.tsx (the
// "Resolved approvals" section). Accept `approvals: HermesApproval[]` as prop.
```

Replace the two duplicated blocks with `<HermesResolvedList approvals={...} />`.

**Acceptance:**
- [ ] `pnpm lint` exits 0
- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm build` succeeds
- [ ] Dashboard renders identically (visual regression check)

---

### Phase 4: Kanban write API — DECISION GATE

**Why:** The audit marked Kanban as "read-only by design." But the user
asked to finish "by far." This decision must be explicit before Phase 5.

**Two paths:**

**Path A (status quo):** Document in the repo's README that Kanban writes
happen from FM via `.hermes/kanban/board.json`. Dashboard is intentionally
read-only. Add a one-line badge to the kanban page header:
> ℹ️ Read-only view — edits happen in FlowManner (`/opt/flowmanner/.hermes/kanban/`)

**Path B (expose writes):** Add `POST /api/kanban/tasks/{id}/move` that
updates the JSON file atomically (write to tmp, rename, fsync). Adds
~50 lines. Required if Glenn wants to drag-and-drop tasks from the
dashboard.

**Action:** Ask Glenn which path. **Default: Path A** (zero risk, matches
current intent). Document the decision in the commit message.

---

### Phase 5: README + repo metadata polish

**Why:** First impression for anyone landing on the GitHub repo. The
existing `README.md` is good but doesn't reflect the recent panels
(Hermes, OpenCode, Model Swap, dark theme).

**Edit `README.md`** to add:
- A "Panels" section with screenshots/diagrams of each dashboard surface
- An "Architecture" diagram showing the homelab stack
- An "Integration matrix" table (which panel reads which endpoint)
- A "Local development" section with the actual `.env.local` keys
- A "Roadmap" section linking to `docs/EXIT-AUDIT-2026-07-02.md` §3

**Also add:**
- `LICENSE` file (MIT — matches the FM repo)
- `.github/CODEOWNERS` → `@glennguilloux`
- `.github/ISSUE_TEMPLATE/bug.yml` + `feature.yml` (basic templates)
- A `SECURITY.md` documenting that the dashboard runs behind WireGuard
  + auth middleware, NOT exposed publicly

**Acceptance:**
- [ ] README updated with screenshots/diagrams
- [ ] LICENSE + CODEOWNERS + issue templates present
- [ ] GitHub repo's About section filled in (description, homepage, topics)

---

### Phase 6 (optional): PR diff view in tactic detail

**Why:** Flagged in original PLAN.md, never built. Would let Glenn see
the diff inline without opening GitHub.

**Scope:** ~150 lines. New `src/components/pr-diff-panel.tsx`. Uses
`execFileP("gh", ["pr", "diff", prNumber])` to fetch the diff, renders
in a code block with syntax highlighting (use `react-syntax-highlighter`
or just `<pre><code>` for v1).

**Defer to a follow-up PR if budget is tight.** Not blocking for the
"ship it" goal.

---

## Execution order

```
Phase 0 (GitHub repo)         ─── blocks everything
Phase 1 (Qwopus YAML)         ─── independent, ~10 min
Phase 2 (approve idempotency) ─── independent, ~30 min
Phase 3 (lint + refactors)    ─── independent, ~30 min
Phase 4 (kanban decision)     ─── decision gate, ~5 min ask
Phase 5 (README polish)       ─── depends on Phase 0
Phase 6 (PR diff, optional)   ─── independent
```

Total: ~2 hours of work + 30 min of Glenn's review time for Phase 4.

---

## Verification gates (run all, paste output)

After ALL phases complete, from `/home/glenn/flowmanner-dashboard-HIL`:

```bash
pnpm typecheck                           # EXIT 0
pnpm lint                                # EXIT 0
pnpm build                               # SUCCESS
pnpm test                                # if tests exist; otherwise note "no tests"
```

After Phase 1 specifically:
```bash
curl -s http://127.0.0.1:9723/models | python3 -m json.tool | grep -c '"display_name"'
# Expected: 3
```

After Phase 0:
```bash
git fetch origin
git log --oneline origin/master..master
# Expected: empty
```

---

## What NOT to do

- Do NOT rewrite or "modernize" the codebase. Every panel is shipped +
  tested. The 2026-07-01 review is the source of truth for known
  trade-offs; respect them.
- Do NOT touch FM backend at `/opt/flowmanner/backend/`. The dashboard
  is downstream; it READS from FM. Any cross-cutting changes go through
  the FM repo first.
- Do NOT add new npm dependencies unless absolutely required (e.g. react-
  syntax-highlighter for Phase 6). The stack is intentionally lean.
- Do NOT enable multi-user auth. This is a single-operator homelab tool.
- Do NOT deploy. Glenn deploys from his side after review.
- Do NOT push to origin without running `pnpm typecheck && pnpm lint &&
  pnpm build` first. If any gate fails, fix before pushing.

---

## Known weaknesses (for honest planning)

1. **Phase 1's architecture key (`qwen36moe`)** is a guess. If the MTP-
   baked GGUF's real architecture differs, the panel will show the wrong
   label. Glenn should verify the `architecture` field with a model
   metadata dump before committing.
2. **Phase 2's idempotency window (10s)** is arbitrary. Could miss
   legitimate retries if the network is slow. Could trigger false
   positives if Glenn double-clicks intentionally within 10s. The audit
   can flag this in a follow-up.
3. **Phase 5's README** will be approximate without screenshots. The
   reviewer (Glenn) should expect ASCII wireframes instead.
4. **The `docs/SESSION-AUDIT-2026-07-02.md` has an off-by-one** — it
   says "5 follow-up commits" but the count from `git log --oneline` since
   `600b3ad` is 5, which matches. No actual bug, but the wording could
   be tighter.

---

## Files summary

| File | Phase | Action |
|---|---|---|
| `/home/glenn/flowmanner-dashboard-HIL/README.md` | 5 | Edit |
| `/home/glenn/flowmanner-dashboard-HIL/.github/workflows/ci.yml` | 0 | Create |
| `/home/glenn/flowmanner-dashboard-HIL/.github/CODEOWNERS` | 5 | Create |
| `/home/glenn/flowmanner-dashboard-HIL/.github/ISSUE_TEMPLATE/{bug,feature}.yml` | 5 | Create |
| `/home/glenn/flowmanner-dashboard-HIL/LICENSE` | 5 | Create |
| `/home/glenn/flowmanner-dashboard-HIL/SECURITY.md` | 5 | Create |
| `/home/glenn/flowmanner-dashboard-HIL/src/app/api/tactics/[id]/approve/route.ts` | 2 | Edit |
| `/home/glenn/flowmanner-dashboard-HIL/src/components/approval-gate.tsx` | 2 | Verify submit debounce |
| `/home/glenn/flowmanner-dashboard-HIL/src/types/hermes.ts` | 3 | Create |
| `/home/glenn/flowmanner-dashboard-HIL/src/lib/hermes-acp.ts` | 3 | Use shared type |
| `/home/glenn/flowmanner-dashboard-HIL/src/components/hermes-approval-panel.tsx` | 3 | Use shared type |
| `/home/glenn/flowmanner-dashboard-HIL/src/components/hermes-panel.tsx` | 3 | Use shared type |
| `/home/glenn/flowmanner-dashboard-HIL/src/components/hermes-resolved-list.tsx` | 3 | Create |
| `/home/glenn/flowmanner-dashboard-HIL/src/components/hermes-agents-panel.tsx` | 3 | Remove unused import |
| `/home/glenn/flowmanner-dashboard-HIL/src/components/settings-panel.tsx` | 3 | Lint fixes |
| `/home/glenn/flowmanner-dashboard-HIL/src/components/executive-briefing.tsx` | 3 | Lint fixes |
| `/opt/flowmanner/config/llm-models.yaml` | 1 | Edit (in FM repo, not dashboard) |

## Cross-repo note

Phase 1 edits a file in `/opt/flowmanner` (the FM backend repo, NOT the
dashboard repo). The user should commit + push that YAML change as part
of the FM repo's normal exit-audit flow. The dashboard repo does NOT
need to be touched for Phase 1 — the model-swap proxy
(`src/app/api/models/route.ts`) reads the daemon's `GET /models` response
at runtime, which reads the YAML live.

---

## Stop rules

- STOP if `pnpm typecheck` fails for ANY reason other than a missing
  import that's obvious. Report and let Glenn decide.
- STOP if the GitHub repo creation fails (auth issue, name taken, etc.).
  Report the error and ask.
- STOP if `gh pr review` or `gh pr merge` fails in Phase 2's manual test.
  The repo state matters; don't try to fix gh auth.
- STOP if Phase 4 (kanban decision) reveals Glenn wants Path B. The
  atomic-write API needs careful design; surface it as a separate plan
  rather than rushing.

Do NOT push to origin. Glenn reviews, then Hermes verifies and commits.