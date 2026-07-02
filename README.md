# FlowManner HIL Dashboard

Next.js 16 control surface for FlowManner agent tactics, PRs, and human gates. Real Next.js app — agents propose, CI runs, every high-risk decision pauses at a human gate.

## Stack

Next.js 16 (App Router, RSC + client components) · React 19 · Drizzle ORM 0.45 · Postgres 15 · Tailwind v4 · lucide-react · date-fns

## Panels

| Panel | What it does |
|---|---|
| **Dashboard** | Stat cards, PR list, approval queue, missions, executive briefing |
| **System Health** | Parallel-pings 5 homelab services (FM backend, Hermes, llama-server, WG, Postgres) |
| **Activity Timeline** | Recent tactic approvals, rejections, and PR events |
| **Agent Approvals** | 4-scope decision UI for Hermes HITL gates (allow_once / allow_session / allow_always / deny) |
| **Hermes Agent** | Sessions, jobs, skills, tools, capabilities — all from the Hermes REST API |
| **OpenCode** | Telemetry from the OpenCode CLI session |
| **Model Swap** | Activate/deactivate LLM models on the homelab llama-server daemon |
| **Kanban Board** | Read-only snapshot of tasks from `.hermes/kanban/board.json` |
| **PR Detail** | CI rollup, approval gate, message thread per tactic |
| **Strategy Detail** | All tactics under a strategy with their status and CI |

## Architecture

```
┌─────────────────────────────────────────────────────┐
│  Browser (WireGuard LAN only)                       │
│  ┌───────────────────────────────────────────────┐  │
│  │  FlowManner HIL Dashboard  (Next.js 16)       │  │
│  │  ┌─────────┐ ┌──────────┐ ┌───────────────┐  │  │
│  │  │ Panels  │ │ API routes│ │ Auth middleware│  │  │
│  │  └────┬────┘ └────┬─────┘ └───────────────┘  │  │
│  └───────┼───────────┼───────────────────────────┘  │
└──────────┼───────────┼──────────────────────────────┘
           │           │
     ┌─────┴─────┐  ┌──┴──────────────┐
     │  Postgres  │  │  Hermes Agent   │
     │  (hil_ops  │  │  REST API       │
     │   schema)  │  │  :8642          │
     └───────────┘  └─────────────────┘
           │
     ┌─────┴─────┐    ┌───────────────┐
     │  FM Backend│    │  llama-server  │
     │  (public   │    │  :9723         │
     │   schema)  │    │  (model swap)  │
     └───────────┘    └───────────────┘
```

## Integration matrix

| Panel | Endpoint | Source |
|---|---|---|
| Dashboard stats | `getDashboardData()` | Postgres `hil_ops` |
| System Health | `/api/system-health` | Parallel HTTP pings |
| Activity Timeline | `/api/activity-timeline` | Postgres `hil_ops` |
| Agent Approvals | `/api/hermes/approvals` | Hermes REST API |
| Hermes Agent | `/api/hermes` | Hermes REST API |
| OpenCode | `/api/opencode` | OpenCode CLI telemetry |
| Model Swap | `/api/models` | llama-server daemon `:9723` |
| Kanban | `/api/kanban` | `.hermes/kanban/board.json` |
| Executive Briefing | `/api/briefing` or browser→OpenRouter | Homelab LLM or BYOK |
| PR sync | `/api/prs/sync` | `gh pr list` CLI |
| Inbox sync | `/api/inbox/sync` | Postgres `public.inbox_items` |

## Local development

```bash
pnpm install
cp .env.example .env.local         # then edit DATABASE_URL
pnpm db:push                       # creates the hil_ops schema + tables
pnpm dev                           # http://localhost:3000
```

### Required environment variables

| Variable | Example | Notes |
|---|---|---|
| `DATABASE_URL` | `postgresql://user:pass@localhost:5432/flowmanner` | Shares FM's Postgres, `hil_ops` schema only |
| `HERMES_URL` | `http://localhost:8642` | Hermes API server (optional) |
| `HERMES_API_KEY` | *(empty for local)* | Bearer token for Hermes (optional) |
| `AUTH_TOKEN` | *(empty for dev)* | Bearer token for dashboard auth (dev: no-op) |

Click **Load demo data** on the dashboard (or `curl -X POST localhost:3000/api/seed`) to populate 1 strategy, 3 agents, and 3 tactics — including one that triggers the human gate (low confidence + high risk).

## Schema isolation

All dashboard tables live in the `hil_ops` Postgres schema, leaving FM's `public` schema (managed by alembic) untouched. The dashboard's drizzle-kit never sees FM's migrations; FM's migrations never sees the dashboard's tables.

## Gate rule

A tactic pauses for human approval when any of: `confidence < 70` · `risk = high` · explicit `requiresHumanApproval = true`. Single source of truth in `src/lib/gate.ts`; the UI, the API, and the background reviewer all use it.

## Self-hosted LLM rule

Any AI in the stack runs on the homelab llama.cpp (`:11434`, Qwen3-27B). No OpenAI / Anthropic / Google / DeepSeek — not even as fallback. The optional OpenRouter BYOK path runs browser→OpenRouter directly (key never hits the server).

## Roadmap

See [`docs/EXIT-AUDIT-2026-07-02.md`](docs/EXIT-AUDIT-2026-07-02.md) §3 for the 8-phase OpenCode + Hermes + OpenClaw integration plan (next major workstream after this ships).

## License

[MIT](LICENSE)
