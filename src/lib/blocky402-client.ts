import { X402_HEDERA_FACILITATOR_BASE_URL, type HederaPaymentRequirements, parseFacilitatorSettlement } from "@/lib/blocky402";

/**
 * IO wrapper around the x402 / Blocky402 facilitator HTTP API.
 *
 * Pure: all network IO is injected via `fetchImpl`. Production uses the global
 * `fetch`; tests pass a mock. This keeps the client testable and lets the
 * orchestrator stay deterministic.
 */

export type Blocky402Fetch = (input: string, init?: { method?: string; headers?: Record<string, string>; body?: string }) => Promise<{
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
}>;

export type Blocky402ClientConfig = {
  facilitatorUrl: string;
  network: "hedera:testnet";
  fetchImpl?: Blocky402Fetch;
};

export type SettleResult =
  | { ok: true; txHash: string; network: string; receiptId: string; payer: string }
  | { ok: false; error: string; txHash: ""; network: ""; receiptId: ""; payer: "" };

export async function settlePaymentWithBlocky402(input: {
  config: Blocky402ClientConfig;
  paymentHeader: string;
  requirements: HederaPaymentRequirements;
  /**
   * Optional caller-supplied nonce. When present it is forwarded to the
   * facilitator so the orchestrator and the shim agree on a single shared
   * challenge record. When absent, the facilitator / shim can auto-generate.
   */
  nonce?: string;
}): Promise<SettleResult> {
  const fetchImpl = input.config.fetchImpl ?? (globalThis.fetch as unknown as Blocky402Fetch);
  const url = `${input.config.facilitatorUrl.replace(/\/$/, "")}/settle`;
  try {
    const response = await fetchImpl(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        paymentHeader: input.paymentHeader,
        paymentRequirements: input.requirements,
        ...(input.nonce ? { nonce: input.nonce } : {}),
      }),
    });
    if (!response.ok) {
      return {
        ok: false,
        error: `facilitator /settle returned HTTP ${response.status}`,
        txHash: "",
        network: "",
        receiptId: "",
        payer: "",
      };
    }
    const raw = await response.json();
    // Self-hosted HMAC facilitator returns { ok, receipt }; x402.org-style facilitators
    // return the receipt payload directly. Normalize both into parseFacilitatorSettlement input.
    const payload = (raw && typeof raw === "object" && "receipt" in (raw as Record<string, unknown>))
      ? ((raw as { ok?: boolean; receipt?: Record<string, unknown> }).ok === true && (raw as { receipt?: unknown }).receipt
          ? ((raw as { receipt: Record<string, unknown> }).receipt)
          : (raw as Record<string, unknown>))
      : (raw as Record<string, unknown>);
    let parsed: { ok: boolean; txHash: string; network: string; receiptId: string; payer: string };
    try {
      parsed = parseFacilitatorSettlement(payload);
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "facilitator settlement parse failed",
        txHash: "",
        network: "",
        receiptId: "",
        payer: "",
      };
    }
    return {
      ok: parsed.ok as true,
      txHash: parsed.txHash,
      network: parsed.network,
      receiptId: parsed.receiptId,
      payer: parsed.payer,
    } satisfies SettleResult;
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "unknown facilitator error",
      txHash: "",
      network: "",
      receiptId: "",
      payer: "",
    };
  }
}

export function defaultBlocky402Config(): Blocky402ClientConfig {
  return {
    facilitatorUrl: X402_HEDERA_FACILITATOR_BASE_URL,
    network: "hedera:testnet",
  };
}
