# vibecode-browser-preview-pro v0.5 Implementation Plan

> **For agentic workers:** Inline execution per user preference. No automated tests — verification is `npm run typecheck && npm run lint && npm run sync:check` plus manual checklist post-install. Single MR.

**Goal:** UI cleanup on v0.4 — Codicons, 3-tab panel (+ Assets), force-state chips, warning × dismiss, device select anchored right.

**Spec:** [docs/superpowers/specs/2026-05-25-vibecode-browser-preview-pro-v0.5-design.md](../specs/2026-05-25-vibecode-browser-preview-pro-v0.5-design.md)

## Files changed

```
vibecode-browser-preview-pro/
├── package.json              MODIFY  version + dep + scripts (copy-codicons)
├── README.md                 MODIFY  v0.5 shipped section
├── i18n/ko.json              MODIFY  Dismiss key
├── l10n/bundle.l10n.ko.json  AUTO    sync re-generated
├── scripts/
│   └── copy-codicons.mjs     NEW     copies codicon.{css,ttf} → dist/codicons/
├── src/
│   ├── l10n-bundle.ts        MODIFY  dismiss field
│   ├── editor-provider.ts    MODIFY  extensionUri + localResourceRoots + codiconCssUri
│   └── webview/
│       ├── html.ts           MODIFY  buildHtml(webview,l10n,codiconCssUri); CSP font-src; <link> codicon; all emoji→codicon; toolbar reorder (device last); 3rd Assets tab; warning close button; footer
│       ├── styles.ts         MODIFY  .codicon sizing; .force-chips; .panel-warning-close; .panel-footer; .url flex+ellipsis; .device-label anchor; panel display:flex
│       └── client-script.ts  MODIFY  tabAssetsCount; panelWarningText/Close refs; updateTabCounts(+assets); '▲'→'' in counts; copyBtn/unpinBtn innerHTML codicon; force-toggles→force-chips (button+aria-pressed); panel-warning-close listener + sessionStorage; addAsset → updateTabCounts
```

## Tasks (executed inline)

1. **package.json** — version 0.5.0; +copy-codicons script; +dep @vscode/codicons; build chain `sync && copy-codicons && tsc`
2. **scripts/copy-codicons.mjs** — Node script copying ttf+css to dist/codicons/
3. **i18n/ko.json + l10n-bundle.ts** — `Dismiss` / `dismiss`
4. **editor-provider.ts** — extensionUri field + constructor; register(context) uses context.extensionUri; localResourceRoots; codiconCssUri via asWebviewUri; pass to buildHtml
5. **html.ts** — full rewrite: buildHtml 3rd arg; CSP font-src; codicon link tag; all 5 toolbar buttons + 2 pin card actions emoji → codicon spans; device-label moved AFTER url-label; 3-tab panel structure (+ tabpanel-assets); panel-warning with text span + close button; panel-footer with snapshotsHint
6. **styles.ts** — `.url` ellipsis; `.device-label` anchor; `.panel` flex column; remove `.force-toggles`; add `.force-chips` + `.force-chip[aria-pressed]`; `.panel-warning` flex + close button styles; `.panel-footer` + hint; `.codicon` base sizing
7. **client-script.ts** — new element refs (tabAssetsCount, panelWarningText, panelWarningClose); updateTabCounts handles 3 tabs incl assets; `▲N` → `N`; copy/unpin buttons use codicon innerHTML; force checkbox loop → button-chip loop with aria-pressed toggle; force-state-scan handler uses panelWarningText + sessionStorage dismiss check; addAsset calls updateTabCounts; panelWarningClose click handler sets sessionStorage + hidden
8. **README.md** — v0.5 shipped + 한계 (v0.5)
9. **Build / package / install** — `npm run build && npm run package && code --install-extension`
10. **Commit / push / MR / merge** — single MR off main

## Verify checklist (manual, post-install + Reload Window)

- Toolbar 5 buttons show codicon icons (refresh/edit/link-external/inspect/save), no emoji
- URL label center, ellipsis if long; Device select at right edge regardless of URL length
- Inspector → click element → pin card shows codicon Copy/Trash; badge shows `1` (no `▲`)
- Panel tabs: Pins / Changes / Assets (3 tabs), counts as numbers only
- Assets count goes up as page loads css/js/images
- Force-state chips: 4 on one line (`:hover :focus :focus-vis :active`), click toggles aria-pressed + filled bg, element style actually changes
- Cross-origin stylesheet warning: `× close` button visible, click dismisses (sessionStorage), Reload Window re-shows
- Snapshot hint: bottom of panel as footer (small italic gray centered)
- Save Snapshot still produces 6 files + zip (no regression)
