# Security Policy

## Network posture

The FlowManner HIL Dashboard is a **single-operator homelab tool**. It is:

- **Not exposed to the public internet.** It runs behind a WireGuard VPN on the homelab LAN.
- **Protected by auth middleware** (`src/middleware.ts`) that enforces Bearer token authentication on all API routes. In local development, the auth check is a no-op.
- **Single-user by design.** There is no multi-user auth, no role-based access, and no session management. The operator is the only user.

## What it accesses

The dashboard **reads** from:
- The FlowManner Postgres database (`hil_ops` schema — never touches `public` schema)
- The Hermes agent API server (local HTTP, port 8642)
- The LLM model manager daemon (local HTTP, port 9723)
- The `gh` CLI for GitHub PR operations
- OpenRouter API (optional, browser-side BYOK — key never hits the server)

The dashboard **writes** to:
- Its own `hil_ops` tables (approvals, messages, tactic status)
- Hermes approval decisions (proxied to the Hermes API)
- `public.inbox_items` (resolution status only, via direct DB update)

It does **not** manage deployments, run arbitrary code, or have filesystem access beyond reading `.hermes/kanban/board.json`.

## Reporting a vulnerability

If you find a security issue, please open a GitHub issue or contact the maintainer directly. This is a homelab tool with a single operator — responsible disclosure is appreciated.
