import * as vscode from 'vscode';
import {
  CFG_ADDITIONAL_BINARY_EXTS, CFG_DEFAULT_GROUPING, CFG_MAX_FILE_SIZE_KB,
  CFG_RESPECT_FILES_EXCLUDE, CFG_RESPECT_GITIGNORE,
  DEFAULT_BINARY_EXTS, EXTENSION_ID, LINE_COUNTER_RAW_NEWLINE,
  VIEW_ID, VIEW_MODE_FLAT, VIEW_MODE_GROUP_EXT, WATCH_DEBOUNCE_MS
} from './constants';
import { apps } from './apps';
import { fullCommandId, type ExtensionApi } from './apps/_types';
import { VsCodeConfig } from './adapters/vscodeConfig';
import { VsCodeFileSystem } from './adapters/vscodeFileSystem';
import { VsCodeLogger } from './adapters/vscodeLogger';
import { VsCodeWatcher } from './adapters/vscodeWatcher';
import { ExtensionAndNullByteDetector } from './core/binaryDetectors/extensionAndNullByteDetector';
import { InMemoryLineCache } from './core/cache';
import { GitignoreSource } from './core/ignoreSources/gitignoreSource';
import { LineignoreSource } from './core/ignoreSources/lineignoreSource';
import { FilesExcludeSource } from './core/ignoreSources/filesExcludeSource';
import { IgnoreResolver } from './core/ignoreResolver';
import { RawNewlineCounter } from './core/lineCounters/rawNewlineCounter';
import { Registry } from './core/registry';
import { Scanner } from './core/scanner';
import type { IIgnoreSource, Uri } from './core/types';
import { LineTreeProvider } from './view/lineTreeProvider';
import { FlatByLines } from './view/viewModes/flatByLines';
import { GroupByExtension } from './view/viewModes/groupByExtension';

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const folder = vscode.workspace.workspaceFolders?.[0];
  if (!folder) return;
  const workspaceRoot = folder.uri.fsPath;

  const logger = new VsCodeLogger('Vibecode Show File Lines');
  const config = new VsCodeConfig();
  const fs = new VsCodeFileSystem();
  const watcher = new VsCodeWatcher();

  const registry = new Registry();
  registry.registerLineCounter(new RawNewlineCounter());
  registry.registerBinaryDetector(new ExtensionAndNullByteDetector(
    DEFAULT_BINARY_EXTS,
    config.get<string[]>(CFG_ADDITIONAL_BINARY_EXTS, [])
  ));
  registry.registerViewMode(new FlatByLines());
  registry.registerViewMode(new GroupByExtension());

  const sources: IIgnoreSource[] = [new LineignoreSource(workspaceRoot, fs)];
  if (config.get<boolean>(CFG_RESPECT_GITIGNORE, true)) sources.push(new GitignoreSource(workspaceRoot, fs));
  if (config.get<boolean>(CFG_RESPECT_FILES_EXCLUDE, true)) sources.push(new FilesExcludeSource(workspaceRoot, config));
  const ignoreResolver = new IgnoreResolver(workspaceRoot, sources);
  await ignoreResolver.reload();

  const cache = new InMemoryLineCache();
  const scanner = new Scanner({
    fs, cache, ignoreResolver,
    lineCounter: registry.getLineCounter(LINE_COUNTER_RAW_NEWLINE)!,
    binaryDetector: registry.getBinaryDetector(),
    maxFileSizeBytes: config.get<number>(CFG_MAX_FILE_SIZE_KB, 5120) * 1024,
    logger
  });

  const initialGrouping = config.get<string>(CFG_DEFAULT_GROUPING, 'flat');
  const provider = new LineTreeProvider(
    cache, registry,
    initialGrouping === 'byExtension' ? VIEW_MODE_GROUP_EXT : VIEW_MODE_FLAT
  );
  const treeView = vscode.window.createTreeView(VIEW_ID, { treeDataProvider: provider, showCollapseAll: true });
  context.subscriptions.push(treeView);

  // Watcher with debounced batch
  const fw = watcher.watch('**/*');
  const debounce = makeDebouncer(WATCH_DEBOUNCE_MS);
  const pending = new Set<string>();
  const flushPending = async () => {
    const batch = [...pending].map(p => ({ fsPath: p, toString: () => `file://${p}` }) as Uri);
    pending.clear();
    for (const u of batch) await scanner.rescanOne(u);
  };
  context.subscriptions.push(
    fw.onCreate(u => { if (!ignoreResolver.isIgnored(u)) { pending.add(u.fsPath); debounce(flushPending); } }),
    fw.onChange(u => { if (!ignoreResolver.isIgnored(u)) { pending.add(u.fsPath); debounce(flushPending); } }),
    fw.onDelete(u => { cache.remove(u); }),
    { dispose: () => fw.dispose() }
  );

  // Config / ignore changes -> full rescan
  context.subscriptions.push(
    config.onChange(
      [CFG_RESPECT_GITIGNORE, CFG_RESPECT_FILES_EXCLUDE, CFG_MAX_FILE_SIZE_KB, CFG_ADDITIONAL_BINARY_EXTS, 'files.exclude'],
      () => { void rescanAll(); }
    )
  );

  // Commands — registered via apps factory pattern
  const api: ExtensionApi = {
    refresh: rescanAll,
    toggleView: () => provider.toggleMode(),
    openSettings: () => vscode.commands.executeCommand(
      'workbench.action.openSettings', `@ext:dalsoop.${EXTENSION_ID}`
    )
  };
  for (const app of apps) {
    context.subscriptions.push(
      vscode.commands.registerCommand(fullCommandId(app.manifest.id), app.create(api))
    );
  }

  // Initial scan with status-bar progress
  void rescanAll();

  async function rescanAll(): Promise<void> {
    cache.clear();
    await ignoreResolver.reload();
    await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Window, title: vscode.l10n.t('Vibecode Show File Lines') },
      async (progress) => {
        let last = 0;
        await scanner.scanAll({
          onProgress: (done, total) => {
            if (done === total || done - last >= 50) {
              progress.report({ message: vscode.l10n.t('Scanning {0} / {1} files...', done, total) });
              last = done;
            }
          }
        });
        progress.report({ message: vscode.l10n.t('Scan complete: {0} files indexed.', cache.size()) });
      }
    );
  }
}

export function deactivate(): void { /* subscriptions disposed by VSCode */ }

function makeDebouncer(ms: number): (fn: () => void) => void {
  let timer: NodeJS.Timeout | undefined;
  return (fn) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(fn, ms);
  };
}
