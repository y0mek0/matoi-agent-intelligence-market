import { NextResponse } from "next/server";

function isSet(value: string | undefined) {
  return Boolean(value && !value.includes("__PASTE_") && !value.includes("__GENERATE_"));
}

export function GET() {
  return NextResponse.json({
    arc: {
      network: process.env.ARC_NETWORK ?? null,
      circleApiKey: isSet(process.env.CIRCLE_API_KEY),
      entitySecret: isSet(process.env.CIRCLE_ENTITY_SECRET),
      traderWallet: isSet(process.env.ARC_TRADER_WALLET_ID),
      researchWallet: isSet(process.env.ARC_RESEARCH_WALLET_ID),
      riskWallet: isSet(process.env.ARC_RISK_WALLET_ID),
    },
    hedera: {
      network: process.env.HEDERA_NETWORK ?? null,
      operatorId: isSet(process.env.HEDERA_OPERATOR_ID),
      operatorKey: isSet(process.env.HEDERA_OPERATOR_KEY),
      ecdsaAccount: isSet(process.env.HEDERA_ECDSA_ACCOUNT_ID),
      ecdsaKey: isSet(process.env.HEDERA_ECDSA_KEY),
      hcsTopic: isSet(process.env.HEDERA_HCS_TOPIC_ID),
      hcsSigner: process.env.HEDERA_HCS_SIGNER ?? null,
    },
    openrouter: {
      apiKey: isSet(process.env.OPENROUTER_API_KEY),
      model: process.env.OPENROUTER_MODEL ?? null,
      enabled: isSet(process.env.OPENROUTER_API_KEY),
    },
    telegram: {
      botToken: isSet(process.env.TELEGRAM_BOT_TOKEN),
      mode: isSet(process.env.TELEGRAM_BOT_TOKEN) ? "live-ready" : "fixture",
      webhookRegistered: false,
      publicUrlConfigured: isSet(process.env.NOVA_PUBLIC_URL),
    },
  });
}
