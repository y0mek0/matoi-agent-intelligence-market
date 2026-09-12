import { buildSignedHederaUsdcTransfer } from "@/lib/hedera-payment-signer";
import { settlePaymentWithBlocky402, type Blocky402Fetch } from "@/lib/blocky402-client";
import {
  buildHederaUsdcTransferBody,
  encodeHederaPaymentHeader,
  HEDERA_TESTNET_USDC_DECIMALS,
  HEDERA_TESTNET_USDC_TOKEN_ID,
  smallestUnitToUsd,
  type HederaPaymentPayload,
} from "@/lib/blocky402";

/**
 * Orchestrator for a real paid request through the Blocky402 / x402 facilitator
 * on Hedera testnet.
 *
 * Flow:
 *   1. Build a local Hedera USDC transfer (sign off-chain)
 *   2. Encode payment header per x402 spec (base64 JSON)
 *   3. POST to facilitator /settle
 *   4. Capture transaction hash + receipt id
 *   5. Emit A2A-style transcript messages so the orchestrator can log them
 */

export type Blocky402A2AMessageType =
  | "BLOCKY402_CHALLENGE_RECEIVED"
  | "BLOCKY402_PAYMENT_SUBMITTED"
  | "BLOCKY402_RECEIPT_VERIFIED"
  | "BLOCKY402_PAYMENT_FAILED";

export type Blocky402A2AMessage = {
  type: Blocky402A2AMessageType;
  from: string;
  to: string;
  rail: "hedera-x402";
  status: "sent" | "verified" | "failed";
  summary: string;
  txHash?: string;
  receiptId?: string;
  network?: "hedera:testnet";
  amountInUsd?: number;
};

export type Blocky402RunInput = {
  providerId: string;
  resource: string;
  payToAccountId: string;
  amountInSmallestUnit: string;
  payerAccountId: string;
  payerPrivateKey: string;
  facilitatorUrl: string;
  memo?: string;
  fetchImpl?: Blocky402Fetch;
};

export type Blocky402RunResult = {
  ok: boolean;
  network: "hedera:testnet" | "";
  txHash: string;
  receiptId: string;
  amountInUsd: number;
  signedTransactionBase64: string;
  paymentHeader: string;
  error?: string;
  a2aMessages: Blocky402A2AMessage[];
};

export async function runBlocky402PaidRequest(input: Blocky402RunInput): Promise<Blocky402RunResult> {
  const amountInUsd = smallestUnitToUsd(input.amountInSmallestUnit, HEDERA_TESTNET_USDC_DECIMALS);

  if (!/^[1-9]\d*$/.test(input.amountInSmallestUnit) || amountInUsd <= 0) {
    return {
      ok: false,
      network: "",
      error: `invalid payment amount: ${input.amountInSmallestUnit} (${amountInUsd} USDC)`,
      txHash: "",
      receiptId: "",
      amountInUsd,
      signedTransactionBase64: "",
      paymentHeader: "",
      a2aMessages: [
        {
          type: "BLOCKY402_PAYMENT_FAILED",
          from: "Blocky402Orchestrator",
          to: "X402Facilitator",
          rail: "hedera-x402",
          status: "failed",
          summary: `Invalid payment amount ${amountInUsd} USDC for ${input.providerId}.`,
          amountInUsd,
        },
      ],
    };
  }

  // 1. Build local challenge description and requirements
  const requirements = {
    scheme: "exact" as const,
    network: "hedera:testnet" as const,
    asset: "USDC" as const,
    tokenId: HEDERA_TESTNET_USDC_TOKEN_ID,
    decimals: HEDERA_TESTNET_USDC_DECIMALS,
    payTo: input.payToAccountId,
    maxAmountRequired: input.amountInSmallestUnit,
    resource: input.resource,
    description: `Matoi paid request to ${input.providerId}`,
    mimeType: "application/json",
  };

  const a2aMessages: Blocky402A2AMessage[] = [
    {
      type: "BLOCKY402_CHALLENGE_RECEIVED",
      from: "Blocky402Facilitator",
      to: "BuyerAgent",
      rail: "hedera-x402",
      status: "sent",
      summary: `Blocky402 /settle challenge received for ${input.providerId} (${amountInUsd} USDC on hedera:testnet).`,
      network: "hedera:testnet",
      amountInUsd,
    },
  ];

  // 2. Sign the Hedera USDC transfer off-chain
  let signedTransactionBase64: string;
  try {
    const signed = await buildSignedHederaUsdcTransfer({
      payerAccountId: input.payerAccountId,
      payerPrivateKey: input.payerPrivateKey,
      payToAccountId: input.payToAccountId,
      tokenId: HEDERA_TESTNET_USDC_TOKEN_ID,
      amountInSmallestUnit: input.amountInSmallestUnit,
      memo: input.memo ?? `Matoi nanopayment: ${input.providerId}`,
    });
    signedTransactionBase64 = signed.signedTransactionBase64;
  } catch (error) {
    return {
      ok: false,
      network: "",
      error: `Hedera signing failed: ${error instanceof Error ? error.message : String(error)}`,
      txHash: "",
      receiptId: "",
      amountInUsd,
      signedTransactionBase64: "",
      paymentHeader: "",
      a2aMessages: [
        ...a2aMessages,
        {
          type: "BLOCKY402_PAYMENT_FAILED",
          from: "BuyerAgent",
          to: "Blocky402Facilitator",
          rail: "hedera-x402",
          status: "failed",
          summary: `Local Hedera signing failed for ${input.providerId}: ${error instanceof Error ? error.message : String(error)}.`,
          amountInUsd,
        },
      ],
    };
  }

  // 3. Build x402 payment header
  const paymentPayload: HederaPaymentPayload = {
    x402Version: 1,
    scheme: "exact",
    network: "hedera:testnet",
    payload: {
      transactionBody: signedTransactionBase64,
      signatures: [], // Signatures are baked into the signed transaction body
    },
  };
  const paymentHeader = encodeHederaPaymentHeader(paymentPayload);

  a2aMessages.push({
    type: "BLOCKY402_PAYMENT_SUBMITTED",
    from: "BuyerAgent",
    to: "Blocky402Facilitator",
    rail: "hedera-x402",
    status: "sent",
    summary: `BuyerAgent submitted signed Hedera USDC transfer to Blocky402 /settle for ${input.providerId}.`,
    network: "hedera:testnet",
    amountInUsd,
  });

  // 4. POST to facilitator /settle (with a fresh nonce for the auto-opened challenge).
  const requestNonce = `b402-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const settlement = await settlePaymentWithBlocky402({
    config: {
      facilitatorUrl: input.facilitatorUrl,
      network: "hedera:testnet",
      fetchImpl: input.fetchImpl,
    },
    paymentHeader,
    requirements,
    nonce: requestNonce,
  });
  if (!settlement.ok) {
    console.error(`[blocky402] settle failed: ${settlement.error}; facilitatorUrl=${input.facilitatorUrl}`);
  }

  if (!settlement.ok) {
    return {
      ok: false,
      network: "",
      error: settlement.error,
      txHash: "",
      receiptId: "",
      amountInUsd,
      signedTransactionBase64,
      paymentHeader,
      a2aMessages: [
        ...a2aMessages,
        {
          type: "BLOCKY402_PAYMENT_FAILED",
          from: "Blocky402Facilitator",
          to: "BuyerAgent",
          rail: "hedera-x402",
          status: "failed",
          summary: `Blocky402 /settle failed: ${settlement.error}.`,
          amountInUsd,
        },
      ],
    };
  }

  a2aMessages.push({
    type: "BLOCKY402_RECEIPT_VERIFIED",
    from: "Blocky402Facilitator",
    to: "BuyerAgent",
    rail: "hedera-x402",
    status: "verified",
    summary: `Blocky402 facilitator verified and broadcast Hedera testnet USDC transfer; tx=${settlement.txHash}.`,
    txHash: settlement.txHash,
    receiptId: settlement.receiptId,
    network: "hedera:testnet",
    amountInUsd,
  });

  // Sanity check: ensure amountInUsd in body matches what we requested
  const body = buildHederaUsdcTransferBody(requirements);
  if (Math.abs(body.amountInUsd - amountInUsd) > 0.000001) {
    return {
      ok: false,
      network: "",
      error: `body amount mismatch: requested ${amountInUsd}, body has ${body.amountInUsd}`,
      txHash: "",
      receiptId: "",
      amountInUsd,
      signedTransactionBase64,
      paymentHeader,
      a2aMessages: [
        ...a2aMessages,
        {
          type: "BLOCKY402_PAYMENT_FAILED",
          from: "Blocky402Orchestrator",
          to: "BuyerAgent",
          rail: "hedera-x402",
          status: "failed",
          summary: `Body amount mismatch: requested ${amountInUsd}, body has ${body.amountInUsd}.`,
          amountInUsd,
        },
      ],
    };
  }

  return {
    ok: true,
    network: "hedera:testnet",
    txHash: settlement.txHash,
    receiptId: settlement.receiptId,
    amountInUsd,
    signedTransactionBase64,
    paymentHeader,
    a2aMessages,
  };
}
