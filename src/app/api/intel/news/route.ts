import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type NewsAnalysis = {
  importance: number;
  asset: string;
  impact: "bullish" | "bearish" | "neutral" | "mixed";
  time_horizon: string;
  summary: string;
  actions: string[];
};

type NewsItem = {
  hash: string;
  message_id?: string;
  score?: number;
  reasons?: string[];
  analysis: NewsAnalysis;
  analyzed_at?: string;
};

const PRIMARY_PATH = path.join(process.cwd(), "..", "..", "tg-bot-41-18", ".data", "news-intel.json");
const FALLBACK_PATH = path.join(process.cwd(), ".data", "news-intel.json");

type NewsSource = "external" | "local-fallback" | "none";

function readNews(): { items: NewsItem[]; source: NewsSource } {
  const sources: Array<{ path: string; source: NewsSource }> = [
    { path: PRIMARY_PATH, source: "external" },
    { path: FALLBACK_PATH, source: "local-fallback" },
  ];
  for (const { path: candidate, source } of sources) {
    try {
      const data = JSON.parse(fs.readFileSync(/* turbopackIgnore: true */ candidate, "utf-8")) as { analyses?: NewsItem[] };
      if (!data.analyses?.length) continue;
      return { items: data.analyses.slice(0, 10), source };
    } catch {
      continue;
    }
  }
  return { items: [], source: "none" };
}

export function GET(request: Request) {
  const url = new URL(request.url);
  const limit = Math.max(1, Math.min(20, Number(url.searchParams.get("limit") ?? 10)));
  const news = readNews();
  const items = news.items.slice(0, limit).map((item) => ({
    hash: item.hash,
    score: item.score ?? 0,
    importance: item.analysis.importance,
    asset: item.analysis.asset,
    impact: item.analysis.impact,
    timeHorizon: item.analysis.time_horizon,
    summary: item.analysis.summary,
    actions: item.analysis.actions,
    analyzedAt: item.analyzed_at ?? null,
  }));
  return NextResponse.json({ items, source: news.source, total: news.items.length });
}
