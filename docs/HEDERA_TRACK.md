# Hedera track — x402 / Blocky402 paid service proof

This page maps the Hedera bounty requirements to the exact project artifacts,
routes, setup steps and proof commands in this repository.

## Bounty requirements → proof

| Hedera requirement | Our implementation | Proof artifact |
|---|---|---|
| Host a live x402-gated service on Hedera testnet or mainnet | `POST /api/x402/blocky402/pay` on Hedera testnet | Public tunnel: `https://mix-comp-royalty-gordon.trycloudflare.com/api/x402/blocky402/pay` |
| Settled through the Blocky402 facilitator | `BLOCKY402_URL=http://127.0.0.1:3100/api/x402/blocky402-facilitator`; client posts to `<BLOCKY402_URL>/settle` | Route: `src/app/api/x402/blocky402-facilitator/settle/route.ts` |
| Build a platform or agent that consumes that service | BuyerAgent mission runner calls Blocky402 mode and adds receipt messages to the A2A transcript | `POST /api/mission/run` with `x402Mode: "blocky402"` |
| Complete at least one real paid request end to end | Localhost and public tunnel paid requests return `ok: true` with `receiptId` | Example receipts: `x402-d72b519cbeb82c65`, `x402-44df75b702d9b507` from verified runs |
| Public GitHub repo README covering setup, architecture, payment flow | Root `README.md`, `docs/SETUP.md`, `docs/architecture.svg`, this file | Document graph in root README |
| Demo video ≤ 5 minutes showing the paid request executing | `DEMO_SCRIPT.md` includes the exact shot list; video link to be added before final submission | README video placeholder |

## What is hosted

The live gated service is:

```text
POST /api/x402/blocky402/pay
```

Local URL:

```text
http://127.0.0.1:3100/api/x402/blocky402/pay
```

Public demo URL through `cloudflared`:

```text
https://mix-comp-royalty-gordon.trycloudflare.com/api/x402/blocky402/pay
```

> The `trycloudflare.com` URL is an anonymous tunnel and changes if cloudflared
> restarts. The server is hosted on the demo PC and kept running for judging.

## Network and asset

| Field | Value |
|---|---|
| Network | Hedera testnet |
| x402 network label | `hedera:testnet` |
| USDC token id | `0.0.429274` |
| USDC decimals | 6 |
| Payer account | `0.0.10380366` |
| Payer EVM address | `0x4b7c9e49609650056c64bf111131503f6cca8c05` |
| HCS topic | `0.0.10426202` |
| Token association proof | `0.0.10380366@1789189919.552662668` |

Secrets are not committed. Private keys live only in `.env.local`.

## End-to-end payment flow

```text
1. BuyerAgent selects a provider service (`telegram-pulse`).
2. `POST /api/x402/blocky402/pay` builds Hedera payment requirements:
   - network: `hedera:testnet`
   - token: `0.0.429274`
   - amount: `10000` smallest units = `0.01 USDC`
3. `src/lib/hedera-payment-signer.ts` builds and signs a Hedera
   `TransferTransaction` using `@hashgraph/sdk` and the ECDSA payer key.
4. `src/lib/blocky402.ts` encodes the signed transaction as an x402-style
   `PAYMENT-SIGNATURE` header.
5. `src/lib/blocky402-client.ts` posts to `<BLOCKY402_URL>/settle`.
6. `/api/x402/blocky402-facilitator/settle` acts as the Blocky402-compatible
   facilitator:
   - parses the x402-shaped body
   - auto-opens a matching challenge if the orchestrator supplied a fresh nonce
   - calls `settleX402Payment`
   - returns an HMAC-signed receipt envelope
7. `src/lib/blocky402-orchestrator.ts` parses the receipt and returns:
   - `ok: true`
   - `receiptId: x402-...`
   - `txHash: blocky402:...`
   - 3 A2A messages
8. The mission runner consumes this receipt and appends it to the buyer-agent
   transcript:
   - `BLOCKY402_CHALLENGE_RECEIVED`
   - `BLOCKY402_PAYMENT_SUBMITTED`
   - `BLOCKY402_RECEIPT_VERIFIED`
9. The audit logger appends `blocky402_payment_settled` and the HCS route can
   publish a redacted proof to topic `0.0.10426202`.
```

## How to run a paid request

### Localhost

```bash
curl -s -X POST http://127.0.0.1:3100/api/x402/blocky402/pay \
  -H 'content-type: application/json' \
  -d '{"providerId":"telegram-pulse","payToAccountId":"0.0.10380366","amountInSmallestUnit":"10000"}'
```

### Public tunnel

```bash
curl -s -X POST https://mix-comp-royalty-gordon.trycloudflare.com/api/x402/blocky402/pay \
  -H 'content-type: application/json' \
  -d '{"providerId":"telegram-pulse","payToAccountId":"0.0.10380366","amountInSmallestUnit":"10000"}'
```

Expected shape:

```json
{
  "ok": true,
  "network": "hedera:testnet",
  "receiptId": "x402-...",
  "txHash": "blocky402:...",
  "amountInUsd": 0.01,
  "a2aMessages": [
    { "type": "BLOCKY402_CHALLENGE_RECEIVED", "status": "sent" },
    { "type": "BLOCKY402_PAYMENT_SUBMITTED", "status": "sent" },
    { "type": "BLOCKY402_RECEIPT_VERIFIED", "status": "verified" }
  ]
}
```

## How the platform consumes the service

The x402 paid service is not a standalone demo button. It is wired into the
agent marketplace mission flow:

```text
BuyerAgent → Provider quote → Blocky402 paid request → receipt verified →
ProviderAgent delivers intelligence → RiskAgent reviews → TraderAgent emits
simulation-only decision → HCS proof ready
```

Route:

```bash
curl -s -X POST http://127.0.0.1:3100/api/mission/run \
  -H 'content-type: application/json' \
  -d '{"scenarioId":"dao-treasury-rebalance","x402Mode":"blocky402"}'
```

The response includes `a2aTranscript` plus the `BLOCKY402_*` receipt messages.

## Setup summary

See [SETUP.md](./SETUP.md) for full details. Required `.env.local` values:

```env
HEDERA_PAYER_ACCOUNT_ID=0.0.10380366
HEDERA_PAYER_KEY=<0x-hex ECDSA key, never commit>
BLOCKY402_URL=http://127.0.0.1:3100/api/x402/blocky402-facilitator
HEDERA_OPERATOR_ID=0.0.<operator-id>
HEDERA_OPERATOR_KEY=<operator key, never commit>
HCS_TOPIC_ID=0.0.10426202
```

Start the production server:

```bash
BLOCKY402_URL=http://127.0.0.1:3100/api/x402/blocky402-facilitator \
  npm run start -- --hostname 127.0.0.1 --port 3100
```

Optional public tunnel:

```bash
cloudflared tunnel --url http://127.0.0.1:3100
```

## Verification commands

```bash
npm run lint
npm run build
npx vitest run
npm run qa:smoke
npm run blocky402:readiness
```

Recent verified state:

```text
npm run lint      → exit 0
npm run build     → exit 0
npx vitest run    → 42 files, 91 tests passed
npm run qa:smoke  → RESULT: SMOKE_HTTP_OK http://127.0.0.1:3100
localhost paid request → ok=true, receiptId=x402-d72b519cbeb82c65
public tunnel paid request → ok=true, receiptId=x402-44df75b702d9b507
```

## Demo video shot for this track

The five-minute video must visibly show:

1. The public tunnel URL loading the dashboard.
2. The Blocky402 toggle enabled in the mission runner.
3. A `POST /api/x402/blocky402/pay` request returning `ok: true`.
4. The `BLOCKY402_RECEIPT_VERIFIED` A2A transcript message.
5. HCS topic `0.0.10426202` or `/api/audit/hcs` proof path.
6. README / architecture diagram showing setup, architecture and payment flow.

Full recording script: [../DEMO_SCRIPT.md](../DEMO_SCRIPT.md).

## Important honesty note

`https://x402.org` is documentation, not a public Hedera testnet facilitator
endpoint. This project therefore hosts a Blocky402-compatible facilitator route
inside the app and sets `BLOCKY402_URL` to the app's facilitator base URL. The
client still uses the standard `<BLOCKY402_URL>/settle` pattern and the buyer
agent consumes the paid service end to end.
