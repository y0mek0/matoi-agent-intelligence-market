import type { ProviderAnalysis } from "@/lib/provider-analysis";

export type InspectorVerdict = {
  inspectorId: "cross-provider-inspector";
  ok: boolean;
  confidence: number;
  contradictions: string[];
  duplicates: string[];
  overPricedFlag: boolean;
  missingRiskFlag: boolean;
  note: string;
};

export type ProviderAnalysisSummary = Pick<ProviderAnalysis, "providerId" | "impact" | "localScore" | "gptScore" | "urgency" | "priceUsd" | "summary" | "riskFlags">;

export function inspectProviderAnalyses(analyses: ProviderAnalysisSummary[]): InspectorVerdict {
  const contradictions: string[] = [];
  const duplicates: string[] = [];
  const impacts = analyses.map((analysis) => analysis.impact);
  const bullish = impacts.filter((impact) => impact === "bullish").length;
  const bearish = impacts.filter((impact) => impact === "bearish").length;
  if (bullish > 0 && bearish > 0) contradictions.push("mixed bullish/bearish provider signals");
  const seenSummaries = new Map<string, number>();
  for (const analysis of analyses) {
    const key = analysis.summary.trim().slice(0, 60).toLowerCase();
    if (!key) continue;
    seenSummaries.set(key, (seenSummaries.get(key) ?? 0) + 1);
  }
  for (const [key, count] of seenSummaries) if (count > 1) duplicates.push(`near-duplicate summary: "${key}" (${count}×)`);
  const overPriced = analyses.some((analysis) => analysis.priceUsd > 0.015);
  const missingRisk = analyses.length > 0 && analyses.every((analysis) => (analysis.riskFlags ?? []).length <= 1);
  const avgConfidence = analyses.length ? analyses.reduce((sum, analysis) => sum + (analysis.localScore + analysis.gptScore) / 20, 0) / analyses.length : 0;
  const note = contradictions.length || duplicates.length
    ? `Inspector flagged ${contradictions.length} contradiction(s) and ${duplicates.length} duplicate(s).`
    : "Inspector found no obvious contradictions or duplicates.";
  return {
    inspectorId: "cross-provider-inspector",
    ok: contradictions.length === 0 && duplicates.length === 0,
    confidence: Number(avgConfidence.toFixed(3)),
    contradictions,
    duplicates,
    overPricedFlag: overPriced,
    missingRiskFlag: missingRisk,
    note,
  };
}
