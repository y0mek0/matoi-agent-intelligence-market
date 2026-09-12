import fs from "node:fs";
import path from "node:path";
import type { ProviderId } from "@/lib/provider-analysis";

export type ProviderReputationEvent = {
  providerId: ProviderId;
  missionId: string;
  outcome: "useful" | "neutral" | "duplicate" | "wrong" | "untrusted";
  score: number;       // -1..+1
  timestamp: string;
  note?: string;
};

export type ProviderReputation = {
  providerId: ProviderId;
  ratingsCount: number;
  score: number;        // 0..1; higher = more trustworthy
  useful: number;
  wrong: number;
  duplicate: number;
  untrusted: number;
  neutral: number;
  lastUpdated: string;
};

const dataDir = path.join(process.cwd(), ".data");
const repPath = path.join(dataDir, "provider-reputation.json");

function ensure() {
  fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(repPath)) fs.writeFileSync(repPath, JSON.stringify({ events: [] }, null, 2));
}

function readEvents() {
  try { ensure(); return (JSON.parse(fs.readFileSync(repPath, "utf-8")) as { events: ProviderReputationEvent[] }).events; }
  catch { return []; }
}

function writeEvents(events: ProviderReputationEvent[]) {
  ensure();
  fs.writeFileSync(repPath, JSON.stringify({ events: events.slice(-200) }, null, 2));
}

export function recordProviderReputation(event: ProviderReputationEvent): ProviderReputation {
  const events = readEvents().concat(event);
  writeEvents(events);
  return getProviderReputation(event.providerId);
}

export function getProviderReputation(providerId: ProviderId): ProviderReputation {
  const events = readEvents().filter((event) => event.providerId === providerId);
  const tally = { useful: 0, neutral: 0, duplicate: 0, wrong: 0, untrusted: 0 };
  for (const event of events) tally[event.outcome] += 1;
  const total = events.length;
  const score = total === 0 ? 0.6 : Math.max(0, Math.min(1, tally.useful / total + 0.2 * (1 - tally.untrusted / total)));
  return { providerId, ratingsCount: total, score, useful: tally.useful, wrong: tally.wrong, duplicate: tally.duplicate, untrusted: tally.untrusted, neutral: tally.neutral, lastUpdated: new Date().toISOString() };
}

export function listProviderReputations(): ProviderReputation[] {
  const ids: ProviderId[] = ["telegram-pulse", "telegram-news", "rss-news", "coingecko-price", "defillama-tvl", "github-releases"];
  return ids.map((id) => getProviderReputation(id));
}

export function disputeProvider(providerId: ProviderId, missionId: string, reason = "wrong"): ProviderReputation {
  const event: ProviderReputationEvent = { providerId, missionId, outcome: "wrong", score: -0.6, timestamp: new Date().toISOString(), note: reason };
  return recordProviderReputation(event);
}

export function rateProvider(providerId: ProviderId, missionId: string, outcome: ProviderReputationEvent["outcome"]): ProviderReputation {
  const score = outcome === "useful" ? 0.4 : outcome === "duplicate" ? -0.1 : outcome === "wrong" ? -0.6 : outcome === "untrusted" ? -0.9 : 0;
  return recordProviderReputation({ providerId, missionId, outcome, score, timestamp: new Date().toISOString() });
}

export function resetProviderReputationForTests() {
  writeEvents([]);
}
