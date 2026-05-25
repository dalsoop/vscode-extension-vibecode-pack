import * as vscode from 'vscode';
import { collectAllSkills } from './sources';
import { describeSkill } from './parser';
import { log } from './logger';

const HELP = `## @ccskills commands

- \`/list\` — list installed skills
- \`/search <query>\` — search by keyword
- \`/preview <skill-name>\` — show SKILL.md
- \`/recommend <goal>\` — suggest skills
- \`/help\` — this help`;

function handler(request: any, _ctx: any, stream: any): any {
  const cmd = request.command || 'list';
  const prompt = (request.prompt || '').trim();

  if (cmd === 'help' || prompt === 'help') {
    stream.markdown(HELP);
    return {};
  }

  if (cmd === 'list') {
    const items = collectAllSkills({});
    stream.markdown(`### Installed (${items.length})\n\n`);
    for (const it of items.slice(0, 80)) {
      stream.markdown(
        `- **${it.name}** — \`${it.source.label}/${it.source.scope}\`${it.info.description ? ' — ' + it.info.description.slice(0, 140) : ''}\n`
      );
    }
    if (items.length > 80) stream.markdown(`\n_...and ${items.length - 80} more_`);
    return {};
  }

  if (cmd === 'search') {
    const q = prompt.toLowerCase();
    if (!q) {
      stream.markdown('Provide a query.');
      return {};
    }
    const matched = collectAllSkills({}).filter(it => {
      const hay = `${it.name} ${it.info.description || ''} ${it.info.whenToUse || ''}`.toLowerCase();
      return hay.includes(q);
    });
    stream.markdown(`### Results for "${prompt}" (${matched.length})\n\n`);
    matched
      .slice(0, 30)
      .forEach(it =>
        stream.markdown(`- **${it.name}** — ${it.info.description ? it.info.description.slice(0, 160) : '(no desc)'}\n`)
      );
    return {};
  }

  if (cmd === 'preview') {
    const hit =
      collectAllSkills({}).find(x => x.name === prompt) ||
      collectAllSkills({}).find(x => x.name.toLowerCase() === prompt.toLowerCase());
    if (!hit) {
      stream.markdown(`"${prompt}" not found`);
      return {};
    }
    const info = describeSkill(hit.dir);
    stream.markdown(`### ${hit.name}\n\n`);
    if (info.description) stream.markdown(`> ${info.description}\n\n`);
    if (info.whenToUse) stream.markdown(`**When**: ${info.whenToUse}\n\n`);
    stream.markdown(`---\n\n${info.body || info.raw || ''}`);
    return {};
  }

  if (cmd === 'recommend') {
    if (!prompt) {
      stream.markdown('Provide a goal.');
      return {};
    }
    const kw = prompt
      .toLowerCase()
      .split(/\s+/)
      .filter((w: string) => w.length > 2);
    const scored = collectAllSkills({})
      .map(it => {
        const hay = `${it.name} ${it.info.description || ''} ${it.info.whenToUse || ''}`.toLowerCase();
        let s = 0;
        for (const k of kw) if (hay.includes(k)) s += 1;
        return { it, s };
      })
      .filter(x => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 5);
    stream.markdown(`### For "${prompt}"\n\n`);
    if (!scored.length) {
      stream.markdown('_No matches_');
      return {};
    }
    scored.forEach(({ it, s }) =>
      stream.markdown(`- **${it.name}** _(match ${s})_ — ${it.info.description || '(no desc)'}\n`)
    );
    return {};
  }

  stream.markdown(HELP);
  return {};
}

export function register(context: vscode.ExtensionContext): void {
  const chat = (vscode as any).chat;
  if (!chat || !chat.createChatParticipant) return;
  try {
    const p = chat.createChatParticipant('ccskills.participant', handler);
    p.iconPath = new vscode.ThemeIcon('book');
    context.subscriptions.push(p);
  } catch (e) {
    log.error('createChatParticipant failed', e);
  }
}
