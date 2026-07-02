// Session-ritual checks for the FlowManner backend repo. Shells out to
// /opt/flowmanner (configurable via FM_REPO_PATH env var) to gather git
// status, branch, unpushed commits, and alembic migration state.
//
// Follows the same execFileP pattern as @/lib/github.ts.

import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileP = promisify(execFile);

const FM_REPO = process.env.FM_REPO_PATH ?? "/opt/flowmanner";

export type SessionRitual = {
  /** Whether the FM repo directory exists and is a git repo. */
  available: boolean;
  /** Current git branch, or null if unavailable. */
  branch: string | null;
  /** Whether the working tree has uncommitted changes. */
  dirty: boolean;
  /** List of changed files (from `git status --porcelain`). */
  changedFiles: string[];
  /** Number of commits ahead of upstream. */
  unpushedCount: number;
  /** Titles of unpushed commits (last 5). */
  unpushedCommits: string[];
  /** Current alembic migration head, or null if alembic not available. */
  alembicHead: string | null;
  /** Current alembic revision applied to DB, or null. */
  alembicCurrent: string | null;
  /** Whether alembic head matches current (no pending migrations). */
  alembicClean: boolean;
  /** Error message if something went wrong, null if all good. */
  error: string | null;
};

async function runGit(args: string[]): Promise<string> {
  const { stdout } = await execFileP("git", args, {
    cwd: FM_REPO,
    maxBuffer: 1024 * 1024,
    timeout: 10_000,
  });
  return stdout.trim();
}

async function runAlembic(args: string[]): Promise<string> {
  const { stdout } = await execFileP("alembic", args, {
    cwd: FM_REPO,
    maxBuffer: 1024 * 1024,
    timeout: 10_000,
  });
  return stdout.trim();
}

export async function getSessionRitual(): Promise<SessionRitual> {
  const empty: SessionRitual = {
    available: false,
    branch: null,
    dirty: false,
    changedFiles: [],
    unpushedCount: 0,
    unpushedCommits: [],
    alembicHead: null,
    alembicCurrent: null,
    alembicClean: false,
    error: null,
  };

  try {
    // Quick check: is the directory a git repo?
    await runGit(["rev-parse", "--is-inside-work-tree"]);
  } catch {
    return { ...empty, error: `FM repo not found at ${FM_REPO}` };
  }

  try {
    // Branch
    let branch: string | null = null;
    try {
      branch = await runGit(["branch", "--show-current"]);
    } catch {
      /* detached HEAD or no commits yet */
    }

    // Dirty working tree
    const porcelain = await runGit(["status", "--porcelain"]);
    const changedFiles = porcelain
      ? porcelain.split("\n").map((line) => line.slice(3).trim()).filter(Boolean)
      : [];
    const dirty = changedFiles.length > 0;

    // Unpushed commits
    let unpushedCount = 0;
    let unpushedCommits: string[] = [];
    try {
      const upstream = await runGit([
        "rev-parse",
        "--abbrev-ref",
        "@{upstream}",
      ]);
      if (upstream) {
        const log = await runGit([
          "log",
          "--oneline",
          `${upstream}..HEAD`,
        ]);
        if (log) {
          const lines = log.split("\n").filter(Boolean);
          unpushedCount = lines.length;
          unpushedCommits = lines.slice(0, 5);
        }
      }
    } catch {
      // No upstream configured — not an error, just means the branch isn't tracking.
    }

    // Alembic state
    let alembicHead: string | null = null;
    let alembicCurrent: string | null = null;
    let alembicClean = false;
    try {
      const headRaw = await runAlembic(["heads"]);
      // alembic heads output: "abc123 (head)"
      alembicHead = headRaw.split(/\s+/)[0] || null;

      const currentRaw = await runAlembic(["current"]);
      // alembic current output: "abc123 (head)" or "" if no migration applied
      alembicCurrent = currentRaw.split(/\s+/)[0] || null;

      alembicClean =
        alembicHead !== null &&
        alembicCurrent !== null &&
        alembicHead === alembicCurrent;
    } catch {
      // Alembic not installed or not configured — not fatal.
    }

    return {
      available: true,
      branch,
      dirty,
      changedFiles,
      unpushedCount,
      unpushedCommits,
      alembicHead,
      alembicCurrent,
      alembicClean,
      error: null,
    };
  } catch (err) {
    return {
      ...empty,
      error: `Ritual check failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
