import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import MarkdownIt from 'markdown-it';
import { describeSkill, parseFrontmatter, tryAutoFixFrontmatter } from '../parser';
import { score } from '../analyzer';

const md = new MarkdownIt({ html: false, linkify: true, breaks: false, typographer: false });
import { parseSections, replaceSection, removeSection, sectionBody, type Section } from './sections';
import { scoreSection, type SectionScore } from './sectionScore';
import { readConfig } from '../config';
import { findMirrors, mirrorWrite } from '../mirrors';
import { listPerSkillFiles } from '../instructionsDetector';
import { log } from '../logger';
import { buildHtml } from './view';

export interface PreviewPayload {
  dir: string;
  mdPath?: string | null;
  name: string;
  source: { label: string; scope: string; tier?: string; readOnly?: boolean };
}

interface SectionDto {
  id: string;
  canonical?: string;
  kind: string;
  level?: number;
  heading?: string;
  raw: string;
  body: string;
  rendered: string;
  score: SectionScore;
}

interface PayloadDto {
  meta: {
    name: string;
    description?: string;
    source: { label: string; scope: string; readOnly: boolean };
    abs: string;
    categories: string[];
    totalScore: SectionScore;
    lines: number;
    chars: number;
    ageDays: number;
    frontmatterError?: { message: string; line?: number; column?: number; snippet?: string } | null;
    showScoreBreakdown: boolean;
    mirrors: Array<{ source: 'group' | 'skill-by-name'; groupLabel?: string; targets: string[] }>;
  };
  sections: SectionDto[];
  aux: Array<{ name: string; abs: string; size: number; age: string }>;
  toc: Array<{ id: string; label: string; level: number; score: number }>;
}

function renderMd(input: string): string {
  if (!input) return '';
  return md.render(input);
}

function ageString(ms: number): string {
  const d = (Date.now() - ms) / 1000;
  if (d < 60) return `${Math.floor(d)}s ago`;
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return `${Math.floor(d / 86400)}d ago`;
}

// ── State per open panel ────────────────────────────────────────────────
interface PanelState {
  panel: vscode.WebviewPanel;
  payload: PreviewPayload;
  watcher: fs.FSWatcher | null;
  editingSections: Set<string>;
  configListener?: vscode.Disposable;
}
let active: PanelState | null = null;

// ── Save validation ─────────────────────────────────────────────────────
function validateCandidate(
  originalDoc: string,
  sectionId: string,
  newSectionRaw: string
): {
  ok: boolean;
  error?: string;
  next?: string;
} {
  let next: string;
  try {
    next = replaceSection(originalDoc, sectionId, newSectionRaw);
  } catch (e: any) {
    return { ok: false, error: e.message };
  }

  // Re-parse must still find a section with the same id, otherwise the edit
  // structurally broke the doc.
  let sections: Section[];
  try {
    sections = parseSections(next);
  } catch (e: any) {
    return { ok: false, error: `Parse failed: ${e.message}` };
  }

  if (!sections.find(s => s.id === sectionId)) {
    return { ok: false, error: `Edit removed section "${sectionId}" structure` };
  }

  // Frontmatter must keep --- fences
  if (sectionId === 'frontmatter') {
    const fm = sections.find(s => s.id === 'frontmatter');
    if (!fm || !fm.raw.startsWith('---\n') || !fm.raw.endsWith('---')) {
      return { ok: false, error: 'Frontmatter must start and end with ---' };
    }
  }

  // Sanity size cap (1MB)
  if (next.length > 1_000_000) {
    return { ok: false, error: 'File would exceed 1MB' };
  }
  return { ok: true, next };
}

// ── Payload builder ─────────────────────────────────────────────────────
function buildPayload(p: PreviewPayload): PayloadDto | null {
  const mdPath = p.mdPath || null;
  if (!mdPath || !fs.existsSync(mdPath)) return null;
  const raw = fs.readFileSync(mdPath, 'utf8');
  const sections = parseSections(raw).map((s): SectionDto => {
    const scoreResult = scoreSection(s, mdPath);
    const body = sectionBody(s);
    return {
      id: s.id,
      canonical: s.canonical,
      kind: s.kind,
      level: s.level,
      heading: s.heading,
      raw: s.raw,
      body,
      rendered: renderMd(s.canonical === 'frontmatter' ? '```yaml\n' + body + '\n```' : s.raw),
      score: scoreResult
    };
  });

  const { meta = {} } = parseFrontmatter(mdPath);
  const info = describeSkill(p.dir);
  const total = score({ name: p.name, dir: p.dir, mdPath });
  const st = fs.statSync(mdPath);

  const aux = listPerSkillFiles(p.dir)
    .filter(f => f.label !== 'SKILL.md')
    .map(f => ({ name: f.label, abs: f.abs, size: f.size, age: ageString(f.mtime) }));

  return {
    meta: {
      name: meta.name || p.name,
      description: meta.description || undefined,
      source: { label: p.source.label, scope: p.source.scope, readOnly: !!p.source.readOnly },
      abs: mdPath,
      categories: info.categories,
      totalScore: {
        pct: total.pct,
        earned: total.pct,
        total: 100,
        grade: total.grade === '-' ? 'F' : total.grade,
        color: total.color === 'gray' ? 'red' : total.color,
        rules: [],
        issues: total.issues
      },
      lines: raw.split('\n').length,
      chars: raw.length,
      ageDays: (Date.now() - st.mtimeMs) / (1000 * 60 * 60 * 24),
      frontmatterError: info.frontmatterError,
      showScoreBreakdown: readConfig().showScoreBreakdown,
      mirrors: findMirrors(mdPath).map(m => ({
        source: m.source,
        groupLabel: m.groupLabel,
        targets: m.targets
      }))
    },
    sections,
    aux,
    toc: sections.map(s => ({
      id: s.id,
      label: s.heading || (s.canonical === 'frontmatter' ? 'Frontmatter' : s.id),
      level: s.level ?? (s.canonical === 'frontmatter' ? 0 : 2),
      score: s.score.pct
    }))
  };
}

function send(panel: vscode.WebviewPanel, type: string, extra: Record<string, any> = {}): void {
  panel.webview.postMessage({ type, ...extra });
}

function sendPayload(s: PanelState, type: 'payload' | 'saved' | 'external-change' = 'payload'): void {
  const dto = buildPayload(s.payload);
  if (dto) send(s.panel, type, { payload: dto });
}

// ── External file watcher ───────────────────────────────────────────────
function setupWatcher(s: PanelState): void {
  const mdPath = s.payload.mdPath;
  if (!mdPath) return;
  let lastMtime = 0;
  try {
    lastMtime = fs.statSync(mdPath).mtimeMs;
  } catch {}
  s.watcher = fs.watch(mdPath, () => {
    try {
      const cur = fs.statSync(mdPath).mtimeMs;
      if (cur === lastMtime) return;
      lastMtime = cur;
      if (s.editingSections.size > 0) {
        send(s.panel, 'external-change', { editing: [...s.editingSections] });
      } else {
        sendPayload(s);
      }
    } catch {}
  });
}

// ── Messages ────────────────────────────────────────────────────────────
async function handleMessage(msg: any, s: PanelState): Promise<void> {
  if (!msg) return;
  const mdPath = s.payload.mdPath;
  if (!mdPath) return;
  const readOnly = !!s.payload.source.readOnly;

  switch (msg.type) {
    case 'ready':
    case 'refresh':
      sendPayload(s);
      return;

    case 'editing-start':
      if (msg.sectionId) s.editingSections.add(msg.sectionId);
      return;
    case 'editing-stop':
      if (msg.sectionId) s.editingSections.delete(msg.sectionId);
      return;

    case 'toggle-score-breakdown': {
      const cfg = vscode.workspace.getConfiguration('claudeCodexSkills');
      await cfg.update('showScoreBreakdown', !!msg.value, vscode.ConfigurationTarget.Global);
      sendPayload(s);
      return;
    }

    case 'open':
      await vscode.window.showTextDocument(vscode.Uri.file(mdPath));
      return;
    case 'open-file':
      if (msg.path && fs.existsSync(msg.path)) {
        await vscode.window.showTextDocument(vscode.Uri.file(msg.path));
      }
      return;
    case 'copy-md':
      await vscode.env.clipboard.writeText(fs.readFileSync(mdPath, 'utf8'));
      vscode.window.setStatusBarMessage('Copied SKILL.md', 2000);
      return;
    case 'copy-path':
      await vscode.env.clipboard.writeText(s.payload.dir);
      vscode.window.setStatusBarMessage(`Copied: ${s.payload.dir}`, 2000);
      return;
    case 'finder':
      vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(s.payload.dir));
      return;
    case 'terminal': {
      const term = vscode.window.createTerminal({ name: path.basename(s.payload.dir), cwd: s.payload.dir });
      term.show();
      return;
    }

    case 'save-section': {
      if (readOnly) {
        send(s.panel, 'save-error', { error: 'Skill is read-only (bundled by an extension).' });
        return;
      }
      const original = fs.readFileSync(mdPath, 'utf8');
      const result = validateCandidate(original, msg.sectionId, msg.content);
      if (!result.ok || !result.next) {
        send(s.panel, 'save-error', { error: result.error || 'Validation failed' });
        vscode.window.showErrorMessage(`Save aborted: ${result.error}`);
        return;
      }
      fs.writeFileSync(mdPath, result.next, 'utf8');

      // Mirror to peers if requested (client only sets this when user confirms).
      if (msg.mirror) {
        const targets = findMirrors(mdPath).flatMap(m => m.targets);
        if (targets.length) {
          const wr = mirrorWrite(mdPath, targets, result.next);
          const msgs: string[] = [];
          if (wr.written.length) msgs.push(`mirrored to ${wr.written.length}`);
          if (wr.skipped.length) msgs.push(`${wr.skipped.length} skipped`);
          vscode.window.setStatusBarMessage(`Saved + ${msgs.join(', ')}`, 3500);
          if (wr.skipped.length) {
            const detail = wr.skipped.map(x => `${x.path}: ${x.reason}`).join('\n');
            vscode.window.showWarningMessage(`Some mirror targets skipped:\n${detail}`);
          }
        } else {
          vscode.window.setStatusBarMessage(`Saved section "${msg.sectionId}"`, 2500);
        }
      } else {
        vscode.window.setStatusBarMessage(`Saved section "${msg.sectionId}"`, 2500);
      }
      s.editingSections.delete(msg.sectionId);
      sendPayload(s, 'saved');
      return;
    }

    case 'quick-fix': {
      if (readOnly) return;
      const fixed = applyQuickFix(mdPath, msg.sectionId, msg.fix);
      if (!fixed) {
        send(s.panel, 'save-error', { error: `Cannot apply fix: ${msg.fix}` });
        return;
      }
      sendPayload(s, 'saved');
      return;
    }

    case 'autofix-frontmatter': {
      if (readOnly) {
        send(s.panel, 'save-error', { error: 'Skill is read-only.' });
        return;
      }
      const result = tryAutoFixFrontmatter(mdPath);
      if (!result.applied) {
        send(s.panel, 'save-error', {
          error: `Auto-fix didn't apply: ${result.error}. Try opening the file manually.`
        });
      } else {
        vscode.window.setStatusBarMessage('Frontmatter auto-fixed', 2500);
        sendPayload(s, 'saved');
      }
      return;
    }
    case 'open-at-line': {
      const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(mdPath));
      const editor = await vscode.window.showTextDocument(doc);
      const line = Math.max(0, (msg.line || 1) - 1);
      const col = Math.max(0, (msg.column || 1) - 1);
      const pos = new vscode.Position(line, col);
      editor.selection = new vscode.Selection(pos, pos);
      editor.revealRange(new vscode.Range(pos, pos), vscode.TextEditorRevealType.InCenter);
      return;
    }

    case 'delete-section': {
      if (readOnly) {
        send(s.panel, 'save-error', { error: 'Skill is read-only.' });
        return;
      }
      // Inline confirm is the user-facing safety net; reject anything that
      // didn't go through that path.
      if (!msg.confirmed) {
        send(s.panel, 'save-error', { error: 'Delete must be confirmed inline.' });
        return;
      }
      const original = fs.readFileSync(mdPath, 'utf8');
      try {
        const next = removeSection(original, msg.sectionId);
        fs.writeFileSync(mdPath, next, 'utf8');
        s.editingSections.delete(msg.sectionId);
        vscode.window.setStatusBarMessage(`Deleted section "${msg.sectionId}"`, 2500);
        sendPayload(s, 'saved');
      } catch (e: any) {
        send(s.panel, 'save-error', { error: e.message });
      }
      return;
    }
  }
}

// ── Quick fixes ─────────────────────────────────────────────────────────
function applyQuickFix(mdPath: string, sectionId: string, fix: string): boolean {
  const original = fs.readFileSync(mdPath, 'utf8');
  const sections = parseSections(original);
  const target = sections.find(x => x.id === sectionId);
  if (!target) return false;

  let newRaw = target.raw;
  const emojiRe = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2300}-\u{23FF}\u{2900}-\u{297F}]/gu;

  switch (fix) {
    case 'strip-emoji':
      newRaw = newRaw.replace(emojiRe, '').replace(/  +/g, ' ');
      break;
    case 'trim-desc-200':
      newRaw = newRaw.replace(/^(description:\s*)(.+)$/m, (_m, prefix, val) => prefix + val.slice(0, 200));
      break;
    case 'add-when-to-use':
      // append a stub section before the next H2 — we replace the section with itself + appended stub
      // simpler: write a separate section. handled outside this helper.
      return false;
    default:
      return false;
  }
  if (newRaw === target.raw) return false;
  const next = replaceSection(original, sectionId, newRaw);
  fs.writeFileSync(mdPath, next, 'utf8');
  return true;
}

export function open(payload: PreviewPayload, extensionPath: string): void {
  if (active) {
    active.payload = payload;
    active.editingSections.clear();
    active.panel.title = payload.name;
    active.panel.webview.html = buildHtml(active.panel.webview, extensionPath);
    active.panel.reveal(vscode.ViewColumn.Beside, true);
    if (active.watcher) {
      active.watcher.close();
      active.watcher = null;
    }
    setupWatcher(active);
    sendPayload(active);
    return;
  }
  const panel = vscode.window.createWebviewPanel(
    'claudeCodexSkillsPreview',
    payload.name,
    { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true },
    {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [vscode.Uri.file(extensionPath)]
    }
  );
  panel.iconPath = new vscode.ThemeIcon('book');
  panel.webview.html = buildHtml(panel.webview, extensionPath);

  const state: PanelState = { panel, payload, watcher: null, editingSections: new Set() };
  active = state;
  setupWatcher(state);

  state.configListener = vscode.workspace.onDidChangeConfiguration(e => {
    if (e.affectsConfiguration('claudeCodexSkills.showScoreBreakdown')) sendPayload(state);
  });

  panel.webview.onDidReceiveMessage(msg => {
    handleMessage(msg, state).catch(e => log.error('preview msg', e));
  });
  panel.onDidDispose(() => {
    if (state.watcher) state.watcher.close();
    if (state.configListener) state.configListener.dispose();
    if (active === state) active = null;
  });
}
