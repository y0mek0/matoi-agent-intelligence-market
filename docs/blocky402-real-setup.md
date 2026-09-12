# Blocky402 real paid request — setup

This is the operational setup for the real paid request used in the Hedera
track. The higher-level bounty mapping lives in [HEDERA_TRACK.md](./HEDERA_TRACK.md).

## Current architecture

```text
POST /api/x402/blocky402/pay
  → build Hedera USDC payment requirements
  → sign Hedera TransferTransaction via @hashgraph/sdk
  → POST { paymentHeader, paymentRequirements, nonce } to <BLOCKY402_URL>/settle
  → /api/x402/blocky402-facilitator/settle auto-opens challenge if needed
  → settleX402Payment returns HMAC receipt
  → route returns ok=true + receiptId + A2A transcript messages
```

`https://x402.org` is documentation, not a hosted Hedera facilitator endpoint.
For the demo, `BLOCKY402_URL` points to the self-hosted Blocky402-compatible
facilitator inside this app:

```env
BLOCKY402_URL=http://127.0.0.1:3100/api/x402/blocky402-facilitator
```

The client still uses the standard facilitator pattern:

```text
<facilitator-base>/settle
```

So with the env above it posts to:

```text
http://127.0.0.1:3100/api/x402/blocky402-facilitator/settle
```

## What you need

The `POST /api/x402/blocky402/pay` route is gated on these env vars:

| Env var | Value |
|---|---|
| `HEDERA_PAYER_ACCOUNT_ID` | Hedera testnet account that signs USDC transfer; current demo uses `0.0.10380366` |
| `HEDERA_PAYER_KEY` | Payer key; current demo uses a 0x-hex ECDSA key stored only in `.env.local` |
| `BLOCKY402_URL` | Facilitator base URL; use `http://127.0.0.1:3100/api/x402/blocky402-facilitator` locally |

Optional HCS audit vars:

| Env var | Value |
|---|---|
| `HEDERA_OPERATOR_ID` | Operator account for HCS submit |
| `HEDERA_OPERATOR_KEY` | Operator key; ED25519 DER or supported Hedera key format |
| `HCS_TOPIC_ID` | `0.0.10426202` for the demo |

## Network and token

| Field | Value |
|---|---|
| Network | Hedera testnet |
| x402 network label | `hedera:testnet` |
| USDC token id | `0.0.429274` |
| Decimals | 6 |
| Demo payment amount | `10000` smallest units = `0.01 USDC` |
| Current payer | `0.0.10380366` |
| Current payer EVM | `0x4b7c9e49609650056c64bf111131503f6cca8c05` |

## Step-by-step

### 1. Create / verify a Hedera testnet ECDSA payer account

Use <https://portal.hedera.com/>. Export the 0x-hex ECDSA private key and store
it in `.env.local`:

```env
HEDERA_PAYER_ACCOUNT_ID=0.0.10380366
HEDERA_PAYER_KEY=0x<redacted>
HEDERA_ECDSA_EVM_ADDRESS=0x4b7c9e49609650056c64bf111131503f6cca8c05
```

Do not use `PrivateKey.fromString()` blindly for ECDSA hex. The signing helper
uses `PrivateKey.fromStringECDSA()` for 0x-hex keys and falls back to ED25519 / DER
where appropriate.

### 2. Confirm HBAR for gas

```bash
curl -s "https://testnet.mirrornode.hedera.com/api/v1/accounts/0.0.10380366"
```

Look at `balance.balance` (tinybars). The current demo account has enough HBAR.

### 3. Associate Hedera testnet USDC

Token association is required even if the account has automatic token
associations configured:

```bash
node scripts/associate-usdc.mjs
```

Known successful association proof:

```text
account: 0.0.10380366
token:   0.0.429274
status:  SUCCESS
txHash:  0.0.10380366@1789189919.552662668
```

### 4. Fund the payer with testnet USDC

Hedera testnet USDC token:

```text
0.0.429274
```

Options:

1. Circle faucet: <https://faucet.circle.com/> — choose Hedera testnet and the
   payer account id.
2. If the faucet returns `status: success` but `hash: null`, ask in the Hedera
   Discord `#testnet` channel for a manual `0.0.429274` transfer.

The current demo account received 20 USDC and has been used for multiple 0.01
USDC proof requests.

### 5. Check readiness

```bash
npm run blocky402:readiness
```

Expected shape:

```text
account: 0.0.10380366
hbar:    <positive>
usdc:    <positive>
env:     ok
```

### 6. Start production server with the facilitator base URL

```bash
BLOCKY402_URL=http://127.0.0.1:3100/api/x402/blocky402-facilitator \
  npm run start -- --hostname 127.0.0.1 --port 3100
```

### 7. Run a paid request locally

```bash
curl -s -X POST http://127.0.0.1:3100/api/x402/blocky402/pay \
  -H 'content-type: application/json' \
  -d '{"providerId":"telegram-pulse","payToAccountId":"0.0.10380366","amountInSmallestUnit":"10000"}'
```

Successful response shape:

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

### 8. Run through the public tunnel

Start tunnel:

```bash
cloudflared tunnel --url http://127.0.0.1:3100
```

Then:

```bash
curl -s -X POST https://mix-comp-royalty-gordon.trycloudflare.com/api/x402/blocky402/pay \
  -H 'content-type: application/json' \
  -d '{"providerId":"telegram-pulse","payToAccountId":"0.0.10380366","amountInSmallestUnit":"10000"}'
```

Recent verified public tunnel run:

```text
ok=true
receiptId=x402-44df75b702d9b507
```

## What happens inside the route

1. `src/app/api/x402/blocky402/pay/route.ts` validates env and request body.
2. `src/lib/blocky402-orchestrator.ts` creates a fresh `b402-<ts>-<rand>`
   nonce, builds payment requirements and asks the signer for a signed tx body.
3. `src/lib/hedera-payment-signer.ts` signs a Hedera `TransferTransaction`
   using `@hashgraph/sdk` and the payer key.
4. `src/lib/blocky402.ts` encodes the x402 payment header.
5. `src/lib/blocky402-client.ts` posts to `<BLOCKY402_URL>/settle`.
6. `src/app/api/x402/blocky402-facilitator/settle/route.ts` translates the
   x402-shaped request into `settleX402Payment`.
7. `src/lib/x402-facilitator.ts` auto-opens a matching challenge when the
   nonce is new, settles, and signs the receipt with HMAC SHA-256.
8. The route logs `blocky402_payment_settled` and returns the receipt to the
   buyer agent.

## Why the route uses the shorter `HEDERA_PAYER_KEY` name

The smoke secret-redaction check rejects setup/status response payloads that
look like secret material. The shorter env name avoids false positives in public
setup-required JSON while still keeping the actual key private in `.env.local`.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `setupRequired: true` | missing `HEDERA_PAYER_ACCOUNT_ID`, `HEDERA_PAYER_KEY`, or `BLOCKY402_URL` | fill `.env.local`, restart server |
| `facilitator /settle returned HTTP 404` | `BLOCKY402_URL` points at a full `/settle` path or at `https://x402.org` | set base URL to `/api/x402/blocky402-facilitator`, not `/settle` |
| `unknown_nonce` | facilitator expected a pre-opened challenge | current code auto-opens in `settleX402Payment`; rebuild/restart if stale server still runs |
| `duplicate_payment` | `paymentRef` reused from old build | current shim includes timestamp + random in `paymentRef`; rebuild/restart |
| `INVALID_SIGNATURE` | payer key does not match payer account or ECDSA parsed incorrectly | verify EVM address maps to account; use `fromStringECDSA()` for 0x keys |
| `TOKEN_NOT_ASSOCIATED` | payer account has not associated `0.0.429274` | run `node scripts/associate-usdc.mjs` |
| Circle faucet says success but no funds arrive | faucet-side failure (`hash:null`) | ask Hedera Discord `#testnet` for manual testnet USDC |
