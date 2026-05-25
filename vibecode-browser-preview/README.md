# vibecode-browser-preview

Live-preview HTML files inside VSCode. Double-click any `.html` (or `.htm`) in the workspace and a webview opens with the page rendered through a local HTTP server rooted at your workspace folder. Save any file in the workspace and the preview auto-reloads.

## How it works

- Registered as a `customEditor` with `priority: default` for `*.html` / `*.htm` — double-clicking opens the preview instead of the text editor.
- A Node HTTP server binds to `127.0.0.1:0` (kernel picks the port) and serves the workspace folder statically. One server per workspace root, lazily started, closed on last preview close.
- The webview renders a toolbar + an `<iframe>` pointing at `http://127.0.0.1:PORT/<relative-path>`.
- A workspace `FileSystemWatcher` debounces (200ms) all file changes and triggers an iframe `src` cache-bust. `node_modules`, `.git`, `dist`, `out` are ignored.

## Toolbar

- **↻ Reload** — force an immediate reload
- **📝 Edit Source** — open the same `.html` file in a text editor beside the preview
- **↗ Open in External Browser** — open the same URL in your default browser

## Security

The HTTP server only listens on `127.0.0.1`, so it isn't reachable from other machines. However, **any process on your machine** can read files from your workspace via the chosen port while the preview is open — that includes things like `.env`, secrets, or anything else in the workspace tree. Don't run this in untrusted multi-user environments.

## Limitations (v0.1)

- Reloads are full-page (no HMR-style partial updates).
- `.gitignore` is not honored — every save triggers reload (minus the hardcoded ignore list).
- No DevTools / console panel.
- No localhost dev-server proxy (use a regular browser for `npm run dev` projects).
