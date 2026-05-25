// Action → codicon name registry. Codicon list:
// https://microsoft.github.io/vscode-codicons/dist/codicon.html
// Used by hub.client.ts to render <span class="codicon codicon-xxx">.

const ICONS: Record<string, string> = {
  open: 'go-to-file',
  preview: 'preview',
  finder: 'folder-opened',
  fav: 'star-full',
  sync: 'sync',
  github: 'github',
  create: 'add',
  refresh: 'refresh',
  search: 'search',
  add: 'add',
  more: 'ellipsis'
};

function codiconFor(name: string): string {
  return ICONS[name] || 'symbol-method';
}
