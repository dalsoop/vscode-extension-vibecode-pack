// dotenvx-compatible strategy.
//
// On encrypt: read DOTENV_PUBLIC_KEY from the .env file, ECIES-encrypt the
// value, store as `encrypted:<base64>`. Format matches @dotenvx/dotenvx
// exactly (both libs use eciesjs underneath with the same defaults).
//
// Activation: only ready when both a sibling `.env.keys` exists AND the .env
// file declares DOTENV_PUBLIC_KEY. Otherwise the resolver falls back to
// NoneStrategy, preserving the normal-variant behavior.
//
// v0.1 scope: encrypt-on-write only. The user must bootstrap their keypair
// out-of-band (`npx dotenvx encrypt`). Bootstrap-from-editor lives in a
// future `bootstrap.ts` here.

import * as fs from 'fs/promises';
import * as path from 'path';
import type * as vscode from 'vscode';
import { encrypt as eciesEncrypt } from 'eciesjs';
import {
  STRATEGY_ID,
  ENCRYPTED_VALUE_PREFIX,
  ENV_KEYS_FILENAME,
  DOTENV_PUBLIC_KEY_VAR
} from '../constants';
import type { CryptoStrategy } from '../types';
import { bootstrapDotenvxKeys } from './bootstrap';

export { bootstrapDotenvxKeys } from './bootstrap';
export type { BootstrapResult } from './bootstrap';

export const DotenvxStrategy: CryptoStrategy = {
  id: STRATEGY_ID.DOTENVX,

  async isReady(envUri) {
    const keysPath = path.join(path.dirname(envUri.fsPath), ENV_KEYS_FILENAME);
    if (!(await fileExists(keysPath))) return false;
    return (await readPublicKey(envUri)) !== null;
  },

  async encryptValue(value, envUri) {
    if (value === '') return value;
    if (isEncryptedValue(value)) return value;

    const publicKeyHex = await readPublicKey(envUri);
    if (!publicKeyHex) {
      throw new Error(
        `${DOTENV_PUBLIC_KEY_VAR} not found in ${envUri.fsPath}. ` +
          `Run \`npx dotenvx encrypt\` once in this folder to bootstrap encryption.`
      );
    }
    const ciphertext = eciesEncrypt(
      Buffer.from(publicKeyHex, 'hex'),
      new TextEncoder().encode(value)
    );
    return ENCRYPTED_VALUE_PREFIX + Buffer.from(ciphertext).toString('base64');
  },

  isEncrypted: isEncryptedValue,

  async initialize(envUri) {
    await bootstrapDotenvxKeys(envUri.fsPath);
  }
};

function isEncryptedValue(stored: string): boolean {
  return stored.startsWith(ENCRYPTED_VALUE_PREFIX);
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

// dotenvx writes the public key as a quoted hex string on a single line.
// Match that shape precisely instead of routing through the .env parser —
// keeps this strategy self-contained.
const PUBLIC_KEY_LINE_RE = new RegExp(
  `^\\s*${DOTENV_PUBLIC_KEY_VAR}\\s*=\\s*["']?([0-9a-fA-F]+)["']?\\s*$`,
  'm'
);

async function readPublicKey(envUri: vscode.Uri): Promise<string | null> {
  const text = await fs.readFile(envUri.fsPath, 'utf8').catch(() => '');
  const match = text.match(PUBLIC_KEY_LINE_RE);
  return match ? match[1] : null;
}
