// Orchestrates a canonical pull: fetch → validate → snapshot → write.
// Snapshots reuse src/preview/versions.ts so users get history for canonical
// pulls just like manual edits.

import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { fetchRaw } from './gitlab';
import { resolveTarget } from './targets';
import { getGitLabToken, getGitHubToken } from './secretToken';
import { snapshot } from '../preview/versions';
import { log } from '../logger';
import { bus } from '../bus';
import type { CanonicalSource, PullResult, CanonicalSyncMeta } from '../types';

const META_KEY = 'ccskills.canonicalMeta';

export function getSyncMeta(ctx: vscode.ExtensionContext, sourceId: string): CanonicalSyncMeta {
  const all = ctx.globalState.get<Record<string, CanonicalSyncMeta>>(META_KEY, {});
  return all[sourceId] || {};
}

async function writeSyncMeta(ctx: vscode.ExtensionContext, sourceId: string, meta: CanonicalSyncMeta): Promise<void> {
  const all = ctx.globalState.get<Record<string, CanonicalSyncMeta>>(META_KEY, {});
  all[sourceId] = meta;
  await ctx.globalState.update(META_KEY, all);
}

function hash(text: string): string {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0;
  return h.toString(16);
}

export async function pullOne(ctx: vscode.ExtensionContext, source: CanonicalSource): Promise<PullResult> {
  const targetRes = resolveTarget(source.target);
  if (!targetRes.abs) {
    return { source, ok: false, target: source.target, error: targetRes.reason };
  }
  const abs = targetRes.abs;

  const gitlab = await getGitLabToken(ctx);
  const github = await getGitHubToken(ctx);

  const fetched = await fetchRaw(source.url, {
    gitlabToken: gitlab.value,
    githubToken: github.value
  });
  if (!fetched.ok || fetched.text === undefined) {
    await writeSyncMeta(ctx, source.id, { lastError: fetched.error, lastSync: Date.now() });
    return { source, ok: false, target: abs, error: fetched.error };
  }
  const newText = fetched.text;
  const newHash = hash(newText);

  // Unchanged?
  let unchanged = false;
  if (fs.existsSync(abs)) {
    try {
      const existing = fs.readFileSync(abs, 'utf8');
      if (existing === newText) unchanged = true;
    } catch {}
  }

  if (unchanged) {
    await writeSyncMeta(ctx, source.id, { lastSync: Date.now(), lastHash: newHash });
    return { source, ok: true, target: abs, bytes: fetched.bytes, unchanged: true };
  }

  // Snapshot if exists
  let snapshotId: string | undefined;
  if (fs.existsSync(abs)) {
    try {
      const v = snapshot(abs, { tag: 'edit' });
      snapshotId = v?.id;
    } catch (e: any) {
      log.warn('snapshot before pull failed', e.message);
    }
  }

  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, newText, 'utf8');

  await writeSyncMeta(ctx, source.id, { lastSync: Date.now(), lastHash: newHash });
  bus.emit('data-changed');

  return { source, ok: true, target: abs, bytes: fetched.bytes, unchanged: false, snapshotId };
}

export async function pullAll(
  ctx: vscode.ExtensionContext,
  sources: CanonicalSource[],
  onlyAutoSync = false
): Promise<PullResult[]> {
  const results: PullResult[] = [];
  for (const src of sources) {
    if (onlyAutoSync && !src.autoSync) continue;
    try {
      results.push(await pullOne(ctx, src));
    } catch (e: any) {
      log.error('pullOne threw', src.id, e);
      results.push({ source: src, ok: false, target: src.target, error: e.message });
    }
  }
  return results;
}
