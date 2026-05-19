const vscode = require('vscode');
const { collectAllSkills } = require('./sources');
const { describeSkill } = require('./parser');

const HELP = `## @ccskills commands

- \`/list\` — list all installed skills
- \`/search <query>\` — search by name, description, when-to-use
- \`/preview <skill-name>\` — show full SKILL.md
- \`/recommend <goal>\` — suggest skills for a goal
- \`/categories\` — list categories with counts
- \`/help\` — show this help`;

function handler(request, context, stream, token) {
  const cmd = request.command || 'list';
  const prompt = (request.prompt || '').trim();

  if (cmd === 'help' || prompt === 'help') {
    stream.markdown(HELP);
    return { metadata: { command: 'help' } };
  }

  if (cmd === 'list') {
    const items = collectAllSkills({});
    stream.markdown(`### Installed skills (${items.length})\n\n`);
    for (const it of items.slice(0, 80)) {
      stream.markdown(`- **${it.name}** — \`${it.source.label}/${it.source.scope}\`${it.info.description ? ` — ${it.info.description.slice(0, 140)}` : ''}\n`);
    }
    if (items.length > 80) stream.markdown(`\n_...and ${items.length - 80} more_`);
    return { metadata: { command: 'list', count: items.length } };
  }

  if (cmd === 'categories') {
    const m = new Map();
    for (const it of collectAllSkills({})) for (const c of (it.info.categories || [])) m.set(c, (m.get(c) || 0) + 1);
    const entries = [...m.entries()].sort((a, b) => b[1] - a[1]);
    stream.markdown(`### Categories (${entries.length})\n\n`);
    entries.forEach(([c, n]) => stream.markdown(`- **${c}** — ${n}\n`));
    return { metadata: { command: 'categories' } };
  }

  if (cmd === 'search') {
    const q = prompt.toLowerCase();
    if (!q) { stream.markdown('Provide a search query.'); return {}; }
    const items = collectAllSkills({});
    const matched = items.filter(it => {
      const hay = `${it.name} ${it.info.description || ''} ${it.info.whenToUse || ''}`.toLowerCase();
      return hay.includes(q);
    });
    stream.markdown(`### Results for "${prompt}" (${matched.length})\n\n`);
    matched.slice(0, 30).forEach(it => {
      stream.markdown(`- **${it.name}** — \`${it.source.label}/${it.source.scope}\`${it.info.description ? ` — ${it.info.description.slice(0, 160)}` : ''}\n`);
    });
    return { metadata: { command: 'search', q: prompt, count: matched.length } };
  }

  if (cmd === 'preview') {
    if (!prompt) { stream.markdown('Provide a skill name to preview.'); return {}; }
    const items = collectAllSkills({});
    const hit = items.find(x => x.name === prompt) || items.find(x => x.name.toLowerCase() === prompt.toLowerCase());
    if (!hit) { stream.markdown(`Skill "${prompt}" not found`); return {}; }
    const info = describeSkill(hit.dir);
    stream.markdown(`### ${hit.name}\n\n`);
    if (info.description) stream.markdown(`> ${info.description}\n\n`);
    if (info.whenToUse)   stream.markdown(`**When to use**: ${info.whenToUse}\n\n`);
    if ((info.categories || []).length) stream.markdown(`**Categories**: ${info.categories.join(', ')}\n\n`);
    stream.markdown(`---\n\n${info.body || info.raw || ''}`);
    return { metadata: { command: 'preview', name: hit.name } };
  }

  if (cmd === 'recommend') {
    const goal = prompt;
    if (!goal) { stream.markdown('Provide a goal to recommend for.'); return {}; }
    const kw = goal.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const scored = collectAllSkills({}).map(it => {
      const hay = `${it.name} ${it.info.description || ''} ${it.info.whenToUse || ''}`.toLowerCase();
      let s = 0; for (const k of kw) if (hay.includes(k)) s += 1;
      return { it, s };
    }).filter(x => x.s > 0).sort((a, b) => b.s - a.s).slice(0, 5);
    stream.markdown(`### Recommendations for "${goal}"\n\n`);
    if (!scored.length) { stream.markdown('_No matching skills found._'); return {}; }
    scored.forEach(({ it, s }) => {
      stream.markdown(`- **${it.name}** _(match ${s})_ — ${it.info.description || '(no description)'}\n`);
    });
    return { metadata: { command: 'recommend', goal } };
  }

  stream.markdown(HELP);
  return { metadata: { command: 'help' } };
}

function register(context) {
  if (!vscode.chat || !vscode.chat.createChatParticipant) return null;
  try {
    const p = vscode.chat.createChatParticipant('ccskills.participant', handler);
    p.iconPath = new vscode.ThemeIcon('book');
    context.subscriptions.push(p);
    return p;
  } catch (e) {
    console.error('createChatParticipant failed', e);
    return null;
  }
}

module.exports = { register };
