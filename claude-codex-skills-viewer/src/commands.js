const vscode = require('vscode');
const fs = require('fs');
const path = require('path');
const os = require('os');
const state = require('./state');
const preview = require('./webview/preview');
const scaffold = require('./scaffold');
const instructions = require('./instructions');
const github = require('./github');
const { describeSkill } = require('./parser');

const t = (...a) => (vscode.l10n && vscode.l10n.t) ? vscode.l10n.t(...a) : a[0].replace(/\{(\d+)\}/g, (_, i) => a[+i + 1]);

function register(context, providers, browseProvider) {
  const all = [providers.installed, providers.userGlobal, providers.categories, providers.instructions, browseProvider].filter(Boolean);
  const refreshAll = () => all.forEach(p => p.refresh && p.refresh());

  const c = vscode.commands.registerCommand;

  context.subscriptions.push(
    c('claudeCodexSkills.refresh', refreshAll),

    c('claudeCodexSkills.search', async () => {
      const q = await vscode.window.showInputBox({
        prompt: t('Filter skills (name, description, when-to-use)'),
        placeHolder: t('leave empty to clear')
      });
      if (q === undefined) return;
      all.forEach(p => p.setFilter && p.setFilter(q));
    }),

    c('claudeCodexSkills.clearFilter', () => {
      all.forEach(p => p.setFilter && p.setFilter(''));
    }),

    c('claudeCodexSkills.previewSkill', (payload) => payload && preview.open(payload)),

    c('claudeCodexSkills.openSkillFile', (item) => {
      const p = item && (item._mdPath || (item._info && item._info.mdPath));
      if (p) vscode.window.showTextDocument(vscode.Uri.file(p));
    }),

    c('claudeCodexSkills.revealInFinder', (item) => {
      const target = item && (item._dir || (item._source && item._source.dir));
      if (target) vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(target));
    }),

    c('claudeCodexSkills.copyPath', async (item) => {
      if (item && item._dir) {
        await vscode.env.clipboard.writeText(item._dir);
        vscode.window.setStatusBarMessage(t('Copied: {0}', item._dir), 2000);
      }
    }),

    c('claudeCodexSkills.copyContent', async (item) => {
      const p = item && item._mdPath;
      if (!p) return;
      const txt = fs.readFileSync(p, 'utf8');
      await vscode.env.clipboard.writeText(txt);
      vscode.window.setStatusBarMessage('Copied SKILL.md', 2000);
    }),

    c('claudeCodexSkills.openInTerminal', (item) => {
      if (!item || !item._dir) return;
      const term = vscode.window.createTerminal({ name: path.basename(item._dir), cwd: item._dir });
      term.show();
    }),

    c('claudeCodexSkills.openSourceFolder', (item) => {
      const src = item && item._source;
      if (src) vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(src.dir));
    }),

    c('claudeCodexSkills.toggleFavorite', async (item) => {
      if (!item || !item._dir) return;
      const on = await state.toggleFavorite(item._dir);
      vscode.window.setStatusBarMessage(on ? '★ Added to favorites' : 'Removed from favorites', 2000);
      refreshAll();
    }),

    c('claudeCodexSkills.createSkill', async () => {
      const dir = await scaffold.runWizard();
      if (dir) refreshAll();
    }),

    c('claudeCodexSkills.deleteSkill', async (item) => {
      if (!item || !item._dir) return;
      if (item._source && item._source.readOnly) {
        vscode.window.showWarningMessage('Cannot delete read-only skill (bundled by extension).');
        return;
      }
      const ans = await vscode.window.showWarningMessage(
        `Delete skill folder "${path.basename(item._dir)}"?\n${item._dir}`,
        { modal: true }, 'Delete'
      );
      if (ans !== 'Delete') return;
      fs.rmSync(item._dir, { recursive: true, force: true });
      await state.removeInstallTime(item._dir);
      refreshAll();
      vscode.window.setStatusBarMessage('Skill deleted', 2000);
    }),

    c('claudeCodexSkills.installRemoteSkill', async (payload) => {
      const { source, skill } = payload || {};
      if (!source || !skill) return;
      const target = await vscode.window.showQuickPick([
        { label: 'Global (~/.claude/skills)', dir: path.join(os.homedir(), '.claude', 'skills') },
        { label: 'Global (~/.codex/skills)',  dir: path.join(os.homedir(), '.codex',  'skills') },
        ...(vscode.workspace.workspaceFolders ? [
          { label: 'Workspace (.claude/skills)', dir: path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, '.claude', 'skills') }
        ] : [])
      ], { placeHolder: `Install "${skill.name}" where?` });
      if (!target) return;
      await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: `Installing ${skill.name}...`,
        cancellable: false
      }, async () => {
        try {
          const dest = await github.installSkill(source, skill, target.dir);
          await state.markInstalled(dest);
          refreshAll();
          vscode.window.showInformationMessage(`Installed: ${dest}`);
        } catch (e) {
          vscode.window.showErrorMessage(`Install failed: ${e.message}`);
        }
      });
    }),

    c('claudeCodexSkills.searchGithub', async () => {
      const q = await vscode.window.showInputBox({ prompt: 'Search GitHub for skills (SKILL.md)', placeHolder: 'e.g. testing pytest' });
      if (!q) return;
      const results = await vscode.window.withProgress({
        location: vscode.ProgressLocation.Window,
        title: `Searching GitHub for "${q}"`
      }, () => github.searchRepos(q));
      if (!results.length) {
        vscode.window.showInformationMessage('No results found.');
        return;
      }
      const pick = await vscode.window.showQuickPick(
        results.map(r => ({ label: r.name, description: r.repo, detail: r.path, _r: r })),
        { placeHolder: `${results.length} results — select to install` }
      );
      if (!pick) return;
      await vscode.commands.executeCommand('claudeCodexSkills.installRemoteSkill', {
        source: { repo: pick._r.repo, branch: 'main' },
        skill: { name: pick._r.name, path: pick._r.path }
      });
    }),

    c('claudeCodexSkills.refreshRemote', () => browseProvider && browseProvider.refresh()),

    c('claudeCodexSkills.syncInstructions', async () => {
      const targets = Object.entries(instructions.TARGETS).map(([k, v]) => ({ label: v.label, key: k, picked: true }));
      const picked = await vscode.window.showQuickPick(targets, { canPickMany: true, placeHolder: 'Pick targets to sync' });
      if (!picked) return;
      const written = [];
      for (const p of picked) {
        try { written.push(await instructions.syncTarget(p.key)); } catch {}
      }
      vscode.window.showInformationMessage(`Synced ${written.length} file(s)`);
    }),

    c('claudeCodexSkills.syncInstructionsAll', async () => {
      const w = await instructions.syncAll();
      vscode.window.showInformationMessage(`Synced ${w.length} instruction file(s)`);
    }),

    c('claudeCodexSkills.removeInstructionBlock', async () => {
      const targets = Object.entries(instructions.TARGETS).map(([k, v]) => ({ label: v.label, key: k }));
      const pick = await vscode.window.showQuickPick(targets, { placeHolder: 'Remove ccskills block from which file?' });
      if (!pick) return;
      await instructions.removeBlock(pick.key);
      vscode.window.setStatusBarMessage('Block removed', 2000);
    }),

    c('claudeCodexSkills.openInstructionFile', async (payload) => {
      const abs = payload && payload.abs;
      if (!abs) return;
      if (!fs.existsSync(abs)) {
        const ans = await vscode.window.showInformationMessage(
          `${path.basename(abs)} does not exist. Create empty file?`, 'Create', 'Cancel'
        );
        if (ans !== 'Create') return;
        fs.mkdirSync(path.dirname(abs), { recursive: true });
        fs.writeFileSync(abs, '', 'utf8');
      }
      const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(abs));
      await vscode.window.showTextDocument(doc);
    }),

    c('claudeCodexSkills.syncToThisFile', async (item) => {
      const f = item && item._file;
      if (!f) return;
      const cfg = vscode.workspace.getConfiguration('claudeCodexSkills');
      const format = cfg.get('instructionFormat', 'ref');
      const block = instructions.renderBlock(format);
      fs.mkdirSync(path.dirname(f.abs), { recursive: true });
      const cur = fs.existsSync(f.abs) ? fs.readFileSync(f.abs, 'utf8') : '';
      const next = instructions.injectBlock(cur, block);
      fs.writeFileSync(f.abs, next, 'utf8');
      vscode.window.setStatusBarMessage(`Synced ccskills block → ${path.basename(f.abs)}`, 2500);
      refreshAll();
    }),

    c('claudeCodexSkills.removeBlockFromThisFile', async (item) => {
      const f = item && item._file;
      if (!f || !f.exists) return;
      const cur = fs.readFileSync(f.abs, 'utf8');
      const next = cur.replace(/\n?<!-- ccskills-START -->[\s\S]*?<!-- ccskills-END -->\n?/, '');
      fs.writeFileSync(f.abs, next, 'utf8');
      vscode.window.setStatusBarMessage(`Removed block from ${path.basename(f.abs)}`, 2500);
      refreshAll();
    }),

    c('claudeCodexSkills.createInstructionFile', async (item) => {
      const f = item && item._file;
      if (!f) return;
      fs.mkdirSync(path.dirname(f.abs), { recursive: true });
      fs.writeFileSync(f.abs, '', 'utf8');
      refreshAll();
      const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(f.abs));
      await vscode.window.showTextDocument(doc);
    }),

    c('claudeCodexSkills.reportBug', () =>
      vscode.env.openExternal(vscode.Uri.parse('https://github.com/dalsoop/claude-codex-skills-viewer/issues/new'))),

    c('claudeCodexSkills.openCatalog', () => {
      const ext = vscode.extensions.getExtension('dalsoop.claude-codex-skills-viewer');
      if (ext) {
        const p = path.join(ext.extensionPath, 'resources', 'catalog.json');
        vscode.window.showTextDocument(vscode.Uri.file(p));
      }
    }),

    vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('claudeCodexSkills')) refreshAll();
    })
  );
}

module.exports = { register };
