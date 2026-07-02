# FlowManner HIL Dashboard

Next.js 16 control surface for FlowManner agent tactics, PRs, and human gates. Real Next.js app — agents propose, CI runs, every high-risk decision pauses at a human gate.

## Stack

Next.js 16 (App Router, RSC + client components) · React 19 · Drizzle ORM 0.45 · Postgres 15 · Tailwind v4 · lucide-react · date-fns

## Layout

```
src/
  app/
    page.tsx                  # dashboard
    strategies/[id]/page.tsx  # strategy + its tactics + thread
    tactics/[id]/page.tsx     # tactic detail + gate + thread + history
    agents/page.tsx
    api/                      # health, seed, tactics, approve, messages
  components/
    approval-gate.tsx         # the 3-way decision UI
    message-thread.tsx        # human↔agent chat
    simulate-proposal.tsx     # dev: propose a tactic to test the gate
    tactic-card.tsx, status-badge.tsx, seed-banner.tsx, sidebar.tsx
  db/schema.ts                # all tables in the `hil_ops` schema
  lib/{data,gate}.ts
```

## Setup

```bash
pnpm install
cp .env.example .env.local         # then edit DATABASE_URL
pnpm db:push                       # creates the hil_ops schema + tables
pnpm dev                           # http://localhost:3000
```

Click **Load demo data** on the dashboard (or `curl -X POST localhost:3000/api/seed`) to populate 1 strategy, 3 agents, and 3 tactics — including one that triggers the human gate (low confidence + high risk).

## Schema isolation

All dashboard tables live in the `hil_ops` Postgres schema, leaving FM's `public` schema (managed by alembic) untouched. The dashboard's drizzle-kit never sees FM's migrations; FM's migrations never see the dashboard's tables.

## Gate rule

A tactic pauses for human approval when any of: `confidence < 70` · `risk = high` · explicit `requiresHumanApproval = true`. Single source of truth in `src/lib/gate.ts`; the UI, the API, and (in phase 5) the background reviewer all use it.

## Self-hosted LLM rule

Any AI in the stack runs on the homelab llama.cpp (`:11434`, Qwen3-27B). No OpenAI / Anthropic / Google / DeepSeek — not even as fallback. Demo seed agents already point at `llama.cpp:qwen3-27b-q5 (homelab)`.

## Phase status

- [x] **Phase 1** — scaffold, `hil_ops` schema, seed, dashboard, tactic detail with gate + thread
- [ ] Phase 2 — inbox sync (read real `inbox_items`, resolve via FM backend)
- [ ] Phase 3 — PR sync + CI badges (`gh pr list`)
- [ ] Phase 4 — background reviewer on homelab LLM scores confidence/risk
- [ ] Phase 5 — session-ritual + kanban panels