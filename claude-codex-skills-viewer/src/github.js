const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Lightweight GitHub API wrapper. Uses global fetch (Node 18+, VSCode 1.95+).
function token() {
  const cfg = vscode.workspace.getConfiguration('claudeCodexSkills');
  const t = cfg.get('githubToken', '');
  if (t) return t;
  return process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';
}

function headers() {
  const h = { 'Accept': 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'ccskills-viewer' };
  const t = token();
  if (t) h['Authorization'] = `Bearer ${t}`;
  return h;
}

async function getJSON(url) {
  const r = await fetch(url, { headers: headers() });
  if (!r.ok) throw new Error(`GET ${url} -> ${r.status}`);
  return r.json();
}

async function getText(url) {
  const r = await fetch(url, { headers: { ...headers(), 'Accept': 'application/vnd.github.raw' } });
  if (!r.ok) throw new Error(`GET ${url} -> ${r.status}`);
  return r.text();
}

// List immediate skill folders for a source. Each entry is { name, path, type, sha, url }.
async function listSourceSkills(source) {
  const { repo, branch = 'main', skillsPath = '' } = source;
  const p = skillsPath ? `/${encodeURIComponent(skillsPath).replace(/%2F/g, '/')}` : '';
  const url = `https://api.github.com/repos/${repo}/contents${p}?ref=${branch}`;
  const items = await getJSON(url);
  if (!Array.isArray(items)) return [];
  return items.filter(x => x.type === 'dir').map(x => ({
    name: x.name, path: x.path, sha: x.sha, url: x.url
  }));
}

// Get a single skill folder's SKILL.md (and optional related files).
async function fetchSkillFiles(repo, branch, skillFolderPath) {
  const url = `https://api.github.com/repos/${repo}/contents/${skillFolderPath}?ref=${branch}`;
  const items = await getJSON(url);
  if (!Array.isArray(items)) return [];
  const files = [];
  for (const it of items) {
    if (it.type === 'file') {
      const txt = await getText(`https://api.github.com/repos/${repo}/contents/${it.path}?ref=${branch}`);
      files.push({ name: it.name, content: txt });
    } else if (it.type === 'dir') {
      const sub = await fetchSkillFiles(repo, branch, it.path);
      for (const s of sub) files.push({ name: path.join(it.name, s.name), content: s.content });
    }
  }
  return files;
}

async function installSkill(source, skill, targetDir) {
  const files = await fetchSkillFiles(source.repo, source.branch || 'main', skill.path);
  const dest = path.join(targetDir, skill.name);
  fs.mkdirSync(dest, { recursive: true });
  for (const f of files) {
    const fp = path.join(dest, f.name);
    fs.mkdirSync(path.dirname(fp), { recursive: true });
    fs.writeFileSync(fp, f.content, 'utf8');
  }
  return dest;
}

async function searchRepos(query) {
  const url = `https://api.github.com/search/code?q=${encodeURIComponent(query + ' filename:SKILL.md')}`;
  try {
    const r = await getJSON(url);
    return (r.items || []).slice(0, 30).map(it => ({
      repo: it.repository.full_name,
      path: it.path.replace(/\/SKILL\.md$/, ''),
      name: path.basename(path.dirname(it.path)),
      url: it.html_url
    }));
  } catch {
    return [];
  }
}

module.exports = { listSourceSkills, fetchSkillFiles, installSkill, searchRepos, token };
