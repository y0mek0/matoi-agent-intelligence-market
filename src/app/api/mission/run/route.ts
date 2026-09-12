import { NextResponse } from "next/server";
import { runMission, type A2AMessage, type MissionRunInput } from "@/lib/mission-orchestrator";
import { runBlocky402PaidRequest, type Blocky402A2AMessage } from "@/lib/blocky402-orchestrator";

export const runtime = "nodejs";

function buildBlocky402SetupFailure(): Blocky402A2AMessage[] {
  return [
    {
      type: "BLOCKY402_PAYMENT_FAILED",
      from: "MissionRoute",
      to: "BuyerAgent",
      rail: "hedera-x402",
      status: "failed",
      summary: "Blocky402 mode requested, but HEDERA_PAYER_ACCOUNT_ID, HEDERA_PAYER_KEY or BLOCKY402_URL is not configured.",
    },
  ];
}

async function runMissionPaidGate(): Promise<Blocky402A2AMessage[]> {
  const payerAccountId = process.env.HEDERA_PAYER_ACCOUNT_ID ?? "";
  const payerKey = process.env.HEDERA_PAYER_KEY ?? "";
  const facilitatorUrl = process.env.BLOCKY402_URL ?? "";
  const payToAccountId = process.env.HEDERA_PROVIDER_ACCOUNT_ID ?? payerAccountId;

  if (!payerAccountId || !payerKey || !facilitatorUrl || !payToAccountId) {
    return buildBlocky402SetupFailure();
  }

  const result = await runBlocky402PaidRequest({
    providerId: "telegram-pulse",
    resource: "/api/providers/telegram-pulse",
    payToAccountId,
    amountInSmallestUnit: "10000",
    payerAccountId,
    payerPrivateKey: payerKey,
    facilitatorUrl,
    memo: "Matoi mission Blocky402 paid gate: telegram-pulse",
  });

  return result.a2aMessages;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const x402Mode = body.x402Mode === "blocky402" ? "blocky402" : "hmac";

  const input: MissionRunInput = {
    scenarioId: typeof body.scenarioId === "string" ? body.scenarioId : undefined,
    useOpenRouter: body.useOpenRouter === false ? false : Boolean(process.env.OPENROUTER_API_KEY),
  };

  if (x402Mode === "blocky402") {
    input.x402Blocky402Messages = await runMissionPaidGate();
  }

  const result = await runMission(input);
  // Defensive: ensure transcript type union includes Blocky402 messages.
  result.a2aTranscript = result.a2aTranscript as A2AMessage[];
  return NextResponse.json(result);
}

export async function GET() {
  const result = await runMission({ scenarioId: "fast-eth-risk-check", useOpenRouter: false });
  return NextResponse.json(result);
}
