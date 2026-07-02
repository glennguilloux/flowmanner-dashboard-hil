# DeepSeek Plan Prompt — Turn the FlowManner HIL Dashboard Into a Proper Operational Dashboard (with Model Swap)

You are a senior engineer reviewing an existing working codebase and turning it
into a **proper, production-quality operational dashboard** for the FlowManner
homelab stack. Your deliverable is **two things**:

1. **A code-review memo** (written to `docs/DASHBOARD-REVIEW-2026-07-01.md`)
   that enumerates what's working, what's broken/rough, and what's missing for
   "proper" dashboard quality. Be specific: cite files, line numbers, code
   snippets. Don't be vague.

2. **A build plan** (written to `docs/DASHBOARD-PLAN-2026-07-01.md`) that
   prioritizes the work into numbered phases, each with: what changes, why it
   matters, files affected, and the order to do it in. The plan must include
   the **LLM model swap feature** as a concrete build target.

Do NOT write any application code in this phase. Your job is review + plan.
The next phase will be build.

## Project context

- **Project:** `/home/glenn/flowmanner-dashboard-HIL/`
- **Type:** Next.js 16 + React 19 + Tailwind 4 + Drizzle + Postgres
- **Database:** homelab Postgres, shares the FM backend DB
- **Purpose:** HIL/PR/CD control surface — the human-in-the-loop dashboard for
  FlowManner ops
- **Self LLM:** homelab llama.cpp at `http://localhost:11434` (hard rule: no SaaS)

The current state is documented in `PLAN.md` (258 lines). Read it first.

## Infrastructure that's already built (relevant to your plan)

A host-side **LLM model manager daemon** has been built on the homelab. It
allows swapping the active llama-server model (Qwen3.6-27B-MTP ↔ Ornith-35B
currently configured) without manual SSH + systemctl. This is critical for the
model swap UI.

- **Daemon URL (from this dashboard, on the homelab):**
  `http://localhost:9723` (the daemon binds 0.0.0.0:9723, host is 172.16.1.1)
- **Endpoints:**
  - `GET /health` → `{ "status": "ok" }`
  - `GET /models` → JSON list of model presets + active model
  - `GET /status` → current model, service status, health
  - `POST /activate` (body: `{ "model_id": "<id>" }`) → swap models
- **Config:** `/opt/flowmanner/config/llm-models.yaml` (sources of truth)
- **Swap mechanic:** daemon regenerates a systemd drop-in override for
  `llama-server.service`, restarts the service, waits for health check, ~10–30s
  total. **Per-model speculative decoding flags preserved** (MTP for Qwen,
  ngram-simple for Ornith).
- **Constraint:** dashboard runs in the homelab user context (you can reach
  the daemon at localhost:9723 directly — no Docker gateway dance needed
  here, this isn't the FM container).

## What "proper dashboard" means (concrete criteria)

When you grade the existing code, score it against these criteria:

### 1. Data correctness (read: "does it actually work?")
- Are PRs, CI states, inbox items, missions actually loaded correctly?
- Are numbers on stat cards consistent with the underlying data (no
  off-by-one, no double-counting)?
- Do the approve/reject buttons actually map to real `gh`/DB actions?
- Does the model swap endpoint actually swap the model, or just pretend to?

### 2. UX polish (read: "does it feel like a real product?")
- Loading states on every async operation (no flicker on data fetch)
- Error states with actionable messages (network fail, `gh` not authed,
  model swap timeout, etc.)
- Empty states that are honest ("✓ No pending interrupts" vs "No data yet")
- Optimistic UI where appropriate (toggle switches, status flips)
- Keyboard shortcuts (e.g. `r` to refresh, `j/k` for nav, `?` for help)
- Refresh strategy (auto-refresh interval? on-focus refetch? stale-while-revalidate?)
- Consistent design tokens (use a single spacing scale, no ad-hoc values)
- Accessibility: focus visible, aria-labels, role="status" for toasts

### 3. Operational maturity
- Time stamps relative ("3m ago") + absolute on hover
- Health surface: which llama.cpp is serving? which model? is the daemon
  itself healthy? latency to the API?
- Audit trail: who approved what, when, with what reasoning
- Idempotency: clicking Approve twice shouldn't double-trigger `gh pr merge`
- Rate-limiting awareness: don't hammer `gh api` if a sync is in flight
- Background-refresh: keep the page useful while data updates

### 4. Things you might miss but Glenn cares about
- **Glenn runs this on a homelab over SSH/WireGuard.** Latency matters.
  Don't ship a 5MB JS bundle for what's a 50KB feature.
- **Glenn sits in front of this daily.** Layout density > marketing copy.
  Trim every paragraph that doesn't earn its keep.
- **One person operation.** No need for multi-user/multi-tenant polish,
  but destructive actions need confirmation.
- **Hard rule: homelab LLM only.** The settings panel currently lets you
  paste an OpenRouter key for the executive briefing — that is the ONE
  legitimate SaaS shortcut. Don't expand it further.

## What you need to deliver — the LLM Model Swap feature design

The model swap is a NEW feature that must be in the dashboard. As part of your
plan, design and spec it concretely. Your build plan should answer:

- **Where in the UI does the model swap go?** Options:
  - a) Settings panel (alongside the OpenRouter key) — quick, doesn't change
    the dashboard, but easy to overlook.
  - b) A persistent header chip showing "Model: Qwen3.6-27B-MTP" that expands
    into a picker — visible on every page, one click to open.
  - c) A dedicated `/models` sub-route — more space for context, but adds a
    nav item.
  - Your recommendation with reasoning.

- **What does the picker show for each model?** At minimum:
  - Display name + architecture (qwen35, qwen35moe, etc.)
  - Quantization (Q5_K_M)
  - Spec type (draft-mtp, ngram-simple, none) — Glenn specifically wants to
    know which models have MTP vs not
  - Description from the config (e.g. "35B MoE, ~3B active per token")
  - "Currently active" badge on the active model
  - Health badge (healthy/unreachable) on each row

- **What happens during a swap?**
  - Click "Activate" → confirm dialog → POST `/activate`
  - Disable the picker, show a progress state with stage indicators
    (regenerating override → restarting → health check)
  - On success: toast + refresh the active state + re-render any LLM-
    dependent UI in the page
  - On failure: revert UI, show error with tail of stderr if available
  - Poll health endpoint with backoff while waiting (this could be 10–60s)

- **Error cases the swap must handle gracefully:**
  - Daemon unreachable (network error)
  - Model file missing on disk
  - systemd daemon-reload rejected
  - Service restart succeeded but /health never came up (timeout)
  - User navigates away mid-swap (AbortController)

## How to do the review

1. Read `PLAN.md` end-to-end first — it tells you what's been built and why.
2. Skim every file under `src/` and `src/app/`. Note the rough edges.
3. **Run `pnpm typecheck` and `pnpm lint`** to establish a baseline.
4. For each criterion in the list above, look for the pattern or anti-pattern.
   Cite file paths and line numbers. Examples of what to look for:
   - "PR sync button uses form action POST without client-side loading state
     — see `src/app/page.tsx:71-80`. Should be a client component with
     useTransition."
   - "Inbox stat card shows pending count but never distinguishes 'empty
     inbox because no agents raised interrupts' from 'sync hasn't run yet'.
     See `src/lib/inbox.ts:38`."
5. **DO NOT propose giant rewrites.** The current dashboard works. Your job
   is targeted improvements, not "burn it down and start over." Phases 1, 2,
   3, 4, 5 in `PLAN.md` are already done. Build on top.

## Output spec

**Memo file:** `docs/DASHBOARD-REVIEW-2026-07-01.md`

Structure:
- **What's working** (3–8 bullets, concrete file references)
- **What's rough or broken** (numbered list, severity tag each: HIGH / MED / LOW)
- **What's missing for "proper" dashboard** (organized by the 4 criteria
  above)
- **LLM Model Swap design** (your chosen UI placement, with a wireframe in
  ASCII or markdown, the fetch sequence, error handling)

**Plan file:** `docs/DASHBOARD-PLAN-2026-07-01.md`

Structure:
- **Phase 1 (highest value, smallest change):** one coherent improvement
- **Phase 2:** next — could be the model swap, or could be polish
- ... up to 5 phases, each ≤ 2 hours of work
- Each phase: title, why it matters, files affected, exact change

**Commit message:** none yet — you're producing planning docs only. The
commit will come when the next agent picks up your plan and builds phase 1.

## Tools available

You have full read access to the project at `/home/glenn/flowmanner-dashboard-HIL/`.
You can read files, search content, run shell commands. Do NOT modify any
source files in this planning phase — output goes in `docs/` only. Do NOT
install dependencies.

## Hard constraints

- Do NOT modify any code in `src/` — that's for the build phase
- Do NOT create files outside `docs/`
- Do NOT install packages
- Do NOT touch `.env.local` or any credential files
- Do NOT modify the FM backend at `/opt/flowmanner/backend/`
- Do NOT touch the model manager daemon config at
  `/opt/flowmanner/config/llm-models.yaml` (read-only to you)
- When you write the memo and plan, base every claim on a file you actually
  read — no hand-waving, no fabricated refs. If you cite a line, it must
  match what's there.

## When done

Report to Glenn (in your final response):
- One-sentence summary of "what's the biggest single win?"
- How many rough spots you found (HIGH/MED/LOW counts)
- Your UI placement recommendation for the model swap (with one-sentence
  reason)
- Any blocker or "I need to ask Glenn" items

Do NOT push to origin. Glenn reviews, then Hermes verifies and commits.
