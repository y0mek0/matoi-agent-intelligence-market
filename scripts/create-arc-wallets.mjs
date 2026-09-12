/**
 * Create/fill Circle developer-controlled wallets on Arc Testnet.
 * Requires CIRCLE_API_KEY and CIRCLE_ENTITY_SECRET in .env.local.
 * Fills wallet roles:
 * - Trader Agent
 * - ArcResearch Agent
 * - Risk Agent
 *
 * It updates .env.local with wallet IDs/addresses.
 * It never prints API key or entity secret.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import dotenv from 'dotenv';
import { initiateDeveloperControlledWalletsClient } from '@circle-fin/developer-controlled-wallets';

const root = process.cwd();
const envPath = path.join(root, '.env.local');
dotenv.config({ path: envPath });

function requireEnv(name) {
  const value = process.env[name];
  if (!value || value.includes('__PASTE_') || value.includes('__GENERATE_')) {
    throw new Error(`${name} is missing in .env.local`);
  }
  return value;
}

function setEnvValue(content, key, value) {
  const safeValue = String(value ?? '');
  const line = `${key}=${safeValue}`;
  const re = new RegExp(`^${key}=.*$`, 'm');
  if (re.test(content)) return content.replace(re, line);
  return content.trimEnd() + `\n${line}\n`;
}

function walletAddress(wallet) {
  return wallet.address || wallet.blockchainAddress || wallet.accountAddress || wallet.walletAddress || '';
}

function roleNeedsWallet(role) {
  return !process.env[`ARC_${role}_WALLET_ID`] || !process.env[`ARC_${role}_WALLET_ADDRESS`];
}

async function main() {
  const apiKey = requireEnv('CIRCLE_API_KEY');
  const entitySecret = requireEnv('CIRCLE_ENTITY_SECRET');
  const blockchain = process.env.ARC_NETWORK || 'ARC-TESTNET';

  const client = initiateDeveloperControlledWalletsClient({ apiKey, entitySecret });

  let walletSetId = process.env.CIRCLE_WALLET_SET_ID;
  let envText = fs.readFileSync(envPath, 'utf8');

  if (!walletSetId) {
    const walletSetResponse = await client.createWalletSet({
      name: 'Agent Intelligence Market - Arc Testnet Agents',
      idempotencyKey: crypto.randomUUID(),
    });
    walletSetId = walletSetResponse.data?.walletSet?.id;
    if (!walletSetId) throw new Error('Wallet set creation failed: no walletSet.id returned');
    envText = setEnvValue(envText, 'CIRCLE_WALLET_SET_ID', walletSetId);
    fs.writeFileSync(envPath, envText);
    console.log('Created wallet set:', walletSetId);
  } else {
    console.log('Using existing wallet set:', walletSetId);
  }

  const roles = ['TRADER', 'RESEARCH', 'RISK'];
  const missingRoles = roles.filter(roleNeedsWallet);

  if (missingRoles.length === 0) {
    console.log('Arc wallets already configured in .env.local. No new wallets created.');
    console.log('RESULT: ARC_WALLETS_ALREADY_CONFIGURED');
    return;
  }

  // Do not pass accountType explicitly: Circle's Arc Testnet wallet API currently creates EOA by default.
  // Create one wallet at a time: current Arc Testnet wallet API may reject multi-count create calls.
  envText = fs.readFileSync(envPath, 'utf8');
  for (const role of missingRoles) {
    const walletsResponse = await client.createWallets({
      walletSetId,
      blockchains: [blockchain],
      count: 1,
      idempotencyKey: crypto.randomUUID(),
    });
    const wallets = walletsResponse.data?.wallets || [];
    if (wallets.length < 1) {
      throw new Error(`Expected 1 wallet for ${role}, got ${wallets.length}`);
    }
    const wallet = wallets[0];
    envText = setEnvValue(envText, `ARC_${role}_WALLET_ID`, wallet.id);
    envText = setEnvValue(envText, `ARC_${role}_WALLET_ADDRESS`, walletAddress(wallet));
    fs.writeFileSync(envPath, envText);
    console.log(`Created ${role} wallet:`, wallet.id, walletAddress(wallet));
  }
  console.log('RESULT: ARC_WALLETS_CREATED');
}

main().catch((error) => {
  console.error('RESULT: ARC_WALLETS_FAILED');
  console.error(String(error?.response?.data?.message || error?.message || error).slice(0, 1200));
  process.exit(1);
});
