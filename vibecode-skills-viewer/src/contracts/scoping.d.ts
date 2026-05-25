// Ambient global types shared across the extension and all webview clients.
// Each file under src/contracts/ declares additions to `Contracts` and contains
// no top-level import/export so it stays compatible with both the extension's
// commonjs compilation and the webview clients' `module: "none"` + outFile
// compilation. To use, write `Contracts.Foo` anywhere; no import needed.

declare namespace Contracts {
  // Standard built-in tool ids. User can add more at runtime — code that
  // checks ids should treat this as an open set (use ToolId for typing, but
  // never assume the union is exhaustive).
  type ToolId =
    | 'claude'
    | 'codex'
    | 'copilot'
    | 'cursor'
    | 'gemini'
    | 'windsurf'
    | 'cline'
    | 'agents'
    | 'extension'
    | 'custom'
    | (string & {});

  type ScopeId = 'global' | 'workspace' | 'extension' | 'this folder';
  type ScopeFilter = 'all' | 'global' | 'workspace' | 'this';
  type TabId = 'skill' | 'rootmd' | 'agent' | 'memory';
  type ActionName = 'open' | 'preview' | 'finder' | 'fav' | 'sync' | 'create';

  type RootScope = 'global' | 'workspace';
  type RootLayout = 'folder-tree' | 'rules-file' | 'single-md';

  type LocaleSetting = 'auto' | 'en' | 'ko';
  type InstructionFormat = 'ref' | 'compact' | 'full' | 'legacy';

  interface WebviewI18n {
    locale: string;
    dict: Record<string, string>;
  }
}
