// The decision gate rule, extracted so the UI, the API, and the background
// reviewer all agree on the threshold.
//
// Pause for a human when ANY of:
//   - the tactic explicitly requires human approval (override)
//   - confidence is below 70%
//   - risk is high
//
// Mirrors `src/app/api/tactics/route.ts` POST + `<ApprovalGate>` render guard.
export type GateInput = {
  confidence: number;
  riskLevel: "low" | "medium" | "high";
  requiresHumanApproval: boolean;
};

export function needsGate(t: GateInput): boolean {
  return t.requiresHumanApproval || t.confidence < 70 || t.riskLevel === "high";
}

export function reasonForGate(t: GateInput): string {
  if (t.requiresHumanApproval) return "explicit human approval required";
  if (t.confidence < 70) return `confidence ${t.confidence}% below 70% threshold`;
  if (t.riskLevel === "high") return "high risk";
  return "";
}