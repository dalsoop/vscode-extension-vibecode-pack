// Conventional Commits for vscode-extension-mono. Enforced by:
//   - .gitlab-ci.yml `commit-lint` job (MR + push to main, gating)
//   - .git/hooks/commit-msg locally after `bash tools/install-hooks.sh`
//   - vibecode-commit-lint-check extension's Checks tree view (dogfood)
//
// All three call `npx commitlint` against this file.

module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // type-enum is conventional default — keep as is
    // 'type-enum' fallback: feat, fix, docs, chore, refactor, test, build, ci, perf, style, revert

    // scope-enum: every vibecode-* extension folder + meta scopes used in our history
    // Empty scope is allowed (level 1 = warning would be too noisy for cross-cutting work).
    'scope-enum': [2, 'always', [
      // extensions (kebab-cased folder names)
      'ai-md-system-init-this-folder',
      'browser-preview',
      'browser-preview-pro',
      'commit-lint-check',
      'env-viewer-encryption',
      'env-viewer-normal',
      'extension-menu-list',
      'mcp-list',
      'right-click-action-open-to-file',
      'right-click-sh-actions',
      'right-click-vsix-package-and-install',
      'show-file-lines',
      'skills-viewer',
      // legacy aliases that still appear in history
      'browser-preview',
      'rca-extensions',
      'rca-vsix-package-install',
      'agent-init-this-folder',
      'extensions',
      // meta scopes
      '.claude',
      'claude-codex-skills-viewer',
      'docs',
      'lint',
      'plan',
      'repo',
      'skills',
      'spec',
      'tools'
    ]],
    'scope-empty': [0],   // allow empty scope for cross-cutting commits like "chore: bump deps"
    'subject-case': [0],  // korean subjects don't have casing — turn off
    'header-max-length': [2, 'always', 100],
    // Bodies often contain auto-generated trailers (Co-Authored-By, URLs) and
    // verbose explanations; the conventional default of 100 cols is too tight.
    'body-max-line-length': [0],
    'footer-max-line-length': [0]
  }
};
