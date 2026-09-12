# Agents

## Buyer Agent

Client enters a mission:

```text
objective + asset + budget + risk profile + time horizon
```

Nova creates a logical buyer wallet role and spending policy. It ranks provider quotes, authorizes Arc/Circle spend intents, buys provider intelligence under a cap, and produces a task-relative mission summary. The buyer never signs directly; policy gates every action.

## Buyer scenarios

| Scenario | Client | Mission | Primary providers | Arc role |
|---|---|---|---|---|
| `fast-eth-risk-check` | hedge-fund analyst | urgent ETH bullish/bearish risk | Telegram, CoinGecko, RSS | HedgeFundAnalyst Buyer |
| `dao-treasury-rebalance` | DAO treasury | USDC/ETH rebalance watch | DefiLlama, CoinGecko, RSS | DaoTreasury Buyer |
| `security-event-shock` | protocol ops | exploit/release/security shock | GitHub, RSS, Telegram | ProtocolOps Buyer |
| `market-narrative-scout` | research desk | market narrative summary | Telegram, RSS, TVL, GitHub | ResearchDesk Buyer |
| `provider-marketplace-demo` | autonomous buyer agent | cheapest reliable intelligence bundle | all providers compete | AgentCustomer Buyer |

Endpoint:

```text
POST /api/mission/run
```

## Provider / Source Agents

Each sellable provider has two evaluator layers:

1. **Local scorer** — cheap deterministic scoring before any LLM call.
2. **OpenRouter evaluator prompt/parser** — provider-specific analysis schema, with deterministic fallback.

Common output shape:

```text
providerId, missionId, asset, localScore, gptScore, urgency,
tradability, reliability, priceUsd, impact, summary, evidenceHash,
riskFlags, rawTextStored=false
```

| Agent | Sells | Unique scoring | Proof path |
|---|---|---|---|
| TelegramPulse | high-signal Telegram ETH sentiment | urgency, breaking words, asset mentions, social/news shock terms | `GET /api/providers/telegram-pulse` + x402 facilitator |
| TelegramNewsCollector | multi-source public Telegram news | recency, importance, asset/impact tags from side pipeline | `tg-bot-41-18/.data/news-intel.json` → `/api/intel/news` |
| RSS News Agent | publisher headlines and summaries | publisher reliability, headline specificity, regulation/security/macro terms | `/api/intel/sources` + `/api/mission/run` |
| CoinGecko Price Agent | price/volume movement snapshot | 24h move, volume spike, volatility/tradability | `/api/intel/sources` + `/api/mission/run` |
| DefiLlama TVL Agent | DeFi TVL/stablecoin context | TVL movement, stablecoin change, liquidity risk | `/api/intel/sources` + `/api/mission/run` |
| GitHub Release Agent | developer/security release signals | release/security keywords, repo activity, vulnerability risk | `/api/intel/sources` + `/api/mission/run` |

## Trading Agent Desk

Simulation-only agents:

- Momentum Trader Agent
- Mean Reversion Trader Agent
- Risk Guard Trader Agent

They vote on `BUY_SMALL_SIMULATED`, `HOLD`, or `REQUEST_MORE_DATA`. Execution is always `disabled` in MVP.

## ArcResearch / Treasury Agent

Represents Arc/Circle treasury context. It exposes role-wallet readiness and participates in spend-intent planning and provider payout authorization. It does not do browser-side signing.

Arc-specific endpoints:

```text
GET  /api/arc/status
POST /api/arc/authorize-payment
```

## RiskGuard Agent

Rejects unsafe actions:

- real trades
- mainnet
- disabled providers
- over-budget spend
- low-confidence signals
- unapproved rails
- unknown providers

## Audit / Proof Agent

Writes local redacted audit events and anchors public hashes on Hedera HCS.

Important event types:

```text
cycle_started
payment_approved
arc_action_planned
provider_signal_released
decision_produced
```

## Agent directory

```text
GET /api/agents/directory
```

Returns machine-readable discovery metadata for buyer, provider, source, trading, risk and audit agents. It exposes endpoints and rails, not secrets.

## Provider states

- `live-snapshot`: external source fetch succeeded.
- `live-ready`: credentials/config are present.
- `catalog-ready`: provider exists but live fetch may be unavailable.
- `partial`: demo/protocol boundary exists but real facilitator/protocol is roadmap.
- `disabled`: cannot be selected.
