const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const os = require('os');

const START = '<!-- ccskills-START -->';
const END = '<!-- ccskills-END -->';

// Known instruction-file shapes.
const FILE_KINDS = {
  'CLAUDE.md':                       { tool: 'claude',   label: 'CLAUDE.md',   note: 'Claude per-project memory' },
  'AGENTS.md':                       { tool: 'codex',    label: 'AGENTS.md',   note: 'Codex / generic agent memory' },
  '.cursor/rules':                   { tool: 'cursor',   label: '.cursor/rules', note: 'Cursor rules' },
  '.cursorrules':                    { tool: 'cursor',   label: '.cursorrules', note: 'Legacy Cursor rules' },
  '.windsurfrules':                  { tool: 'windsurf', label: '.windsurfrules', note: 'Windsurf rules' },
  '.clinerules':                     { tool: 'cline',    label: '.clinerules', note: 'Cline rules' },
  '.github/copilot-instructions.md': { tool: 'copilot',  label: 'copilot-instructions.md', note: 'GitHub Copilot' },
  '.copilot/instructions.md':        { tool: 'copilot',  label: 'copilot instructions.md', note: 'GitHub Copilot (legacy)' }
};

const GLOBAL_FILES = [
  { tool: 'claude',  label: '~/.claude/CLAUDE.md',  abs: path.join(os.homedir(), '.claude', 'CLAUDE.md') },
  { tool: 'claude',  label: '~/CLAUDE.md',          abs: path.join(os.homedir(), 'CLAUDE.md') },
  { tool: 'codex',   label: '~/.codex/AGENTS.md',   abs: path.join(os.homedir(), '.codex', 'AGENTS.md') },
  { tool: 'codex',   label: '~/AGENTS.md',          abs: path.join(os.homedir(), 'AGENTS.md') },
  { tool: 'copilot', label: '~/.copilot/instructions.md', abs: path.join(os.homedir(), '.copilot', 'instructions.md') },
  { tool: 'agents',  label: '~/.agents/AGENTS.md',  abs: path.join(os.homedir(), '.agents', 'AGENTS.md') }
];

const PER_SKILL_FILES = ['CLAUDE.md', 'AGENTS.md', 'README.md', 'NOTES.md'];

function inspect(abs) {
  let exists = false, size = 0, mtime = 0, hasBlock = false, blockSize = 0;
  try {
    const st = fs.statSync(abs);
    exists = st.isFile();
    size = st.size;
    mtime = st.mtimeMs;
    if (exists && size < 500_000) {
      const raw = fs.readFileSync(abs, 'utf8');
      const i = raw.indexOf(START);
      const j = raw.indexOf(END);
      if (i !== -1 && j !== -1 && j > i) {
        hasBlock = true;
        blockSize = j - i + END.length;
      }
    }
  } catch {}
  return { abs, exists, size, mtime, hasBlock, blockSize };
}

function listWorkspaceFiles() {
  const ws = vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders[0];
  if (!ws) return [];
  const root = ws.uri.fsPath;
  const out = [];
  for (const [rel, meta] of Object.entries(FILE_KINDS)) {
    const abs = path.join(root, rel);
    out.push({
      kind: 'workspace', tool: meta.tool, label: meta.label, note: meta.note,
      rel, abs, ...inspect(abs)
    });
  }
  return out;
}

function listGlobalFiles() {
  return GLOBAL_FILES.map(f => ({
    kind: 'global', tool: f.tool, label: f.label, note: '',
    rel: null, ...f, ...inspect(f.abs)
  }));
}

function listPerSkillFiles(skillDir) {
  const out = [];
  for (const name of PER_SKILL_FILES) {
    if (name === 'README.md' || name === 'NOTES.md') {
      const abs = path.join(skillDir, name);
      const i = inspect(abs);
      if (i.exists) out.push({ kind: 'per-skill', label: name, abs, ...i });
    } else {
      const abs = path.join(skillDir, name);
      const i = inspect(abs);
      if (i.exists) out.push({ kind: 'per-skill', label: name, abs, ...i });
    }
  }
  return out;
}

function formatBytes(n) {
  if (n < 1024) return `${n}B`;
  if (n < 1024 * 1024) return `${(n/1024).toFixed(1)}KB`;
  return `${(n/1024/1024).toFixed(1)}MB`;
}

function formatAge(ms) {
  if (!ms) return '';
  const d = (Date.now() - ms) / 1000;
  if (d < 60) return `${Math.floor(d)}s ago`;
  if (d < 3600) return `${Math.floor(d/60)}m ago`;
  if (d < 86400) return `${Math.floor(d/3600)}h ago`;
  return `${Math.floor(d/86400)}d ago`;
}

module.exports = {
  FILE_KINDS, GLOBAL_FILES, PER_SKILL_FILES, START, END,
  inspect, listWorkspaceFiles, listGlobalFiles, listPerSkillFiles,
  formatBytes, formatAge
};
