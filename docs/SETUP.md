# SETUP — per-integration wiring guide

This page walks you through wiring every integration Matoi (Agent Intelligence
Market) talks to. Each section lists:

1. What the integration does
2. Which `.env.local` keys it needs
3. How to obtain the keys
4. How to verify it works
5. What to leave empty if you don't have it (graceful degradation)

> The repo runs end-to-end with **no keys at all** — every integration has a
> deterministic fallback. Keys unlock live mode.

---

## TL;DR — minimum viable setup

```env
# .env.local

# OpenRouter — used by the live provider evaluator
OPENROUTER_API_KEY=sk-or-...
OPENROUTER_MODEL=openai/gpt-4o-mini
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
```

With just these four keys, `npx vitest run` passes, `npm run qa:smoke` passes,
and the UI runs with deterministic fallback signals. To unlock the rest, follow
the sections below in order.

---

## 1. OpenRouter — provider evaluator

What it does:

- Each provider agent (Telegram, CoinGecko, DefiLlama, GitHub, RSS) has a
  schema-specific OpenRouter prompt that turns raw signal into a normalized
  evaluation (`gptScore`, `riskFlags`, `impact`, `summary`).
- Without a key, the orchestrator uses **deterministic scoring** based on
  signal metadata (`urgency`, `localScore`, etc.).

Setup:

1. Sign up at <https://openrouter.ai/>
2. Create an API key at <https://openrouter.ai/keys>
3. Top up credits (the live evaluator uses ~$0.01 per mission)
4. Add to `.env.local`:

```env
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_MODEL=openai/gpt-4o-mini
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
```

Verify:

```bash
curl -s http://127.0.0.1:3100/api/system/status | jq .openrouter
# expected: { "apiKey": true, "model": "openai/gpt-4o-mini", "enabled": true }
```

Fallback: with no key, `provider-openrouter-live.ts` returns
`{ ok: false, usedFallback: true, evaluation: { ... deterministic } }` and the
mission completes with deterministic scoring.

---

## 2. Arc / Circle — DCW wallets on ARC-TESTNET

What it does:

- **3 Developer Controlled Wallets** on ARC-TESTNET (`Trader`, `ArcResearch`,
  `Risk`) act as role-scoped buyer treasuries.
- `POST /api/arc/authorize-payment` returns a spend authorization under the
  buyer's budget + risk policy; entries are written to
  `.data/arc-spend-ledger.json` (idempotent).
- The optional `POST /api/arc/testnet-transfer/run` endpoint submits a real
  ARC-TESTNET USDC transfer when explicitly opted in.

Setup:

1. Sign up at <https://developers.circle.com/>
2. Create an **API key** in the Circle sandbox console (start in
   `sandbox`, then graduate to ARC-TESTNET)
3. Generate an **Entity Secret** — this is the master seed for the DCW wallet
   cluster. Store it in `.env.local`. **Never commit.**
4. Create the **wallet set** and three wallets (`Trader`, `ArcResearch`,
   `Risk`). Save the **wallet IDs**.
5. Add to `.env.local`:

```env
ARC_CIRCLE_API_KEY=...           # sandbox/testnet API key
ARC_CIRCLE_ENTITY_SECRET=...     # 32-byte hex string — NEVER log or commit
ARC_TRADER_WALLET_ID=...
ARC_ARC_RESEARCH_WALLET_ID=...
ARC_RISK_WALLET_ID=...
ARC_USE_TESTNET=true            # always true for hackathon submission
ARC_USDC_TOKEN_ID=...           # USDC token id on ARC-TESTNET
ARC_REAL_USDC_TRANSFER=false     # set to "true" ONLY for the optional live demo
```

Verify:

```bash
curl -s http://127.0.0.1:3100/api/arc/status | jq
# expected: { "network": "ARC-TESTNET", "traderWallet": true, ... }
```

Optional real transfer demo:

```bash
# 1. Confirm the address exists and is funded on ARC-TESTNET
curl -s https://api.circle.com/v1/w3s/wallets/$ARC_TRADER_WALLET_ID/balances ...

# 2. Run the demo transfer
ARC_REAL_USDC_TRANSFER=true confirmRealTransfer=true \
  curl -s -X POST http://127.0.0.1:3100/api/arc/testnet-transfer/run
```

Safety:

- `ARC_REAL_USDC_TRANSFER` is **false** by default. Smoke + tests never set it.
- Even when `true`, the route still requires `confirmRealTransfer=true` in the
  body. Double opt-in.
- The real ARC-TESTNET transfer we already proved (CIRCLE tx
  `a0042c1c-ae9a-5120-accc-7116dfc1ec31`, masked txHash `f2caec07...4820b9a4`)
  is documented as historical evidence in `SUBMISSION_CHECKLIST.md`.

---

## 3. Hedera — operator + ECDSA payer accounts

What it does:

- The mission orchestrator uses **`HEDERA_OPERATOR_ID` + `HEDERA_OPERATOR_KEY`**
  to publish public audit proofs to **HCS topic `0.0.10426202`** on testnet.
- The Blocky402 paid-request path uses **`HEDERA_PAYER_ACCOUNT_ID` +
  `HEDERA_PAYER_KEY`** to sign HTS USDC `TransferTransaction`s locally with
  `@hashgraph/sdk`. The signed body is sent to the facilitator for settlement.

Setup:

1. Sign up at <https://portal.hedera.com/>
2. Create **two testnet accounts**:
   - **Operator** (ED25519) — publishes HCS audit proofs.
     We use `0.0.10366223`.
   - **Payer** (ECDSA — gets a free EVM address automatically). We use
     `0.0.10380366` with EVM `0x4b7c9e49609650056c64bf111131503f6cca8c05`.
3. Export the **DER-encoded ED25519** key for the operator and the
   **0x-hex ECDSA** key for the payer.
4. Add to `.env.local`:

```env
HEDERA_OPERATOR_ID=0.0.<operator-id>
HEDERA_OPERATOR_KEY=3030020100300706052b8104000a04220420<hex>

HEDERA_PAYER_ACCOUNT_ID=0.0.<payer-id>
HEDERA_PAYER_KEY=0x<hex>            # 0x-prefixed 32-byte ECDSA private key
HEDERA_ECDSA_EVM_ADDRESS=0x<20-byte-evm>  # optional: helps auto-resolve payer id

HCS_TOPIC_ID=0.0.10426202
HEDERA_USE_TESTNET=true
```

Verify:

```bash
curl -s http://127.0.0.1:3100/api/system/status | jq .hedera
# expected: { "network": "testnet", "operatorId": true, "ecdsaAccount": true, ... }

npm run blocky402:readiness
# expected: account: 0.0.<payer>, hbar: ~1000, usdc: 0+ if you have USDC
```

Fallback: with no operator key, `/api/audit/hcs` returns `{ ok: false,
error: "..." }` and the mission continues — audit events are kept locally
only.

---

## 4. Blocky402 / x402 on Hedera testnet — real paid requests

What it does:

- `POST /api/x402/blocky402/pay` builds a `TransferTransaction` on Hedera
  testnet USDC (`0.0.429274`), signs it with the ECDSA payer key, encodes a
  `PAYMENT-SIGNATURE` header, and submits to the facilitator at
  `<BLOCKY402_URL>/settle`.
- The facilitator (our self-hosted `/api/x402/blocky402-facilitator/settle`)
  auto-opens a challenge with the orchestrator-supplied nonce, then settles
  against the on-chain transfer and returns an HMAC-signed receipt.
- The orchestrator emits `BLOCKY402_CHALLENGE_RECEIVED → PAYMENT_SUBMITTED →
  RECEIPT_VERIFIED` in the A2A transcript.

Setup:

1. Already done if you completed section 3.
2. **Associate USDC token with the payer account** — required before the
   payer can receive or send `0.0.429274` (some faucets won't auto-associate):

```bash
node scripts/associate-usdc.mjs
# expected: status: SUCCESS, txHash: 0.0.10380366@<timestamp>
```

3. **Top up testnet USDC** on the payer account:
   - Public Circle faucet: <https://faucet.circle.com> (Hedera testnet → 0.0.10380366).
     Note: as of writing this faucet often silently drops requests without an
     `explorerLink`. If it doesn't land within ~30 minutes, ask in the
     `#testnet` channel on <https://hedera.com/discord> (moderators manually
     send `0.0.429274`).
4. Confirm readiness:

```bash
npm run blocky402:readiness
# expected: account: 0.0.10380366, hbar: ~999, usdc: ~0.01+
```

5. Trigger a real paid request:

```bash
# localhost
curl -s -X POST http://127.0.0.1:3100/api/x402/blocky402/pay \
  -H 'content-type: application/json' \
  -d '{"providerId":"telegram-pulse","payToAccountId":"0.0.10380366","amountInSmallestUnit":"10000"}'

# public tunnel
curl -s -X POST https://mix-comp-royalty-gordon.trycloudflare.com/api/x402/blocky402/pay \
  -H 'content-type: application/json' \
  -d '{"providerId":"telegram-pulse","payToAccountId":"0.0.10380366","amountInSmallestUnit":"10000"}'
```

Successful response shape:

```json
{
  "ok": true,
  "network": "hedera:testnet",
  "txHash": "blocky402:eyJ4...:/api/providers/telegram-pulse",
  "receiptId": "x402-...",
  "amountInUsd": 0.01,
  "a2aMessages": [
    { "type": "BLOCKY402_CHALLENGE_RECEIVED", "status": "sent" },
    { "type": "BLOCKY402_PAYMENT_SUBMITTED", "status": "sent" },
    { "type": "BLOCKY402_RECEIPT_VERIFIED", "status": "verified" }
  ]
}
```

Fallback: with no `HEDERA_PAYER_*` env, the route returns
`{ ok: false, setupRequired: true, error: "..." }`. The UI toggle shows the
"requires HEDERA_PAYER_ACCOUNT_ID + HEDERA_PAYER_KEY" hint. The HMAC x402
fallback (`/api/x402/facilitator` action=challenge/settle/verify) keeps working
without any keys.

---

## 5. Telegram — bot + news pipeline

What it does:

- A Telegram bot (configured via BotFather) handles the live webhook demo:
  send a market-intelligence message into a private group, see the
  orchestrator ingest it through `/api/telegram/webhook`.
- A separate `tg-bot-41-18` Telethon project builds the public news index
  that Matoi reads through `/api/intel/news`.

Setup:

1. **Bot webhook demo:**
   1. Create a bot with [@BotFather](https://t.me/BotFather).
   2. Get the bot token.
   3. Add to `.env.local`:

      ```env
      TELEGRAM_BOT_TOKEN=<bot-token>
      TELEGRAM_WEBHOOK_SECRET=<any-random-string>
      ```

   4. With `cloudflared` running, register the webhook:

      ```bash
      cd C:\Users\azi\Documents\prro_grams\tg-bot-41-18
      python scripts\setup-telegram-webhook.py
      ```

   5. Send a message into the bot's private group; refresh the UI to see the
      orchestrator ingest it.

2. **Public news pipeline:**
   - Lives in the sibling repo `C:\Users\azi\Documents\prro_grams\tg-bot-41-18`.
   - Run: `python scripts\run_news_pipeline.py --fetch-limit 25 --analyze-limit 4`.
   - Output is cached in `tg-bot-41-18/.data/news-intel.json` and read through
     `GET /api/intel/news`.

Verify:

```bash
curl -s http://127.0.0.1:3100/api/system/status | jq .telegram
# expected: { "botToken": true, "mode": "live-ready" | "demo-mode", ... }
```

Fallback: with no bot token, the UI shows "TELEGRAM: DEMO MODE" and uses
fixture signals.

---

## 6. Public tunnel (so judges can hit the Blocky402 endpoint from anywhere)

`tunnel` is **not** a tracked config — it lives outside the repo and is started
manually:

```bash
cloudflared tunnel --url http://127.0.0.1:3100
```

Cloudflare prints a one-time URL like
`https://mix-comp-royalty-gordon.trycloudflare.com`. Use that everywhere
instead of `http://127.0.0.1:3100`. The URL **changes every restart** — for a
permanent URL you'd need a named tunnel with a Cloudflare account, which is
out of scope for this submission.

---

## 7. HCS public proofs

What it does:

- `POST /api/audit/hcs` accepts a redacted event payload and publishes its
  hash + allowlisted fields to topic `0.0.10426202` on Hedera testnet.
- Anyone can view the topic at
  <https://hashscan.io/testnet/topic/0.0.10426202>.

Setup:

1. The topic id `0.0.10426202` already exists (created during earlier demo).
   If you need a fresh topic, set `HCS_TOPIC_ID=0.0.<new-id>` after creating
   it via `TopicCreateTransaction`.
2. The `HEDERA_OPERATOR_*` env vars must be set (section 3).

Verify:

```bash
# Server-side publish
curl -s -X POST http://127.0.0.1:3100/api/audit/hcs \
  -H 'content-type: application/json' \
  -d '{"type":"decision_produced","summary":"Smoke test","payload":{"decision":"HOLD"}}'

# Client-side view
open https://hashscan.io/testnet/topic/0.0.10426202
```

---

## 8. Verification matrix

After wiring any subset of the above, run:

```bash
npm run lint && npm run build && npx vitest run && npm run qa:smoke
```

Expected output:

```text
npm run lint      → exit 0
npm run build     → Compiled successfully
npx vitest run    → 91 passed (42 files)
npm run qa:smoke  → RESULT: SMOKE_HTTP_OK http://127.0.0.1:3100
```

The smoke script does not exercise real funds. It does exercise every route
shape that the demo video will hit.

---

## 9. Secrets — what to commit, what NOT to commit

| | Commit? | Where |
|---|---|---|
| `.env.example` | ✅ yes | repo |
| `.env.local` | ❌ **never** | `.gitignore` |
| `ARC_CIRCLE_ENTITY_SECRET` | ❌ never | `.env.local` |
| `OPENROUTER_API_KEY` | ❌ never | `.env.local` |
| `HEDERA_OPERATOR_KEY` | ❌ never | `.env.local` |
| `HEDERA_PAYER_KEY` | ❌ never | `.env.local` |
| `TELEGRAM_BOT_TOKEN` | ❌ never | `.env.local` |
| `.data/arc-spend-ledger.json` | ❌ never | `.gitignore` |
| `.data/news-intel.json` | ❌ never | `.gitignore` |
| `*.session`, `tdata/` | ❌ never | `.gitignore` |

Pre-rotation reminder: if any of the above were ever pasted into chat or
commit history, **rotate them** before submitting.

---

## 10. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `npm run qa:smoke` says `blocky402 status` failed | prod server not restarted with `BLOCKY402_URL` set | restart `npm run start` with `BLOCKY402_URL=http://127.0.0.1:3100/api/x402/blocky402-facilitator` |
| `BLOCKY402_RECEIPT_VERIFIED` not in transcript | `x402Mode=blocky402` not toggled in UI, or env keys missing | toggle "Blocky402 mode" in mission panel; check `npm run blocky402:readiness` |
| `Bridgey: INVALID_SIGNATURE` from Hedera | key/account mismatch | ensure `HEDERA_PAYER_KEY` is for `HEDERA_PAYER_ACCOUNT_ID` (ECDSA pubkey matches mirror node) |
| USDC transfer rejected with `TOKEN_NOT_ASSOCIATED` | `TokenAssociateTransaction` not yet sent | run `node scripts/associate-usdc.mjs` |
| Telegram webhook returns 401 | webhook secret mismatch | regenerate `TELEGRAM_WEBHOOK_SECRET`, re-run `setup-telegram-webhook.py` |
| Cloudflared tunnel URL keeps changing | anonymous tunnels are ephemeral | for a stable URL, run a named tunnel: <https://developers.cloudflare.com/cloudflare-one/connections/connect-apps> |
