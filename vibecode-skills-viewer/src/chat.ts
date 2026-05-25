import * as vscode from 'vscode';
import { collectAllSkills } from './sources';
import { describeSkill } from './parser';
import { log } from './logger';
import { t } from './i18n';

function help(): string {
  return [
    t('chat.help.title'),
    '',
    t('chat.help.list'),
    t('chat.help.search'),
    t('chat.help.preview'),
    t('chat.help.recommend'),
    t('chat.help.help')
  ].join('\n');
}

function handler(request: any, _ctx: any, stream: any): any {
  const cmd = request.command || 'list';
  const prompt = (request.prompt || '').trim();

  if (cmd === 'help' || prompt === 'help') {
    stream.markdown(help());
    return {};
  }

  if (cmd === 'list') {
    const items = collectAllSkills({});
    stream.markdown(`${t('chat.installedHeader', items.length)}\n\n`);
    for (const it of items.slice(0, 80)) {
      stream.markdown(
        `- **${it.name}** — \`${it.source.label}/${it.source.scope}\`${it.info.description ? ' — ' + it.info.description.slice(0, 140) : ''}\n`
      );
    }
    if (items.length > 80) stream.markdown(`\n${t('chat.moreItems', items.length - 80)}`);
    return {};
  }

  if (cmd === 'search') {
    const q = prompt.toLowerCase();
    if (!q) {
      stream.markdown(t('chat.search.needQuery'));
      return {};
    }
    const matched = collectAllSkills({}).filter(it => {
      const hay = `${it.name} ${it.info.description || ''} ${it.info.whenToUse || ''}`.toLowerCase();
      return hay.includes(q);
    });
    stream.markdown(`${t('chat.search.header', prompt, matched.length)}\n\n`);
    const noDesc = t('chat.search.noDesc');
    matched
      .slice(0, 30)
      .forEach(it =>
        stream.markdown(`- **${it.name}** — ${it.info.description ? it.info.description.slice(0, 160) : noDesc}\n`)
      );
    return {};
  }

  if (cmd === 'preview') {
    const hit =
      collectAllSkills({}).find(x => x.name === prompt) ||
      collectAllSkills({}).find(x => x.name.toLowerCase() === prompt.toLowerCase());
    if (!hit) {
      stream.markdown(t('chat.preview.notFound', prompt));
      return {};
    }
    const info = describeSkill(hit.dir);
    stream.markdown(`### ${hit.name}\n\n`);
    if (info.description) stream.markdown(`> ${info.description}\n\n`);
    if (info.whenToUse) stream.markdown(`${t('chat.preview.when', info.whenToUse)}\n\n`);
    stream.markdown(`---\n\n${info.body || info.raw || ''}`);
    return {};
  }

  if (cmd === 'recommend') {
    if (!prompt) {
      stream.markdown(t('chat.recommend.needGoal'));
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
    stream.markdown(`${t('chat.recommend.header', prompt)}\n\n`);
    if (!scored.length) {
      stream.markdown(t('chat.recommend.noMatches'));
      return {};
    }
    const noDesc = t('chat.search.noDesc');
    scored.forEach(({ it, s }) =>
      stream.markdown(
        `- **${it.name}** _(${t('chat.recommend.matchLabel', s)})_ — ${it.info.description || noDesc}\n`
      )
    );
    return {};
  }

  stream.markdown(help());
  return {};
}

export function register(context: vscode.ExtensionContext): void {
  const chat = (vscode as any).chat;
  if (!chat || !chat.createChatParticipant) return;
  try {
    const p = chat.createChatParticipant('vibeskills.participant', handler);
    p.iconPath = new vscode.ThemeIcon('book');
    context.subscriptions.push(p);
  } catch (e) {
    log.error('createChatParticipant failed', e);
  }
}
