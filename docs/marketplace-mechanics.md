# Marketplace Mechanics

This document explains how Nova decides whether a provider's quoted intelligence is worth buying, how buyer agents avoid overpaying, and what each layer guarantees.

## Provider self-evaluation

Each provider is an autonomous agent that publishes a normalized `ProviderAnalysis`:

```text
providerId
missionId
asset
localScore   0..10   cheap deterministic score, provider-specific rules
gptScore     0..10   OpenRouter-style evaluator score (or fallback)
urgency      0..10   how time-sensitive the signal is
tradability  0..10   how actionable the signal is
reliability  0..10   base reliability of the provider channel
priceUsd     ≤ 0.05  quoted price, capped at provider pricing tier
impact       bullish | bearish | neutral | unknown
summary      ≤ 220 chars
evidenceHash sha256(providerId:missionId:evidence)
riskFlags    ≤ 6
rawTextStored false
```

### Provider-specific scoring

Scoring rules are provider-specific, not generic:

| Provider | Local score depends on |
|---|---|
| `telegram-pulse` | urgency, breaking/ETF/hack keywords, asset mentions |
| `telegram-news` | importance, recency, narrative overlap |
| `rss-news` | publisher reliability, regulation/security/macro terms |
| `coingecko-price` | 24h move, volume spike, volatility/tradability |
| `defillama-tvl` | TVL change, stablecoin change, liquidity risk |
| `github-releases` | security/release keywords, repo activity |

Provider-specific OpenRouter prompts are defined in `src/lib/provider-openrouter-evaluators.ts`. The live caller `src/lib/provider-openrouter-live.ts` checks the env, calls OpenRouter with the provider system prompt, parses fenced JSON, and falls back to deterministic evaluation if no key is set or the call fails.

## Dynamic pricing

File: `src/lib/provider-pricing.ts`.

```text
quotedUsd = baseCost
          × confidenceMultiplier   (localScore+gptScore)
          × urgencyMultiplier      (urgency)
          × freshnessMultiplier    (freshness in hours)
          × reputationMultiplier   (reputation 0..1)
          then clamped to provider tier range
```

Tier ranges:

```text
low      0.002..0.01
medium   0.003..0.015
high     0.005..0.025
```

Why this prevents overpricing:

```text
- caps enforced by tier, not by guesswork
- reputation discount prevents a bad provider from charging more
- freshness discount prevents stale signals from being priced like fresh ones
- the buyer-side cap (`scenario.budgetUsd`) is the second safety layer
```

Endpoint: `POST /api/agents/quote`.

## Buyer-side decision

File: `src/lib/mission-orchestrator.ts`.

The buyer agent never trusts a single provider. It runs:

```text
1. score each provider locally
2. compute per-provider quote (dynamic pricing)
3. try OpenRouter evaluator if env is configured and signal is worth it
4. build the provider analysis
5. sort by combined score + reliability + urgency
6. greedy selection under budget
7. Arc spend authorization per accepted quote
8. cross-provider inspector verdict
9. audit + Arc/Hedera proof
```

The greedy selection enforces:

```text
spent += quote.cappedUsd  (cannot exceed scenario.budgetUsd)
```

## Inspector agent

File: `src/lib/inspector-agent.ts`.

After the buyer selects providers, an independent inspector reviews the bundle:

```text
contradictions:
  - mixed bullish/bearish signals
duplicates:
  - near-duplicate summary text across providers
overPricedFlag:
  - any quote > $0.015
missingRiskFlag:
  - no risk flags at all
```

The inspector verdict is included in the audit trail and influences the final decision.

Endpoint: `POST /api/agents/inspector`.

## Reputation / dispute layer

File: `src/lib/provider-reputation.ts`.

Each rating is stored:

```text
outcome ∈ useful, neutral, duplicate, wrong, untrusted
score   -1..+1
```

Reputation is updated after every mission:

```text
- accepted + paid → useful
- blocked by policy → wrong
```

Reputation feeds back into dynamic pricing through `reputationMultiplier`:

```text
0.6..1.4
low reputation → cheaper quotes
high reputation → premium quotes
```

Endpoints:

```text
GET  /api/agents/reputation
POST /api/agents/reputation   rate or dispute
```

## Audit / proof

File: `src/lib/audit-log.ts`.

Every mission produces redacted audit events:

```text
cycle_started
payment_approved
arc_action_planned
provider_signal_released
decision_produced
```

`arc_action_planned` includes:

```text
missionId
actionCount
network=ARC-TESTNET
realTrade=false
authorizedUsd
```

HCS publishing uses an allowlisted payload schema; private keys, raw message text, and secret-like values are never published.

## Anti-overpricing guarantees

The system is designed so that:

```text
1. provider cannot exceed its tier cap
2. provider price is discounted when reputation is low
3. provider price is discounted when signal is stale
4. buyer cannot exceed mission budget
5. Arc ledger enforces $0.01 per-call cap and idempotency
6. inspector flags mixed/duplicate/overpriced signals
7. audit log records every decision and Arc action
```

## When scaling to many buyers and providers

Recommended production shape:

```text
- per-provider reputation accumulated over many missions
- per-buyer reputation and dispute history
- rate limits per buyer and per provider
- knapsack selection for non-greedy multi-objective optimization
- cohort-level price normalization (z-score per provider tier)
- optional HCS anchoring of inspector verdict for public reputation
```

These are intentionally not implemented yet; current architecture keeps them visible as roadmap without forcing mock data.
