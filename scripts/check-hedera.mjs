/**
 * Hedera testnet connectivity check.
 * Reads .env.local, queries account info + balance for both configured accounts.
 * Does NOT spend anything — read-only queries.
 *
 * Usage: node scripts/check-hedera.mjs
 */
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import {
  Client,
  AccountId,
  PrivateKey,
  AccountBalanceQuery,
} from '@hashgraph/sdk';

function loadOperator() {
  const net = process.env.HEDERA_NETWORK ?? 'testnet';
  const accountId = process.env.HEDERA_OPERATOR_ID;
  const key = process.env.HEDERA_OPERATOR_KEY;
  if (!accountId || !key || key.includes('__PASTE_')) {
    return { ok: false, error: 'HEDERA_OPERATOR_KEY not filled yet in .env.local' };
  }
  return { ok: true, net, accountId, key };
}

async function queryAccount(client, accountId, keyLabel) {
  const id = AccountId.fromString(accountId);
  const balance = await new AccountBalanceQuery().setAccountId(id).execute(client);
  return {
    account: accountId,
    keyLabel,
    hbarBalance: balance.hbars?.toString() ?? null,
  };
}

async function main() {
  const op = loadOperator();
  if (!op.ok) {
    console.log('SKIP:', op.error);
    return;
  }

  const client = Client.forName(op.net);
  client.setOperator(
    AccountId.fromString(op.accountId),
    PrivateKey.fromString(op.key)
  );

  console.log('Network:', op.net);
  const results = [];

  // 1) Primary operator account
  results.push(await queryAccount(client, op.accountId, 'OPERATOR'));

  // 2) Secondary ECDSA account if configured
  const ecdsaId = process.env.HEDERA_ECDSA_ACCOUNT_ID;
  const ecdsaKey = process.env.HEDERA_ECDSA_KEY;
  if (ecdsaId && ecdsaKey && !ecdsaKey.includes('__PASTE_')) {
    results.push(await queryAccount(client, ecdsaId, 'ECDSA'));
  }

  for (const r of results) {
    console.log('---');
    console.log('Account:', r.account, `(${r.keyLabel})`);
    console.log('HBAR balance:', r.hbarBalance);
  }
  client.close();
  console.log('---');
  console.log('RESULT: HEDERA_CONNECTION_OK');
}

main().catch((e) => {
  console.error('RESULT: HEDERA_CONNECTION_FAILED');
  console.error(String(e?.message ?? e).slice(0, 800));
  process.exit(1);
});
