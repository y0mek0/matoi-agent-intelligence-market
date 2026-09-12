#!/usr/bin/env node
/**
 * scripts/check-blocky402-readiness.mjs
 *
 * Verifies that a Blocky402 / x402.org paid request can be attempted
 * against Hedera testnet.
 *
 * Prints:
 *   - account id and HBAR balance from the mirror node
 *   - USDC (token 0.0.429274) balance if any
 *   - env status (whether HEDERA_PAYER_ACCOUNT_ID + HEDERA_PAYER_KEY are set)
 *   - facilitator URL
 *
 * Does NOT submit any transaction. Pure read-only.
 *
 * Loads .env.local automatically via dotenv (already a dependency).
 */

import process from "node:process";
import { config as loadDotenv } from "dotenv";

loadDotenv({ path: ".env.local" });

const MIRROR_NODE = "https://testnet.mirrornode.hedera.com";
const USDC_TOKEN_ID = "0.0.429274";

function tinybarToHbar(tinybar) {
  return Number(tinybar) / 100_000_000;
}

function smallestUnitToUsd(smallest, decimals = 6) {
  return Number(smallest) / 10 ** decimals;
}

async function getMirrorJson(path) {
  const response = await fetch(`${MIRROR_NODE}${path}`);
  if (!response.ok) {
    throw new Error(`mirror node HTTP ${response.status} on ${path}`);
  }
  return response.json();
}

async function resolveAccountIdFromEvmAddress(evmAddress) {
  try {
    const payload = await getMirrorJson(`/api/v1/accounts/${evmAddress}`);
    return payload.account ?? evmAddress;
  } catch {
    return evmAddress;
  }
}

async function main() {
  const accountId = process.env.HEDERA_PAYER_ACCOUNT_ID ?? process.env.HEDERA_OPERATOR_ID ?? "";
  if (!accountId) {
    console.log("account: missing");
    console.log("env:     missing (set HEDERA_PAYER_ACCOUNT_ID or HEDERA_OPERATOR_ID in .env.local)");
    process.exitCode = 2;
    return;
  }
  const hasPayerKey = Boolean(process.env.HEDERA_PAYER_ACCOUNT_ID && process.env.HEDERA_PAYER_KEY);
  // Some envs store the EVM address of an ECDSA Hedera account instead of the Hedera 0.0.x id;
  // try to resolve the EVM alias to the canonical 0.0.x id via the mirror node first.
  const resolvedAccountId = /^0x[0-9a-fA-F]{40}$/.test(accountId)
    ? await resolveAccountIdFromEvmAddress(accountId)
    : accountId;

  console.log(`account: ${resolvedAccountId}`);
  try {
    const account = await getMirrorJson(`/api/v1/accounts/${resolvedAccountId}`);
    const hbar = tinybarToHbar(account.balance?.balance ?? 0);
    console.log(`hbar:    ${hbar.toFixed(7)}`);
    if (Array.isArray(account.balance?.tokens) && account.balance.tokens.length > 0) {
      for (const token of account.balance.tokens) {
        if (token.token_id === USDC_TOKEN_ID) {
          const usd = smallestUnitToUsd(token.balance);
          console.log(`usdc:    ${usd.toFixed(7)}   (${token.balance} smallest units of ${USDC_TOKEN_ID})`);
        } else {
          console.log(`token:   ${token.token_id} balance=${token.balance}`);
        }
      }
    } else {
      console.log(`usdc:    0  (no token balances yet — request testnet USDC for ${USDC_TOKEN_ID})`);
    }
  } catch (error) {
    console.log(`mirror:  ${error instanceof Error ? error.message : String(error)}`);
  }

  console.log(`env:     ${hasPayerKey ? "ok (HEDERA_PAYER_ACCOUNT_ID + HEDERA_PAYER_KEY set)" : "missing (HEDERA_PAYER_ACCOUNT_ID or HEDERA_PAYER_KEY not set)"}`);
  console.log(`facilitator: ${process.env.BLOCKY402_URL ?? "https://x402.org"}`);
}

main().catch((error) => {
  console.error("readiness check failed:", error instanceof Error ? error.message : String(error));
  process.exit(1);
});
