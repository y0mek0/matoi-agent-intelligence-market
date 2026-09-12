import { NextResponse } from "next/server";
import { buildSourceAgentSnapshot, normalizeExternalSourceItem, type ExternalSourceItem } from "@/lib/source-agents";

export const runtime = "nodejs";

async function fetchWithTimeout(url: string, timeoutMs = 4500): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { "user-agent": "NovaHackathonDemo/1.0" } });
    if (!response.ok) return null;
    return await response.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function stripTags(value: string) {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function rssTitles(xml: string | null, agentId: ExternalSourceItem["agentId"]): ExternalSourceItem[] {
  if (!xml) return [];
  return Array.from(xml.matchAll(/<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/gi))
    .slice(1, 6)
    .map((match, index) => ({ agentId, title: stripTags(match[1] ?? match[2] ?? "headline"), value: index + 1 }));
}

async function liveItems(): Promise<ExternalSourceItem[]> {
  const [coingeckoRaw, defiRaw, githubRaw, coindeskRss] = await Promise.all([
    fetchWithTimeout("https://api.coingecko.com/api/v3/simple/price?ids=ethereum,bitcoin,solana&vs_currencies=usd&include_24hr_change=true"),
    fetchWithTimeout("https://api.llama.fi/protocols"),
    fetchWithTimeout("https://api.github.com/repos/hashgraph/hedera-sdk-js/releases?per_page=3"),
    fetchWithTimeout("https://www.coindesk.com/arc/outboundfeeds/rss/"),
  ]);

  const items: ExternalSourceItem[] = [];
  if (coingeckoRaw) {
    try {
      const data = JSON.parse(coingeckoRaw) as Record<string, { usd?: number; usd_24h_change?: number }>;
      for (const [coin, values] of Object.entries(data)) items.push({ agentId: "coingecko-price", title: `${coin} price ${values.usd ?? "unknown"} usd`, value: values.usd_24h_change ?? 0 });
    } catch {}
  }
  if (defiRaw) {
    try {
      const protocols = JSON.parse(defiRaw) as Array<{ name?: string; tvl?: number; change_1d?: number }>;
      for (const p of protocols.filter((p) => /ethereum|aave|uniswap|curve|maker/i.test(p.name ?? "")).slice(0, 4)) items.push({ agentId: "defillama-tvl", title: `${p.name} TVL ${Math.round(p.tvl ?? 0)}`, value: p.change_1d ?? 0 });
    } catch {}
  }
  if (githubRaw) {
    try {
      const releases = JSON.parse(githubRaw) as Array<{ name?: string; tag_name?: string; html_url?: string }>;
      for (const release of releases.slice(0, 3)) items.push({ agentId: "github-releases", title: release.name ?? release.tag_name ?? "release", value: 1, url: release.html_url });
    } catch {}
  }
  items.push(...rssTitles(coindeskRss, "rss-news"));
  return items;
}

export async function GET() {
  const items = (await liveItems()).map(normalizeExternalSourceItem);
  return NextResponse.json(buildSourceAgentSnapshot(items));
}
