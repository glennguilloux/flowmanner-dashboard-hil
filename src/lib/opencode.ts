// OpenCode session telemetry reader. Reads OpenCode's flat-file storage
// to surface session data for the HIL dashboard.
//
// OpenCode stores sessions as files in its storage directory:
//   - Project-specific: ./<project-slug>/storage/
//   - Global: ./global/storage/
//   - App data: ~/.local/share/opencode/
//
// Since OpenCode has no REST API or CLI export, we read the filesystem
// directly using Node.js fs module.
//
// OpenCode by anomalyco: https://github.com/anomalyco/opencode
//
// HARD RULE: reads only from the local filesystem. No network calls.

import { readdir, readFile, stat } from "node:fs/promises";
import { join, extname } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileP = promisify(execFile);

// ── Configuration ─────────────────────────────────────────────────────────

const OPENCODE_BASE =
  process.env.OPENCODE_STORAGE_PATH ??
  join(process.env.HOME ?? "/root", ".local", "share", "opencode");

const OPENCODE_BIN = process.env.OPENCODE_BIN ?? "opencode";

// ── Types ─────────────────────────────────────────────────────────────────

export type OpenCodeSession = {
  id: string;
  title: string;
  model: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  filePaths: string[];
  tokenCount: number | null;
};

export type OpenCodeProject = {
  name: string;
  path: string;
  sessionCount: number;
};

export type OpenCodeHealth = {
  ok: boolean;
  version: string | null;
  storagePath: string;
  projectCount: number;
  totalSessions: number;
  error?: string;
};

export type OpenCodeOverview = {
  health: OpenCodeHealth;
  sessions: OpenCodeSession[];
  projects: OpenCodeProject[];
  latencyMs: number;
};

// ── Internal helpers ──────────────────────────────────────────────────────

async function fileExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function readJsonFile<T>(path: string): Promise<T | null> {
  try {
    const raw = await readFile(path, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function getOpencodeVersion(): Promise<string | null> {
  try {
    const { stdout } = await execFileP(OPENCODE_BIN, ["--version"], {
      timeout: 5_000,
    });
    return stdout.trim() || null;
  } catch {
    return null;
  }
}

// ── Session file parsing ──────────────────────────────────────────────────

// OpenCode stores session data in JSON files within project storage dirs.
// The exact schema may evolve, so we parse defensively.

type RawSession = {
  id?: string;
  session_id?: string;
  title?: string;
  name?: string;
  model?: string;
  model_id?: string;
  created_at?: string;
  updated_at?: string;
  messages?: unknown[];
  files?: string[];
  file_paths?: string[];
  tokens?: number;
  token_count?: number;
  usage?: { total_tokens?: number };
  [key: string]: unknown;
};

function parseSession(raw: RawSession, fileName: string): OpenCodeSession | null {
  const id = raw.id ?? raw.session_id ?? fileName.replace(extname(fileName), "");
  if (!id) return null;

  const createdAt = raw.created_at ?? new Date(0).toISOString();
  const updatedAt = raw.updated_at ?? createdAt;

  // Count messages if available.
  let messageCount = 0;
  if (Array.isArray(raw.messages)) {
    messageCount = raw.messages.length;
  }

  // Extract file paths from multiple possible shapes.
  const filePaths = raw.files ?? raw.file_paths ?? [];

  // Token count from multiple possible shapes.
  const tokenCount =
    raw.tokens ?? raw.token_count ?? raw.usage?.total_tokens ?? null;

  return {
    id: String(id),
    title: raw.title ?? raw.name ?? `Session ${String(id).slice(0, 8)}`,
    model: raw.model ?? raw.model_id ?? "unknown",
    createdAt: String(createdAt),
    updatedAt: String(updatedAt),
    messageCount,
    filePaths: filePaths.map(String),
    tokenCount: typeof tokenCount === "number" ? tokenCount : null,
  };
}

// ── Storage directory scanning ────────────────────────────────────────────

// Global cap on total file reads per request to prevent runaway I/O.
const MAX_FILE_READS = 50;

async function scanProjectStorage(
  projectDir: string,
  projectName: string,
): Promise<{ sessions: OpenCodeSession[]; project: OpenCodeProject }> {
  const storageDir = join(projectDir, "storage");
  const sessions: OpenCodeSession[] = [];
  let readsRemaining = MAX_FILE_READS;

  try {
    const entries = await readdir(storageDir, { withFileTypes: true });

    // Session files are typically JSON files in the storage directory.
    const jsonFiles = entries.filter(
      (e) => e.isFile() && extname(e.name) === ".json" && e.name !== "auth.json",
    );

    // Also check for subdirectories that might contain session data.
    const subdirs = entries.filter((e) => e.isDirectory());

    for (const file of jsonFiles) {
      if (readsRemaining <= 0) break;
      const filePath = join(storageDir, file.name);
      const raw = await readJsonFile<RawSession>(filePath);
      readsRemaining--;
      if (raw) {
        const session = parseSession(raw, file.name);
        if (session) sessions.push(session);
      }
    }

    // Scan subdirectories for session JSON files (only if budget remains).
    for (const dir of subdirs) {
      if (readsRemaining <= 0) break;
      const dirPath = join(storageDir, dir.name);
      try {
        const dirEntries = await readdir(dirPath, { withFileTypes: true });
        const dirJson = dirEntries.filter(
          (e) => e.isFile() && extname(e.name) === ".json",
        );
        for (const file of dirJson) {
          if (readsRemaining <= 0) break;
          const filePath = join(dirPath, file.name);
          const raw = await readJsonFile<RawSession>(filePath);
          readsRemaining--;
          if (raw) {
            const session = parseSession(raw, `${dir.name}/${file.name}`);
            if (session) sessions.push(session);
          }
        }
      } catch {
        // Skip unreadable subdirectories.
      }
    }
  } catch {
    // Storage directory doesn't exist or is unreadable — return empty.
  }

  // Sort by updatedAt descending.
  sessions.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );

  return {
    sessions,
    project: {
      name: projectName,
      path: projectDir,
      sessionCount: sessions.length,
    },
  };
}

// ── Public API ────────────────────────────────────────────────────────────

export async function getOpenCodeHealth(): Promise<OpenCodeHealth> {
  const version = await getOpencodeVersion();
  const exists = await fileExists(OPENCODE_BASE);

  if (!exists) {
    return {
      ok: false,
      version,
      storagePath: OPENCODE_BASE,
      projectCount: 0,
      totalSessions: 0,
      error: `Storage not found at ${OPENCODE_BASE}`,
    };
  }

  try {
    const entries = await readdir(OPENCODE_BASE, { withFileTypes: true });
    const projectDirs = entries.filter((e) => e.isDirectory());

    let totalSessions = 0;
    for (const dir of projectDirs.slice(0, 10)) {
      const storageDir = join(OPENCODE_BASE, dir.name, "storage");
      if (await fileExists(storageDir)) {
        try {
          const files = await readdir(storageDir);
          totalSessions += files.filter((f) => extname(f) === ".json").length;
        } catch {
          // Skip.
        }
      }
    }

    return {
      ok: true,
      version,
      storagePath: OPENCODE_BASE,
      projectCount: projectDirs.length,
      totalSessions,
    };
  } catch {
    return {
      ok: false,
      version,
      storagePath: OPENCODE_BASE,
      projectCount: 0,
      totalSessions: 0,
      error: "Cannot read storage directory",
    };
  }
}

export async function getOpenCodeOverview(): Promise<OpenCodeOverview> {
  const start = Date.now();

  const health = await getOpenCodeHealth();

  if (!health.ok) {
    return {
      health,
      sessions: [],
      projects: [],
      latencyMs: Date.now() - start,
    };
  }

  try {
    const entries = await readdir(OPENCODE_BASE, { withFileTypes: true });
    const projectDirs = entries.filter((e) => e.isDirectory());

    const results = await Promise.all(
      projectDirs.slice(0, 10).map((dir) =>
        scanProjectStorage(join(OPENCODE_BASE, dir.name), dir.name),
      ),
    );

    // Merge all sessions and sort globally.
    const allSessions = results
      .flatMap((r) => r.sessions)
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );

    const projects = results.map((r) => r.project).filter((p) => p.sessionCount > 0);

    return {
      health,
      sessions: allSessions.slice(0, 20),
      projects,
      latencyMs: Date.now() - start,
    };
  } catch {
    return {
      health,
      sessions: [],
      projects: [],
      latencyMs: Date.now() - start,
    };
  }
}
