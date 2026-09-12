import type { Blocky402A2AMessage } from "@/lib/blocky402-orchestrator";

/**
 * Merge a Blocky402 paid-request transcript onto an existing A2A transcript.
 *
 * The existing transcript may use any message shape (e.g. HMAC-style x402
 * messages from the local facilitator). The Blocky402 messages always carry
 * `txHash`, `receiptId`, `network`, `amountInUsd` so they can be rendered as
 * a distinct rail in the UI.
 *
 * Pure: no IO, no env. Used by `mission-orchestrator.ts` when the caller
 * supplies a Blocky402 result.
 */

export type EnrichedA2AMessage = {
  type: string;
  missionId: string;
  from?: string;
  to?: string;
  summary?: string;
  rail?: "hedera-x402" | "arc-usdc" | "local-orchestrator" | "hcs";
  status?: string;
  txHash?: string;
  receiptId?: string;
  network?: string;
  amountInUsd?: number;
};

export type EnrichInput = {
  baseMessages: ReadonlyArray<Record<string, unknown>>;
  blocky402Messages: Blocky402A2AMessage[];
  missionId: string;
};

export function enrichA2ATranscriptWithBlocky402(input: EnrichInput): EnrichedA2AMessage[] {
  const base = input.baseMessages.map((message) => message as EnrichedA2AMessage);
  if (!input.blocky402Messages.length) return base;
  const blocky = input.blocky402Messages.map<EnrichedA2AMessage>((message) => ({
    type: message.type,
    missionId: input.missionId,
    from: message.from,
    to: message.to,
    summary: message.summary,
    rail: message.rail,
    status: message.status,
    txHash: message.txHash,
    receiptId: message.receiptId,
    network: message.network,
    amountInUsd: message.amountInUsd,
  }));
  return [...base, ...blocky];
}
