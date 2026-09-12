# Arc / Circle track — Agentic Economy proof

This page maps the Arc / Circle bounty requirements to the exact project artifacts,
routes, setup steps and proof commands in this repository.

## Submitted bounty

```text
Best Agentic Economy Application with Circle Agent Stack — $3,500
```

We are not submitting this as a DeFi lending/swap/yield project. The Arc/Circle
role is **agentic treasury + spend authorization + USDC settlement proof** for a
buyer-agent marketplace.

## Bounty requirements → proof

| Arc / Circle requirement | Our implementation | Proof artifact |
|---|---|---|
| Functional MVP | Next.js control room UI + Next.js API backend | `/`, `/api/mission/run`, `/api/arc/status`, `/api/arc/authorize-payment` |
| Working frontend | Control room with mission runner, provider marketplace, Arc cards, Blocky402 toggle, audit/HCS panel | `src/components/InkExperience.tsx` |
| Working backend | Mission orchestrator, Arc/Circle routes, spend ledger, x402/Hedera routes, HCS routes | `src/app/api/**`, `src/lib/**` |
| Architecture diagram | One-page SVG embedded in README | `docs/architecture.svg`, `docs/architecture.md` |
| Video demonstration + presentation | `DEMO_SCRIPT.md` includes Arc/Circle slide + demo shot list | video link to be added before submit |
| Succinct core function outline | README hero + Tracks + Demo sections | `README.md` |
| Effective use of Circle Developer tools/tech | DCW role wallets, ARC-TESTNET USDC, guarded transfer, spend authorization, nanopayments ledger | this doc + `docs/SETUP.md` |
| Detailed documentation | Setup, architecture, wallets/rails, checklist | `docs/SETUP.md`, `docs/wallets-and-rails.md`, `SUBMISSION_CHECKLIST.md` |
| GitHub/Replit repo | Public GitHub repo required | link to be added before final submit |

## Circle / Arc technology usage

| Circle / Arc tech | How we use it | Demo proof |
|---|---|---|
| Circle Developer Controlled Wallets (DCW) | Three role wallets: `Trader`, `ArcResearch`, `Risk` | `GET /api/arc/status` returns ready wallet roles |
| ARC-TESTNET | All Arc/Circle wallet actions are testnet-only | README + status route show `ARC-TESTNET` |
| USDC | Buyer-agent spend authorization and optional real testnet transfer | historical Circle tx `a0042c1c-ae9a-5120-accc-7116dfc1ec31` COMPLETE |
| Circle transaction API | Optional guarded real ARC-TESTNET transfer | `POST /api/arc/testnet-transfer/run` with double opt-in |
| Agent Stack concept | BuyerAgent / ProviderAgent / RiskAgent / ArcTreasuryAgent cooperate in one mission flow | `POST /api/mission/run` A2A transcript |
| Nanopayments | Per-provider-call metering and settlement ledger | `src/lib/nanopayments.ts`, `NANOPAYMENT_SETTLED` entries |
| Circle wallets + policy guard | Budget/risk policy gates spend before any transfer | `src/lib/mission-orchestrator.ts`, `src/lib/arc-spend-ledger.ts` |

## Core product function

Matoi is an **agent intelligence market**:

```text
BuyerAgent opens a mission
  → discovers provider agents
  → ranks provider quotes and signals
  → authorizes bounded USDC spend through Arc/Circle
  → optionally pays a Hedera x402 provider service
  → receives normalized intelligence
  → RiskAgent reviews
  → TraderAgent emits simulation-only decision
  → audit proof can be published to HCS
```

Arc/Circle is central to the product because it is the buyer-agent treasury:

- holds role wallets for agent roles
- records spend authorization under budget/risk policy
- supports an optional real ARC-TESTNET USDC transfer proof
- accounts for provider payout intents and nanopayments
- makes the agent economy financially inspectable rather than just a chat UI

## Working frontend

Frontend route:

```text
/
```

Judge-visible UI elements:

- `Mission scenario runner`
- `RUN FULL MISSION`
- scenario chips (`Fast ETH Risk`, `DAO Treasury`, `Security Shock`, `Narrative Scout`, `Provider Market`)
- provider marketplace / quote cards
- Arc spend / treasury summary card
- Blocky402 mode toggle
- A2A transcript
- audit / HCS proof area

## Working backend

Important routes:

| Route | Purpose |
|---|---|
| `GET /api/arc/status` | Shows Arc/Circle wallet readiness and ARC-TESTNET mode |
| `POST /api/arc/authorize-payment` | Creates bounded buyer-agent spend authorization |
| `POST /api/arc/settlement/run` | Arc settlement lifecycle proof route |
| `POST /api/arc/testnet-transfer/run` | Optional real ARC-TESTNET transfer with double opt-in |
| `POST /api/mission/run` | Full agent mission: providers → Arc spend → risk → decision → audit |
| `GET /api/agents/directory` | Agent directory / discovery |
| `GET /api/agents/marketplace` | Provider marketplace |
| `GET /api/agents/quote` | Provider pricing / quote logic |
| `POST /api/audit/hcs` | Publish redacted audit proof to Hedera HCS |

## Architecture diagram

The diagram required by the bounty is embedded directly in the root README:

```md
![Architecture](./docs/architecture.svg)
```

Files:

```text
docs/architecture.svg   # rendered 1180×780 GitHub-friendly diagram
docs/architecture.md    # mermaid + component roles + track mapping
```

For the video/presentation, use the same `docs/architecture.svg` as the first
slide. It already highlights:

- Next.js / React / TypeScript frontend
- BuyerAgent / PolicyEngine / RiskGuard
- Mission orchestrator
- Circle DCW / ArcTreasuryAgent
- ARC-TESTNET USDC
- Nanopayments meter
- HCS proof
- Blocky402 / Hedera x402 paid service

## Real proof artifacts

| Proof | Value |
|---|---|
| Circle real transfer | `a0042c1c-ae9a-5120-accc-7116dfc1ec31` COMPLETE |
| Masked Arc tx hash | `f2caec07...4820b9a4` |
| Arc network | `ARC-TESTNET` |
| HCS topic | `0.0.10426202` |
| Tests | 91 passed |
| Smoke | `SMOKE_HTTP_OK` |
| Public demo URL | `https://mix-comp-royalty-gordon.trycloudflare.com` |

## How to verify Arc/Circle locally

```bash
# status / readiness
curl -s http://127.0.0.1:3100/api/arc/status

# spend authorization path
curl -s -X POST http://127.0.0.1:3100/api/arc/authorize-payment \
  -H 'content-type: application/json' \
  -d '{"scenarioId":"dao-treasury-rebalance","maxSpendUsd":0.05}'

# full agent mission consuming Arc/Circle spend logic
curl -s -X POST http://127.0.0.1:3100/api/mission/run \
  -H 'content-type: application/json' \
  -d '{"scenarioId":"dao-treasury-rebalance","x402Mode":"blocky402"}'
```

## Safety and boundaries

- Mainnet disabled.
- Real trading/swaps disabled.
- Real ARC-TESTNET USDC transfer is **off by default**.
- Optional real transfer requires two gates:
  - `ARC_REAL_USDC_TRANSFER=true`
  - request body `confirmRealTransfer=true`
- Smoke tests never spend real funds.
- Secrets stay in `.env.local` and are not exposed in browser, audit or HCS.

## What to say in the video presentation

Short version:

> "For Arc/Circle, Matoi uses Circle Developer Controlled Wallets on ARC-TESTNET as an agent treasury. The BuyerAgent authorizes bounded USDC spend to provider agents under a budget and risk policy. We record provider payout intents and nanopayments in an idempotent ledger, and we have a guarded real ARC-TESTNET USDC transfer proof. The diagram shows the full frontend, backend, wallet, payment and audit flow."

Show on screen:

1. README Arc/Circle section.
2. `docs/architecture.svg` diagram.
3. `GET /api/arc/status` response.
4. `POST /api/mission/run` response with Arc spend authorization.
5. `NANOPAYMENT_SETTLED` / provider payout ledger summary in UI.
