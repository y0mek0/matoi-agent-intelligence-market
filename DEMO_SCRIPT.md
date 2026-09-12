# Agent Intelligence Market — Demo Script (60–90 seconds)

Use this checklist to record a tight demo video for the hackathon jury.

## Setup (do not show)

1. `cd C:\Users\azi\Documents\prro_grams\hackaton-now\agent-intelligence-market`
2. `npm run qa:full` — confirm green
3. `npm run monitor:once` — confirm one passing tick
4. Open the public URL (cloudflared tunnel or `http://127.0.0.1:3100`)
5. Pre-warm: visit the page once, click **RUN FULL MISSION** once, click **PUBLISH HCS PROOF** once
6. Have these tabs ready in the browser:
   - Nova dashboard (main `/`)
   - Docs graph (`/docs`)
   - Optional: `https://hashscan.io/testnet/topic/0.0.10426202`

## Shot list

### Shot 0 — Submission slides embedded in video (0–20s)

Voiceover:

> "Matoi is an agent intelligence market for two tracks: Arc/Circle agentic economy and Hedera x402 paid services. The demo shows a live frontend, backend, architecture diagram, and a real Blocky402 paid request on Hedera testnet."

Visuals:

- README hero and `docs/architecture.svg`
- Point at the Hedera checklist in README: live x402 service, facilitator, real paid request, setup + payment flow docs

### Shot 1 — Hook (20–35s)

Voiceover:

> "Agent Intelligence Market is a control room for autonomous economic agents.
> Buyer agents arrive with budgets, buy intelligence from provider agents, authorize spend through Arc/Circle, and leave public proofs on Hedera — without real trades."

Visuals:

- Hero section: `AGENT MARKET` typography, kanji rain
- Hover the `RUN CYCLE` / scenario area

### Shot 2 — Buyer mission runner (10–28s)

Click **RUN FULL MISSION** or one scenario chip.

Voiceover:

> "Instead of one fixed bot action, Nova has five buyer tasks: ETH risk, DAO treasury, security shock, narrative scout, and provider marketplace. Each mission selects providers, ranks quotes, and creates a task-relative summary."

Visuals:

- `Mission scenario runner`
- scenario chips: `Fast ETH Risk`, `DAO Treasury`, `Security Shock`, `Narrative Scout`, `Provider Market`
- `RUN FULL MISSION`
- `ARC SPEND AUTHORIZED`

### Shot 3 — Provider agents sell intelligence (28–45s)

Voiceover:

> "Each provider has its own scoring model. Telegram scores urgency and social shock; CoinGecko scores price and volume; DefiLlama scores liquidity risk; GitHub scores release and security signals. OpenRouter-style evaluators turn those signals into normalized intelligence."

Visuals:

- `Buyer agent marketplace`
- `Source agents`: RSS, CoinGecko, DefiLlama, GitHub
- provider count / selected providers
- mission summary text

### Shot 4 — Arc/Circle spend authorization + Circle tools (45–72s)

Voiceover:

> "For the Arc/Circle track, Circle Developer Controlled Wallets act as the buyer-agent treasury. Matoi has three ARC-TESTNET role wallets — Trader, ArcResearch, and Risk. The BuyerAgent authorizes bounded USDC spend under a budget and risk policy, records provider payout intents, and accrues nanopayments per provider call. A guarded real ARC-TESTNET USDC transfer proof is documented in the README."

Visuals:

- `docs/architecture.svg` payment rails block, then return to UI
- `ARC INTENT READY`
- `Arc $0.xx` authorized in mission runner
- `Arc wallets` card: Trader / ArcResearch / Risk connected
- `NANOPAYMENTS` summary card
- optional endpoint tab: `/api/arc/status`

### Shot 5 — Trading/risk desk remains safe (72–88s)

Voiceover:

> "Trading agents vote on simulated action only. Momentum, mean reversion and risk guard can say buy small, hold, or request more data — but execution is always disabled."

Visuals:

- `Trading agent desk`
- `SIMULATION ONLY`
- `BUY_SMALL_SIMULATED`, `HOLD` or `REQUEST_MORE_DATA`
- `NO REAL SWAP`

### Shot 6 — Hedera x402 paid request (88–116s)

Run a real paid request through the public tunnel:

```bash
curl -s -X POST https://mix-comp-royalty-gordon.trycloudflare.com/api/x402/blocky402/pay \
  -H 'content-type: application/json' \
  -d '{"providerId":"telegram-pulse","payToAccountId":"0.0.10380366","amountInSmallestUnit":"10000"}'
```

Voiceover:

> "This is the Hedera track proof. The buyer agent pays the TelegramPulse service through the Blocky402-compatible facilitator. The request is x402-gated, signed with the Hedera ECDSA payer, and returns a verified x402 receipt."

Visuals:

- Terminal response: `ok: true`
- `receiptId: x402-...`
- `network: hedera:testnet`
- A2A messages: `BLOCKY402_CHALLENGE_RECEIVED`, `BLOCKY402_PAYMENT_SUBMITTED`, `BLOCKY402_RECEIPT_VERIFIED`

### Shot 7 — Hedera HCS audit (116–136s)

Click **PUBLISH HCS PROOF**.

Voiceover:

> "Every decision and Arc action can be reduced to a public proof hash and submitted to Hedera Consensus Service. Public audit, no secrets."

Visuals:

- Audit trail: `arc_action_planned`, `decision_produced`
- `HCS SUCCESS`
- Topic id `0.0.10426202`
- Optional HashScan tab: the message is visible

### Shot 8 — Out (136–150s)

Voiceover:

> "Nova is a programmable intelligence market: OpenRouter analyzes, Arc/Circle controls buyer spending, and Hedera proves what happened."

Visuals:

- Final hero shot
- Footer safety line

## What NOT to show

- No mainnet transactions
- No real swap or trade
- No raw wallet IDs
- No real wallet keys
- No Telegram bot token or webhook secret
- No OpenRouter or Circle API key

## What MUST be visible

- Hero: `AGENT MARKET`, `NOVA CONTROL ROOM`
- `Mission scenario runner`
- `RUN FULL MISSION`
- 5 scenario chips
- Buyer marketplace: provider quotes, `ARC INTENT READY`
- Source agents: RSS / CoinGecko / DefiLlama / GitHub
- Trading desk: `SIMULATION ONLY`
- Decision: `BUY_SMALL_SIMULATED` or safe alternative, plus `NO REAL SWAP`
- HCS topic id `0.0.10426202` after publish
- Arc addresses are masked or role-only

## Telegram live modes

### Own group webhook demo

Create a private group/channel with **your own** bot and **your own** test messages. This validates webhook + secret-token handling.

Steps:

1. In Telegram, create private demo group or channel.
2. Add the bot as admin if channel, or member if group.
3. Register webhook using local tunnel:

```bash
python scripts/setup-telegram-webhook.py
```

4. Send a demo ETH intelligence message.
5. Refresh/click RUN CYCLE.

### Public Telegram news pipeline

Public-source market news is collected by the separate Telethon side project, not by the bot token:

```bash
cd C:\Users\azi\Documents\prro_grams\tg-bot-41-18
python scripts\run_news_pipeline.py --fetch-limit 25 --analyze-limit 4
```

Then Nova reads cached analysis through:

```text
GET /api/intel/news
```

## Fallback script if live sources are unavailable

> "For demo reliability, this run is using deterministic fallback signals. The same policy, Arc spend, trading and HCS proof path is live; only the source message is fixture-mode."
