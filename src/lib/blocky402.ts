/**
 * Blocky402 / x402 facilitator primitives for Hedera testnet.
 *
 * This is the pure (no IO, no network) layer. It encodes/decodes payment
 * headers according to the x402 spec and converts facilitator 402 challenges
 * into our internal `HederaPaymentRequirements` shape.
 *
 * The actual facilitator call (verify/settle) lives in `blocky402-client.ts`.
 * The actual Hedera TransferTransaction construction/signing lives in
 * `hedera-payment-signer.ts`.
 */

export type HederaPaymentRequirements = {
  scheme: "exact";
  network: "hedera:testnet";
  asset: "USDC";
  tokenId: string;
  decimals: number;
  payTo: string;
  maxAmountRequired: string;
  resource: string;
  description: string;
  mimeType: string;
};

export type HederaPaymentPayload = {
  x402Version: number;
  scheme: "exact";
  network: "hedera:testnet";
  payload: {
    transactionBody: string;
    signatures: string[];
  };
};

export type HederaUsdcTransferBody = {
  network: "hedera:testnet";
  tokenId: string;
  decimals: number;
  payToAccountId: string;
  amountInSmallestUnit: string;
  amountInUsd: number;
};

export const HEDERA_TESTNET_USDC_TOKEN_ID = "0.0.429274";
export const HEDERA_TESTNET_USDC_DECIMALS = 6;
export const X402_HEDERA_FACILITATOR_BASE_URL = "https://x402.org";

export function smallestUnitToUsd(amount: string, decimals: number): number {
  const big = BigInt(amount);
  const divisor = BigInt(10) ** BigInt(decimals);
  // Number conversion safe up to ~9e15, fine for our capped testnet amounts (< 0.01 USDC = 10000 smallest units).
  return Number(big) / Number(divisor);
}

export function buildHederaUsdcTransferBody(req: HederaPaymentRequirements): HederaUsdcTransferBody {
  return {
    network: "hedera:testnet",
    tokenId: req.tokenId,
    decimals: req.decimals,
    payToAccountId: req.payTo,
    amountInSmallestUnit: req.maxAmountRequired,
    amountInUsd: Number(smallestUnitToUsd(req.maxAmountRequired, req.decimals).toFixed(req.decimals)),
  };
}

export function encodeHederaPaymentHeader(payload: HederaPaymentPayload): string {
  return Buffer.from(JSON.stringify(payload), "utf-8").toString("base64");
}

export function decodeHederaPaymentHeader(header: string): HederaPaymentPayload {
  const json = Buffer.from(header, "base64").toString("utf-8");
  return JSON.parse(json) as HederaPaymentPayload;
}

export type FacilitatorChallenge = {
  status?: number;
  accepts?: Array<Record<string, unknown>>;
};

export function parseFacilitatorChallenge(challenge: FacilitatorChallenge): HederaPaymentRequirements {
  const accepts = Array.isArray(challenge.accepts) ? challenge.accepts : [];
  const hederaOption = accepts.find((option) => option.network === "hedera:testnet");
  if (!hederaOption) {
    throw new Error("facilitator challenge has no hedera:testnet payment option");
  }
  const candidate: HederaPaymentRequirements = {
    scheme: "exact",
    network: "hedera:testnet",
    asset: "USDC",
    tokenId: typeof hederaOption.tokenId === "string" ? hederaOption.tokenId : HEDERA_TESTNET_USDC_TOKEN_ID,
    decimals: typeof hederaOption.decimals === "number" ? hederaOption.decimals : HEDERA_TESTNET_USDC_DECIMALS,
    payTo: typeof hederaOption.payTo === "string" ? hederaOption.payTo : "",
    maxAmountRequired: typeof hederaOption.maxAmountRequired === "string" ? hederaOption.maxAmountRequired : "0",
    resource: typeof hederaOption.resource === "string" ? hederaOption.resource : "",
    description: typeof hederaOption.description === "string" ? hederaOption.description : "",
    mimeType: typeof hederaOption.mimeType === "string" ? hederaOption.mimeType : "application/json",
  };
  if (!candidate.payTo) throw new Error("hedera payment option missing payTo account");
  return candidate;
}

/**
 * Verify a facilitator settlement response has the expected shape.
 * Returns the parsed receipt, throws on shape mismatch.
 */
export type FacilitatorSettlementResponse = {
  success?: boolean;
  transaction?: string;
  network?: string;
  receiptId?: string;
  payer?: string;
};

export function parseFacilitatorSettlement(raw: unknown): {
  ok: boolean;
  txHash: string;
  network: string;
  receiptId: string;
  payer: string;
} {
  if (!raw || typeof raw !== "object") throw new Error("settlement response is not an object");
  const r = raw as FacilitatorSettlementResponse;
  if (r.success !== true) throw new Error("settlement not successful");
  if (typeof r.transaction !== "string" || !r.transaction) throw new Error("settlement missing transaction hash");
  if (typeof r.network !== "string" || (r.network !== "hedera:testnet" && r.network !== "hedera-testnet")) throw new Error(`settlement network is not hedera:testnet (got ${r.network})`);
  return {
    ok: true,
    txHash: r.transaction,
    network: r.network,
    receiptId: typeof r.receiptId === "string" ? r.receiptId : "",
    payer: typeof r.payer === "string" ? r.payer : "",
  };
}
