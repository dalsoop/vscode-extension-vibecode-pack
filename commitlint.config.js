module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [2, 'always', [
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
      'rca-extensions',
      'rca-vsix-package-install',
      'agent-init-this-folder',
      'extensions',
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
    'scope-empty': [0],
    'subject-case': [0],
    'header-max-length': [2, 'always', 100],
    'body-max-line-length': [0],
    'footer-max-line-length': [0]
  }
};
