import * as fs from 'fs/promises';
import * as path from 'path';
import * as vscode from 'vscode';
import type {
  AssetData,
  PickData,
  SnapshotPayload,
  SnapshotResult
} from './snapshot-types';

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
    const folderAbs = await this.uniqueFolder(baseDir, stamp);

    const stateHtml = payload.outerHTML.replace(INSPECTOR_SCRIPT_TAG_RE, '\n');

    const picks = { version: 1, picks: payload.picks };
    const assets = { version: 1, assets: payload.assets };
    const meta = {
      version: 1,
      savedAt: new Date().toISOString(),
      savedAtLocal: stamp,
      sourceFile: path.relative(workspaceRoot, sourceFileAbsPath),
      workspaceRoot,
      viewport: payload.viewport,
      userAgent: payload.userAgent,
      summary: this.summarize(payload.picks, payload.assets)
    };

    await Promise.all([
      fs.writeFile(path.join(folderAbs, 'state.html'), stateHtml, 'utf8'),
      fs.writeFile(path.join(folderAbs, 'picks.json'), JSON.stringify(picks, null, 2) + '\n', 'utf8'),
      fs.writeFile(path.join(folderAbs, 'assets.json'), JSON.stringify(assets, null, 2) + '\n', 'utf8'),
      fs.writeFile(path.join(folderAbs, 'meta.json'), JSON.stringify(meta, null, 2) + '\n', 'utf8')
    ]);

    return {
      folderAbsPath: folderAbs,
      folderRelPath: path.relative(workspaceRoot, folderAbs),
      timestampLocal: stamp
    };
  }

  async revealInFinder(folderAbsPath: string): Promise<void> {
    await vscode.commands.executeCommand(
      'revealFileInOS',
      vscode.Uri.file(folderAbsPath)
    );
  }

  private summarize(picks: PickData[], assets: AssetData[]): {
    picksCount: number;
    assetsCount: number;
    overridesCount: number;
  } {
    let overridesCount = 0;
    for (const p of picks) {
      if (p.overrides.classToggles.length > 0) overridesCount++;
      if (p.overrides.inlineStyle.trim()) overridesCount++;
      if (p.overrides.forceState) overridesCount++;
    }
    return {
      picksCount: picks.length,
      assetsCount: assets.length,
      overridesCount
    };
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

  private async uniqueFolder(baseDir: string, stamp: string): Promise<string> {
    let candidate = path.join(baseDir, stamp);
    let n = 1;
    while (true) {
      try {
        await fs.mkdir(candidate);
        return candidate;
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code !== 'EEXIST') throw err;
        n++;
        candidate = path.join(baseDir, `${stamp}-${n}`);
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
