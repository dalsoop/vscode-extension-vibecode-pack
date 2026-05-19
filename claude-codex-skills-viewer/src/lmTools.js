const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const { collectAllSkills } = require('./sources');
const { describeSkill } = require('./parser');

function txt(s) {
  if (vscode.LanguageModelToolResult && vscode.LanguageModelTextPart) {
    return new vscode.LanguageModelToolResult([new vscode.LanguageModelTextPart(s)]);
  }
  return { content: [{ kind: 'text', value: s }] };
}

function tool_list(input = {}) {
  const scope = input.scope || 'all';
  const tool = input.tool || 'all';
  const items = collectAllSkills({ scope, tool });
  const lines = items.map(({ name, dir, source, info }) => {
    const desc = info.description ? ` — ${info.description.slice(0, 140)}` : '';
    return `- [${source.label}/${source.scope}] **${name}**${desc}`;
  });
  return `# Installed Skills (${items.length})\n\nFilter: scope=${scope}, tool=${tool}\n\n${lines.join('\n') || '_(none)_'}`;
}

function tool_search(input = {}) {
  const q = String(input.query || '').toLowerCase().trim();
  if (!q) return 'Empty query.';
  const limit = Math.min(50, Math.max(1, input.limit || 10));
  const scored = [];
  for (const it of collectAllSkills({})) {
    const name = it.name.toLowerCase();
    const desc = (it.info.description || '').toLowerCase();
    const when = (it.info.whenToUse || '').toLowerCase();
    const cats = (it.info.categories || []).join(' ').toLowerCase();
    let s = 0;
    if (name === q) s += 12;
    else if (name.includes(q)) s += 6;
    if (desc.includes(q)) s += 3;
    if (when.includes(q)) s += 2;
    if (cats.includes(q)) s += 2;
    if (s > 0) scored.push({ it, s });
  }
  scored.sort((a, b) => b.s - a.s);
  const top = scored.slice(0, limit);
  if (!top.length) return `No skills found for "${input.query}"`;
  return `# Search "${input.query}" (${top.length}/${scored.length})\n\n` +
    top.map(({ it, s }) => `- [${it.source.label}/${it.source.scope}] **${it.name}** _(score ${s})_${it.info.description ? ' — ' + it.info.description.slice(0, 160) : ''}`).join('\n');
}

function tool_read(input = {}) {
  const name = String(input.name || '').trim();
  if (!name) return 'Missing skill name.';
  const all = collectAllSkills({});
  const hit = all.find(x => x.name === name) || all.find(x => x.name.toLowerCase() === name.toLowerCase());
  if (!hit) return `Skill "${name}" not found`;
  if (!hit.info.mdPath) return `Skill "${name}" has no SKILL.md`;
  const raw = fs.readFileSync(hit.info.mdPath, 'utf8');
  return `# Skill: ${name}\n\nSource: ${hit.source.label}/${hit.source.scope}\nPath: \`${hit.info.mdPath}\`\n\n---\n\n${raw}`;
}

function tool_recommend(input = {}) {
  const goal = String(input.goal || '').toLowerCase().trim();
  if (!goal) return 'Provide a `goal` describing the task.';
  const keywords = goal.split(/\s+/).filter(w => w.length > 2);
  const scored = [];
  for (const it of collectAllSkills({})) {
    const hay = `${it.name} ${it.info.description || ''} ${it.info.whenToUse || ''} ${(it.info.categories || []).join(' ')}`.toLowerCase();
    let s = 0;
    for (const k of keywords) if (hay.includes(k)) s += 1;
    if (s > 0) scored.push({ it, s });
  }
  scored.sort((a, b) => b.s - a.s);
  const top = scored.slice(0, 5);
  if (!top.length) return `No skills match goal "${input.goal}".`;
  return `# Recommended for "${input.goal}"\n\n` +
    top.map(({ it, s }) => `- **${it.name}** _(match ${s})_ — ${it.info.description || '(no description)'}\n  - When: ${it.info.whenToUse || '_(not specified)_'}`).join('\n');
}

function tool_listCategories() {
  const cats = new Map();
  for (const it of collectAllSkills({})) {
    for (const c of (it.info.categories || [])) {
      cats.set(c, (cats.get(c) || 0) + 1);
    }
  }
  const entries = [...cats.entries()].sort((a, b) => b[1] - a[1]);
  return `# Categories (${entries.length})\n\n` + entries.map(([c, n]) => `- **${c}** — ${n} skill(s)`).join('\n');
}

function tool_inCategory(input = {}) {
  const cat = String(input.category || '').toLowerCase().trim();
  if (!cat) return 'Provide a category.';
  const matches = collectAllSkills({}).filter(it => (it.info.categories || []).map(c => c.toLowerCase()).includes(cat));
  if (!matches.length) return `No skills in category "${input.category}".`;
  return `# Category: ${input.category} (${matches.length})\n\n` +
    matches.map(it => `- [${it.source.label}/${it.source.scope}] **${it.name}** — ${it.info.description || '(no description)'}`).join('\n');
}

function tool_listSources() {
  const seen = new Map();
  for (const it of collectAllSkills({})) {
    const k = `${it.source.label} (${it.source.scope})`;
    seen.set(k, (seen.get(k) || 0) + 1);
  }
  return `# Skill sources\n\n` + [...seen.entries()].map(([k, n]) => `- **${k}** — ${n} skill(s)`).join('\n');
}

function tool_status() {
  const items = collectAllSkills({});
  const byScope = {};
  const byTool = {};
  for (const it of items) {
    byScope[it.source.scope] = (byScope[it.source.scope] || 0) + 1;
    byTool[it.source.tool] = (byTool[it.source.tool] || 0) + 1;
  }
  return `# Status\n\n- Total: **${items.length}** skills\n- By scope: ${JSON.stringify(byScope)}\n- By tool: ${JSON.stringify(byTool)}`;
}

const TOOLS = [
  { name: 'claudeCodexSkills_list',           handler: tool_list,           prepare: i => ({ invocationMessage: 'Listing installed skills' }) },
  { name: 'claudeCodexSkills_search',         handler: tool_search,         prepare: i => ({ invocationMessage: `Searching skills for "${i.query || ''}"` }) },
  { name: 'claudeCodexSkills_read',           handler: tool_read,           prepare: i => ({ invocationMessage: `Reading skill "${i.name || ''}"` }) },
  { name: 'claudeCodexSkills_recommend',      handler: tool_recommend,      prepare: i => ({ invocationMessage: `Recommending skills for "${i.goal || ''}"` }) },
  { name: 'claudeCodexSkills_listCategories', handler: tool_listCategories, prepare: () => ({ invocationMessage: 'Listing categories' }) },
  { name: 'claudeCodexSkills_inCategory',     handler: tool_inCategory,     prepare: i => ({ invocationMessage: `Listing skills in "${i.category || ''}"` }) },
  { name: 'claudeCodexSkills_listSources',    handler: tool_listSources,    prepare: () => ({ invocationMessage: 'Listing skill sources' }) },
  { name: 'claudeCodexSkills_status',         handler: tool_status,         prepare: () => ({ invocationMessage: 'Computing status' }) }
];

function registerAll(context) {
  if (!vscode.lm || !vscode.lm.registerTool) return;
  for (const t of TOOLS) {
    try {
      const sub = vscode.lm.registerTool(t.name, {
        async prepareInvocation(opts) { return t.prepare(opts.input || {}); },
        async invoke(opts) { return txt(t.handler(opts.input || {})); }
      });
      context.subscriptions.push(sub);
    } catch (e) {
      console.error('registerTool', t.name, e);
    }
  }
}

module.exports = { registerAll, TOOLS };
