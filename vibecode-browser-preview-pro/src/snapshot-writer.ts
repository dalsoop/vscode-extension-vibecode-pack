import * as fs from 'fs/promises';
import * as path from 'path';
import * as vscode from 'vscode';
import type {
  AssetData,
  ChangeData,
  PickData,
  SnapshotPayload,
  SnapshotResult
} from './snapshot-types';
import { buildZip } from './zip-writer';

const INSPECTOR_SCRIPT_TAG_RE =
  /\s*<script[^>]*src=["']\/__bp_inspector\.js["'][^>]*><\/script>\s*/g;

export class SnapshotWriter {
  async write(
    workspaceRoot: string,
    sourceFileAbsPath: string,
    payload: SnapshotPayload
  ): Promise<SnapshotResult> {
    const baseDir = path.join(workspaceRoot, '.vibecode', 'browser-preview');
    await fs.mkdir(baseDir, { recursive: true });
    await this.ensureGitignore(path.join(workspaceRoot, '.vibecode'));

    const stamp = this.timestampLocal(new Date());
    const { folderAbs, folderName } = await this.uniqueFolder(baseDir, stamp);

    const stateHtml = payload.outerHTML.replace(INSPECTOR_SCRIPT_TAG_RE, '\n');

    const picks = { version: 1, picks: payload.picks };
    const assets = { version: 1, assets: payload.assets };
    const changes = { version: 1, changes: payload.changes };
    const meta = {
      version: 1,
      savedAt: new Date().toISOString(),
      savedAtLocal: stamp,
      sourceFile: path.relative(workspaceRoot, sourceFileAbsPath),
      workspaceRoot,
      viewport: payload.viewport,
      userAgent: payload.userAgent,
      summary: this.summarize(payload.picks, payload.assets, payload.changes)
    };
    const changesMdText = this.renderChangesMd(meta, payload.picks, payload.assets, payload.changes);

    const fileBlobs: { name: string; data: Buffer }[] = [
      { name: 'state.html', data: Buffer.from(stateHtml, 'utf8') },
      { name: 'picks.json', data: Buffer.from(JSON.stringify(picks, null, 2) + '\n', 'utf8') },
      { name: 'assets.json', data: Buffer.from(JSON.stringify(assets, null, 2) + '\n', 'utf8') },
      { name: 'changes.json', data: Buffer.from(JSON.stringify(changes, null, 2) + '\n', 'utf8') },
      { name: 'changes.md', data: Buffer.from(changesMdText, 'utf8') },
      { name: 'meta.json', data: Buffer.from(JSON.stringify(meta, null, 2) + '\n', 'utf8') }
    ];

    await Promise.all(
      fileBlobs.map(f => fs.writeFile(path.join(folderAbs, f.name), f.data))
    );

    let zipAbsPath: string | null = null;
    try {
      const zipBuf = buildZip(fileBlobs.map(f => ({ name: `${folderName}/${f.name}`, data: f.data })));
      zipAbsPath = path.join(baseDir, `${folderName}.zip`);
      await fs.writeFile(zipAbsPath, zipBuf);
    } catch {
      zipAbsPath = null;
    }

    return {
      folderAbsPath: folderAbs,
      folderRelPath: path.relative(workspaceRoot, folderAbs),
      zipAbsPath,
      timestampLocal: stamp
    };
  }

  async revealInFinder(folderAbsPath: string): Promise<void> {
    await vscode.commands.executeCommand(
      'revealFileInOS',
      vscode.Uri.file(folderAbsPath)
    );
  }

  private summarize(picks: PickData[], assets: AssetData[], changes: ChangeData[]): {
    picksCount: number;
    assetsCount: number;
    pinsWithChanges: number;
    overridesCount: number;
  } {
    let overridesCount = 0;
    for (const p of picks) {
      if (p.overrides.classToggles.length > 0) overridesCount++;
      if (p.overrides.inlineStyle.trim()) overridesCount++;
      if (p.overrides.forceStates && p.overrides.forceStates.length > 0) overridesCount++;
      if (p.overrides.notes.trim()) overridesCount++;
    }
    const pinsWithChanges = changes.filter(c => c.hasAnyChange).length;
    return {
      picksCount: picks.length,
      assetsCount: assets.length,
      pinsWithChanges,
      overridesCount
    };
  }

  private renderChangesMd(
    meta: { savedAtLocal: string; sourceFile: string; viewport: { width: number; height: number }; summary: { picksCount: number; pinsWithChanges: number } },
    picks: PickData[],
    assets: AssetData[],
    changes: ChangeData[]
  ): string {
    const escBacktick = (s: string) => s.replace(/`/g, '\\`');
    const lines: string[] = [];
    lines.push(`# Browser Preview Snapshot — ${meta.savedAtLocal}`);
    lines.push('');
    lines.push(`Source: \`${escBacktick(meta.sourceFile)}\``);
    lines.push(`Viewport: ${meta.viewport.width}×${meta.viewport.height}`);
    lines.push(`Pins: ${meta.summary.picksCount} (${meta.summary.pinsWithChanges} with changes)`);
    lines.push('');
    lines.push('---');
    lines.push('');

    const changeById = new Map<number, ChangeData>();
    for (const c of changes) changeById.set(c.pickId, c);

    for (const pick of picks) {
      lines.push(`## Pin ${pick.id}: \`${escBacktick(pick.selector)}\``);
      lines.push('');
      const c = changeById.get(pick.id);
      if (!c || !c.hasAnyChange) {
        lines.push('*No changes — pin recorded as-is.*');
        lines.push('');
        lines.push('---');
        lines.push('');
        continue;
      }
      const d = c.delta;
      lines.push('**Changes:**');
      lines.push('');
      if (d.classes.added.length) lines.push(`- Class added: \`${d.classes.added.join(', ')}\``);
      if (d.classes.removed.length) lines.push(`- Class removed: \`${d.classes.removed.join(', ')}\``);
      if (d.inlineStyle.changed) {
        const before = d.inlineStyle.before ? `\`${escBacktick(d.inlineStyle.before)}\`` : '*(empty)*';
        const after = d.inlineStyle.after ? `\`${escBacktick(d.inlineStyle.after)}\`` : '*(empty)*';
        lines.push(`- Inline style: ${before} → ${after}`);
      }
      if (d.forceStates.changed) {
        const after = d.forceStates.after.length ? d.forceStates.after.join(', ') : '(none)';
        lines.push(`- Force states: \`${after}\``);
      }
      if (d.notes.changed) {
        lines.push(`- **Notes:**`);
        lines.push('');
        for (const ln of (d.notes.after || '').split('\n')) {
          lines.push(`  > ${ln}`);
        }
      }
      const compKeys = Object.keys(d.computed);
      if (compKeys.length) {
        lines.push('');
        lines.push('Computed deltas:');
        for (const k of compKeys) {
          lines.push(`- \`${k}\`: \`${escBacktick(d.computed[k].before)}\` → \`${escBacktick(d.computed[k].after)}\``);
        }
      }
      lines.push('');
      lines.push('---');
      lines.push('');
    }

    lines.push(`## Assets (${assets.length})`);
    lines.push('');
    for (const a of assets) {
      const label = a.sourcePath || a.url;
      const sizeStr = a.size != null ? ` (${Math.round(a.size / 1024)} KB)` : '';
      lines.push(`- \`${a.type}\` \`${escBacktick(label)}\`${sizeStr}`);
    }
    lines.push('');

    return lines.join('\n');
  }

  private async ensureGitignore(vibecodeDir: string): Promise<void> {
    const gitignorePath = path.join(vibecodeDir, '.gitignore');
    try {
      await fs.access(gitignorePath);
      return;
    } catch {
      // file does not exist — create it
    }
    await fs.mkdir(vibecodeDir, { recursive: true });
    await fs.writeFile(gitignorePath, '*\n', 'utf8');
  }

  private async uniqueFolder(baseDir: string, stamp: string): Promise<{ folderAbs: string; folderName: string }> {
    let name = stamp;
    let candidate = path.join(baseDir, name);
    let n = 1;
    while (true) {
      try {
        await fs.mkdir(candidate);
        return { folderAbs: candidate, folderName: name };
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code !== 'EEXIST') throw err;
        n++;
        name = `${stamp}-${n}`;
        candidate = path.join(baseDir, name);
      }
    }
  }

  private timestampLocal(d: Date): string {
    const p = (n: number, len = 2) => String(n).padStart(len, '0');
    return (
      d.getFullYear().toString() +
      p(d.getMonth() + 1) +
      p(d.getDate()) +
      p(d.getHours()) +
      p(d.getMinutes()) +
      p(d.getSeconds())
    );
  }
}
