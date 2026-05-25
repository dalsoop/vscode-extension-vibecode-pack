/// <reference path="../_refs.d.ts" />

namespace DetailClient {
  function escapeHtml(s: string): string {
    return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
  }
  function maskValue(v: string): string {
    if (v.length <= 4) return '•'.repeat(v.length);
    return v.slice(0, 2) + '••••' + v.slice(-2);
  }
  export function render(entry: DetailContract.SerializedMcpEntry): void {
    current = entry;
    const envRows = Object.entries(entry.env ?? {}).map(([k, v]) => `
      <div class="env-row">
        <code class="env-key">${escapeHtml(k)}</code>
        <span class="env-eq">=</span>
        <code class="env-val" data-key="${escapeHtml(k)}" data-full="${escapeHtml(v)}">${escapeHtml(maskValue(v))}</code>
        <button class="env-toggle" data-key="${escapeHtml(k)}">show</button>
      </div>
    `).join('');
    elements.root.innerHTML = `
      <header>
        <h1>${escapeHtml(entry.name)} <span class="badge">${escapeHtml(entry.transport)}</span></h1>
        <div class="meta">${escapeHtml(entry.sourceLabel)} · ${escapeHtml(entry.originLabel)}</div>
        <div class="actions">
          <button data-action="openSource">Open source</button>
          <button data-action="copyCommand">Copy command</button>
          <button data-action="refresh">Refresh</button>
        </div>
      </header>
      <section>
        ${entry.command ? `<h2>Command</h2><pre><code>${escapeHtml(entry.command)} ${escapeHtml((entry.args ?? []).join(' '))}</code></pre>` : ''}
        ${entry.url ? `<h2>URL</h2><pre><code>${escapeHtml(entry.url)}</code></pre>` : ''}
        ${entry.cwd ? `<h2>Working directory</h2><pre><code>${escapeHtml(entry.cwd)}</code></pre>` : ''}
        ${envRows ? `<h2>Environment</h2><div class="env">${envRows}</div>` : ''}
        <h2>Raw JSON</h2>
        <details><summary>Show</summary><pre><code>${escapeHtml(entry.rawJson)}</code></pre></details>
      </section>
    `;
  }
}
