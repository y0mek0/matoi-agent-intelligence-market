# Wallets and rails

## Arc/Circle

Circle Developer-Controlled Wallets are configured for Arc testnet. They are used as the **agent treasury / spend-control / provider payout authorization layer**, not as a real trading venue.

Working setup findings:

- `CIRCLE_ENTITY_SECRET` is generated locally and registered with Circle.
- `recovery/` must stay gitignored.
- `ARC_NETWORK` must be `ARC-TESTNET`.
- Do not pass `accountType` explicitly when creating Arc testnet wallets.
- Create Arc wallets one at a time with `count: 1`.

Configured agent wallet roles:

- Trader Agent wallet.
- ArcResearch Agent wallet.
- Risk Agent wallet.
- Buyer Agent wallet roles are logical in MVP; they build spend intents against the Arc/Circle treasury policy.

## Arc action model

The client enters a mission and budget. Nova converts it into a bounded Arc/Circle action plan:

```text
Buyer scenario
→ provider discovery and quote ranking
→ provider-specific scoring/evaluation
→ PolicyEngine approval
→ Arc/Circle provider payment authorization
→ local Arc spend ledger entry
→ audit event: arc_action_planned
→ optional HCS proof publish
```

Current Arc actions:

| Action | Rail | Meaning | Safety |
|---|---|---|---|
| `AUTHORIZE_PROVIDER_PAYMENT` | `arc-usdc` | authorize tiny testnet provider spend intent | `realTrade=false` |
| `RESERVE_BUYER_BUDGET` | `arc-usdc` | keep remaining buyer budget reserved | `realTrade=false` |
| `RECORD_HCS_AUDIT` | `hedera-hcs` | anchor Arc intent/public hash on Hedera | public proof only |

## Arc spend ledger

Endpoint:

```text
POST /api/arc/authorize-payment
```

What it records:

```text
missionId
buyerId
providerId
amountUsd
network=ARC-TESTNET
status=authorized|blocked
realTrade=false
realUsdcTransfer=false
idempotencyKey
```

MVP caps provider authorization at `$0.01` per call. Unknown providers are blocked. Idempotency prevents duplicate spend entries during retries.

## Why Arc matters here

Arc/Circle is the economic layer:

```text
OpenRouter analyzes.
Hedera proves and gates.
Arc/Circle controls buyer budget, wallet roles and provider payout authorization.
```

Without Arc/Circle, Nova can summarize data and publish proofs, but it cannot model autonomous agent treasury control or provider micro-payment authorization.

## MVP boundary

```text
real trades: disabled
real USDC transfer: disabled by default
mainnet: disabled
Arc network: ARC-TESTNET
browser secrets: none
```

Real testnet USDC transfer execution is the next upgrade, but only after policy/idempotency tests and no-secret browser checks remain green.

## Hedera

Hedera provides the proof and pay-per-call side:

- Real x402 facilitator at `/api/x402/facilitator` (challenge → settle → verify → HCS anchor).
- HMAC-signed receipts persist in `.data/x402-receipts.json`.
- HCS topic for public audit proof; x402 receipts are anchorable via `/api/x402/anchor`.
- `/api/agents/directory` exposes discoverable agent catalog for the Hedera agent-discovery requirement.
- Scheduled Transactions / HTS / HCS-14 identity remain roadmap unless time allows.

## Payment strategy

Current demo is honest:

```text
Hedera x402: 402-style challenge + demo proof
Arc/Circle: DCW role wallets + policy-bounded provider spend intents + ledger
HCS: real testnet TopicMessageSubmitTransaction proof
```
