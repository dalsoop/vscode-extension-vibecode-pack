# Vibecode Browser Preview

Live-preview HTML files inside VSCode. Double-click any `.html` (or `.htm`) in the workspace and a webview opens with the page rendered through a local HTTP server rooted at your workspace folder. Save any file in the workspace and the preview auto-reloads.

> For the inspector + asset-collection + state-control "pro" experience, see [vibecode-browser-preview-pro](../vibecode-browser-preview-pro/).

## How it works

- Registered as a `customEditor` with `priority: default` for `*.html` / `*.htm` — double-clicking opens the preview instead of the text editor.
- A Node HTTP server binds to `127.0.0.1:0` (kernel picks the port) and serves the workspace folder statically. One server per workspace root, lazily started, closed on last preview close.
- The webview renders a toolbar + an `<iframe>` pointing at `http://127.0.0.1:PORT/<relative-path>`.
- A workspace `FileSystemWatcher` debounces (200 ms) all file changes and triggers an iframe `src` cache-bust. `node_modules`, `.git`, `dist`, `out` are ignored to keep reloads quiet during builds.

## Toolbar

- **↻ Reload** — force an immediate reload (bypasses debounce)
- **📝 Edit Source** — open the same `.html` file in a text editor beside the preview
- **↗ Open in External Browser** — open the same `http://127.0.0.1:PORT/...` URL in your default browser

## Quick start

1. Install the extension.
2. Open a workspace folder that contains HTML.
3. Double-click an `.html` file — the preview opens automatically.
4. Edit any file in the workspace and save — the preview reloads.

If you opened an unsaved `.html` buffer with no folder, the webview shows **"Open a folder first"** because the static server has no root to serve from.

## Security

The HTTP server only listens on `127.0.0.1`, so it isn't reachable from other machines. However, **any process on your machine** can read files from your workspace via the chosen port while the preview is open — that includes `.env`, secrets, or anything else in the workspace tree.

- Do **not** use this in untrusted multi-user environments (shared dev boxes, kiosks).
- The server only serves files inside the workspace root — paths with `..` are rejected.
- The server stops when the last preview tab closes.

## Limitations (v0.1)

- Reloads are full-page (no HMR-style partial updates).
- `.gitignore` is not honored — every save outside the hard-coded ignore list triggers reload.
- No DevTools / console panel inside the preview.
- No localhost dev-server proxy. If you already have `npm run dev` running, just point a regular browser at it; this extension is for static / build-output HTML.

## Development

```bash
npm install
npm run build       # tsc + sync NLS
npm run package     # produce .vsix
```

## License

MIT — see [LICENSE](LICENSE).
