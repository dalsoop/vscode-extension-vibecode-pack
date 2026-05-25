// Top header: title + meta badges + toolbar.

namespace HeaderSection {
  export function render(): void {
    const p = P.payload();
    if (!p) return;
    const { meta } = p;
    P.$('title').textContent = meta.name;

    const roBadge = meta.source.readOnly
      ? `<span class="badge ro" title="${P.esc(P.t('preview.badge.readOnly.tooltip'))}">${P.esc(P.t('preview.badge.readOnly.label'))}</span>`
      : '';
    const extBadge = P.externalDirty()
      ? `<span class="badge warn">${P.esc(P.t('preview.badge.externalChange'))}</span>`
      : '';

    const mirrorCount = (meta.mirrors || []).reduce((a, m) => a + m.targets.length, 0);
    const drift = (meta.mirrorDrift || []).filter(d => !d.inSync);
    const driftCount = drift.length;

    let mirrorBadge = '';
    if (mirrorCount) {
      const tooltip = (meta.mirrors || [])
        .map(m => {
          const tag = m.alwaysMirror ? P.t('preview.mirror.alwaysTag') : '';
          const label =
            (m.source === 'group'
              ? m.groupLabel || P.t('preview.mirror.group.label')
              : P.t('preview.mirror.skillByName')) + tag;
          const lines = m.targets.map(target => {
            const driftEntry = (meta.mirrorDrift || []).find(d => d.path === target);
            const mark = !driftEntry
              ? P.t('preview.mirror.mark.unknown')
              : !driftEntry.exists
                ? P.t('preview.mirror.mark.missing')
                : driftEntry.inSync
                  ? P.t('preview.mirror.mark.ok')
                  : P.t('preview.mirror.mark.differs');
            return `  ${mark} ${target}`;
          });
          return `${label}:\n${lines.join('\n')}`;
        })
        .join('\n\n');
      if (driftCount > 0) {
        mirrorBadge = `<span class="badge mirror drift" title="${P.esc(tooltip)}">${P.ico('warning')} ${P.esc(P.t('preview.mirror.driftBadge', driftCount, mirrorCount))}</span>`;
      } else {
        mirrorBadge = `<span class="badge mirror ok" title="${P.esc(tooltip)}">${P.ico('link')} ${P.esc(P.t('preview.mirror.okBadge', mirrorCount))}</span>`;
      }
    }

    P.$('meta').innerHTML = [
      `<span class="badge">${P.esc(meta.source.label)}</span>`,
      `<span class="badge">${P.esc(meta.source.scope)}</span>`,
      roBadge,
      extBadge,
      mirrorBadge,
      ...meta.categories.map(c => `<span class="badge">${P.esc(c)}</span>`),
      `<span class="score ${meta.totalScore.color}" title="${P.esc(meta.totalScore.issues.join('\n') || P.t('preview.score.noIssues'))}">${P.esc(P.t('preview.score.fmt', meta.totalScore.pct, meta.totalScore.grade))}</span>`,
      `<span style="opacity:0.7">${P.esc(P.t('preview.stats.lineCharsAge', meta.lines, (meta.chars / 1024).toFixed(1), Math.floor(meta.ageDays)))}</span>`
    ].join('');

    const showScore = meta.showScoreBreakdown;
    const driftPeers = (meta.mirrorDrift || []).filter(d => !d.inSync);
    const mirrorButtons: string[] = [];
    if (mirrorCount > 0 && driftPeers.length > 0) {
      mirrorButtons.push(
        `<button class="tbtn danger" data-act="mirror-sync" title="${P.esc(P.t('preview.toolbar.mirrorSync.title'))}">${P.ico('cloud-upload')} ${P.esc(P.t('preview.toolbar.mirrorSync.label', driftPeers.length))}</button>`
      );
      const firstDrift = driftPeers.find(d => d.exists);
      if (firstDrift) {
        mirrorButtons.push(
          `<button class="tbtn" data-act="mirror-diff" data-peer="${P.esc(firstDrift.path)}" title="${P.esc(P.t('preview.toolbar.mirrorDiff.title', firstDrift.path))}">${P.ico('diff')} ${P.esc(P.t('preview.toolbar.mirrorDiff.label'))}</button>`
        );
      }
    }

    P.$('toolbar').innerHTML = [
      `<button class="tbtn" data-act="open">${P.ico('go-to-file')} ${P.esc(P.t('preview.toolbar.open'))}</button>`,
      `<button class="tbtn" data-act="copy-md">${P.ico('copy')} ${P.esc(P.t('preview.toolbar.copyMd'))}</button>`,
      `<button class="tbtn" data-act="copy-path">${P.ico('files')} ${P.esc(P.t('preview.toolbar.copyPath'))}</button>`,
      `<button class="tbtn" data-act="finder">${P.ico('folder-opened')} ${P.esc(P.t('preview.toolbar.finder'))}</button>`,
      `<button class="tbtn" data-act="terminal">${P.ico('terminal')} ${P.esc(P.t('preview.toolbar.terminal'))}</button>`,
      `<button class="tbtn ${showScore ? 'active' : ''}" data-act="toggle-score" title="${P.esc(P.t('preview.toolbar.toggleScoreTitle'))}">${P.ico(showScore ? 'eye' : 'eye-closed')} ${P.esc(P.t(showScore ? 'preview.toolbar.hideScores' : 'preview.toolbar.showScores'))}</button>`,
      ...mirrorButtons,
      `<button class="tbtn" data-act="refresh">${P.ico('refresh')} ${P.esc(P.t('preview.toolbar.refresh'))}</button>`
    ].join('');

    P.$('toolbar')
      .querySelectorAll<HTMLButtonElement>('.tbtn')
      .forEach(b => {
        b.onclick = () => {
          const a = b.dataset.act;
          if (a === 'toggle-score') {
            P.vscode.postMessage({ type: 'toggle-score-breakdown', value: !showScore });
          } else if (a === 'mirror-sync') {
            const willCreate = P.t('preview.confirm.mirrorSync.willCreate');
            const detail = driftPeers.map(d => `  • ${d.path}${d.exists ? '' : willCreate}`).join('\n');
            if (confirm(P.t('preview.confirm.mirrorSync', driftPeers.length, detail))) {
              P.vscode.postMessage({ type: 'mirror-sync-from-here' });
            }
          } else if (a === 'mirror-diff') {
            P.vscode.postMessage({ type: 'mirror-diff', peer: b.dataset.peer });
          } else {
            P.vscode.postMessage({ type: a });
          }
        };
      });
  }
}
