import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export type TelegramPulseMessage = {
  id: string;
  chatId: string;
  timestamp: string;
  text: string;
  asset: "ETH" | "BTC" | "OTHER";
  sentiment: "bullish" | "bearish" | "neutral";
  hash: string;
};

export type TelegramPulseSignal = {
  provider: "TelegramPulse";
  mode: "LIVE TELEGRAM" | "DEMO FIXTURE";
  asset: "ETH";
  confidence: number;
  sentiment: "bullish" | "bearish" | "neutral";
  intensity: number;
  summary: string;
  sampleSize: number;
  recent: Array<Pick<TelegramPulseMessage, "timestamp" | "asset" | "sentiment" | "text" | "hash">>;
};

const dataDir = path.join(process.cwd(), ".data");
const storePath = path.join(dataDir, "telegram-pulse.json");
const maxMessages = 80;

const fixtureMessages: TelegramPulseMessage[] = [
  makeMessage("fixture-1", "demo", "ETH momentum is picking up after the testnet payment demo", Date.now() - 1000 * 60 * 8),
  makeMessage("fixture-2", "demo", "holding ETH looks safer until the audit proof is written", Date.now() - 1000 * 60 * 6),
  makeMessage("fixture-3", "demo", "small buy signal only, no real swap should execute", Date.now() - 1000 * 60 * 4),
  makeMessage("fixture-4", "demo", "risk cap is more important than chasing green candles", Date.now() - 1000 * 60 * 2),
];

function ensureStore() {
  fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(storePath)) fs.writeFileSync(storePath, JSON.stringify({ messages: [] }, null, 2));
}

function hashText(text: string) {
  return crypto.createHash("sha256").update(text).digest("hex").slice(0, 16);
}

function redactText(text: string) {
  return text
    .replace(/\b\d{6,}\b/g, "[number]")
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "[email]")
    .replace(/https?:\/\/\S+/g, "[link]")
    .slice(0, 220);
}

function classifyAsset(text: string): TelegramPulseMessage["asset"] {
  const upper = text.toUpperCase();
  if (upper.includes("ETH") || upper.includes("ETHEREUM")) return "ETH";
  if (upper.includes("BTC") || upper.includes("BITCOIN")) return "BTC";
  return "OTHER";
}

function classifySentiment(text: string): TelegramPulseMessage["sentiment"] {
  const lower = text.toLowerCase();
  const bullish = ["buy", "long", "pump", "bull", "up", "moon", "green", "рост", "покуп", "лонг"];
  const bearish = ["sell", "short", "dump", "bear", "down", "red", "risk", "пад", "шорт", "прод"];
  const bullScore = bullish.filter((word) => lower.includes(word)).length;
  const bearScore = bearish.filter((word) => lower.includes(word)).length;
  if (bullScore > bearScore) return "bullish";
  if (bearScore > bullScore) return "bearish";
  return "neutral";
}

function makeMessage(id: string, chatId: string, rawText: string, timestampMs: number): TelegramPulseMessage {
  const text = redactText(rawText.trim());
  return {
    id,
    chatId,
    timestamp: new Date(timestampMs).toISOString(),
    text,
    asset: classifyAsset(text),
    sentiment: classifySentiment(text),
    hash: hashText(`${id}:${chatId}:${text}`),
  };
}

export function extractTelegramText(update: unknown) {
  const value = update as {
    update_id?: number;
    message?: { message_id?: number; date?: number; text?: string; caption?: string; chat?: { id?: number | string } };
    channel_post?: { message_id?: number; date?: number; text?: string; caption?: string; chat?: { id?: number | string } };
  };
  const message = value.message ?? value.channel_post;
  const rawText = message?.text ?? message?.caption ?? "";
  if (!message || !rawText.trim()) return null;
  return makeMessage(
    String(value.update_id ?? message.message_id ?? crypto.randomUUID()),
    String(message.chat?.id ?? "unknown"),
    rawText,
    (message.date ? message.date * 1000 : Date.now()),
  );
}

export function appendTelegramUpdate(update: unknown) {
  const message = extractTelegramText(update);
  if (!message) return { stored: false, reason: "no_text" as const };
  ensureStore();
  const data = JSON.parse(fs.readFileSync(storePath, "utf-8")) as { messages: TelegramPulseMessage[] };
  const deduped = data.messages.filter((item) => item.id !== message.id);
  deduped.push(message);
  fs.writeFileSync(storePath, JSON.stringify({ messages: deduped.slice(-maxMessages) }, null, 2));
  return { stored: true, message };
}

export function readTelegramMessages() {
  ensureStore();
  try {
    const data = JSON.parse(fs.readFileSync(storePath, "utf-8")) as { messages: TelegramPulseMessage[] };
    return data.messages.slice(-maxMessages);
  } catch {
    return [];
  }
}

export function buildTelegramPulseSignal(messages = readTelegramMessages()): TelegramPulseSignal {
  const liveEth = messages.filter((message) => message.asset === "ETH").slice(-20);
  const source = liveEth.length ? liveEth : fixtureMessages;
  const bullish = source.filter((message) => message.sentiment === "bullish").length;
  const bearish = source.filter((message) => message.sentiment === "bearish").length;
  const neutral = source.length - bullish - bearish;
  const sentiment = bullish >= bearish && bullish > neutral ? "bullish" : bearish > bullish ? "bearish" : "neutral";
  const intensity = Math.min(1, Math.max(0.18, source.length / 10 + Math.abs(bullish - bearish) * 0.08));
  const confidence = Number(Math.min(0.92, 0.56 + intensity * 0.22 + source.length * 0.012).toFixed(2));
  const mode = liveEth.length ? "LIVE TELEGRAM" : "DEMO FIXTURE";
  return {
    provider: "TelegramPulse",
    mode,
    asset: "ETH",
    confidence,
    sentiment,
    intensity: Number(intensity.toFixed(2)),
    sampleSize: source.length,
    summary:
      mode === "LIVE TELEGRAM"
        ? `${source.length} recent ETH Telegram messages classified as ${sentiment}.`
        : "Using seeded ETH fixture until the Telegram bot receives live group messages.",
    recent: source.slice(-5).map(({ timestamp, asset, sentiment: itemSentiment, text, hash }) => ({ timestamp, asset, sentiment: itemSentiment, text, hash })),
  };
}
