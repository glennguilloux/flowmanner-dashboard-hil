# Exit Audit & Handoff — 2026-07-02

**Session scope:** Claude OS-inspired dashboard additions + exit audit with future integration plans.
**Stack:** Next.js 16 · React 19 · Tailwind 4 · Drizzle 0.45 · Postgres 15 · lucide-react · date-fns
**Validation:** `pnpm typecheck` ✅ · Code review ✅ (all critical bugs fixed)
**Working tree:** 8 modified files, 9 new untracked files, 3 deleted files (not yet committed).

---

## Part 1 — What was built this session

### 1a. Claude OS-inspired panels (new)

Inspired by [Claude OS](https://thebob.dev/claude-os/) — a persistent-memory AI operating system. Two new dashboard features were added:

#### System Health Panel

| File | Type | Purpose |
|---|---|---|
| `src/lib/system-health.ts` | Lib (server) | Parallel health checks via `Promise.allSettled` for 5 services: PostgreSQL, Homelab LLM (`:11434`), Model Manager (`:9723`), GitHub CLI (`gh auth status`), FM Backend repo (`git rev-parse`). Each check is independently try/caught — one failure never blocks the others. |
| `src/components/system-health-panel.tsx` | Server component | Compact 2-column grid of service status cards. Each card shows: lucide icon, service name, healthy/degraded/down status icon, detail string, and latency in ms. Header shows "X/Y online" aggregate badge. Responsive — collapses to 1-column on mobile. |

#### Activity Timeline Panel

| File | Type | Purpose |
|---|---|---|
| `src/lib/activity-timeline.ts` | Lib (server) | Queries 3 data sources in parallel: recent approvals (joined with tactics), recent tactic updates (filtered to completed/needs_review), and recent missions (raw SQL on `public.missions`). Merge-sorts by timestamp descending, returns top N `TimelineEvent` objects. |
| `src/components/activity-timeline-panel.tsx` | Server component | Vertical timeline with a persistent left-edge line. Each event has: circular icon node on the timeline, title with `TypeBadge` (Approved/Rejected/Done/Review/Mission), description, relative timestamp. Events are clickable `<Link>` elements that navigate to the relevant page. Empty state when no activity. |

#### Dashboard layout restructure

| File | Change |
|---|---|
| `src/app/page.tsx` | Widened container from `max-w-6xl` to `max-w-[1400px]`. Replaced single-column stack with `lg:grid-cols-12` two-column layout: left 8/12 for primary panels (Briefing, Approvals, PRs, Missions), right 4/12 for sidebar (System Health + Activity Timeline). Both sidebar panels wrapped in `<Suspense>` with `<SkeletonCard>` fallbacks so they render independently. |

### 1b. Bug fixes (from code review)

| Bug | Fix | File |
|---|---|---|
| `MissionRow.createdAt` vs `created_at` — runtime `undefined` on mission timeline events | Changed type to `created_at` to match raw SQL column name | `src/lib/activity-timeline.ts` |
| `ApprovalRow.tacticTitle` nullable on leftJoin — `null` passed to template literal | Added `?? "Deleted tactic"` fallback | `src/lib/activity-timeline.ts` |
| `gh auth status --hostname` not portable across `gh` versions | Removed `--hostname` flag; exit code is what matters | `src/lib/system-health.ts` |
| `animate-pulse` on all healthy status dots — visually noisy | Pulse now only on degraded/down services | `src/components/system-health-panel.tsx` |

### 1c. Current file state (uncommitted)

**Modified (from prior session, not yet committed):**
- `src/app/page.tsx` — two-column layout + new panel imports
- `src/components/dashboard-approval-panel.tsx` — gated/resolved badges, sorting
- `src/components/dashboard-missions-panel.tsx` — health counters, failure list, mission health prop
- `src/components/sidebar.tsx` — WG watchdog chip, kanban link
- `src/lib/data.ts` — `getDashboardData()` aggregated fetcher
- `src/lib/wg-watchdog.ts` — WireGuard watchdog SSH/toggle logic

**New (untracked):**
- `src/app/api/wg-watchdog/route.ts` — WG watchdog API endpoint
- `src/app/kanban/page.tsx` — dedicated Kanban page
- `src/components/activity-timeline-panel.tsx` — activity timeline
- `src/components/system-health-panel.tsx` — system health grid
- `src/components/wg-watchdog-chip.tsx` — sidebar chip for WG status
- `src/components/wg-watchdog-panel.tsx` — full WG management panel
- `src/lib/activity-timeline.ts` — timeline data fetcher
- `src/lib/system-health.ts` — service health checker
- `src/lib/wg-watchdog.ts` — WG watchdog logic

**Deleted:**
- `src/components/governance-panel.tsx` — merged into approval panel
- `src/components/mission-health-panel.tsx` — merged into missions panel
- `src/components/session-ritual-panel.tsx` — removed from dashboard (chip remains in sidebar)

---

## Part 2 — Current project state (complete inventory)

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Browser (WireGuard tailnet)                             │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  Next.js 16 (App Router, RSC + client components)   │ │
│  │  ├── Dashboard (two-column, 6 panels)               │ │
│  │  ├── Strategies, Tactics, PRs, Kanban, Agents, Users│ │
│  │  └── API routes (health, sync, approve, review, etc)│ │
│  └─────────────────────────────────────────────────────┘ │
│                         │                                 │
│           ┌─────────────┼─────────────┐                   │
│           ▼             ▼             ▼                   │
│     PostgreSQL    Homelab LLM    GitHub CLI               │
│     (hil_ops +    (:11434,        (gh pr list,            │
│      public)      Qwen3-27B)      gh pr review)           │
│           │             │                                 │
│           ▼             ▼                                 │
│     FM Backend    Model Manager                           │
│     (/opt/flow-   (:9723, systemd                         │
│      manner)       daemon)                                │
└─────────────────────────────────────────────────────────┘
```

### Feature inventory

| Feature | Status | Notes |
|---|---|---|
| Dashboard (stat cards, briefing, approvals, PRs, missions) | ✅ Complete | Two-column layout with sidebar |
| System Health panel | ✅ Complete | 5 services, parallel pings |
| Activity Timeline panel | ✅ Complete | Approvals + tactics + missions |
| PR sync (`gh pr list` → tactics) | ✅ Complete | Upsert on (source, sourceId) |
| Inbox sync (read + write-back) | ✅ Complete | Empty until FM raises interrupts |
| CI badges + rollup | ✅ Complete | Per-check detail with links |
| Approval gate (3-way) | ✅ Complete | Approve/reject/request-more-info |
| PR merge (CI-gated) | ✅ Complete | 2-step confirm, only when CI green |
| Background LLM reviewer | ✅ Complete | Single + batch scoring via Qwen3 |
| Model swap (sidebar chip + panel) | ✅ Complete | Daemon proxy, health polling |
| WireGuard watchdog | ✅ Complete | SSH toggle, audit trail, journal logs |
| Kanban snapshot | ✅ Complete | Read-only from `.hermes/kanban/` |
| Session ritual (git/alembic state) | ✅ Complete | Chip in sidebar |
| Executive briefing | ✅ Complete | Homelab LLM or OpenRouter BYOK |
| Dark theme | ✅ Complete | Class-based, localStorage + system pref |
| Keyboard shortcuts | ✅ Complete | `t` theme, `?` help, `g+{page}` nav |
| Mobile hamburger menu | ✅ Complete | Drawer with full nav |
| Auth middleware | ✅ Complete | Bearer token, no-op in dev mode |
| Section error boundaries | ✅ Complete | Per-panel isolation |
| Auto-refresh (RefreshBar) | ✅ Complete | 30s interval, on-focus, sync buttons |

### Database schema (`hil_ops`)

| Table | Purpose |
|---|---|
| `users` | Operator identity (single-user homelab) |
| `agents` | AI agent registry (name, role, model) |
| `strategies` | High-level goals (linked to FM missions) |
| `tactics` | Individual actions (PRs, inbox, simulated) — the core table |
| `approvals` | Human decisions (approve/reject/request_more_info) |
| `messages` | Human↔agent thread per strategy/tactic |

### API routes

| Route | Method | Purpose |
|---|---|---|
| `/api/health` | GET | DB ping (unauthenticated) |
| `/api/ops/health` | GET | DB + tactic stats |
| `/api/seed` | POST | Load demo data |
| `/api/tactics` | POST | Create simulated tactic |
| `/api/tactics/[id]/approve` | POST | 3-way decision |
| `/api/tactics/[id]/messages` | GET/POST | Thread messages |
| `/api/strategies/[id]/messages` | GET/POST | Strategy thread |
| `/api/prs/sync` | POST | `gh pr list` → upsert tactics |
| `/api/prs/[id]/merge` | POST | CI-gated `gh pr merge` |
| `/api/inbox/sync` | POST | Read `inbox_items` → upsert |
| `/api/briefing` | POST | Homelab LLM briefing |
| `/api/briefing/data` | GET | Structured data for browser-side LLM |
| `/api/models` | GET/POST | Model manager proxy |
| `/api/models/health` | GET | Daemon health check |
| `/api/review/score/[id]` | POST | Single tactic LLM scoring |
| `/api/review/score/batch` | POST | Batch LLM scoring |
| `/api/session-ritual` | GET | FM repo git/alembic state |
| `/api/wg-watchdog` | GET/POST | WG timer status + toggle |

### Env vars (`.env.local`)

```
DATABASE_URL=postgresql://...          # Postgres (shared with FM)
GH_TOKEN=...                           # GitHub PAT (or gh keyring)
GH_REPO=glennguilloux/flowmanner      # Target repo for gh commands
FM_REPO_PATH=/opt/flowmanner           # FM backend git repo
KANBAN_BOARD_PATH=.hermes/kanban/board.json
HIL_AUTH_SECRET=...                    # API bearer token (blank = dev mode)
NEXT_PUBLIC_HIL_AUTH_SECRET=...        # Same, for client components
LLM_URL=http://localhost:11434         # Homelab llama.cpp
MODEL_MANAGER_URL=http://localhost:9723 # Model swap daemon
```

### Design conventions

- **Panel style:** `rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 p-6 shadow-sm`
- **Color system:** Tailwind slate (neutral), indigo (primary), emerald (success), amber (warning), rose (danger), sky (info)
- **Dark mode:** `@custom-variant dark (&:where(.dark, .dark *))` — class-based, toggled via localStorage
- **Server components:** All data-fetching panels are async RSCs. Client components only for interactivity (forms, toggles, polling).
- **Error handling:** `SectionErrorBoundary` wraps each panel. API routes return `{ ok, error }` JSON.
- **Icons:** `lucide-react` exclusively. Icon strings mapped via `ICON_MAP` in system-health-panel.
- **Timestamps:** `date-fns/formatDistanceToNow` for relative; `title` attribute for absolute ISO timestamp on hover.

---

## Part 3 — Future work: OpenCode, Hermes, OpenClaw integration

### Overview

The three tools represent different layers of an AI-powered development stack:

| Layer | Tool | Role | Integration point |
|---|---|---|---|
| **Developer tooling** | OpenCode | Terminal-based AI coding assistant (Go, Bubble Tea TUI, SQLite sessions, LSP) | Session telemetry → dashboard |
| **Specialist agents** | Hermes | Self-improving agent framework (Python, ACP protocol, SQLite memory, skill extraction) | Agent orchestration → dashboard |
| **Workflow orchestration** | OpenClaw | Multi-agent gateway (routing, sandboxing, YAML config, Docker/SSH isolation) | Control plane → dashboard |

### 3a. OpenCode integration

**What it is:** An open-source, terminal-based AI coding assistant written in Go. Uses Bubble Tea for its TUI, SQLite for persistent session management, and LSP for code intelligence. Supports non-interactive mode (`--output-format json`).

**Integration vision:** OpenCode becomes the developer-facing coding tool on the homelab. The HIL dashboard surfaces its activity as part of the operational picture.

#### Phase 1: Session telemetry ingestion

OpenCode stores sessions in a local SQLite database. The dashboard can read this to show:

- **Active coding sessions** — who's coding, what files are open, which LLM is being used
- **Recent code changes** — files modified, lines added/removed, linked to git commits
- **Token usage** — per-session and aggregate LLM token consumption

**Implementation:**

```
New files:
  src/lib/opencode.ts          — SQLite reader for OpenCode sessions
  src/components/opencode-panel.tsx — "Active Sessions" panel
  src/app/api/opencode/route.ts    — API endpoint for session data

Env var:
  OPENCODE_DB_PATH=/home/glenn/.opencode/sessions.db
```

**Data model (read-only from OpenCode's SQLite):**

```sql
-- OpenCode's schema (not ours — we read only)
SELECT session_id, created_at, model, file_paths, token_count
FROM sessions ORDER BY created_at DESC LIMIT 20;
```

#### Phase 2: Bidirectional integration

- **Dashboard → OpenCode:** "Review this tactic" button that launches an OpenCode session pre-loaded with the tactic's context (description, CI failures, diff)
- **OpenCode → Dashboard:** Post-session hook that creates a message on the relevant tactic thread with a summary of what was coded

#### Phase 3: LLM model alignment

OpenCode uses its own LLM configuration. The dashboard's Model Swap feature should:
- Detect which model OpenCode is configured to use
- Offer to align it with the homelab's active model (via the model manager daemon)
- Show OpenCode's token usage alongside the dashboard's briefing/reviewer usage

### 3b. Hermes integration

**What it is:** An open-source, self-improving AI agent framework focused on deep reasoning and a closed learning loop. Python-based, uses ACP (Agent Communication Protocol) for inter-agent communication, SQLite + FTS5 for persistent memory, and a pluggable tool/skill system.

**Integration vision:** Hermes agents become the "brains" behind FlowManner's mission execution. The HIL dashboard becomes their control surface — monitoring, approving, and reviewing their work.

#### Phase 1: ACP client in the dashboard

Hermes exposes itself as an ACP server (JSON-RPC). The dashboard can connect as an ACP client to:

- **Monitor agent state** — which agents are active, their current task, reasoning chain progress
- **Surface agent memory** — what the agent "remembers" about the project, recent decisions, learned patterns
- **Show skill extraction** — as Hermes learns from execution results, display newly extracted skills

**Implementation:**

```
New files:
  src/lib/hermes-acp.ts             — ACP client (JSON-RPC over HTTP)
  src/components/hermes-agents-panel.tsx — Agent status + reasoning chain
  src/components/hermes-memory-panel.tsx — Agent memory browser
  src/app/api/hermes/agents/route.ts    — Proxy to ACP server
  src/app/api/hermes/memory/route.ts    — Memory search endpoint

Env var:
  HERMES_ACP_URL=http://localhost:8050  — Hermes ACP server
```

**Key integration points:**

```typescript
// ACP client pattern
type AcpRequest = {
  jsonrpc: "2.0";
  method: "agents.list" | "agents.status" | "memory.search" | "skills.list";
  params: Record<string, unknown>;
  id: string;
};

// The dashboard becomes an ACP client
async function hermesAcpCall<T>(method: string, params: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${HERMES_ACP_URL}/rpc`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", method, params, id: crypto.randomUUID() }),
    signal: AbortSignal.timeout(10_000),
  });
  const data = await res.json() as { result?: T; error?: { message: string } };
  if (data.error) throw new Error(data.error.message);
  return data.result!;
}
```

#### Phase 2: Human-in-the-loop agent approval

Hermes supports gated actions — the agent can pause and request human approval before executing sensitive operations. The dashboard's existing `<ApprovalGate>` component can be extended to handle ACP approval requests:

```
Hermes agent → ACP approval request → Dashboard notification → Human approves → ACP response → Agent continues
```

This maps directly onto the existing `tactics.status = "needs_review"` + `requiresHumanApproval = true` pattern.

#### Phase 3: Skill library management

Hermes extracts and refines "skills" from execution results. The dashboard can show:

- **Skill inventory** — all learned skills with success rates
- **Skill health** — dedup, consolidation, archival status (similar to Claude OS's lifecycle engine)
- **Skill approval** — new skills can be gated for human review before they're applied

#### Phase 4: Mission ↔ Agent binding

Map Hermes agents to FlowManner missions:

```
Mission (public.missions) ←1:1→ Hermes Agent Session
  ↓                                ↓
Tactic (hil_ops.tactics)     ACP state + memory
  ↓                                ↓
Approval (hil_ops.approvals)  ACP approval gate
```

The dashboard already shows missions and tactics. Adding Hermes integration means each mission can show its agent's reasoning chain, memory state, and skill extraction progress.

### 3c. OpenClaw integration

**What it is:** A multi-agent orchestration framework with a central Gateway as the control plane. Supports sandboxed agent execution (Docker/SSH), granular tool/permission configuration via YAML, and multi-channel routing (Slack, Discord, Telegram, CLI).

**Integration vision:** OpenClaw becomes the outer orchestration layer that routes work to Hermes agents (and potentially OpenCode sessions). The HIL dashboard becomes the web UI for the OpenClaw Gateway.

#### Phase 1: Gateway API integration

OpenClaw's Gateway exposes a management API. The dashboard can:

- **Monitor agent queues** — pending work, active agents, completed tasks
- **Show routing decisions** — which channel sent work to which agent
- **Display sandbox status** — Docker containers or SSH sessions running agents

**Implementation:**

```
New files:
  src/lib/openclaw-gateway.ts           — Gateway API client
  src/components/openclaw-agents-panel.tsx — Agent queue + sandbox status
  src/components/openclaw-routing-panel.tsx — Routing decisions + channel status
  src/app/api/openclaw/status/route.ts     — Gateway status proxy

Env var:
  OPENCLAW_GATEWAY_URL=http://localhost:8080  — OpenClaw Gateway
```

#### Phase 2: YAML config management

OpenClaw uses YAML for agent configuration (tools, permissions, skills). The dashboard can provide a GUI for:

- **Tool scoping** — which tools each agent can access (file read/write, shell, network)
- **Permission management** — which actions require human approval
- **Skill assignment** — which skills are available to which agents

This replaces or complements manual YAML editing with a visual editor.

#### Phase 3: Multi-channel monitoring

OpenClaw routes work from multiple channels (Slack, Discord, Telegram, CLI). The dashboard can show:

- **Channel status** — which channels are connected, message volume
- **Cross-channel correlation** — the same task discussed on Slack and CLI, unified view
- **Alert routing** — WG watchdog alerts, CI failures, and mission failures routed to the operator's preferred channel

#### Phase 4: Sandbox management

OpenClaw isolates agent execution in Docker containers or SSH sessions. The dashboard can:

- **Show active sandboxes** — container/resource usage, agent isolation status
- **Provide kill switches** — terminate a runaway agent's sandbox from the UI
- **Stream sandbox output** — live logs from agent execution environments

### 3d. Unified architecture

The three tools nest naturally:

```
┌─────────────────────────────────────────────────────┐
│  FlowManner HIL Dashboard (Next.js)                  │
│  ├── System Health (all services)                    │
│  ├── Activity Timeline (all events)                  │
│  ├── OpenCode Sessions (dev tooling)                 │
│  ├── Hermes Agents (specialist reasoning)            │
│  ├── OpenClaw Gateway (orchestration)                │
│  └── Human Gates (approvals, decisions)              │
└─────────────────────┬───────────────────────────────┘
                      │
          ┌───────────┼───────────┐
          ▼           ▼           ▼
    ┌──────────┐ ┌──────────┐ ┌──────────┐
    │ OpenCode │ │  Hermes  │ │ OpenClaw │
    │ (Go CLI) │ │ (Python) │ │ (Gateway)│
    │ SQLite   │ │ ACP/JSON │ │ YAML cfg │
    │ LSP      │ │ FTS5 mem │ │ Docker   │
    └──────────┘ └──────────┘ └──────────┘
         │              │              │
         └──────────────┼──────────────┘
                        ▼
              Homelab infrastructure
              ├── Postgres (shared DB)
              ├── LLM (:11434, Qwen3)
              ├── Model Manager (:9723)
              ├── GitHub CLI (keyring)
              └── WireGuard (tailnet)
```

### 3e. Implementation priority

| Priority | Integration | Effort | Value |
|---|---|---|---|
| **P0** | Hermes ACP client + agent monitoring | ~3h | Immediate visibility into agent reasoning |
| **P1** | OpenCode session telemetry | ~2h | Developer activity awareness |
| **P2** | Hermes human-in-the-loop approval | ~2h | Extends existing gate to agent requests |
| **P3** | OpenClaw Gateway status | ~2h | Orchestration layer visibility |
| **P4** | Hermes skill library UI | ~3h | Long-term learning visualization |
| **P5** | OpenClaw YAML config editor | ~4h | Replace manual config with GUI |
| **P6** | OpenClaw sandbox management | ~3h | Agent isolation monitoring |
| **P7** | Unified cross-tool activity timeline | ~2h | Single timeline across all tools |

### 3f. Technical considerations

**Database strategy:**
- OpenCode: read-only from its SQLite (separate DB file)
- Hermes: read-only from its SQLite (separate DB file) + ACP for live state
- OpenClaw: API-only (Gateway manages its own state)
- No schema changes needed to `hil_ops` — these integrations are API/client-side

**Auth alignment:**
- All three tools run on the homelab — same WireGuard tailnet
- Dashboard auth middleware (`HIL_AUTH_SECRET`) covers the dashboard's API routes
- Tool-specific auth (ACP tokens, Gateway API keys) managed per-tool

**LLM resource sharing:**
- All three tools should use the same homelab LLM (`:11434`)
- The Model Manager daemon (`:9723`) controls which model is active
- Dashboard's System Health panel already monitors all three endpoints
- Consider adding a "LLM queue depth" metric to prevent overload

**No new dependencies philosophy:**
- All integrations use `fetch()` to tool APIs — no SDK packages
- SQLite reads use existing `pg` driver's raw SQL or a lightweight `better-sqlite3` if needed
- YAML parsing for OpenClaw config: use `js-yaml` (already available in Node.js ecosystem)

---

## Part 4 — Known issues & TODOs (carried forward)

### From prior sessions (still open)

| Issue | Severity | Status |
|---|---|---|
| No idempotency on approve/reject double-click | HIGH | Unfixed — server-side guard needed |
| ESLint: 3 errors in settings-panel + executive-briefing | LOW | Unfixed |
| `Example/` directory not updated with dark mode | LOW | Unfixed |
| Kanban board is read-only (no task moves) | MED | By design — FM owns writes |
| `process.env.NEXT_PUBLIC_GH_REPO` in client component | LOW | Falls back correctly |

### From this session

| Issue | Severity | Status |
|---|---|---|
| `getSystemHealth` unreachable `unknown` fallback in `Promise.allSettled` mapping | LOW | Dead code — each check catches internally |
| System Health panel has no auto-refresh without full page reload | MED | RefreshBar's `router.refresh()` re-triggers RSC, but no client-side polling |
| Activity Timeline has no pagination | LOW | Returns top 12; sufficient for now |

---

## Part 5 — Handoff checklist

### For the next agent/session

- [ ] **Commit the working tree** — 9 new files, 8 modified, 3 deleted. Use conventional commit format.
- [ ] **Run `pnpm db:push`** — verify no schema changes needed (none expected).
- [ ] **Browser test** — verify two-column layout, System Health panel shows all 5 services, Activity Timeline renders events.
- [ ] **Verify dark mode** — all new panels support `dark:` classes.
- [ ] **Pick up P0 from Part 3** — Hermes ACP client integration.

### Quick start for a new agent

```bash
cd /home/glenn/flowmanner-dashboard-HIL
pnpm install
cp .env.example .env.local  # fill in DATABASE_URL
pnpm dev                     # http://localhost:3000
```

Read these files first:
1. `docs/EXIT-AUDIT-2026-07-02.md` (this file)
2. `PLAN.md` (original architecture)
3. `docs/SESSION-AUDIT-2026-07-02.md` (prior session audit)
4. `src/app/page.tsx` (dashboard entry point)
5. `src/db/schema.ts` (data model)

---

*Document generated 2026-07-02. Author: Buffy (Codebuff).*
