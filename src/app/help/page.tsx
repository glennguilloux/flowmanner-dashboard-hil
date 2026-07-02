import {
  Keyboard,
  LayoutDashboard,
  Target,
  Flag,
  Lightbulb,
  Scale,
  Wrench,
  Grid2x2,
  BarChart3,
  ListChecks,
  Bot,
  GitPullRequest,
  Shield,
  Cpu,
  Server,
  Database,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950 dark:text-slate-50">
          Help &amp; Guide
        </h1>
        <p className="mt-1 text-slate-600 dark:text-slate-400">
          How the FlowManner HIL Dashboard works — shortcuts, panels, gates, and
          architecture.
        </p>
      </div>

      {/* ── Keyboard Shortcuts ────────────────────────────────────────── */}
      <Section title="Keyboard Shortcuts" icon={Keyboard}>
        <div className="grid gap-2 sm:grid-cols-2">
          <Shortcut keys={["⌘", "K"]} desc="Open global search" />
          <Shortcut keys={["?"]} desc="Show keyboard shortcuts" />
          <Shortcut keys={["r"]} desc="Refresh current page" />
          <Shortcut keys={["t"]} desc="Toggle dark/light theme" />
          <Shortcut keys={["g", "d"]} desc="Go to Dashboard" />
          <Shortcut keys={["g", "s"]} desc="Go to Strategies" />
          <Shortcut keys={["g", "t"]} desc="Go to Tactics" />
          <Shortcut keys={["g", "p"]} desc="Go to Pull Requests" />
          <Shortcut keys={["g", "a"]} desc="Go to Agents" />
          <Shortcut keys={["Esc"]} desc="Close panels / cancel" />
        </div>
        <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">
          Shortcuts are disabled while typing in inputs and textareas.
        </p>
      </Section>

      {/* ── Dashboard Panels ──────────────────────────────────────────── */}
      <Section title="Dashboard Panels" icon={LayoutDashboard}>
        <div className="space-y-3">
          <PanelItem
            icon={Shield}
            name="Executive Briefing"
            desc="LLM-generated summary of PR status, CI health, pending gates, and mission state. Runs on the homelab Qwen3 model."
          />
          <PanelItem
            icon={Shield}
            name="Awaiting Approval"
            desc="Tactics in needs_review status that require a human gate decision (approve, reject, or request more info)."
          />
          <PanelItem
            icon={GitPullRequest}
            name="Pull Requests"
            desc="GitHub PRs synced via gh pr list. Shows CI status, mergeability, and allows approve/reject from the dashboard."
          />
          <PanelItem
            icon={Target}
            name="Missions"
            desc="Running, pending, and failed missions from the FlowManner backend. Health indicators show agent responsiveness."
          />
          <PanelItem
            icon={Cpu}
            name="LLM Models"
            desc="Quick-swap widget to change the active homelab model. Health status for the model manager daemon."
          />
          <PanelItem
            icon={Flag}
            name="Goals"
            desc="Strategic objectives with progress bars. Goals → Strategies → Tactics hierarchy."
          />
          <PanelItem
            icon={Lightbulb}
            name="Brain Dump"
            desc="Quick-capture ideas. Triage with LLM to convert actionable entries into tactics or goals."
          />
          <PanelItem
            icon={Scale}
            name="Decisions"
            desc="Recent human decisions (approve/reject/request_more_info) across all tactics."
          />
          <PanelItem
            icon={Wrench}
            name="Skills"
            desc="Reusable skill definitions linked to agents. Markdown content injected into agent prompts."
          />
          <PanelItem
            icon={Grid2x2}
            name="Priority Matrix"
            desc="Eisenhower 4-quadrant view: Do (important+urgent), Schedule, Delegate, Eliminate."
          />
          <PanelItem
            icon={BarChart3}
            name="LLM Usage"
            desc="Token consumption tracking — today and this week. Full analytics on /usage page."
          />
          <PanelItem
            icon={Server}
            name="System Health"
            desc="Health checks for 7+ homelab services: Postgres, llama.cpp, model manager, WireGuard, Hermes, OpenCode, FM backend."
          />
          <PanelItem
            icon={LayoutDashboard}
            name="Activity Timeline"
            desc="Merged event stream: approvals, tactic changes, brain dump triage, goal completions."
          />
        </div>
      </Section>

      {/* ── Approval Gates ────────────────────────────────────────────── */}
      <Section title="How Approval Gates Work" icon={Shield}>
        <div className="space-y-3 text-sm text-slate-700 dark:text-slate-300">
          <p>
            Every tactic goes through a gate check before execution. The gate
            evaluates two signals:
          </p>
          <ul className="list-inside list-disc space-y-1.5 pl-2">
            <li>
              <strong>Confidence</strong> — the LLM&apos;s assessed probability
              of success (0–100%). Below 70% triggers a gate.
            </li>
            <li>
              <strong>Risk level</strong> — low, medium, or high. High risk
              always triggers a gate.
            </li>
          </ul>
          <p>
            When a gate is triggered, the tactic enters{" "}
            <code className="rounded bg-slate-100 dark:bg-slate-800 px-1 py-0.5 text-xs">
              needs_review
            </code>{" "}
            status and the human operator decides:
          </p>
          <ul className="list-inside list-disc space-y-1.5 pl-2">
            <li>
              <strong>Approve</strong> — tactic proceeds to execution
            </li>
            <li>
              <strong>Reject</strong> — tactic is cancelled
            </li>
            <li>
              <strong>Request more info</strong> — tactic stays in needs_review,
              agent provides additional evidence
            </li>
          </ul>
          <p>
            For PR-sourced tactics, the decision is translated to{" "}
            <code className="rounded bg-slate-100 dark:bg-slate-800 px-1 py-0.5 text-xs">
              gh pr review
            </code>{" "}
            actions on GitHub.
          </p>
          <p>
            <strong>Loop detection:</strong> if a tactic exhausts its max attempts
            (default 3), it auto-escalates to needs_review with a reset button.
          </p>
        </div>
      </Section>

      {/* ── Architecture ──────────────────────────────────────────────── */}
      <Section title="Architecture" icon={Database}>
        <div className="space-y-4 text-sm text-slate-700 dark:text-slate-300">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 font-mono text-xs leading-relaxed dark:border-slate-700 dark:bg-slate-800">
            <pre className="whitespace-pre-wrap">{`┌────────────────────────────────────────────┐
│  Browser (WireGuard tailnet)                │
│  Next.js 16 (App Router, RSC + client)      │
│  ├── Dashboard (11+ panels)                 │
│  ├── Goals, Brain Dump, Decisions, Skills   │
│  ├── Tactics, PRs, Kanban, Agents, Matrix   │
│  └── API routes (CRUD, health, sync, etc)   │
├─────────────┬──────────────┬───────────────┤
│  PostgreSQL  │  Homelab LLM │  GitHub CLI   │
│  (hil_ops +  │  (:11434,    │  (gh pr list, │
│   public)    │  Qwen3-27B)  │  gh pr review)│
│              │              │               │
│              ▼              │               │
│        Model Manager        │               │
│        (:9723, systemd)     │               │
└────────────────────────────────────────────┘`}</pre>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <ArchItem
              label="Frontend"
              value="Next.js 16, React 19, Tailwind 4"
            />
            <ArchItem
              label="Database"
              value="Postgres 15, Drizzle 0.45 ORM"
            />
            <ArchItem
              label="LLM"
              value="Qwen3-27B on homelab llama.cpp"
            />
            <ArchItem
              label="Icons"
              value="lucide-react, date-fns"
            />
            <ArchItem
              label="CI"
              value="GitHub Actions via gh CLI"
            />
            <ArchItem
              label="Auth"
              value="Bearer token (HIL_AUTH_SECRET)"
            />
            <ArchItem
              label="Tunnel"
              value="WireGuard (wg-watchdog)"
            />
            <ArchItem
              label="Agent Framework"
              value="Hermes ACP integration"
            />
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Data hierarchy
            </h3>
            <p>
              Goals → Strategies → Tactics. Goals are long-term objectives.
              Strategies link to FlowManner missions. Tactics are individual
              agent actions (PRs, inbox items, or simulated proposals).
            </p>
            <p>
              Approvals, messages, subtasks, dependencies, and acceptance criteria
              all attach to tactics. Skills and agents are cross-cutting resources.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Environment variables
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              See{" "}
              <code className="rounded bg-slate-100 dark:bg-slate-800 px-1 py-0.5">
                .env.example
              </code>{" "}
              for the full list. Key vars:{" "}
              <code className="rounded bg-slate-100 dark:bg-slate-800 px-1 py-0.5">
                DATABASE_URL
              </code>
              ,{" "}
              <code className="rounded bg-slate-100 dark:bg-slate-800 px-1 py-0.5">
                GH_TOKEN
              </code>
              ,{" "}
              <code className="rounded bg-slate-100 dark:bg-slate-800 px-1 py-0.5">
                LLM_URL
              </code>
              ,{" "}
              <code className="rounded bg-slate-100 dark:bg-slate-800 px-1 py-0.5">
                HIL_AUTH_SECRET
              </code>
              .
            </p>
          </div>
        </div>
      </Section>

      <p className="pb-8 text-center text-xs text-slate-400 dark:text-slate-500">
        FlowManner HIL Dashboard · Built with Next.js 16 + Drizzle + Postgres
      </p>
    </div>
  );
}

/* ── Helper components ───────────────────────────────────────────────── */

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof Keyboard;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex items-center gap-2">
        <Icon className="h-5 w-5 text-indigo-600" />
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

function Shortcut({ keys, desc }: { keys: string[]; desc: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 dark:border-slate-800">
      <span className="text-sm text-slate-600 dark:text-slate-400">{desc}</span>
      <span className="flex items-center gap-1">
        {keys.map((k, i) => (
          <span key={i}>
            {i > 0 && <span className="mx-0.5 text-xs text-slate-400">then</span>}
            <kbd className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
              {k}
            </kbd>
          </span>
        ))}
      </span>
    </div>
  );
}

function PanelItem({
  icon: Icon,
  name,
  desc,
}: {
  icon: typeof Keyboard;
  name: string;
  desc: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-slate-100 p-3 dark:border-slate-800">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />
      <div>
        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
          {name}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400">{desc}</p>
      </div>
    </div>
  );
}

function ArchItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 dark:border-slate-800">
      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
        {label}
      </span>
      <span className="text-xs text-slate-700 dark:text-slate-300">{value}</span>
    </div>
  );
}
