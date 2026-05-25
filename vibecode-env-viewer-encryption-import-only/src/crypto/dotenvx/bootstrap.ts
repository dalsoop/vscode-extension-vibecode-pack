// One-shot bootstrap for dotenvx encryption in a workspace folder. Generates a
// secp256k1 keypair, writes the private half to `.env.keys`, embeds the public
// half in `.env` as DOTENV_PUBLIC_KEY, and adds `.env.keys` to `.gitignore`.
//
// Idempotent on its individual side effects (skipping `.gitignore` updates if
// the entry already exists, and the public-key line if it's already present)
// but refuses to overwrite an existing `.env.keys` — regenerating keys
// silently would orphan every secret that was already encrypted with the old
// public key.

import * as fs from 'fs/promises';
import * as path from 'path';
import { PrivateKey } from 'eciesjs';
import { DOTENV_PUBLIC_KEY_VAR, ENV_KEYS_FILENAME } from '../constants';

export interface BootstrapResult {
  envKeysPath: string;
  envFilePath: string;
  publicKeyHex: string;
  privateKeyVarName: string;
  publicKeyAdded: boolean;
  gitignoreUpdated: boolean;
}

export async function bootstrapDotenvxKeys(envFsPath: string): Promise<BootstrapResult> {
  const dir = path.dirname(envFsPath);
  const keysPath = path.join(dir, ENV_KEYS_FILENAME);

  if (await fileExists(keysPath)) {
    throw new Error(
      `${ENV_KEYS_FILENAME} already exists at ${keysPath}. Refusing to overwrite — ` +
        `remove it manually if you intentionally want to regenerate (this orphans any ` +
        `value already encrypted with the existing key).`
    );
  }

  const sk = new PrivateKey();
  const publicKeyHex = Buffer.from(sk.publicKey.toBytes()).toString('hex');
  const privateKeyHex = Buffer.from(sk.secret).toString('hex');
  const privateKeyVarName = derivePrivateKeyVarName(envFsPath);

  const keysFileBody =
    [
      '#----------------------dotenvx----------------------',
      '#                                                  /',
      '# DO NOT commit. Holds the private key used to     /',
      '# decrypt values written by the encryption editor. /',
      '#                                                  /',
      '#---------------------------------------------------',
      `${privateKeyVarName}="${privateKeyHex}"`,
      ''
    ].join('\n');
  await fs.writeFile(keysPath, keysFileBody, { mode: 0o600 });

  const publicKeyAdded = await ensurePublicKeyLine(envFsPath, publicKeyHex);
  const gitignoreUpdated = await ensureGitignoreEntry(dir, ENV_KEYS_FILENAME);

  return {
    envKeysPath: keysPath,
    envFilePath: envFsPath,
    publicKeyHex,
    privateKeyVarName,
    publicKeyAdded,
    gitignoreUpdated
  };
}

/** dotenvx convention: `.env` → DOTENV_PRIVATE_KEY, `.env.production` → DOTENV_PRIVATE_KEY_PRODUCTION. */
function derivePrivateKeyVarName(envFsPath: string): string {
  const basename = path.basename(envFsPath);
  if (basename === '.env') return 'DOTENV_PRIVATE_KEY';
  const suffix = basename.replace(/^\.env\./, '').toUpperCase();
  return `DOTENV_PRIVATE_KEY_${suffix.replace(/[^A-Z0-9]/g, '_')}`;
}

async function ensurePublicKeyLine(envFsPath: string, publicKeyHex: string): Promise<boolean> {
  let envText = '';
  try {
    envText = await fs.readFile(envFsPath, 'utf8');
  } catch {
    // file may not exist yet — we'll create it
  }
  if (new RegExp(`^\\s*${DOTENV_PUBLIC_KEY_VAR}\\s*=`, 'm').test(envText)) return false;

  const line = `${DOTENV_PUBLIC_KEY_VAR}="${publicKeyHex}"`;
  const prefix = `#----------------dotenvx----------------\n# Public key — safe to commit.\n# Used to encrypt values written via the editor.\n${line}\n#---------------------------------------\n`;
  const next = envText ? `${prefix}\n${envText}` : prefix;
  await fs.writeFile(envFsPath, next);
  return true;
}

async function ensureGitignoreEntry(dir: string, entry: string): Promise<boolean> {
  const gitignorePath = path.join(dir, '.gitignore');
  let content = '';
  try {
    content = await fs.readFile(gitignorePath, 'utf8');
  } catch {
    // doesn't exist — create
  }
  if (content.split(/\r?\n/).some(l => l.trim() === entry)) return false;
  const separator = content === '' || content.endsWith('\n') ? '' : '\n';
  await fs.writeFile(gitignorePath, `${content}${separator}${entry}\n`);
  return true;
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}
