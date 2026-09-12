# Submission Checklist (Arc/Circle × Hedera)

Use this before clicking Submit on the hackathon form.

## Pre-submit gates (must pass)

- [ ] `npm run qa:full` exit 0 (lint + tests + build + smoke)
- [ ] `npm run deploy:check` exit 0 with `mvpReady: true`
- [ ] `POST /api/mission/run` returns a scenario summary with `execution: "disabled"`
- [ ] `POST /api/arc/authorize-payment` returns `ARC-TESTNET` and `realUsdcTransfer: false`
- [ ] `POST /api/x402/facilitator` issues challenge, settles HMAC-signed receipt and verifies signature
- [ ] `POST /api/x402/anchor` returns real Hedera transaction id for an x402 receipt
- [ ] `POST /api/audit/hcs` returns real Hedera transaction id on testnet
- [ ] `GET /api/agents/directory` returns `nova-agent-directory-v1`
- [ ] `GET /api/arc/status` returns 3 wallets on ARC-TESTNET
- [ ] UI shows `Mission scenario runner` and `RUN FULL MISSION`
- [ ] UI shows `LIVE TELEGRAM` after a real bot message, or clearly marks fallback mode
- [ ] External news panel shows live cached analyses when the pipeline has run
- [ ] Cloudflared tunnel URL serves the dashboard (200 OK)
- [ ] `git log` is clean, no secrets in diff (scan with `tests/secret-scan` if available)

## Submission form fields

### Title

```text
Agent Intelligence Market — autonomous economic agents on Arc/Circle and Hedera
```

### Short description (one paragraph)

```text
Agent Intelligence Market is a control room for autonomous economic agents. A buyer agent arrives with a mission, budget and risk profile, discovers provider agents, buys a bounded intelligence bundle through Arc/Circle testnet spend authorization, analyzes each provider signal with provider-specific OpenRouter-style evaluators, produces simulation-only trading/risk intents, and anchors public audit proofs on Hedera Consensus Service. Arc/Circle acts as the programmable buyer treasury and provider payout authorization layer; Hedera provides x402-style access control, HCS proofs and agent discovery. Mainnet and real trades are disabled.
```

### Tracks

```text
Arc/Circle track: DCW role wallets, buyer budgets, provider spend authorization and Arc spend ledger on ARC-TESTNET.
Hedera track: x402-style paid-provider boundary, HCS audit proofs and agent directory/discovery.
```

### Architecture (one paragraph)

```text
Buyer scenario → provider discovery/quotes → provider-specific scoring and OpenRouter-style evaluation → PolicyEngine → Arc/Circle spend authorization and ledger → Hedera x402 demo provider boundary → trading/risk desk vote → redacted audit log → HCS public proof.
```

### Safety narrative

```text
- mainnet disabled
- real swaps disabled (tradeExecution: "disabled")
- real USDC transfer disabled by default (`realUsdcTransfer: false`)
- secrets never reach browser, never logged, never written to audit
- audit log redacts phone, email, links, secrets, long numbers
- HCS messages contain only public proof fields
- LLM/provider output is schema-normalized and impact-bounded
- raw provider text is not stored in mission analysis (`rawTextStored: false`)
```

### Demo

```text
Cloudflared public URL: https://xxxx.trycloudflare.com
Demo video: see DEMO_SCRIPT.md
HCS topic: 0.0.10426202 (testnet)
Arc/Circle wallets: 3 ready on ARC-TESTNET
Scenario runner: 5 buyer tasks via /api/mission/run
```

## Final repo clean-up

- [ ] no `.env.local` in tree
- [ ] no `sessions/`, `tdata/`, `*.session` files in tree
- [ ] no log files (log.txt, *.log) in tree
- [ ] no `.data/` files in tree
- [ ] `.env.example` is the only env file committed
- [ ] `package.json` scripts are clean
- [ ] `README.md` is short and points to `docs/`

## After submission

- [ ] Rotate `CIRCLE_API_KEY` (was exposed in chat earlier in this project)
- [ ] Stop cloudflared tunnel
- [ ] Optional: kill the dev/start server
