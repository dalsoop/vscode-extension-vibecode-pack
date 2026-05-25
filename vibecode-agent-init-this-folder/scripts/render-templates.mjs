#!/usr/bin/env node
// Single-source → multi-target renderer for agent templates.
//
// Source format: `templates/<folder>/.template_md` — YAML frontmatter + 3 markdown sections:
//   ## Overview        — what this agent does (used as JSON.content + skill prelude)
//   ## System Prompt   — instructions for the agent (used as JSON.prompts[system].body + skill body + agent system)
//   ## User Prompt     — example user invocation (used as JSON.prompts[user].body + skill example)
//
// Render targets (declared in frontmatter `targets:`):
//   - this-extension   → `templates/<folder>/template.json`  (this extension's native schema)
//   - claude-skill     → `<repo-root>/.claude/skills/<id>/SKILL.md`
//   - claude-agent     → `<repo-root>/.claude/agents/<id>.md`
//   - codex            → (TODO) `<repo-root>/.codex/agents/<id>.md`  — spec pending
//
// Usage:
//   node scripts/render-templates.mjs            # write all outputs
//   node scripts/render-templates.mjs --check    # exit 1 if any output would change
//
// The tiny YAML parser at the bottom handles only the subset used here:
// string / multiline string (`|`) / inline array (`[a, b]`) / block array.

import { promises as fs } from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXT_ROOT = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(EXT_ROOT, '..');
const TEMPLATES_DIR = path.join(EXT_ROOT, 'templates');
const CLAUDE_DIR = path.join(REPO_ROOT, '.claude');

const CHECK_MODE = process.argv.includes('--check');

const SUPPORTED_TARGETS = new Set(['this-extension', 'claude-skill', 'claude-agent', 'codex']);

// ---------- parsing ----------

function parseFrontmatter(raw) {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) throw new Error('Missing or malformed YAML frontmatter (--- ... ---)');
  return { meta: parseYaml(m[1]), body: m[2] };
}

function parseSections(body) {
  // Split on lines that start with `## `. First chunk before any heading is ignored.
  const lines = body.split('\n');
  const sections = {};
  let current = null;
  let buf = [];
  const flush = () => {
    if (current) sections[current] = buf.join('\n').trim();
  };
  for (const line of lines) {
    const h = line.match(/^##\s+(.+?)\s*$/);
    if (h) {
      flush();
      current = h[1].toLowerCase();
      buf = [];
    } else if (current) {
      buf.push(line);
    }
  }
  flush();
  return sections;
}

// ---------- renderers ----------

function jsonRenderer(meta, sections) {
  return JSON.stringify(
    {
      title: meta.title,
      content: sections['overview'] ?? '',
      prompts: [
        { name: 'system', body: sections['system prompt'] ?? '' },
        { name: 'user', body: sections['user prompt'] ?? '' }
      ],
      upstream_url: meta.upstream_url ?? '',
      ssot: meta.ssot ?? 'local'
    },
    null,
    2
  ) + '\n';
}

function claudeSkillRenderer(meta, sections) {
  const description = compactDescription(meta, sections);
  const lines = ['---', `name: ${meta.id}`, `description: ${description}`, '---', ''];
  lines.push(`# ${meta.title}`, '');
  if (sections['overview']) lines.push(sections['overview'], '');
  if (sections['system prompt']) {
    lines.push('## How to apply', '', sections['system prompt'], '');
  }
  if (sections['user prompt']) {
    lines.push('## Example invocation', '', sections['user prompt'], '');
  }
  return lines.join('\n').replace(/\n{3,}/g, '\n\n') + '\n';
}

function claudeAgentRenderer(meta, sections) {
  const description = compactDescription(meta, sections);
  const tools = Array.isArray(meta.agent_tools) ? meta.agent_tools.join(', ') : '';
  const lines = ['---', `name: ${meta.id}`, `description: ${description}`];
  if (tools) lines.push(`tools: ${tools}`);
  lines.push('---', '');
  lines.push(`You are ${meta.title}.`, '');
  if (sections['overview']) lines.push(sections['overview'], '');
  if (sections['system prompt']) lines.push(sections['system prompt'], '');
  if (sections['user prompt']) {
    lines.push('## When invoked', '', 'The user message will look like:', '', '```', sections['user prompt'], '```', '');
  }
  return lines.join('\n').replace(/\n{3,}/g, '\n\n') + '\n';
}

function compactDescription(meta, _sections) {
  // One-line description for SKILL/agent frontmatter. Prefer explicit `description`,
  // append `when_to_use` if present (collapsed to single line).
  let d = (meta.description ?? '').trim().replace(/\s+/g, ' ');
  if (meta.when_to_use) {
    const w = String(meta.when_to_use).trim().replace(/\s+/g, ' ');
    if (w) d = d ? `${d} Use when: ${w}` : `Use when: ${w}`;
  }
  // YAML-safe: wrap in double quotes if contains : or special chars
  if (/[:#\n"]/.test(d)) {
    d = JSON.stringify(d);
  }
  return d;
}

const TARGET_RENDERERS = {
  'this-extension': (meta, sections, ctx) => ({
    path: path.join(ctx.templateDir, 'template.json'),
    content: jsonRenderer(meta, sections)
  }),
  'claude-skill': (meta, sections) => ({
    path: path.join(CLAUDE_DIR, 'skills', meta.id, 'SKILL.md'),
    content: claudeSkillRenderer(meta, sections)
  }),
  'claude-agent': (meta, sections) => ({
    path: path.join(CLAUDE_DIR, 'agents', `${meta.id}.md`),
    content: claudeAgentRenderer(meta, sections)
  }),
  codex: (_meta, _sections) => {
    throw new Error('codex target not implemented yet — spec pending.');
  }
};

// ---------- driver ----------

async function listTemplateFolders() {
  const entries = await fs.readdir(TEMPLATES_DIR, { withFileTypes: true });
  return entries
    .filter(e => e.isDirectory())
    .map(e => path.join(TEMPLATES_DIR, e.name))
    .sort();
}

async function readSource(templateDir) {
  const file = path.join(templateDir, '.template_md');
  try {
    return await fs.readFile(file, 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
}

async function readRawOrNull(file) {
  try {
    return await fs.readFile(file, 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
}

async function writeOrCheck(outputPath, content, changes) {
  const current = await readRawOrNull(outputPath);
  if (current === content) return;
  changes.push(path.relative(REPO_ROOT, outputPath));
  if (!CHECK_MODE) {
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, content);
  }
}

async function main() {
  const folders = await listTemplateFolders();
  const changes = [];
  let rendered = 0;
  let skipped = 0;

  for (const templateDir of folders) {
    const raw = await readSource(templateDir);
    if (raw == null) {
      skipped++;
      continue;
    }
    const { meta, body } = parseFrontmatter(raw);
    if (!meta.id) throw new Error(`Missing 'id' in ${templateDir}/.template_md`);
    if (!meta.title) throw new Error(`Missing 'title' in ${templateDir}/.template_md`);
    const sections = parseSections(body);
    const targets = Array.isArray(meta.targets) ? meta.targets : [];
    for (const t of targets) {
      if (!SUPPORTED_TARGETS.has(t)) throw new Error(`Unknown target '${t}' in ${meta.id}`);
      const renderer = TARGET_RENDERERS[t];
      const { path: outPath, content } = renderer(meta, sections, { templateDir });
      await writeOrCheck(outPath, content, changes);
    }
    rendered++;
  }

  if (CHECK_MODE) {
    if (changes.length) {
      console.error('Out of sync — run `npm run render`:');
      for (const c of changes) console.error(`  - ${c}`);
      process.exit(1);
    }
    console.log(`OK — ${rendered} template(s) checked, ${skipped} folder(s) without .template_md skipped.`);
    return;
  }

  console.log(`Rendered ${rendered} template(s) (skipped ${skipped} without .template_md).`);
  if (changes.length) {
    console.log('Changed:');
    for (const c of changes) console.log(`  - ${c}`);
  } else {
    console.log('No changes.');
  }
}

main().catch(err => {
  console.error('render-templates failed:', err.message);
  process.exit(1);
});

// ---------- tiny YAML parser (subset) ----------
// Handles: key: value | key: "quoted" | key: |\n  multiline | key: [a, b] | key:\n  - a\n  - b | # comment
// Not handled: nested mappings, anchors, aliases, multi-doc, complex strings.

function parseYaml(src) {
  const lines = src.split('\n');
  const out = {};
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim() || line.trim().startsWith('#')) { i++; continue; }
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(.*)$/);
    if (!m) throw new Error(`Bad YAML line: ${line}`);
    const key = m[1];
    const rest = m[2];
    if (rest === '|' || rest === '>') {
      // Block scalar — collect indented lines.
      const buf = [];
      i++;
      while (i < lines.length && (lines[i].startsWith('  ') || lines[i] === '')) {
        buf.push(lines[i].replace(/^ {0,2}/, ''));
        i++;
      }
      const joined = rest === '|' ? buf.join('\n').replace(/\n+$/, '') : buf.join(' ').trim();
      out[key] = joined;
      continue;
    }
    if (rest === '') {
      // Block array — collect `  - item` lines.
      const arr = [];
      i++;
      while (i < lines.length && /^\s*-\s+/.test(lines[i])) {
        arr.push(unquote(lines[i].replace(/^\s*-\s+/, '').trim()));
        i++;
      }
      out[key] = arr;
      continue;
    }
    if (rest.startsWith('[') && rest.endsWith(']')) {
      // Inline array.
      const inner = rest.slice(1, -1).trim();
      out[key] = inner ? inner.split(',').map(s => unquote(s.trim())) : [];
      i++;
      continue;
    }
    out[key] = unquote(rest);
    i++;
  }
  return out;
}

function unquote(s) {
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  return s;
}
