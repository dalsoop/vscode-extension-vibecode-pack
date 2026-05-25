import * as vscode from 'vscode';
import * as fs from 'fs';
import { collectAllSkills } from './sources';
import { log } from './logger';

function txt(s: string): any {
  const lm = vscode as any;
  if (lm.LanguageModelToolResult && lm.LanguageModelTextPart) {
    return new lm.LanguageModelToolResult([new lm.LanguageModelTextPart(s)]);
  }
  return { content: [{ kind: 'text', value: s }] };
}

function listInstalled(input: any = {}): string {
  const scope = input.scope || 'all';
  const tool = input.tool || 'all';
  const items = collectAllSkills({ scope, tool });
  const lines = items.map(({ name, source, info }) => {
    const desc = info.description ? ` — ${info.description.slice(0, 140)}` : '';
    return `- [${source.label}/${source.scope}] **${name}**${desc}`;
  });
  return `# Installed Skills (${items.length})\n\nFilter: scope=${scope}, tool=${tool}\n\n${lines.join('\n') || '_(none)_'}`;
}

function search(input: any = {}): string {
  const q = String(input.query || '')
    .toLowerCase()
    .trim();
  if (!q) return 'Empty query.';
  const limit = Math.min(50, Math.max(1, input.limit || 10));
  const scored: { it: any; s: number }[] = [];
  for (const it of collectAllSkills({})) {
    const name = it.name.toLowerCase();
    const desc = (it.info.description || '').toLowerCase();
    const when = (it.info.whenToUse || '').toLowerCase();
    let s = 0;
    if (name === q) s += 12;
    else if (name.includes(q)) s += 6;
    if (desc.includes(q)) s += 3;
    if (when.includes(q)) s += 2;
    if (s > 0) scored.push({ it, s });
  }
  scored.sort((a, b) => b.s - a.s);
  const top = scored.slice(0, limit);
  if (!top.length) return `No skills found for "${input.query}"`;
  return (
    `# Search "${input.query}" (${top.length}/${scored.length})\n\n` +
    top
      .map(
        ({ it, s }) =>
          `- [${it.source.label}/${it.source.scope}] **${it.name}** _(score ${s})_${it.info.description ? ' — ' + it.info.description.slice(0, 160) : ''}`
      )
      .join('\n')
  );
}

function read(input: any = {}): string {
  const name = String(input.name || '').trim();
  if (!name) return 'Missing skill name.';
  const all = collectAllSkills({});
  const hit = all.find(x => x.name === name) || all.find(x => x.name.toLowerCase() === name.toLowerCase());
  if (!hit) return `Skill "${name}" not found`;
  if (!hit.info.mdPath) return `Skill "${name}" has no SKILL.md`;
  const raw = fs.readFileSync(hit.info.mdPath, 'utf8');
  return `# Skill: ${name}\n\nSource: ${hit.source.label}/${hit.source.scope}\nPath: \`${hit.info.mdPath}\`\n\n---\n\n${raw}`;
}

const TOOLS = [
  { name: 'claudeCodexSkills_list', handler: listInstalled, prepareMsg: () => 'Listing installed skills' },
  { name: 'claudeCodexSkills_search', handler: search, prepareMsg: (i: any) => `Searching "${i.query || ''}"` },
  { name: 'claudeCodexSkills_read', handler: read, prepareMsg: (i: any) => `Reading skill "${i.name || ''}"` }
];

export function registerAll(context: vscode.ExtensionContext): void {
  const lm = (vscode as any).lm;
  if (!lm || !lm.registerTool) return;
  for (const t of TOOLS) {
    try {
      const sub = lm.registerTool(t.name, {
        async prepareInvocation(opts: any) {
          return { invocationMessage: t.prepareMsg(opts.input || {}) };
        },
        async invoke(opts: any) {
          return txt(t.handler(opts.input || {}));
        }
      });
      context.subscriptions.push(sub);
    } catch (e) {
      log.error('registerTool', t.name, e);
    }
  }
}
