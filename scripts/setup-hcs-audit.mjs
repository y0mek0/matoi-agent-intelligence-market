import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import fs from 'node:fs';
import { Client, AccountId, PrivateKey, TopicCreateTransaction } from '@hashgraph/sdk';

function present(value) {
  return Boolean(value && !value.includes('__PASTE_') && !value.includes('__GENERATE_'));
}

function keyVariants(raw) {
  const variants = [];
  const attempts = [
    ['auto', () => PrivateKey.fromString(raw)],
    ['der', () => PrivateKey.fromStringDer(raw)],
    ['ecdsa', () => PrivateKey.fromStringECDSA(raw)],
    ['ed25519', () => PrivateKey.fromStringED25519(raw)],
  ];
  for (const [label, parse] of attempts) {
    try {
      variants.push({ label, key: parse() });
    } catch {
      // ignore parser mismatch, never print key material
    }
  }
  return variants;
}

function signerCandidates() {
  return [
    { label: 'OPERATOR', accountId: process.env.HEDERA_OPERATOR_ID, rawKey: process.env.HEDERA_OPERATOR_KEY },
    { label: 'ECDSA', accountId: process.env.HEDERA_ECDSA_ACCOUNT_ID, rawKey: process.env.HEDERA_ECDSA_KEY },
  ].filter((item) => present(item.accountId) && present(item.rawKey));
}

function updateEnv(key, value) {
  const path = '.env.local';
  const content = fs.existsSync(path) ? fs.readFileSync(path, 'utf-8') : '';
  const line = `${key}=${value}`;
  const next = content.match(new RegExp(`^${key}=`, 'm'))
    ? content.replace(new RegExp(`^${key}=.*$`, 'm'), line)
    : `${content.trimEnd()}\n${line}\n`;
  fs.writeFileSync(path, next);
}

async function tryCreateWith(candidate, variant, network) {
  const client = Client.forName(network).setOperator(AccountId.fromString(candidate.accountId), variant.key);
  try {
    const tx = await new TopicCreateTransaction()
      .setTopicMemo('Agent Intelligence Market audit trail. Redacted hashes only. Testnet MVP.')
      .execute(client);
    const receipt = await tx.getReceipt(client);
    const topicId = receipt.topicId?.toString();
    if (!topicId) throw new Error('Topic creation returned no topicId');
    return { topicId, signer: candidate.label, keyFormat: variant.label };
  } finally {
    client.close();
  }
}

async function main() {
  const network = process.env.HEDERA_NETWORK ?? 'testnet';
  if (network !== 'testnet') throw new Error('HCS audit setup is testnet-only for this MVP.');
  if (present(process.env.HEDERA_HCS_TOPIC_ID)) {
    console.log(`RESULT: HCS_TOPIC_EXISTS ${process.env.HEDERA_HCS_TOPIC_ID}`);
    return;
  }

  const candidates = signerCandidates();
  if (!candidates.length) throw new Error('No Hedera signer configured');
  const failures = [];
  for (const candidate of candidates) {
    for (const variant of keyVariants(candidate.rawKey)) {
      try {
        const result = await tryCreateWith(candidate, variant, network);
        updateEnv('HEDERA_HCS_TOPIC_ID', result.topicId);
        updateEnv('HEDERA_HCS_SIGNER', result.signer);
        updateEnv('HEDERA_HCS_KEY_FORMAT', result.keyFormat);
        console.log(`RESULT: HCS_TOPIC_CREATED ${result.topicId} signer=${result.signer} keyFormat=${result.keyFormat}`);
        return;
      } catch (error) {
        failures.push(`${candidate.label}/${variant.label}:${String(error?.message ?? error).slice(0, 120)}`);
      }
    }
  }
  throw new Error(`All Hedera signer variants failed: ${failures.join(' | ')}`);
}

main().catch((error) => {
  console.error('RESULT: HCS_TOPIC_FAILED');
  console.error(String(error?.message ?? error).slice(0, 1000));
  process.exit(1);
});
