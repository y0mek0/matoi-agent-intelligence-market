export type DeploymentEnv = Record<string, string | undefined>;

function present(value: string | undefined) {
  return Boolean(value && !value.includes("__PASTE_") && !value.includes("__GENERATE_"));
}

export function buildDeploymentReadiness(env: DeploymentEnv = process.env) {
  const checks = {
    arcTestnet: env.ARC_NETWORK === "ARC-TESTNET",
    circleApiKey: present(env.CIRCLE_API_KEY),
    circleEntitySecret: present(env.CIRCLE_ENTITY_SECRET),
    arcWallets: present(env.ARC_TRADER_WALLET_ID) && present(env.ARC_RESEARCH_WALLET_ID) && present(env.ARC_RISK_WALLET_ID),
    hederaTestnet: (env.HEDERA_NETWORK ?? "testnet") === "testnet",
    hcsTopic: present(env.HEDERA_HCS_TOPIC_ID),
    telegramBot: present(env.TELEGRAM_BOT_TOKEN),
    telegramSecret: present(env.TELEGRAM_WEBHOOK_SECRET),
  };
  const blockers: string[] = [];
  if (!checks.arcTestnet) blockers.push("ARC_NETWORK must be ARC-TESTNET.");
  if (!checks.circleApiKey || !checks.circleEntitySecret || !checks.arcWallets) blockers.push("Circle/Arc wallets are not ready.");
  if (!checks.hederaTestnet || !checks.hcsTopic) blockers.push("Hedera testnet HCS audit is not ready.");
  const liveTelegramReady = checks.telegramBot && checks.telegramSecret;
  const next = liveTelegramReady ? ["Set Vercel URL as Telegram webhook."] : ["Set Telegram bot token and webhook secret for live group input."];
  return {
    mvpReady: blockers.length === 0,
    mode: liveTelegramReady ? "live-telegram-ready" as const : "fixture-safe" as const,
    liveTelegramReady,
    checks,
    blockers,
    next,
    safety: {
      mainnetDisabled: true,
      realTradesDisabled: true,
      secretsInBrowser: false,
    },
  };
}
