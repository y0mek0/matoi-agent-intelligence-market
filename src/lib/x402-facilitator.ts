import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export type X402Challenge = {
  status: 402;
  providerId: string;
  resource: string;
  priceUsd: number;
  rail: "hedera-x402";
  facilitatorUrl: string;
  asset: "HBAR" | "USDC";
  network: "hedera-testnet";
  nonce: string;
  expiresAt: string;
  description: string;
};

export type X402Receipt = {
  receiptId: string;
  providerId: string;
  resource: string;
  buyer: string;
  priceUsd: number;
  rail: "hedera-x402";
  asset: "HBAR" | "USDC";
  network: "hedera-testnet";
  paymentRef: string;
  facilitator: string;
  issuedAt: string;
  expiresAt: string;
  signature: string;
  verification: { algorithm: "hmac-sha256"; publicKeyId: string };
};

const dataDir = path.join(process.cwd(), ".data");
const receiptsPath = path.join(dataDir, "x402-receipts.json");
const challengesPath = path.join(dataDir, "x402-challenges.json");

function ensure() {
  fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(receiptsPath)) fs.writeFileSync(receiptsPath, JSON.stringify({ receipts: [] }, null, 2));
  if (!fs.existsSync(challengesPath)) fs.writeFileSync(challengesPath, JSON.stringify({ challenges: [] }, null, 2));
}

function nowIso() { return new Date().toISOString(); }

function facilitatorSecret() {
  return process.env.X402_FACILITATOR_SECRET ?? process.env.HEDERA_OPERATOR_KEY ?? "x402-dev-secret";
}

function facilitatorId() {
  return process.env.X402_FACILITATOR_ID ?? "nova-x402-facilitator";
}

function publicKeyId() {
  return process.env.X402_PUBLIC_KEY_ID ?? "nova-x402-facilitator-v1";
}

function readChallenges() {
  try { ensure(); return (JSON.parse(fs.readFileSync(challengesPath, "utf-8")) as { challenges: Array<X402Challenge & { nonce: string }> }).challenges; }
  catch { return memoryChallenges; }
}

function readReceipts() {
  try { ensure(); return (JSON.parse(fs.readFileSync(receiptsPath, "utf-8")) as { receipts: X402Receipt[] }).receipts; }
  catch { return memoryReceipts; }
}

function appendChallenge(challenge: X402Challenge) {
  const all = readChallenges().concat(challenge).slice(-200);
  fs.writeFileSync(challengesPath, JSON.stringify({ challenges: all }, null, 2));
}

function appendReceipt(receipt: X402Receipt) {
  const all = readReceipts().concat(receipt).slice(-200);
  fs.writeFileSync(receiptsPath, JSON.stringify({ receipts: all }, null, 2));
}

function shortHash(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex").slice(0, 16);
}

function signReceiptPayload(payload: Omit<X402Receipt, "signature">) {
  return crypto.createHmac("sha256", facilitatorSecret()).update(JSON.stringify(payload)).digest("hex");
}

export type X402BuildChallengeInput = {
  providerId: string;
  resource: string;
  priceUsd: number;
  description: string;
  ttlSeconds?: number;
  /**
   * Optional caller-supplied nonce. If omitted, a fresh short hash is generated.
   * Used by the Blocky402 `/settle` shim so the client-supplied nonce matches
   * the challenge record the same request opens.
   */
  nonce?: string;
};

export function buildX402Challenge(input: X402BuildChallengeInput): X402Challenge {
  const ttl = input.ttlSeconds ?? 60;
  const issued = new Date();
  const challenge: X402Challenge = {
    status: 402,
    providerId: input.providerId,
    resource: input.resource,
    priceUsd: Number(input.priceUsd.toFixed(4)),
    rail: "hedera-x402",
    asset: "HBAR",
    network: "hedera-testnet",
    facilitatorUrl: "/api/x402/facilitator",
    nonce: input.nonce ?? shortHash(`${input.providerId}:${input.resource}:${issued.getTime()}:${Math.random()}`),
    expiresAt: new Date(issued.getTime() + ttl * 1000).toISOString(),
    description: input.description,
  };
  appendChallenge(challenge);
  return challenge;
}

export type X402SettleInput = {
  providerId: string;
  resource: string;
  buyer: string;
  priceUsd: number;
  paymentRef: string;
  nonce: string;
  ttlSeconds?: number;
};

export type X402SettleResult =
  | { ok: true; receipt: X402Receipt }
  | { ok: false; reason: "unknown_nonce" | "expired_nonce" | "amount_mismatch" | "payment_ref_invalid" | "duplicate_payment"; message: string };

export function settleX402Payment(input: X402SettleInput): X402SettleResult {
  ensure();
  const challenges = readChallenges();
  let challenge = challenges.find((item) => item.providerId === input.providerId && item.resource === input.resource && item.nonce === input.nonce);
  if (!challenge) {
    // Single-flight auto-open: if no challenge matches the supplied nonce, open one
    // with the same providerId/resource/nonce and use that to settle immediately.
    // This is what the Blocky402 orchestrator relies on (it signs and posts to /settle
    // without first calling /challenge).
    challenge = buildX402Challenge({
      providerId: input.providerId,
      resource: input.resource,
      priceUsd: input.priceUsd,
      description: `auto-opened from settleX402Payment for ${input.providerId}`,
      ttlSeconds: input.ttlSeconds ?? 300,
      nonce: input.nonce,
    });
  }
  if (new Date(challenge.expiresAt).getTime() < Date.now()) return { ok: false, reason: "expired_nonce", message: "Challenge expired; request a new one." };
  if (Number(challenge.priceUsd.toFixed(4)) !== Number(input.priceUsd.toFixed(4))) return { ok: false, reason: "amount_mismatch", message: "Quoted price does not match the challenge." };
  if (!input.paymentRef || input.paymentRef.length < 6 || /\s/.test(input.paymentRef)) return { ok: false, reason: "payment_ref_invalid", message: "paymentRef must be a non-empty, whitespace-free id of at least 6 chars." };
  const receipts = readReceipts();
  const duplicate = receipts.find((receipt) => receipt.paymentRef === input.paymentRef);
  if (duplicate) return { ok: false, reason: "duplicate_payment", message: `Payment reference ${input.paymentRef} was already settled as ${duplicate.receiptId}.` };

  const ttl = input.ttlSeconds ?? 120;
  const issuedAt = nowIso();
  const payload: Omit<X402Receipt, "signature"> = {
    receiptId: `x402-${shortHash(`${input.paymentRef}:${input.providerId}:${issuedAt}`)}`,
    providerId: input.providerId,
    resource: input.resource,
    buyer: input.buyer,
    priceUsd: challenge.priceUsd,
    rail: challenge.rail,
    asset: challenge.asset,
    network: challenge.network,
    paymentRef: input.paymentRef,
    facilitator: facilitatorId(),
    issuedAt,
    expiresAt: new Date(Date.now() + ttl * 1000).toISOString(),
    verification: { algorithm: "hmac-sha256", publicKeyId: publicKeyId() },
  };
  const signature = signReceiptPayload(payload);
  const receipt: X402Receipt = { ...payload, signature };
  appendReceipt(receipt);
  return { ok: true, receipt };
}

export function verifyX402Receipt(receipt: X402Receipt): boolean {
  const { signature, ...rest } = receipt;
  const expected = signReceiptPayload(rest);
  if (expected.length !== signature.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(signature, "hex"));
}

export function listX402Receipts() {
  return readReceipts().slice(-50).reverse();
}

export function listX402Challenges() {
  return readChallenges().slice(-50).reverse();
}

export function buildDemoX402PaymentRef(receipt: X402Receipt) {
  return `demo-ref:${receipt.receiptId}`;
}

export function resetX402StateForTests() {
  try { fs.rmSync(receiptsPath, { force: true }); } catch {}
  try { fs.rmSync(challengesPath, { force: true }); } catch {}
  memoryChallenges = [];
  memoryReceipts = [];
}

let memoryChallenges: X402Challenge[] = [];
let memoryReceipts: X402Receipt[] = [];
