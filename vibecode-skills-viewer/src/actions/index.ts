import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as state from '../state';
import { log } from '../logger';
import type { ActionHandler, ActionName, ActionContext, ItemPayload } from '../types';

const open: ActionHandler = async (p, _ctx) => {
  const target = p.path && fs.existsSync(p.path) ? p.path : p.mdPath && fs.existsSync(p.mdPath) ? p.mdPath : null;
  if (target) await vscode.window.showTextDocument(vscode.Uri.file(target));
};

const preview: ActionHandler = async (p, _ctx) => {
  if (!p.path) return;
  await vscode.commands.executeCommand('vibecodeSkills.previewSkill', {
    dir: p.path,
    mdPath: p.mdPath,
    name: p.title || path.basename(p.path),
    source: { label: p.tool || 'skill', scope: 'local', readOnly: !!p.readOnly }
  });
};

const finder: ActionHandler = async (p, _ctx) => {
  if (p.path) await vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(p.path));
};

const github: ActionHandler = async (p, _ctx) => {
  if (p.path) await vscode.env.openExternal(vscode.Uri.parse(p.path));
};

const fav: ActionHandler = async (p, ctx) => {
  if (!p.path) return;
  await state.toggleFavorite(p.path);
  ctx.refresh();
};

const sync: ActionHandler = async (p, ctx) => {
  if (!p.path) return;
  await vscode.commands.executeCommand('vibecodeSkills.syncToThisFile', { abs: p.path });
  ctx.refresh();
};

const create: ActionHandler = async (p, ctx) => {
  if (!p.path) return;
  fs.mkdirSync(path.dirname(p.path), { recursive: true });
  fs.writeFileSync(p.path, '', 'utf8');
  ctx.refresh();
  await vscode.window.showTextDocument(vscode.Uri.file(p.path));
};

export const REGISTRY: Record<ActionName, ActionHandler> = {
  open,
  preview,
  finder,
  github,
  fav,
  sync,
  create
};

export async function dispatch(action: ActionName, payload: ItemPayload, ctx: ActionContext): Promise<void> {
  const handler = REGISTRY[action];
  if (!handler) {
    log.warn(`No handler for action: ${action}`);
    return;
  }
  try {
    await handler(payload, ctx);
  } catch (e) {
    log.error(`action ${action} failed`, e);
  }
}
