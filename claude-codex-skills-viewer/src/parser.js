const fs = require('fs');
const path = require('path');

function parseFrontmatter(mdPath) {
  try {
    const raw = fs.readFileSync(mdPath, 'utf8');
    if (!raw.startsWith('---')) return { body: raw, raw };
    const end = raw.indexOf('\n---', 3);
    if (end < 0) return { body: raw, raw };
    const yaml = raw.slice(3, end).trim();
    const body = raw.slice(end + 4).replace(/^\s*\n/, '');
    const meta = {};
    let lastKey = null;
    for (const line of yaml.split('\n')) {
      const m = line.match(/^([A-Za-z_][\w-]*)\s*:\s*(.*)$/);
      if (m) {
        lastKey = m[1];
        let v = m[2].trim();
        if (v.startsWith('[') && v.endsWith(']')) {
          v = v.slice(1, -1).split(',').map(s => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
        } else {
          v = v.replace(/^["']|["']$/g, '');
        }
        meta[lastKey] = v;
      } else if (lastKey && line.match(/^\s+-\s+/)) {
        const item = line.replace(/^\s+-\s+/, '').trim().replace(/^["']|["']$/g, '');
        if (!Array.isArray(meta[lastKey])) meta[lastKey] = meta[lastKey] ? [meta[lastKey]] : [];
        meta[lastKey].push(item);
      } else if (lastKey && line.match(/^\s+\S/)) {
        meta[lastKey] = (meta[lastKey] || '') + ' ' + line.trim();
      }
    }
    return { meta, body, raw };
  } catch {
    return {};
  }
}

function extractWhenToUse(body) {
  if (!body) return null;
  const m = body.match(/##\s+(?:When to [Uu]se|언제 쓰는가|언제 사용)[^\n]*\n([\s\S]+?)(?:\n##\s|$)/);
  if (!m) return null;
  return m[1].trim().replace(/\n+/g, ' ').slice(0, 240);
}

function findSkillMd(skillDir) {
  for (const c of ['SKILL.md', 'skill.md', 'README.md']) {
    const p = path.join(skillDir, c);
    if (fs.existsSync(p)) return p;
  }
  try {
    const mds = fs.readdirSync(skillDir).filter(f => f.toLowerCase().endsWith('.md'));
    if (mds.length) return path.join(skillDir, mds[0]);
  } catch {}
  return null;
}

function describeSkill(dir) {
  const md = findSkillMd(dir);
  if (!md) return { mdPath: null, name: path.basename(dir) };
  const { meta = {}, body = '', raw = '' } = parseFrontmatter(md);
  const cats = Array.isArray(meta.categories) ? meta.categories
    : typeof meta.categories === 'string' ? meta.categories.split(',').map(s => s.trim()).filter(Boolean)
    : [];
  return {
    mdPath: md,
    name: meta.name || path.basename(dir),
    description: meta.description || null,
    whenToUse: extractWhenToUse(body),
    categories: cats,
    license: meta.license || null,
    version: meta.version || null,
    raw,
    body
  };
}

module.exports = { parseFrontmatter, extractWhenToUse, findSkillMd, describeSkill };
