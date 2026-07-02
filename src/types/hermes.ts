// Shared types for Hermes agent approvals.
// Used by both server-side (src/lib/hermes-acp.ts) and client-side components.

export type HermesApprovalScope =
  | "allow_once"
  | "allow_session"
  | "allow_always"
  | "deny";

export type HermesApproval = {
  id: string;
  session_id?: string;
  job_id?: string;
  /** What the agent wants to do (e.g. shell command, file write). */
  action: string;
  /** Human-readable description of why the agent needs approval. */
  reason?: string;
  /** The tool or capability that triggered the approval request. */
  tool?: string;
  status: "pending" | "approved" | "denied" | "expired";
  scope?: HermesApprovalScope;
  decided_by?: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
  /** Seconds until the approval auto-denies. Null = no timeout. */
  timeout_seconds?: number | null;
};
