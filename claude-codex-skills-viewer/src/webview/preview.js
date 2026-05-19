const vscode = require('vscode');
const { describeSkill } = require('../parser');

function renderMarkdownToHtml(md) {
  // Minimal markdown renderer (headings, lists, inline code, code blocks, bold, italic, links).
  if (!md) return '';
  const esc = s => s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

  // code blocks
  let html = esc(md).replace(/```([a-zA-Z0-9_+-]*)\n([\s\S]*?)```/g, (_, lang, code) =>
    `<pre><code class="lang-${lang}">${code}</code></pre>`);

  // headings
  html = html.replace(/^(#{1,6})\s+(.+)$/gm, (_, h, t) => {
    const lvl = h.length;
    return `<h${lvl}>${t}</h${lvl}>`;
  });

  // bullets
  html = html.replace(/(?:^|\n)((?:- .+\n?)+)/g, m => {
    const items = m.trim().split('\n').map(l => `<li>${l.replace(/^- /, '')}</li>`).join('');
    return `<ul>${items}</ul>`;
  });

  // bold / italic / inline code / links
  html = html
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
    .replace(/`([^`\n]+)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, '<a href="$2">$1</a>');

  // paragraphs
  html = html.replace(/\n{2,}/g, '</p><p>');
  if (!html.startsWith('<')) html = '<p>' + html + '</p>';
  return html;
}

function renderHtml(webview, info, dir, source) {
  const esc = s => String(s || '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const cats = info.categories || [];
  const tags = cats.map(c => `<span class="tag">${esc(c)}</span>`).join(' ');
  const bodyHtml = renderMarkdownToHtml(info.body || info.raw || '');
  const tierBadge = `<span class="badge tier">${esc(source.tier || source.scope || '')}</span>`;
  return `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; img-src ${webview.cspSource} data:; script-src 'none';">
<style>
  :root { --r: 6px; }
  body { font: 13px -apple-system, system-ui, sans-serif; padding: 24px 32px; color: var(--vscode-foreground); background: var(--vscode-editor-background); line-height: 1.65; }
  h1 { font-size: 24px; margin: 0 0 6px; letter-spacing: -0.3px; }
  h2 { font-size: 18px; margin: 24px 0 10px; padding-bottom: 6px; border-bottom: 1px solid var(--vscode-panel-border); }
  h3 { font-size: 15px; margin: 18px 0 8px; }
  .meta { color: var(--vscode-descriptionForeground); font-size: 12px; margin-bottom: 18px; display: flex; gap: 6px; flex-wrap: wrap; align-items: center; }
  .badge { display: inline-block; padding: 2px 9px; border-radius: 10px; background: var(--vscode-badge-background); color: var(--vscode-badge-foreground); font-size: 11px; font-weight: 600; }
  .badge.tier { background: var(--vscode-statusBarItem-prominentBackground); }
  .tag { display: inline-block; padding: 1px 8px; border-radius: var(--r); border: 1px solid var(--vscode-panel-border); font-size: 11px; color: var(--vscode-descriptionForeground); }
  .desc { padding: 14px 16px; background: var(--vscode-textBlockQuote-background); border-left: 3px solid var(--vscode-textBlockQuote-border); margin: 14px 0 22px; border-radius: var(--r); font-size: 13px; }
  .when { padding: 12px 16px; background: var(--vscode-input-background); border-radius: var(--r); margin: 12px 0 22px; }
  .when strong { color: var(--vscode-textPreformat-foreground, var(--vscode-foreground)); font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; display: block; margin-bottom: 4px; }
  pre { background: var(--vscode-textCodeBlock-background); padding: 12px 14px; border-radius: var(--r); overflow-x: auto; font-size: 12.5px; line-height: 1.5; }
  code { background: var(--vscode-textCodeBlock-background); padding: 1px 6px; border-radius: 3px; font-size: 12px; font-family: ui-monospace, monospace; }
  pre code { background: transparent; padding: 0; }
  .path { font-family: ui-monospace, monospace; font-size: 11px; color: var(--vscode-descriptionForeground); word-break: break-all; padding: 8px 10px; background: var(--vscode-input-background); border-radius: var(--r); margin: 12px 0; }
  ul { padding-left: 22px; margin: 8px 0; }
  li { margin: 2px 0; }
  a { color: var(--vscode-textLink-foreground); text-decoration: none; }
  a:hover { text-decoration: underline; }
  hr { border: none; border-top: 1px solid var(--vscode-panel-border); margin: 20px 0; }
  .body { font-size: 13px; }
</style>
</head><body>
<h1>${esc(info.name || dir.split('/').pop())}</h1>
<div class="meta">
  ${tierBadge}
  <span class="badge">${esc(source.label)}</span>
  <span class="badge">${esc(source.scope || '')}</span>
  ${tags}
</div>
${info.description ? `<div class="desc">${esc(info.description)}</div>` : ''}
${info.whenToUse ? `<div class="when"><strong>When to use</strong>${esc(info.whenToUse)}</div>` : ''}
<div class="path">${esc(info.mdPath || dir)}</div>
<hr>
<div class="body">${bodyHtml}</div>
</body></html>`;
}

let active = null;

function open(payload) {
  const { dir, name, source } = payload;
  const info = describeSkill(dir);
  if (active) {
    active.title = name;
    active.webview.html = renderHtml(active.webview, info, dir, source);
    active.reveal(vscode.ViewColumn.Beside, true);
    return;
  }
  active = vscode.window.createWebviewPanel(
    'claudeCodexSkillsPreview', name,
    { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true },
    { enableScripts: false, retainContextWhenHidden: true }
  );
  active.iconPath = new vscode.ThemeIcon('book');
  active.webview.html = renderHtml(active.webview, info, dir, source);
  active.onDidDispose(() => { active = null; });
}

module.exports = { open };
