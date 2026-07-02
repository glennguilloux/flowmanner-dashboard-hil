// Types for the briefing data layer. Browser-safe (no DB imports) so the
// client component can use them via dynamic import without pulling in pg.

export type CiState = "failing" | "passing" | "pending" | "none";

export type BriefingData = {
  generatedAt: string;
  prs: Array<{
    number: string;
    title: string;
    status: string;
    riskLevel: string;
    ciState: CiState;
    failingChecks: string[];
    confidence: number;
  }>;
  missions: {
    running: number;
    pending: number;
    failed: number;
  };
  gates: {
    pending: number;
    items: Array<{ id: string; title: string; riskLevel: string; confidence: number }>;
  };
  inbox: {
    pending: number;
  };
};
