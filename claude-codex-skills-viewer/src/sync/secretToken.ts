// Token resolution chain: SecretStorage → process.env → ~/.env file.
// Tokens used by canonical sync; same util will replace githubToken / gitlabToken
// config-string fallbacks elsewhere if desired.

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as vscode from 'vscode';
import { log } from '../logger';

const KEY_GITLAB = 'ccskills.gitlab.token';
const KEY_GITHUB = 'ccskills.github.token';

// Very small dotenv parser — supports KEY=value, optional quotes, # comments.
export function readEnvFile(filePath: string = path.join(os.homedir(), '.env')): Record<string, string> {
  if (!fs.existsSync(filePath)) return {};
  const out: Record<string, string> = {};
  try {
    for (const raw of fs.readFileSync(filePath, 'utf8').split('\n')) {
      const line = raw.split('#')[0].trim();
      if (!line) continue;
      const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/i);
      if (!m) continue;
      let v = m[2].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      out[m[1]] = v;
    }
  } catch (e: any) {
    log.warn('readEnvFile failed', e.message);
  }
  return out;
}

export interface ResolvedToken {
  value: string | null;
  source: 'secret' | 'env' | 'dotenv' | 'none';
}

async function resolveOne(ctx: vscode.ExtensionContext, storageKey: string, envKeys: string[]): Promise<ResolvedToken> {
  const stored = await ctx.secrets.get(storageKey);
  if (stored) return { value: stored, source: 'secret' };

  for (const k of envKeys) {
    if (process.env[k]) return { value: process.env[k] as string, source: 'env' };
  }

  const dot = readEnvFile();
  for (const k of envKeys) {
    if (dot[k]) return { value: dot[k], source: 'dotenv' };
  }

  return { value: null, source: 'none' };
}

export async function getGitLabToken(ctx: vscode.ExtensionContext): Promise<ResolvedToken> {
  return resolveOne(ctx, KEY_GITLAB, ['GITLAB_SERVER_TOKEN', 'GITLAB_TOKEN', 'GL_TOKEN']);
}

export async function getGitHubToken(ctx: vscode.ExtensionContext): Promise<ResolvedToken> {
  return resolveOne(ctx, KEY_GITHUB, ['GITHUB_TOKEN', 'GH_TOKEN']);
}

export async function setGitLabToken(ctx: vscode.ExtensionContext, value: string): Promise<void> {
  if (value) await ctx.secrets.store(KEY_GITLAB, value);
  else await ctx.secrets.delete(KEY_GITLAB);
}

export async function setGitHubToken(ctx: vscode.ExtensionContext, value: string): Promise<void> {
  if (value) await ctx.secrets.store(KEY_GITHUB, value);
  else await ctx.secrets.delete(KEY_GITHUB);
}

export const STORAGE_KEYS = { gitlab: KEY_GITLAB, github: KEY_GITHUB };
