import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as state from './state';
import * as preview from './webview/preview';
import * as scaffold from './scaffold';
import * as instructions from './instructions';
import * as mem from './memory';
import { readConfig } from './config';
import * as settingsPanel from './settings/controller';
import type { CommandDef, SkillCommandArg, FileCommandArg, PreviewArg } from './types';

interface AnyProvider {
  refresh?: () => void;
}
interface Providers {
  hub?: AnyProvider;
}

let extContext: any = null;
export function setContext(ctx: any): void {
  extContext = ctx;
}

function build(providers: Providers): CommandDef[] {
  const refreshAll = () => Object.values(providers).forEach(p => p?.refresh?.());

  return [
    { id: 'claudeCodexSkills.refresh', handler: refreshAll },

    {
      id: 'claudeCodexSkills.previewSkill',
      handler: (arg?: PreviewArg) => {
        if (arg) preview.open(arg);
      }
    },

    {
      id: 'claudeCodexSkills.openSkillFile',
      handler: async (arg?: SkillCommandArg) => {
        if (arg?.mdPath) await vscode.window.showTextDocument(vscode.Uri.file(arg.mdPath));
      }
    },

    {
      id: 'claudeCodexSkills.revealInFinder',
      handler: (arg?: SkillCommandArg) => {
        if (arg?.dir) vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(arg.dir));
      }
    },

    {
      id: 'claudeCodexSkills.copyPath',
      handler: async (arg?: SkillCommandArg) => {
        if (arg?.dir) {
          await vscode.env.clipboard.writeText(arg.dir);
          vscode.window.setStatusBarMessage(`Copied: ${arg.dir}`, 2000);
        }
      }
    },

    {
      id: 'claudeCodexSkills.openInTerminal',
      handler: (arg?: SkillCommandArg) => {
        if (!arg?.dir) return;
        const term = vscode.window.createTerminal({ name: path.basename(arg.dir), cwd: arg.dir });
        term.show();
      }
    },

    {
      id: 'claudeCodexSkills.toggleFavorite',
      handler: async (arg?: SkillCommandArg) => {
        if (!arg?.dir) return;
        const on = await state.toggleFavorite(arg.dir);
        vscode.window.setStatusBarMessage(on ? '★ Added to favorites' : 'Removed from favorites', 2000);
        refreshAll();
      }
    },

    {
      id: 'claudeCodexSkills.createSkill',
      handler: async () => {
        const dir = await scaffold.runWizard();
        if (dir) refreshAll();
      }
    },

    {
      id: 'claudeCodexSkills.deleteSkill',
      needs: 'workspace',
      handler: async (arg?: SkillCommandArg) => {
        if (!arg?.dir) return;
        if (arg.source?.readOnly) {
          vscode.window.showWarningMessage('Cannot delete read-only skill.');
          return;
        }
        const ans = await vscode.window.showWarningMessage(
          `Delete "${path.basename(arg.dir)}"?\n${arg.dir}`,
          { modal: true },
          'Delete'
        );
        if (ans !== 'Delete') return;
        fs.rmSync(arg.dir, { recursive: true, force: true });
        await state.removeInstallTime(arg.dir);
        refreshAll();
      }
    },

    {
      id: 'claudeCodexSkills.syncInstructions',
      needs: 'workspace',
      handler: async () => {
        const targets = Object.entries(instructions.TARGETS).map(([k, v]) => ({
          label: v.label,
          key: k,
          picked: true
        }));
        const picked = await vscode.window.showQuickPick(targets, {
          canPickMany: true,
          placeHolder: 'Pick targets to sync'
        });
        if (!picked) return;
        const written: string[] = [];
        for (const p of picked) {
          try {
            written.push(await instructions.syncTarget(p.key));
          } catch {}
        }
        vscode.window.showInformationMessage(`Synced ${written.length} file(s)`);
        refreshAll();
      }
    },

    {
      id: 'claudeCodexSkills.syncToThisFile',
      handler: async (arg?: FileCommandArg) => {
        if (!arg?.abs) return;
        const block = instructions.renderBlock(readConfig().instructionFormat);
        fs.mkdirSync(path.dirname(arg.abs), { recursive: true });
        const cur = fs.existsSync(arg.abs) ? fs.readFileSync(arg.abs, 'utf8') : '';
        fs.writeFileSync(arg.abs, instructions.injectBlock(cur, block), 'utf8');
        vscode.window.setStatusBarMessage(`Synced → ${path.basename(arg.abs)}`, 2500);
        refreshAll();
      }
    },

    {
      id: 'claudeCodexSkills.openMemoryIndex',
      handler: async () => {
        const dir = mem.currentWorkspaceMemoryDir();
        if (!dir) {
          vscode.window.showInformationMessage('No workspace open.');
          return;
        }
        const indexPath = path.join(dir, 'MEMORY.md');
        if (!fs.existsSync(indexPath)) {
          vscode.window.showInformationMessage(`No memory yet.\n${dir}`);
          return;
        }
        await vscode.window.showTextDocument(vscode.Uri.file(indexPath));
      }
    },

    {
      id: 'claudeCodexSkills.reportBug',
      handler: () =>
        vscode.env.openExternal(vscode.Uri.parse('https://github.com/dalsoop/claude-codex-skills-viewer/issues/new'))
    },

    {
      id: 'claudeCodexSkills.openSettings',
      handler: () => {
        if (extContext) settingsPanel.open(extContext);
      }
    }
  ];
}

function gate(def: CommandDef): CommandDef {
  if (!def.needs) return def;
  return {
    ...def,
    handler: (...args: any[]) => {
      if (def.needs === 'workspace' && !vscode.workspace.workspaceFolders?.length) {
        vscode.window.showWarningMessage(`Command "${def.id}" requires an open workspace.`);
        return;
      }
      if (def.needs === 'editor' && !vscode.window.activeTextEditor) {
        vscode.window.showWarningMessage(`Command "${def.id}" requires an active editor.`);
        return;
      }
      return def.handler(...args);
    }
  };
}

export function register(context: vscode.ExtensionContext, providers: Providers): void {
  const defs = build(providers).map(gate);
  for (const d of defs) {
    context.subscriptions.push(vscode.commands.registerCommand(d.id, d.handler));
  }
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('claudeCodexSkills')) {
        Object.values(providers).forEach(p => p?.refresh?.());
      }
    })
  );
}
