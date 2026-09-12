import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

function present(value) {
  return Boolean(value && !value.includes('__PASTE_') && !value.includes('__GENERATE_'));
}

function buildDeploymentReadiness(env) {
  const checks = {
    arcTestnet: env.ARC_NETWORK === 'ARC-TESTNET',
    circleApiKey: present(env.CIRCLE_API_KEY),
    circleEntitySecret: present(env.CIRCLE_ENTITY_SECRET),
    arcWallets: present(env.ARC_TRADER_WALLET_ID) && present(env.ARC_RESEARCH_WALLET_ID) && present(env.ARC_RISK_WALLET_ID),
    hederaTestnet: (env.HEDERA_NETWORK ?? 'testnet') === 'testnet',
    hcsTopic: present(env.HEDERA_HCS_TOPIC_ID),
    telegramBot: present(env.TELEGRAM_BOT_TOKEN),
    telegramSecret: present(env.TELEGRAM_WEBHOOK_SECRET),
    publicUrl: present(env.NOVA_PUBLIC_URL),
  };
  const blockers = [];
  if (!checks.arcTestnet) blockers.push('ARC_NETWORK must be ARC-TESTNET.');
  if (!checks.circleApiKey || !checks.circleEntitySecret || !checks.arcWallets) blockers.push('Circle/Arc wallets are not ready.');
  if (!checks.hederaTestnet || !checks.hcsTopic) blockers.push('Hedera testnet HCS audit is not ready.');
  const liveTelegramReady = checks.telegramBot && checks.telegramSecret && checks.publicUrl;
  return {
    mvpReady: blockers.length === 0,
    mode: liveTelegramReady ? 'live-telegram-ready' : 'fixture-safe',
    liveTelegramReady,
    checks,
    blockers,
    next: liveTelegramReady
      ? ['Run scripts/setup-telegram-webhook.py to register webhook.']
      : checks.telegramBot && checks.telegramSecret
        ? ['Start cloudflared tunnel and set NOVA_PUBLIC_URL, then run scripts/setup-telegram-webhook.py.']
        : ['Set Telegram bot token and webhook secret for live group input.'],
    safety: { mainnetDisabled: true, realTradesDisabled: true, secretsInBrowser: false },
  };
}

const readiness = buildDeploymentReadiness(process.env);
console.log(JSON.stringify(readiness, null, 2));
if (!readiness.mvpReady) process.exit(1);
