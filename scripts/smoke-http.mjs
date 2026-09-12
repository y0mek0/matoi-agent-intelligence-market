import { spawn, execSync } from "node:child_process";

const preferredPort = 3000;
const fallbackPort = 3100;
let child;
let url = `http://127.0.0.1:${preferredPort}`;
let log = "";

async function canFetch(target) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2_500);
    const response = await fetch(target, { signal: controller.signal });
    clearTimeout(timer);
    return response.ok;
  } catch {
    return false;
  }
}

function killPort(port) {
  if (process.platform !== "win32") return;
  try {
    execSync(`for /f "tokens=5" %a in ('netstat -ano ^| findstr :${port}') do taskkill /PID %a /F`, { shell: "cmd.exe", stdio: "ignore" });
  } catch {}
}

async function startServer() {
  if (await canFetch(url)) return;
  url = `http://127.0.0.1:${fallbackPort}`;
  if (!(await canFetch(url))) {
    killPort(fallbackPort);
  } else {
    return;
  }
  child = spawn(`npm run dev -- --hostname 127.0.0.1 --port ${fallbackPort}`, {
    shell: true,
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      NEXT_TELEMETRY_DISABLED: "1",
      BLOCKY402_URL: process.env.BLOCKY402_URL ?? `http://127.0.0.1:${fallbackPort}/api/x402/blocky402-facilitator`,
    },
  });
  child.stdout.on("data", (chunk) => { log += chunk.toString(); });
  child.stderr.on("data", (chunk) => { log += chunk.toString(); });
}

async function waitForServer() {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (await canFetch(url)) return;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`Server did not become ready at ${url}. Log: ${log.slice(-2000)}`);
}

try {
  await startServer();
  await waitForServer();
  const page = await fetch(url).then((r) => r.text());
  const status = await fetch(`${url}/api/system/status`).then((r) => r.json());
  const arcStatus = await fetch(`${url}/api/arc/status`).then((r) => r.json());
  const challengeResponse = await fetch(`${url}/api/providers/telegram-pulse`);
  const challenge = await challengeResponse.json();
  const paidSignal = await fetch(`${url}/api/providers/telegram-pulse?proof=demo-paid:telegram-pulse`).then((r) => r.json());
  const x402Challenge = await fetch(`${url}/api/x402/facilitator`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "challenge", providerId: "telegram-pulse", priceUsd: 0.01 }) }).then((r) => r.json());
  const x402Settle = await fetch(`${url}/api/x402/facilitator`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "settle", providerId: "telegram-pulse", buyer: "smoke-buyer", priceUsd: 0.01, paymentRef: `smoke-ref-${Date.now()}`, nonce: x402Challenge.nonce }) }).then((r) => r.json());
  const x402Verify = x402Settle.ok ? await fetch(`${url}/api/x402/facilitator`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "verify", receipt: x402Settle.receipt }) }).then((r) => r.json()) : { valid: false };
  const x402ReceiptHeader = x402Settle.ok ? Buffer.from(JSON.stringify(x402Settle.receipt)).toString("base64") : "";
  const x402ReceiptPath = await fetch(`${url}/api/providers/telegram-pulse`, { headers: { "x-x402-receipt": x402ReceiptHeader } }).then((r) => r.json()).catch(() => ({}));
  const cycleRun = await fetch(`${url}/api/cycle/run`, { method: "POST" }).then((r) => r.json());
  const audit = await fetch(`${url}/api/audit`).then((r) => r.json());
  const marketplace = await fetch(`${url}/api/agents/marketplace`).then((r) => r.json());
  const sources = await fetch(`${url}/api/intel/sources`).then((r) => r.json());
  const trading = await fetch(`${url}/api/agents/trading`).then((r) => r.json());
  const tracks = await fetch(`${url}/api/submission/tracks`).then((r) => r.json());
  const directory = await fetch(`${url}/api/agents/directory`).then((r) => r.json());
  const missionRun = await fetch(`${url}/api/mission/run`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ scenarioId: "dao-treasury-rebalance" }) }).then((r) => r.json());
  const arcAuthorize = await fetch(`${url}/api/arc/authorize-payment`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ missionId: "smoke", buyerId: "smoke-buyer", providerId: "rss-news", amountUsd: 0.01, idempotencyKey: `smoke-${Date.now()}` }) }).then((r) => r.json());
  const arcSettlement = await fetch(`${url}/api/arc/settlement/run`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ missionId: "smoke-arc-settlement", buyerId: "smoke-buyer", providerIds: ["telegram-pulse", "rss-news"], budgetUsd: 0.05, requestedUsd: 0.02, idempotencyKey: `smoke-arc-settlement-${Date.now()}` }) }).then((r) => r.json());
  const arcTestnetTransfer = await fetch(`${url}/api/arc/testnet-transfer/run`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ amountUsd: 0.01, providerRole: "ArcResearch" }) }).then((r) => r.json());
  const reputation = await fetch(`${url}/api/agents/reputation`).then((r) => r.json());
  const inspector = await fetch(`${url}/api/agents/inspector`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ scenarioId: "fast-eth-risk-check" }) }).then((r) => r.json());
  const quote = await fetch(`${url}/api/agents/quote`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ providerId: "coingecko-price", localScore: 8, gptScore: 7, urgency: 8, freshnessHours: 1 }) }).then((r) => r.json());
  const blocky402Status = await fetch(`${url}/api/x402/blocky402/pay`).then((r) => r.json()).catch(() => ({}));
  const blocky402Post = await fetch(`${url}/api/x402/blocky402/pay`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ providerId: "telegram-pulse", payToAccountId: "0.0.222222", amountInSmallestUnit: "10000" }) }).then((r) => r.json()).catch(() => ({}));
  const allJson = JSON.stringify({ status, arcStatus, challenge, paidSignal, x402Challenge, x402Settle, x402Verify, x402ReceiptPath, cycleRun, audit, marketplace, sources, trading, tracks, directory, missionRun, arcAuthorize, arcSettlement, arcTestnetTransfer, reputation, inspector, quote, blocky402Status, blocky402Post });
  const checks = [
    ["hero", page.includes("AGENT") && page.includes("MARKET") && page.includes("RUN AGENT MARKET") && page.includes("SEE PAYMENT PROOF")],
    ["hero scope", page.includes("AGENTS") && page.includes("5 BUYER TASKS") && page.includes("ARC") && page.includes("HEDERA X402") && page.includes("HCS ANCHOR")],
    ["hero buttons", page.includes("RUN AGENT MARKET") && page.includes("SEE PAYMENT PROOF")],
    ["docs link", page.includes("/docs")],
    ["mission section", page.includes("Agent market mission") && page.includes("RUN FULL MISSION")],
    ["a2a transcript section", page.includes("A2A transcript")],
    ["rails flow diagram", page.includes("flow-diagram") && page.includes("BuyerAgent")],
    ["rails proof cards", page.includes("proof-cards") && page.includes("Circle DCW + USDC") && page.includes("BLOCKY402 / X402")],
    ["provider agents grid", page.includes("provider-agents-grid") && page.includes("TelegramPulse")],
    ["signals feed", page.includes("Recent signals Matoi just heard") && page.includes("TelegramPulse") && page.includes("More source agents ready to plug") && page.includes("REFRESH")],
    ["status block", page.includes("Built rails are live")],
    ["secret redaction", !allJson.includes("TEST_API_KEY") && !allJson.includes("sk-or") && !allJson.includes("PRIVATE")],
    ["arc ready", status.arc.circleApiKey === true && status.arc.traderWallet === true],
    ["arc status", arcStatus.allReady === true && arcStatus.roles?.length === 3 && !allJson.includes("wallet-")],
    ["hedera ready", status.hedera.operatorKey === true && status.hedera.ecdsaKey === true],
    ["hcs ready", status.hedera.hcsTopic === true],
    ["telegram 402", challengeResponse.status === 402 && (challenge.rail === "hedera-x402" || challenge.acceptedRails?.includes("hedera-x402"))],
    ["telegram proof", paidSignal.provider === "TelegramPulse" && paidSignal.asset === "ETH"],
    ["x402 challenge", x402Challenge.status === 402 && typeof x402Challenge.nonce === "string" && x402Challenge.facilitatorUrl === "/api/x402/facilitator"],
    ["x402 settle", x402Settle.ok === true && typeof x402Settle.receipt?.signature === "string" && x402Settle.receipt.signature.length === 64],
    ["x402 verify", x402Verify.valid === true],
    ["x402 receipt path", x402ReceiptPath?.payment?.receipt?.receiptId === x402Settle.receipt?.receiptId],
    ["cycle run", ["BUY_SMALL_SIMULATED", "HOLD", "REQUEST_MORE_DATA"].includes(cycleRun.decision) && cycleRun.tradeExecution === "disabled" && cycleRun.arcPlan?.allowed === true && cycleRun.auditEvents?.some((event) => event.type === "arc_action_planned") && cycleRun.intelligence?.riskFlags?.includes("simulation-only-no-real-trade")],
    ["audit events", audit.events?.length > 0],
    ["marketplace", marketplace.buyerAgent?.walletRole === "Buyer" && marketplace.providerQuotes?.length >= 4 && marketplace.arcPlan?.actions?.every((action) => action.realTrade === false)],
    ["source agents", sources.agents?.length === 4 && ["live-snapshot", "catalog-ready"].includes(sources.mode)],
    ["trading agents", trading.agents?.length === 3 && trading.consensus?.execution === "disabled"],
    ["track readiness", tracks.safeToSubmit === true && tracks.tracks?.length === 2],
    ["agent directory", directory.protocol === "nova-agent-directory-v1" && directory.agents?.length >= 9 && directory.discovery?.includes("/api/agents/marketplace")],
    ["mission run", missionRun.scenario?.id === "dao-treasury-rebalance" && missionRun.providerAnalyses?.length >= 3 && missionRun.arc?.network === "ARC-TESTNET" && missionRun.decision?.execution === "disabled"],
    ["mission inspector", missionRun.inspector?.inspectorId === "cross-provider-inspector" && Array.isArray(missionRun.inspector?.contradictions)],
    ["mission quotes", Array.isArray(missionRun.quotes) && missionRun.quotes.every((quote) => quote.tier && typeof quote.cappedUsd === "number")],
    ["mission a2a transcript", Array.isArray(missionRun.a2aTranscript) && ["DISCOVER_PROVIDERS", "QUOTE_OFFERED", "SPEND_AUTHORIZED", "X402_RECEIPT_VERIFIED", "HCS_PROOF_READY"].every((type) => missionRun.a2aTranscript.some((message) => message.type === type))],
    ["mission nanopayments meter", missionRun.nanopayments && missionRun.nanopayments.totalCalls > 0 && missionRun.nanopayments.totalAccruedUsdc > 0 && missionRun.nanopayments.meters.length > 0 && missionRun.nanopayments.meters.every((m) => typeof m.costPerCallUsdc === "number" && m.costPerCallUsdc > 0 && typeof m.basePriceUsdc === "number" && m.basePriceUsdc > 0)],
    ["mission delivered call counts", missionRun.a2aTranscript.some((message) => message.type === "INTELLIGENCE_DELIVERED" && typeof message.calls === "number" && message.calls >= 1 && typeof message.costPerCall === "number" && message.costPerCall > 0)],
    ["arc authorize", arcAuthorize.ok === true && arcAuthorize.entry?.network === "ARC-TESTNET" && arcAuthorize.entry?.realUsdcTransfer === false],
    ["arc settlement", arcSettlement.ok === true && arcSettlement.network === "ARC-TESTNET" && arcSettlement.realUsdcTransfer === false && arcSettlement.providers?.length === 2 && arcSettlement.proof?.hcsReady === true],
    ["arc testnet transfer path", arcTestnetTransfer.network === "ARC-TESTNET" && typeof arcTestnetTransfer.realUsdcTransfer === "boolean" && ["disabled", "setup_required", "funding_required", "submitted", "failed"].includes(arcTestnetTransfer.status)],
    ["provider reputation", reputation.reputations?.length >= 1 && reputation.reputations.every((rep) => typeof rep.score === "number")],
    ["inspector api", inspector.inspectorId === "cross-provider-inspector"],
    ["quote api", quote.ok === true && quote.quote?.cappedUsd >= 0.002 && quote.quote?.cappedUsd <= 0.025],
    ["blocky402 status", blocky402Status.network === "hedera:testnet" && typeof blocky402Status.facilitatorUrl === "string" && blocky402Status.facilitatorUrl.length > 0 && Array.isArray(blocky402Status.requiredEnv) && blocky402Status.requiredEnv.includes("HEDERA_PAYER_ACCOUNT_ID") && blocky402Status.requiredEnv.includes("HEDERA_PAYER_KEY") && blocky402Status.requiredEnv.includes("BLOCKY402_URL")],
    ["blocky402 post", blocky402Post && typeof blocky402Post === "object" && (blocky402Post.setupRequired === true || blocky402Post.ok === true || blocky402Post.ok === false)],
  ];
  const failed = checks.filter(([, ok]) => !ok).map(([name]) => name);
  if (failed.length) throw new Error(`Smoke failed: ${failed.join(", ")}`);
  console.log(`RESULT: SMOKE_HTTP_OK ${url}`);
  if (child) child.kill("SIGTERM");
  process.exit(0);
} catch (error) {
  if (child) child.kill("SIGTERM");
  throw error;
}
