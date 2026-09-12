/**
 * Generate and register Circle Entity Secret for Developer-Controlled Wallets.
 *
 * Prerequisite:
 *   CIRCLE_API_KEY must be set in .env.local
 *
 * What it does:
 *   - generates a random 32-byte hex entity secret
 *   - registers it with Circle using the SDK helper
 *   - saves Circle recovery file under ./recovery/
 *   - writes CIRCLE_ENTITY_SECRET into .env.local
 *
 * It NEVER prints the entity secret.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import dotenv from 'dotenv';
import { registerEntitySecretCiphertext } from '@circle-fin/developer-controlled-wallets';

const root = process.cwd();
const envPath = path.join(root, '.env.local');
const recoveryDir = path.join(root, 'recovery');

dotenv.config({ path: envPath });

function fail(message) {
  console.error('RESULT: CIRCLE_ENTITY_SECRET_FAILED');
  console.error(message);
  process.exit(1);
}

function setEnvValue(content, key, value) {
  const line = `${key}=${value}`;
  const re = new RegExp(`^${key}=.*$`, 'm');
  if (re.test(content)) return content.replace(re, line);
  return content.trimEnd() + `\n${line}\n`;
}

if (!fs.existsSync(envPath)) {
  fail('.env.local not found');
}

const apiKey = process.env.CIRCLE_API_KEY;
if (!apiKey || apiKey.includes('__PASTE_')) {
  fail('CIRCLE_API_KEY is missing. Paste it into .env.local first.');
}

const existingSecret = process.env.CIRCLE_ENTITY_SECRET;
const existingSecretIsPlaceholder =
  !existingSecret ||
  existingSecret.includes('__PASTE_') ||
  existingSecret.includes('__GENERATE_');

if (!existingSecretIsPlaceholder) {
  console.log('CIRCLE_ENTITY_SECRET already exists in .env.local. Refusing to overwrite.');
  console.log('RESULT: CIRCLE_ENTITY_SECRET_ALREADY_EXISTS');
  process.exit(0);
}

const entitySecret = crypto.randomBytes(32).toString('hex');
fs.mkdirSync(recoveryDir, { recursive: true });

try {
  await registerEntitySecretCiphertext({
    apiKey,
    entitySecret,
    recoveryFileDownloadPath: recoveryDir,
  });

  const envText = fs.readFileSync(envPath, 'utf8');
  fs.writeFileSync(envPath, setEnvValue(envText, 'CIRCLE_ENTITY_SECRET', entitySecret));

  console.log('Circle Entity Secret registered.');
  console.log('Recovery file directory:', recoveryDir);
  console.log('CIRCLE_ENTITY_SECRET saved to .env.local (secret not printed).');
  console.log('RESULT: CIRCLE_ENTITY_SECRET_REGISTERED');
} catch (error) {
  console.error('RESULT: CIRCLE_ENTITY_SECRET_FAILED');
  console.error(String(error?.message ?? error).slice(0, 1200));
  process.exit(1);
}
