#!/usr/bin/env node
/**
 * scripts/associate-usdc.mjs
 *
 * Sends a TokenAssociateTransaction to associate Hedera testnet account
 * 0.0.10366223 with USDC token 0.0.429274.
 *
 * Required because receiving USDC fails unless the receiver account has
 * explicitly associated the token first (maxAutomaticTokenAssociations = -1
 * is not enough for some faucets).
 *
 * Reads operator key from .env.local (HEDERA_OPERATOR_KEY).
 *
 * Usage:
 *   node scripts/associate-usdc.mjs
 */

import process from "node:process";
import { config as loadDotenv } from "dotenv";
import { Client, AccountId, PrivateKey, TokenAssociateTransaction } from "@hashgraph/sdk";

loadDotenv({ path: ".env.local" });

const USDC_TOKEN_ID = "0.0.429274";

const operatorId = process.env.HEDERA_PAYER_ACCOUNT_ID ?? process.env.HEDERA_OPERATOR_ID;
const operatorKey = process.env.HEDERA_PAYER_KEY ?? process.env.HEDERA_OPERATOR_KEY;

if (!operatorId || !operatorKey) {
  console.error("HEDERA_PAYER_ACCOUNT_ID/HEDERA_PAYER_KEY or HEDERA_OPERATOR_ID/HEDERA_OPERATOR_KEY must be set in .env.local");
  process.exit(1);
}

async function main() {
  const client = Client.forTestnet();
  const accountId = AccountId.fromString(operatorId);
  // Both ED25519 DER (303002...) and ECDSA hex (0x...) are supported; let the SDK pick.
  const privateKey = /^[0-9]+$/.test(operatorKey)
    ? PrivateKey.fromStringDer(operatorKey)
    : PrivateKey.fromStringECDSA(operatorKey);
  client.setOperator(accountId, privateKey);

  console.log(`Associating ${USDC_TOKEN_ID} with ${operatorId}…`);

  const tx = await new TokenAssociateTransaction()
    .setAccountId(accountId)
    .setTokenIds([USDC_TOKEN_ID])
    .freezeWith(client)
    .sign(privateKey);

  const response = await tx.execute(client);
  const receipt = await response.getReceipt(client);

  console.log(`status: ${receipt.status.toString()}`);
  console.log(`txHash: ${response.transactionId.toString()}`);
  console.log(`explorer: https://hashscan.io/testnet/transaction/${response.transactionId.toString()}`);

  if (receipt.status.toString() !== "SUCCESS") {
    console.error("association transaction failed");
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("associate failed:", error instanceof Error ? error.message : String(error));
  process.exit(1);
});
