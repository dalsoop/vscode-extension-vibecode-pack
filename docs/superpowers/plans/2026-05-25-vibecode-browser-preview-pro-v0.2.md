# vibecode-browser-preview-pro v0.2 Implementation Plan

> **For agentic workers:** Inline execution per user preference. Steps use checkbox (`- [ ]`) syntax for tracking. No automated tests (v0.2 spec §2 explicitly excludes them); each task ends with `typecheck` + commit, and a manual verify checklist (spec §7) is run by the user post-build.

**Goal:** Add an in-iframe inspector, asset/CSS introspection, lightweight state controls (class toggle / inline style / force-state label), and a snapshot writer that produces a 4-file folder under `.vibecode/browser-preview/YYYYMMDDHHMMSS/` for design handoff.

**Architecture:** `PreviewServer` injects an inline `<script src="/__bp_inspector.js">` into every served `.html`; the inspector IIFE runs same-origin inside the iframe and talks to the parent webview via `postMessage` with a `bp:` prefix. The webview gains a collapsible right-side inspector panel and two new toolbar buttons (Inspector toggle, Save Snapshot). The extension host listens for `requestSnapshot`, asks the iframe to serialize current state, and writes 4 files via `SnapshotWriter`.

**Tech Stack:** Same as v0.1 — TypeScript 5, Node `http`/`fs`, `@types/vscode ^1.95.0`, no bundler. Inspector script is a TS-exported string (`export const INSPECTOR_SCRIPT = '...';`) — type-checked TS surrounds an untyped JS payload.

**Spec:** [docs/superpowers/specs/2026-05-25-vibecode-browser-preview-pro-v0.2-design.md](../specs/2026-05-25-vibecode-browser-preview-pro-v0.2-design.md)

**Working directory:** `/Users/jeonghan/Documents/WORK/WORKSPACE/apps/vscode-extension-mono/vibecode-browser-preview-pro/`

---

## File change map

```
vibecode-browser-preview-pro/
├── src/
│   ├── preview-server.ts          # MODIFY — Task 4
│   ├── editor-provider.ts          # MODIFY — Task 8
│   ├── snapshot-writer.ts          # NEW    — Task 2
│   ├── snapshot-types.ts           # NEW    — Task 2
│   ├── l10n-bundle.ts              # MODIFY — Task 5
│   ├── inspector/
│   │   └── inspector-script.ts     # NEW    — Task 3
│   └── webview/
│       ├── html.ts                 # MODIFY — Task 6
│       ├── styles.ts               # MODIFY — Task 6
│       └── client-script.ts        # MODIFY — Task 7
└── i18n/ko.json                    # MODIFY — Task 1
```

---

### Task 1: i18n keys for new UI

**Files:**
- Modify: `vibecode-browser-preview-pro/i18n/ko.json` (runtime block)

- [ ] **Step 1: Add new runtime keys**

Path: `vibecode-browser-preview-pro/i18n/ko.json`

Replace the entire `runtime` block with:

```json
{
  "nls": {
    "ext.displayName": "바이브코드 브라우저 프리뷰 Pro",
    "ext.description": "HTML 라이브 프리뷰 + 페이지 안 인스펙터 + 사용된 에셋/CSS 자동 수집 + 상태 컨트롤 + 퍼블리싱 핸드오프용 스냅샷 저장. vibecode-browser-preview 의 확장판.",
    "editor.displayName": "바이브코드 브라우저 프리뷰 Pro"
  },
  "runtime": {
    "Reload": "새로고침",
    "Edit Source": "소스 편집",
    "Open in External Browser": "외부 브라우저에서 열기",
    "Starting preview server…": "프리뷰 서버 시작 중…",
    "Server error: {0}": "서버 오류: {0}",
    "Retry": "다시 시도",
    "Open a folder first": "먼저 폴더를 열어주세요",
    "This unsaved HTML file has no folder to serve from. Save it inside a folder or open a workspace folder.": "저장되지 않은 HTML 파일은 서빙할 폴더가 없습니다. 폴더 안에 저장하거나 워크스페이스 폴더를 여세요.",
    "Inspector": "인스펙터",
    "Save Snapshot": "스냅샷 저장",
    "Inspector unavailable (file too large)": "인스펙터 사용 불가 (파일 너무 큼)",
    "Snapshot saved to {0}": "{0} 에 스냅샷 저장됨",
    "Open Snapshot Folder": "스냅샷 폴더 열기",
    "Snapshot failed: {0}": "스냅샷 저장 실패: {0}",
    "No pins yet. Click an element in the preview to inspect it.": "아직 핀이 없습니다. 프리뷰에서 요소를 클릭해 살펴보세요.",
    "Assets": "에셋",
    "Pins": "핀",
    "Selector": "셀렉터",
    "Matched CSS": "매칭 CSS",
    "Computed": "컴퓨티드",
    "Class toggles": "클래스 토글",
    "Inline style": "인라인 스타일",
    "Force state": "Force state",
    "Unpin": "핀 제거",
    "Copy selector": "셀렉터 복사",
    "(none)": "(없음)",
    "Snapshots are written to .vibecode/browser-preview/ — added to .gitignore automatically.": "스냅샷은 .vibecode/browser-preview/ 에 저장됩니다 — .gitignore 에 자동으로 추가됩니다."
  }
}
```

- [ ] **Step 2: Run sync + verify**

```bash
cd vibecode-browser-preview-pro && npm run sync && npm run sync:check
```

Expected: `Synced NLS — default + 1 locales (ko).` + `NLS bundles are in sync.`

- [ ] **Step 3: Commit**

```bash
cd /Users/jeonghan/Documents/WORK/WORKSPACE/apps/vscode-extension-mono
git add vibecode-browser-preview-pro/i18n/ vibecode-browser-preview-pro/l10n/ vibecode-browser-preview-pro/package.nls.ko.json
git commit -m "feat(browser-preview-pro): add inspector/snapshot i18n keys"
```

---

### Task 2: SnapshotWriter + types

**Files:**
- Create: `vibecode-browser-preview-pro/src/snapshot-types.ts`
- Create: `vibecode-browser-preview-pro/src/snapshot-writer.ts`

- [ ] **Step 1: Write `snapshot-types.ts`**

Path: `vibecode-browser-preview-pro/src/snapshot-types.ts`

```typescript
export interface PickComputed {
  display?: string;
  position?: string;
  top?: string;
  right?: string;
  bottom?: string;
  left?: string;
  width?: string;
  height?: string;
  padding?: string;
  margin?: string;
  border?: string;
  borderRadius?: string;
  color?: string;
  backgroundColor?: string;
  backgroundImage?: string;
  fontFamily?: string;
  fontSize?: string;
  fontWeight?: string;
  lineHeight?: string;
  textAlign?: string;
  opacity?: string;
  transform?: string;
  boxShadow?: string;
}

export interface MatchedRule {
  selector: string;
  source: string;
  declarations: string;
}

export interface PickOverrides {
  classToggles: { name: string; enabled: boolean }[];
  inlineStyle: string;
  forceState: 'hover' | 'focus' | 'active' | null;
}

export interface PickData {
  id: number;
  selector: string;
  boundingBox: { x: number; y: number; width: number; height: number };
  matchedCSS: MatchedRule[];
  computed: PickComputed;
  overrides: PickOverrides;
}

export interface AssetData {
  url: string;
  type: 'stylesheet' | 'script' | 'image' | 'font' | 'other';
  sourcePath: string | null;
  size: number | null;
  mime: string | null;
}

export interface SnapshotPayload {
  outerHTML: string;
  picks: PickData[];
  assets: AssetData[];
  viewport: { width: number; height: number };
  userAgent: string;
}

export interface SnapshotResult {
  folderAbsPath: string;
  folderRelPath: string;
  timestampLocal: string;
}
```

- [ ] **Step 2: Write `snapshot-writer.ts`**

Path: `vibecode-browser-preview-pro/src/snapshot-writer.ts`

```typescript
import * as fs from 'fs/promises';
import * as path from 'path';
import * as vscode from 'vscode';
import type {
  AssetData,
  PickData,
  SnapshotPayload,
  SnapshotResult
} from './snapshot-types';

const INSPECTOR_SCRIPT_TAG_RE =
  /\s*<script[^>]*src=["']\/__bp_inspector\.js["'][^>]*><\/script>\s*/g;

export class SnapshotWriter {
  async write(
    workspaceRoot: string,
    sourceFileAbsPath: string,
    payload: SnapshotPayload
  ): Promise<SnapshotResult> {
    const baseDir = path.join(workspaceRoot, '.vibecode', 'browser-preview');
    await fs.mkdir(baseDir, { recursive: true });
    await this.ensureGitignore(path.join(workspaceRoot, '.vibecode'));

    const stamp = this.timestampLocal(new Date());
    const folderAbs = await this.uniqueFolder(baseDir, stamp);

    const stateHtml = payload.outerHTML.replace(INSPECTOR_SCRIPT_TAG_RE, '\n');

    const picks = { version: 1, picks: payload.picks };
    const assets = { version: 1, assets: payload.assets };
    const meta = {
      version: 1,
      savedAt: new Date().toISOString(),
      savedAtLocal: stamp,
      sourceFile: path.relative(workspaceRoot, sourceFileAbsPath),
      workspaceRoot,
      viewport: payload.viewport,
      userAgent: payload.userAgent,
      summary: this.summarize(payload.picks, payload.assets)
    };

    await Promise.all([
      fs.writeFile(path.join(folderAbs, 'state.html'), stateHtml, 'utf8'),
      fs.writeFile(path.join(folderAbs, 'picks.json'), JSON.stringify(picks, null, 2) + '\n', 'utf8'),
      fs.writeFile(path.join(folderAbs, 'assets.json'), JSON.stringify(assets, null, 2) + '\n', 'utf8'),
      fs.writeFile(path.join(folderAbs, 'meta.json'), JSON.stringify(meta, null, 2) + '\n', 'utf8')
    ]);

    return {
      folderAbsPath: folderAbs,
      folderRelPath: path.relative(workspaceRoot, folderAbs),
      timestampLocal: stamp
    };
  }

  async revealInFinder(folderAbsPath: string): Promise<void> {
    await vscode.commands.executeCommand(
      'revealFileInOS',
      vscode.Uri.file(folderAbsPath)
    );
  }

  private summarize(picks: PickData[], assets: AssetData[]): {
    picksCount: number;
    assetsCount: number;
    overridesCount: number;
  } {
    let overridesCount = 0;
    for (const p of picks) {
      if (p.overrides.classToggles.length > 0) overridesCount++;
      if (p.overrides.inlineStyle.trim()) overridesCount++;
      if (p.overrides.forceState) overridesCount++;
    }
    return {
      picksCount: picks.length,
      assetsCount: assets.length,
      overridesCount
    };
  }

  private async ensureGitignore(vibecodeDir: string): Promise<void> {
    const gitignorePath = path.join(vibecodeDir, '.gitignore');
    try {
      await fs.access(gitignorePath);
      return;
    } catch {
      // file does not exist — create it
    }
    await fs.mkdir(vibecodeDir, { recursive: true });
    await fs.writeFile(gitignorePath, '*\n', 'utf8');
  }

  private async uniqueFolder(baseDir: string, stamp: string): Promise<string> {
    let candidate = path.join(baseDir, stamp);
    let n = 1;
    while (true) {
      try {
        await fs.mkdir(candidate);
        return candidate;
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code !== 'EEXIST') throw err;
        n++;
        candidate = path.join(baseDir, `${stamp}-${n}`);
      }
    }
  }

  private timestampLocal(d: Date): string {
    const p = (n: number, len = 2) => String(n).padStart(len, '0');
    return (
      d.getFullYear().toString() +
      p(d.getMonth() + 1) +
      p(d.getDate()) +
      p(d.getHours()) +
      p(d.getMinutes()) +
      p(d.getSeconds())
    );
  }
}
```

- [ ] **Step 3: Typecheck**

```bash
cd vibecode-browser-preview-pro && npm run typecheck
```

Expected: exits 0.

- [ ] **Step 4: Commit**

```bash
cd /Users/jeonghan/Documents/WORK/WORKSPACE/apps/vscode-extension-mono
git add vibecode-browser-preview-pro/src/snapshot-types.ts vibecode-browser-preview-pro/src/snapshot-writer.ts
git commit -m "feat(browser-preview-pro): snapshot types + writer (.vibecode/browser-preview/YYYYMMDDHHMMSS/)"
```

---

### Task 3: Inspector script (iframe-side IIFE)

**Files:**
- Create: `vibecode-browser-preview-pro/src/inspector/inspector-script.ts`

This file exports a single `INSPECTOR_SCRIPT` string — the JS that runs inside the iframe. Same-origin to the preview server, communicates with parent webview via `postMessage`.

- [ ] **Step 1: Write `inspector-script.ts`**

Path: `vibecode-browser-preview-pro/src/inspector/inspector-script.ts`

```typescript
// IIFE served at /__bp_inspector.js inside the preview iframe. Plain JS string —
// no type-checking inside the template literal. Communicates with parent webview
// via window.parent.postMessage with the 'bp:' prefix.

export const INSPECTOR_SCRIPT = `
(function () {
  'use strict';

  // ---- selector path generator ----
  function buildSelector(el) {
    if (!(el instanceof Element)) return '';
    if (el === document.documentElement) return 'html';
    if (el === document.body) return 'body';
    const parts = [];
    let cur = el;
    while (cur && cur !== document.body && cur !== document.documentElement) {
      let part = cur.tagName.toLowerCase();
      if (cur.id) { part = '#' + cur.id; parts.unshift(part); break; }
      const cls = (cur.className || '').toString().trim().split(/\\s+/).filter(c => c && !c.startsWith('__bp_'));
      if (cls.length) part += '.' + cls.join('.');
      const parent = cur.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children).filter(s => s.tagName === cur.tagName);
        if (siblings.length > 1) part += ':nth-of-type(' + (siblings.indexOf(cur) + 1) + ')';
      }
      parts.unshift(part);
      cur = cur.parentElement;
    }
    return (cur === document.body ? 'body > ' : '') + parts.join(' > ');
  }

  // ---- matched CSS rules (heuristic) ----
  function matchedRules(el) {
    const out = [];
    for (const sheet of Array.from(document.styleSheets)) {
      let rules;
      try { rules = sheet.cssRules; } catch (_e) { continue; }
      if (!rules) continue;
      const source = (sheet.href || '<inline>').replace(location.origin, '');
      walkRules(rules, source, el, out);
    }
    return out;
  }

  function walkRules(rules, source, el, out) {
    for (const r of Array.from(rules)) {
      if (r.cssRules && r.conditionText !== undefined) {
        walkRules(r.cssRules, source, el, out);
        continue;
      }
      const sel = r.selectorText;
      if (!sel) continue;
      try {
        if (el.matches(sel.split(',').map(s => s.trim()).filter(Boolean).join(','))) {
          out.push({
            selector: sel,
            source,
            declarations: (r.style && r.style.cssText) || ''
          });
        }
      } catch (_e) { /* invalid selector — skip */ }
    }
  }

  // ---- computed style whitelist ----
  var COMPUTED_KEYS = [
    'display','position','top','right','bottom','left','width','height',
    'padding','margin','border','borderRadius','color','backgroundColor','backgroundImage',
    'fontFamily','fontSize','fontWeight','lineHeight','textAlign','opacity','transform','boxShadow'
  ];

  function computedFor(el) {
    const cs = getComputedStyle(el);
    const out = {};
    for (const k of COMPUTED_KEYS) {
      const v = cs.getPropertyValue(k.replace(/[A-Z]/g, m => '-' + m.toLowerCase()));
      if (v) out[k] = v;
    }
    return out;
  }

  // ---- hover overlay ----
  var overlay = document.createElement('div');
  overlay.id = '__bp_overlay';
  overlay.setAttribute('style',
    'position:fixed;pointer-events:none;z-index:2147483646;display:none;' +
    'box-sizing:border-box;outline:2px solid #4f9eff;background:rgba(79,158,255,0.08);' +
    'transition:none;');
  var tooltip = document.createElement('div');
  tooltip.id = '__bp_tooltip';
  tooltip.setAttribute('style',
    'position:fixed;pointer-events:none;z-index:2147483647;display:none;' +
    'background:#1f1f1f;color:#fff;font:11px/1.4 -apple-system,system-ui,sans-serif;' +
    'padding:3px 6px;border-radius:3px;max-width:520px;word-break:break-all;');
  document.documentElement.appendChild(overlay);
  document.documentElement.appendChild(tooltip);

  function showOverlay(el) {
    const r = el.getBoundingClientRect();
    overlay.style.left = r.left + 'px';
    overlay.style.top = r.top + 'px';
    overlay.style.width = r.width + 'px';
    overlay.style.height = r.height + 'px';
    overlay.style.display = 'block';
    tooltip.textContent = buildSelector(el);
    tooltip.style.left = Math.max(0, r.left) + 'px';
    tooltip.style.top = Math.max(0, r.top - 18) + 'px';
    tooltip.style.display = 'block';
  }

  function hideOverlay() {
    overlay.style.display = 'none';
    tooltip.style.display = 'none';
  }

  // ---- pin registry ----
  var pins = new Map();   // pickId -> { el, overrides }
  var nextPickId = 1;

  function isInspectableEl(el) {
    return el instanceof Element &&
           el !== overlay && el !== tooltip &&
           !el.closest('#__bp_overlay,#__bp_tooltip');
  }

  // ---- inspector mode state ----
  var inspectorOn = false;

  function onMouseMove(e) {
    if (!inspectorOn) return;
    const el = e.target;
    if (!isInspectableEl(el)) { hideOverlay(); return; }
    showOverlay(el);
  }

  function onClick(e) {
    if (!inspectorOn) return;
    const el = e.target;
    if (!isInspectableEl(el)) return;
    e.preventDefault();
    e.stopPropagation();
    pinElement(el);
  }

  function pinElement(el) {
    const id = nextPickId++;
    const overrides = { classToggles: [], inlineStyle: '', forceState: null };
    pins.set(id, { el, overrides, originalInlineStyle: el.getAttribute('style') || '' });
    post({
      type: 'bp:pinned',
      pick: snapshotPick(id, el, overrides)
    });
  }

  function snapshotPick(id, el, overrides) {
    const r = el.getBoundingClientRect();
    return {
      id,
      selector: buildSelector(el),
      boundingBox: { x: Math.round(r.left), y: Math.round(r.top), width: Math.round(r.width), height: Math.round(r.height) },
      matchedCSS: matchedRules(el),
      computed: computedFor(el),
      overrides: {
        classToggles: overrides.classToggles.slice(),
        inlineStyle: overrides.inlineStyle,
        forceState: overrides.forceState
      }
    };
  }

  // ---- asset collection ----
  var assets = [];
  var seenAssetUrls = new Set();

  function classifyAsset(initiatorType, url) {
    if (initiatorType === 'link' || /\\.css(\\?.*)?$/i.test(url)) return 'stylesheet';
    if (initiatorType === 'script' || /\\.m?js(\\?.*)?$/i.test(url)) return 'script';
    if (initiatorType === 'img' || /\\.(png|jpg|jpeg|gif|svg|webp|ico)(\\?.*)?$/i.test(url)) return 'image';
    if (/\\.(woff2?|ttf|otf|eot)(\\?.*)?$/i.test(url)) return 'font';
    return 'other';
  }

  function sourcePathFrom(url) {
    try {
      const u = new URL(url, location.href);
      if (u.origin !== location.origin) return null;
      return decodeURIComponent(u.pathname.replace(/^\\//, ''));
    } catch (_e) { return null; }
  }

  function recordAsset(url, type, size) {
    if (!url || seenAssetUrls.has(url)) return;
    seenAssetUrls.add(url);
    const asset = {
      url,
      type,
      sourcePath: sourcePathFrom(url),
      size: typeof size === 'number' ? size : null,
      mime: null
    };
    assets.push(asset);
    post({ type: 'bp:assetAdded', asset });
  }

  function scanInitialAssets() {
    for (const link of Array.from(document.querySelectorAll('link[rel="stylesheet"][href]'))) {
      recordAsset(link.href, 'stylesheet', null);
    }
    for (const script of Array.from(document.querySelectorAll('script[src]'))) {
      recordAsset(script.src, 'script', null);
    }
    for (const img of Array.from(document.querySelectorAll('img[src]'))) {
      recordAsset(img.src, 'image', null);
    }
  }

  function startPerfObserver() {
    if (typeof PerformanceObserver === 'undefined') return;
    try {
      const po = new PerformanceObserver(list => {
        for (const entry of list.getEntries()) {
          const url = entry.name;
          if (!url || url === location.href) continue;
          if (url.indexOf('/__bp_inspector.js') !== -1) continue;
          const t = classifyAsset(entry.initiatorType, url);
          recordAsset(url, t, entry.transferSize || entry.encodedBodySize || null);
        }
      });
      po.observe({ type: 'resource', buffered: true });
    } catch (_e) { /* ignore */ }
  }

  // ---- variant control receivers ----
  function applyToggleClass(pickId, className, enabled) {
    const pin = pins.get(pickId); if (!pin) return;
    if (enabled) pin.el.classList.add(className); else pin.el.classList.remove(className);
    const idx = pin.overrides.classToggles.findIndex(t => t.name === className);
    if (idx >= 0) pin.overrides.classToggles[idx].enabled = enabled;
    else pin.overrides.classToggles.push({ name: className, enabled });
  }

  function applyInlineStyle(pickId, css) {
    const pin = pins.get(pickId); if (!pin) return;
    pin.overrides.inlineStyle = css;
    pin.el.setAttribute('style', (pin.originalInlineStyle ? pin.originalInlineStyle + ';' : '') + css);
  }

  function applyForceState(pickId, state) {
    const pin = pins.get(pickId); if (!pin) return;
    pin.overrides.forceState = state || null;
    // v0.2: label only — no actual pseudo-class simulation
  }

  function unpin(pickId) {
    pins.delete(pickId);
  }

  // ---- snapshot collector ----
  function collectSnapshot() {
    const picksArr = [];
    for (const [id, pin] of pins.entries()) {
      picksArr.push(snapshotPick(id, pin.el, pin.overrides));
    }
    // Hide overlay/tooltip before capturing outerHTML
    hideOverlay();
    overlay.remove();
    tooltip.remove();
    const outerHTML = '<!DOCTYPE html>\\n' + document.documentElement.outerHTML;
    document.documentElement.appendChild(overlay);
    document.documentElement.appendChild(tooltip);
    return {
      outerHTML,
      picks: picksArr,
      assets: assets.slice(),
      viewport: { width: window.innerWidth, height: window.innerHeight },
      userAgent: navigator.userAgent
    };
  }

  // ---- postMessage in / out ----
  function post(msg) {
    try { window.parent.postMessage(msg, '*'); } catch (_e) {}
  }

  window.addEventListener('message', function (event) {
    const msg = event.data;
    if (!msg || typeof msg !== 'object' || typeof msg.type !== 'string') return;
    switch (msg.type) {
      case 'bp:setInspectorMode':
        inspectorOn = !!msg.on;
        if (!inspectorOn) hideOverlay();
        break;
      case 'bp:toggleClass':
        applyToggleClass(msg.pickId, msg.className, !!msg.enabled);
        break;
      case 'bp:setInlineStyle':
        applyInlineStyle(msg.pickId, String(msg.css || ''));
        break;
      case 'bp:setForceState':
        applyForceState(msg.pickId, msg.state || null);
        break;
      case 'bp:unpin':
        unpin(msg.pickId);
        break;
      case 'bp:collectSnapshot':
        post({ type: 'bp:snapshotData', payload: collectSnapshot() });
        break;
    }
  });

  document.addEventListener('mousemove', onMouseMove, true);
  document.addEventListener('click', onClick, true);

  scanInitialAssets();
  startPerfObserver();

  post({ type: 'bp:ready' });
})();
`;
```

- [ ] **Step 2: Typecheck**

```bash
cd vibecode-browser-preview-pro && npm run typecheck
```

Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
cd /Users/jeonghan/Documents/WORK/WORKSPACE/apps/vscode-extension-mono
git add vibecode-browser-preview-pro/src/inspector/
git commit -m "feat(browser-preview-pro): iframe inspector script (selector, matched CSS, asset collection, variant controls)"
```

---

### Task 4: PreviewServer — serve `/__bp_inspector.js` + inject into `.html`

**Files:**
- Modify: `vibecode-browser-preview-pro/src/preview-server.ts`

- [ ] **Step 1: Replace the file**

Path: `vibecode-browser-preview-pro/src/preview-server.ts`

```typescript
import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { URL } from 'url';
import { contentTypeFor } from './mime';
import { INSPECTOR_SCRIPT } from './inspector/inspector-script';

const INSPECTOR_VIRTUAL_PATH = '/__bp_inspector.js';
const INSPECTOR_TAG = '<script src="/__bp_inspector.js"></script>';
const HTML_INJECT_LIMIT = 5 * 1024 * 1024; // 5MB

class PreviewServer {
  private server: http.Server | null = null;
  private refCount = 0;
  private url: URL | null = null;

  constructor(private readonly rootDir: string) {}

  async start(): Promise<URL> {
    if (this.url) return this.url;
    this.server = http.createServer((req, res) => this.handle(req, res));
    await new Promise<void>((resolve, reject) => {
      this.server!.once('error', reject);
      this.server!.listen(0, '127.0.0.1', () => {
        this.server!.off('error', reject);
        resolve();
      });
    });
    const addr = this.server.address();
    if (!addr || typeof addr === 'string') {
      throw new Error('preview-server: failed to obtain bound port');
    }
    this.url = new URL(`http://127.0.0.1:${addr.port}/`);
    return this.url;
  }

  acquire(): void {
    this.refCount++;
  }

  async release(): Promise<void> {
    this.refCount = Math.max(0, this.refCount - 1);
    if (this.refCount === 0 && this.server) {
      const server = this.server;
      this.server = null;
      this.url = null;
      await new Promise<void>(resolve => server.close(() => resolve()));
    }
  }

  isIdle(): boolean {
    return this.refCount === 0;
  }

  private handle(req: http.IncomingMessage, res: http.ServerResponse): void {
    try {
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.statusCode = 405;
        res.end();
        return;
      }
      const rawPath = decodeURIComponent((req.url ?? '/').split('?')[0]);

      if (rawPath === INSPECTOR_VIRTUAL_PATH) {
        this.serveInspector(res);
        return;
      }

      const resolved = path.normalize(path.join(this.rootDir, rawPath));
      if (
        resolved !== this.rootDir &&
        !resolved.startsWith(this.rootDir + path.sep)
      ) {
        res.statusCode = 403;
        res.end('Forbidden');
        return;
      }
      this.serveFile(resolved, res);
    } catch (err) {
      res.statusCode = 500;
      res.end(`Internal error: ${(err as Error).message}`);
    }
  }

  private serveInspector(res: http.ServerResponse): void {
    const body = Buffer.from(INSPECTOR_SCRIPT, 'utf8');
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/javascript; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Length', body.byteLength);
    res.end(body);
  }

  private serveFile(absPath: string, res: http.ServerResponse): void {
    fs.stat(absPath, (err, stat) => {
      if (err) {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.end('Not found');
        return;
      }
      if (stat.isDirectory()) {
        this.serveFile(path.join(absPath, 'index.html'), res);
        return;
      }
      const ext = path.extname(absPath).toLowerCase();
      const isHtml = ext === '.html' || ext === '.htm';
      if (isHtml && stat.size <= HTML_INJECT_LIMIT) {
        this.serveHtmlWithInjection(absPath, res);
        return;
      }
      res.statusCode = 200;
      res.setHeader('Content-Type', contentTypeFor(ext));
      res.setHeader('Cache-Control', 'no-store');
      const stream = fs.createReadStream(absPath);
      stream.on('error', () => {
        if (!res.headersSent) {
          res.statusCode = 500;
        }
        res.end();
      });
      stream.pipe(res);
    });
  }

  private serveHtmlWithInjection(absPath: string, res: http.ServerResponse): void {
    fs.readFile(absPath, 'utf8', (err, html) => {
      if (err) {
        res.statusCode = 500;
        res.end('Read error');
        return;
      }
      const injected = injectInspectorTag(html);
      const body = Buffer.from(injected, 'utf8');
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Content-Length', body.byteLength);
      res.end(body);
    });
  }
}

export function injectInspectorTag(html: string): string {
  if (html.includes(INSPECTOR_TAG)) return html;
  const lower = html.toLowerCase();
  const bodyClose = lower.lastIndexOf('</body>');
  if (bodyClose >= 0) {
    return html.slice(0, bodyClose) + INSPECTOR_TAG + '\n' + html.slice(bodyClose);
  }
  const htmlClose = lower.lastIndexOf('</html>');
  if (htmlClose >= 0) {
    return html.slice(0, htmlClose) + INSPECTOR_TAG + '\n' + html.slice(htmlClose);
  }
  return html + '\n' + INSPECTOR_TAG + '\n';
}

export class PreviewServerRegistry {
  private readonly servers = new Map<string, PreviewServer>();

  async acquire(rootDir: string): Promise<{ url: URL; release: () => Promise<void> }> {
    const key = path.resolve(rootDir);
    let server = this.servers.get(key);
    if (!server) {
      server = new PreviewServer(key);
      this.servers.set(key, server);
    }
    const url = await server.start();
    server.acquire();
    const ownedServer = server;
    const release = async (): Promise<void> => {
      await ownedServer.release();
      if (ownedServer.isIdle()) {
        this.servers.delete(key);
      }
    };
    return { url, release };
  }
}
```

- [ ] **Step 2: Typecheck**

```bash
cd vibecode-browser-preview-pro && npm run typecheck
```

Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
cd /Users/jeonghan/Documents/WORK/WORKSPACE/apps/vscode-extension-mono
git add vibecode-browser-preview-pro/src/preview-server.ts
git commit -m "feat(browser-preview-pro): preview server injects inspector script into .html"
```

---

### Task 5: l10n bundle — new keys

**Files:**
- Modify: `vibecode-browser-preview-pro/src/l10n-bundle.ts`

- [ ] **Step 1: Replace the file**

Path: `vibecode-browser-preview-pro/src/l10n-bundle.ts`

```typescript
import * as vscode from 'vscode';

export interface L10nBundle {
  reload: string;
  editSource: string;
  openExternal: string;
  starting: string;
  serverError: string;
  retry: string;
  openFolderFirst: string;
  openFolderHint: string;
  inspector: string;
  saveSnapshot: string;
  inspectorUnavailable: string;
  snapshotSaved: string;
  openSnapshotFolder: string;
  snapshotFailed: string;
  noPins: string;
  assets: string;
  pins: string;
  selectorLabel: string;
  matchedCss: string;
  computed: string;
  classToggles: string;
  inlineStyle: string;
  forceState: string;
  unpin: string;
  copySelector: string;
  none: string;
  snapshotsHint: string;
}

export function getL10nBundle(): L10nBundle {
  return {
    reload: vscode.l10n.t('Reload'),
    editSource: vscode.l10n.t('Edit Source'),
    openExternal: vscode.l10n.t('Open in External Browser'),
    starting: vscode.l10n.t('Starting preview server…'),
    serverError: vscode.l10n.t('Server error: {0}'),
    retry: vscode.l10n.t('Retry'),
    openFolderFirst: vscode.l10n.t('Open a folder first'),
    openFolderHint: vscode.l10n.t('This unsaved HTML file has no folder to serve from. Save it inside a folder or open a workspace folder.'),
    inspector: vscode.l10n.t('Inspector'),
    saveSnapshot: vscode.l10n.t('Save Snapshot'),
    inspectorUnavailable: vscode.l10n.t('Inspector unavailable (file too large)'),
    snapshotSaved: vscode.l10n.t('Snapshot saved to {0}'),
    openSnapshotFolder: vscode.l10n.t('Open Snapshot Folder'),
    snapshotFailed: vscode.l10n.t('Snapshot failed: {0}'),
    noPins: vscode.l10n.t('No pins yet. Click an element in the preview to inspect it.'),
    assets: vscode.l10n.t('Assets'),
    pins: vscode.l10n.t('Pins'),
    selectorLabel: vscode.l10n.t('Selector'),
    matchedCss: vscode.l10n.t('Matched CSS'),
    computed: vscode.l10n.t('Computed'),
    classToggles: vscode.l10n.t('Class toggles'),
    inlineStyle: vscode.l10n.t('Inline style'),
    forceState: vscode.l10n.t('Force state'),
    unpin: vscode.l10n.t('Unpin'),
    copySelector: vscode.l10n.t('Copy selector'),
    none: vscode.l10n.t('(none)'),
    snapshotsHint: vscode.l10n.t('Snapshots are written to .vibecode/browser-preview/ — added to .gitignore automatically.')
  };
}
```

- [ ] **Step 2: Typecheck + commit**

```bash
cd vibecode-browser-preview-pro && npm run typecheck
cd /Users/jeonghan/Documents/WORK/WORKSPACE/apps/vscode-extension-mono
git add vibecode-browser-preview-pro/src/l10n-bundle.ts
git commit -m "feat(browser-preview-pro): l10n bundle keys for inspector/snapshot UI"
```

---

### Task 6: Webview HTML + styles — side panel skeleton

**Files:**
- Modify: `vibecode-browser-preview-pro/src/webview/styles.ts`
- Modify: `vibecode-browser-preview-pro/src/webview/html.ts`

- [ ] **Step 1: Replace `styles.ts`**

Path: `vibecode-browser-preview-pro/src/webview/styles.ts`

```typescript
export const STYLES = `
  :root { color-scheme: var(--vscode-color-scheme, light dark); }
  html, body { margin: 0; padding: 0; height: 100%; width: 100%; background: var(--vscode-editor-background); color: var(--vscode-foreground); font-family: var(--vscode-font-family); }
  body { display: flex; flex-direction: column; }
  .toolbar { display: flex; align-items: center; gap: 6px; padding: 6px 10px; background: var(--vscode-titleBar-activeBackground, var(--vscode-editorWidget-background)); border-bottom: 1px solid var(--vscode-panel-border, transparent); height: 36px; box-sizing: border-box; flex: 0 0 auto; }
  .toolbar button { background: var(--vscode-button-secondaryBackground, transparent); color: var(--vscode-button-secondaryForeground, var(--vscode-foreground)); border: 1px solid var(--vscode-button-border, transparent); padding: 4px 10px; font: inherit; font-size: 12px; cursor: pointer; border-radius: 3px; }
  .toolbar button:hover { background: var(--vscode-button-secondaryHoverBackground, var(--vscode-list-hoverBackground)); }
  .toolbar button.active { background: var(--vscode-button-background); color: var(--vscode-button-foreground); }
  .url { font-size: 11px; color: var(--vscode-descriptionForeground); margin-left: auto; user-select: text; }

  .main { flex: 1 1 auto; min-height: 0; display: flex; }
  .frame-wrap { flex: 1 1 auto; min-width: 0; position: relative; background: white; }
  iframe { border: 0; width: 100%; height: 100%; display: block; }
  .overlay { position: absolute; inset: 0; display: none; flex-direction: column; align-items: center; justify-content: center; gap: 12px; padding: 24px; text-align: center; background: var(--vscode-editor-background); color: var(--vscode-foreground); }
  .overlay.visible { display: flex; }
  .overlay h2 { margin: 0; font-size: 14px; font-weight: 600; }
  .overlay p { margin: 0; font-size: 12px; color: var(--vscode-descriptionForeground); max-width: 480px; }

  .panel { display: none; flex: 0 0 320px; min-width: 240px; max-width: 600px; border-left: 1px solid var(--vscode-panel-border, transparent); background: var(--vscode-sideBar-background, var(--vscode-editor-background)); color: var(--vscode-sideBar-foreground, var(--vscode-foreground)); overflow: auto; font-size: 12px; }
  .panel.visible { display: block; }
  .panel-section { padding: 8px 10px; border-bottom: 1px solid var(--vscode-panel-border, transparent); }
  .panel-section h3 { margin: 0 0 6px 0; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: var(--vscode-descriptionForeground); }
  .panel-empty { font-size: 11px; color: var(--vscode-descriptionForeground); font-style: italic; }
  .pin-card { background: var(--vscode-editor-background); border: 1px solid var(--vscode-panel-border, transparent); border-radius: 4px; padding: 8px; margin-bottom: 8px; }
  .pin-header { display: flex; justify-content: space-between; align-items: center; gap: 6px; margin-bottom: 6px; }
  .pin-selector { font-family: var(--vscode-editor-font-family, monospace); font-size: 11px; word-break: break-all; flex: 1 1 auto; }
  .pin-actions button { font-size: 11px; padding: 2px 6px; }
  .pin-block { margin-top: 6px; }
  .pin-block label { display: block; font-size: 10px; text-transform: uppercase; color: var(--vscode-descriptionForeground); margin-bottom: 3px; letter-spacing: 0.04em; }
  .pin-rules { font-family: var(--vscode-editor-font-family, monospace); font-size: 11px; max-height: 100px; overflow: auto; background: var(--vscode-textBlockQuote-background, var(--vscode-editor-background)); padding: 4px 6px; border-radius: 3px; }
  .pin-rule { padding: 2px 0; }
  .pin-computed { display: grid; grid-template-columns: max-content 1fr; gap: 2px 8px; font-family: var(--vscode-editor-font-family, monospace); font-size: 11px; }
  .pin-computed .k { color: var(--vscode-descriptionForeground); }
  .pin-overrides input[type=text], .pin-overrides textarea, .pin-overrides select { width: 100%; box-sizing: border-box; font: inherit; font-family: var(--vscode-editor-font-family, monospace); font-size: 11px; padding: 3px 5px; background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border, transparent); border-radius: 3px; }
  .pin-overrides textarea { resize: vertical; min-height: 38px; }
  .pin-overrides .toggles label { display: inline-flex; align-items: center; gap: 4px; margin-right: 8px; font-size: 11px; text-transform: none; color: inherit; }
  .asset-row { display: flex; gap: 6px; font-family: var(--vscode-editor-font-family, monospace); font-size: 11px; padding: 2px 0; }
  .asset-row .type { width: 56px; color: var(--vscode-descriptionForeground); text-transform: uppercase; font-size: 10px; }
  .asset-row .path { flex: 1 1 auto; word-break: break-all; }

  .toast { position: absolute; left: 50%; bottom: 16px; transform: translateX(-50%); background: var(--vscode-notifications-background, #1f1f1f); color: var(--vscode-notifications-foreground, #fff); padding: 6px 12px; border-radius: 4px; font-size: 12px; display: none; z-index: 1000; }
  .toast.visible { display: flex; align-items: center; gap: 8px; }
  .toast button { font-size: 11px; padding: 2px 6px; }
`;
```

- [ ] **Step 2: Replace `html.ts`**

Path: `vibecode-browser-preview-pro/src/webview/html.ts`

```typescript
import * as vscode from 'vscode';
import { STYLES } from './styles';
import { CLIENT_SCRIPT } from './client-script';
import type { L10nBundle } from '../l10n-bundle';

function randomNonce(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  for (let i = 0; i < 32; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function esc(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

export function buildHtml(webview: vscode.Webview, l10n: L10nBundle): string {
  const nonce = randomNonce();
  const cspSource = webview.cspSource;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy"
        content="default-src 'none'; style-src ${cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; frame-src http://127.0.0.1:* http://localhost:*; connect-src 'none';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>${STYLES}</style>
</head>
<body data-l10n='${esc(JSON.stringify(l10n))}'>
  <div class="toolbar">
    <button id="btn-reload" title="${esc(l10n.reload)}">↻ ${esc(l10n.reload)}</button>
    <button id="btn-edit" title="${esc(l10n.editSource)}">📝 ${esc(l10n.editSource)}</button>
    <button id="btn-open" title="${esc(l10n.openExternal)}">↗ ${esc(l10n.openExternal)}</button>
    <button id="btn-inspector" title="${esc(l10n.inspector)}">🎯 ${esc(l10n.inspector)}</button>
    <button id="btn-save" title="${esc(l10n.saveSnapshot)}">💾 ${esc(l10n.saveSnapshot)}</button>
    <span class="url" id="url-label"></span>
  </div>
  <div class="main">
    <div class="frame-wrap">
      <iframe id="preview-frame" sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-modals"></iframe>
      <div class="overlay" id="overlay">
        <h2 id="overlay-title">${esc(l10n.starting)}</h2>
        <p id="overlay-body"></p>
        <button id="overlay-retry" style="display:none">${esc(l10n.retry)}</button>
      </div>
      <div class="toast" id="toast">
        <span id="toast-msg"></span>
        <button id="toast-action" style="display:none"></button>
      </div>
    </div>
    <aside class="panel" id="panel">
      <div class="panel-section">
        <h3 id="panel-pins-title">${esc(l10n.pins)}</h3>
        <div id="pins-list">
          <div class="panel-empty" id="pins-empty">${esc(l10n.noPins)}</div>
        </div>
      </div>
      <div class="panel-section">
        <h3 id="panel-assets-title">${esc(l10n.assets)}</h3>
        <div id="assets-list"></div>
      </div>
      <div class="panel-section">
        <p class="panel-empty">${esc(l10n.snapshotsHint)}</p>
      </div>
    </aside>
  </div>
  <script nonce="${nonce}">${CLIENT_SCRIPT}</script>
</body>
</html>`;
}
```

- [ ] **Step 3: Typecheck + commit**

```bash
cd vibecode-browser-preview-pro && npm run typecheck
cd /Users/jeonghan/Documents/WORK/WORKSPACE/apps/vscode-extension-mono
git add vibecode-browser-preview-pro/src/webview/styles.ts vibecode-browser-preview-pro/src/webview/html.ts
git commit -m "feat(browser-preview-pro): webview side panel skeleton + new toolbar buttons"
```

---

### Task 7: Webview client-script — inspector panel logic + iframe bridge

**Files:**
- Modify: `vibecode-browser-preview-pro/src/webview/client-script.ts`

- [ ] **Step 1: Replace the file**

Path: `vibecode-browser-preview-pro/src/webview/client-script.ts`

```typescript
export const CLIENT_SCRIPT = `
  (function () {
    const vscode = acquireVsCodeApi();
    const iframe = document.getElementById('preview-frame');
    const urlLabel = document.getElementById('url-label');
    const overlay = document.getElementById('overlay');
    const overlayTitle = document.getElementById('overlay-title');
    const overlayBody = document.getElementById('overlay-body');
    const overlayRetry = document.getElementById('overlay-retry');
    const btnReload = document.getElementById('btn-reload');
    const btnEdit = document.getElementById('btn-edit');
    const btnOpen = document.getElementById('btn-open');
    const btnInspector = document.getElementById('btn-inspector');
    const btnSave = document.getElementById('btn-save');
    const panel = document.getElementById('panel');
    const pinsList = document.getElementById('pins-list');
    const pinsEmpty = document.getElementById('pins-empty');
    const assetsList = document.getElementById('assets-list');
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toast-msg');
    const toastAction = document.getElementById('toast-action');

    const l10n = JSON.parse(document.body.getAttribute('data-l10n') || '{}');

    let baseUrl = null;
    let inspectorOn = false;
    const pins = new Map(); // pickId -> { card, data }
    const seenAssetUrls = new Set();

    function setOverlay(opts) {
      if (!opts) {
        overlay.classList.remove('visible');
        overlayRetry.style.display = 'none';
        return;
      }
      overlayTitle.textContent = opts.title || '';
      overlayBody.textContent = opts.body || '';
      overlayRetry.textContent = opts.retryLabel || 'Retry';
      overlayRetry.style.display = opts.showRetry ? 'inline-block' : 'none';
      overlay.classList.add('visible');
    }

    function setSrc() {
      if (!baseUrl) return;
      iframe.src = baseUrl + (baseUrl.includes('?') ? '&' : '?') + '_t=' + Date.now();
      clearPanel();
    }

    function clearPanel() {
      pins.clear();
      pinsList.innerHTML = '';
      pinsList.appendChild(pinsEmpty);
      pinsEmpty.style.display = '';
      assetsList.innerHTML = '';
      seenAssetUrls.clear();
    }

    function setInspector(on) {
      inspectorOn = !!on;
      btnInspector.classList.toggle('active', inspectorOn);
      panel.classList.toggle('visible', inspectorOn);
      postToIframe({ type: 'bp:setInspectorMode', on: inspectorOn });
      vscode.postMessage({ type: 'toggleInspector', on: inspectorOn });
    }

    function postToIframe(msg) {
      try { iframe.contentWindow && iframe.contentWindow.postMessage(msg, '*'); } catch (_e) {}
    }

    function showToast(text, actionLabel, onAction) {
      toastMsg.textContent = text;
      if (actionLabel) {
        toastAction.textContent = actionLabel;
        toastAction.style.display = 'inline-block';
        toastAction.onclick = () => { onAction && onAction(); hideToast(); };
      } else {
        toastAction.style.display = 'none';
        toastAction.onclick = null;
      }
      toast.classList.add('visible');
      clearTimeout(showToast._t);
      showToast._t = setTimeout(hideToast, 4000);
    }
    function hideToast() { toast.classList.remove('visible'); }

    // ---- pin card rendering ----
    function renderPinCard(pick) {
      const card = document.createElement('div');
      card.className = 'pin-card';
      card.dataset.pickId = pick.id;

      const header = document.createElement('div');
      header.className = 'pin-header';
      const sel = document.createElement('div');
      sel.className = 'pin-selector';
      sel.textContent = pick.selector;
      const actions = document.createElement('div');
      actions.className = 'pin-actions';
      const copyBtn = document.createElement('button');
      copyBtn.textContent = '📋';
      copyBtn.title = l10n.copySelector || 'Copy';
      copyBtn.onclick = () => navigator.clipboard && navigator.clipboard.writeText(pick.selector);
      const unpinBtn = document.createElement('button');
      unpinBtn.textContent = '🗑';
      unpinBtn.title = l10n.unpin || 'Unpin';
      unpinBtn.onclick = () => unpinLocal(pick.id);
      actions.appendChild(copyBtn);
      actions.appendChild(unpinBtn);
      header.appendChild(sel);
      header.appendChild(actions);
      card.appendChild(header);

      // matched CSS
      const cssBlock = document.createElement('div');
      cssBlock.className = 'pin-block';
      const cssLabel = document.createElement('label');
      cssLabel.textContent = l10n.matchedCss || 'Matched CSS';
      cssBlock.appendChild(cssLabel);
      const cssBox = document.createElement('div');
      cssBox.className = 'pin-rules';
      if (pick.matchedCSS && pick.matchedCSS.length) {
        for (const r of pick.matchedCSS) {
          const row = document.createElement('div');
          row.className = 'pin-rule';
          row.textContent = r.selector + ' { ' + r.declarations + ' }';
          row.title = r.source;
          cssBox.appendChild(row);
        }
      } else {
        cssBox.textContent = l10n.none || '(none)';
      }
      cssBlock.appendChild(cssBox);
      card.appendChild(cssBlock);

      // computed
      const compBlock = document.createElement('div');
      compBlock.className = 'pin-block';
      const compLabel = document.createElement('label');
      compLabel.textContent = l10n.computed || 'Computed';
      compBlock.appendChild(compLabel);
      const compGrid = document.createElement('div');
      compGrid.className = 'pin-computed';
      for (const k of Object.keys(pick.computed || {})) {
        const kd = document.createElement('div'); kd.className = 'k'; kd.textContent = k;
        const vd = document.createElement('div'); vd.textContent = pick.computed[k];
        compGrid.appendChild(kd); compGrid.appendChild(vd);
      }
      compBlock.appendChild(compGrid);
      card.appendChild(compBlock);

      // overrides
      const ov = document.createElement('div');
      ov.className = 'pin-block pin-overrides';
      const ovLabel = document.createElement('label');
      ovLabel.textContent = l10n.classToggles || 'Class toggles';
      ov.appendChild(ovLabel);
      const togWrap = document.createElement('div'); togWrap.className = 'toggles';
      const togInput = document.createElement('input');
      togInput.type = 'text';
      togInput.placeholder = 'class-name';
      togInput.onkeydown = (e) => {
        if (e.key === 'Enter' && togInput.value.trim()) {
          const cls = togInput.value.trim();
          togInput.value = '';
          addToggle(pick.id, togWrap, cls, true);
          postToIframe({ type: 'bp:toggleClass', pickId: pick.id, className: cls, enabled: true });
        }
      };
      ov.appendChild(togInput);
      ov.appendChild(togWrap);

      const inlineLabel = document.createElement('label');
      inlineLabel.textContent = l10n.inlineStyle || 'Inline style';
      ov.appendChild(inlineLabel);
      const styleTa = document.createElement('textarea');
      styleTa.placeholder = 'color: red; padding: 12px;';
      let styleTimer = null;
      styleTa.oninput = () => {
        clearTimeout(styleTimer);
        styleTimer = setTimeout(() => {
          postToIframe({ type: 'bp:setInlineStyle', pickId: pick.id, css: styleTa.value });
        }, 200);
      };
      ov.appendChild(styleTa);

      const forceLabel = document.createElement('label');
      forceLabel.textContent = l10n.forceState || 'Force state';
      ov.appendChild(forceLabel);
      const forceSel = document.createElement('select');
      for (const opt of [['', '—'], ['hover', ':hover'], ['focus', ':focus'], ['active', ':active']]) {
        const o = document.createElement('option');
        o.value = opt[0]; o.textContent = opt[1];
        forceSel.appendChild(o);
      }
      forceSel.onchange = () => {
        postToIframe({ type: 'bp:setForceState', pickId: pick.id, state: forceSel.value || null });
      };
      ov.appendChild(forceSel);

      card.appendChild(ov);

      return card;
    }

    function addToggle(pickId, togWrap, cls, enabled) {
      const id = 'tog_' + pickId + '_' + cls.replace(/[^a-zA-Z0-9_-]/g, '_');
      let existing = document.getElementById(id);
      if (existing) { existing.checked = enabled; return; }
      const lbl = document.createElement('label');
      const cb = document.createElement('input');
      cb.type = 'checkbox'; cb.id = id; cb.checked = enabled;
      cb.onchange = () => postToIframe({ type: 'bp:toggleClass', pickId, className: cls, enabled: cb.checked });
      lbl.appendChild(cb); lbl.appendChild(document.createTextNode(' ' + cls));
      togWrap.appendChild(lbl);
    }

    function addPin(pick) {
      if (pins.has(pick.id)) return;
      const card = renderPinCard(pick);
      pins.set(pick.id, { card, data: pick });
      pinsEmpty.style.display = 'none';
      pinsList.appendChild(card);
    }

    function unpinLocal(pickId) {
      const entry = pins.get(pickId);
      if (!entry) return;
      entry.card.remove();
      pins.delete(pickId);
      if (pins.size === 0) pinsEmpty.style.display = '';
      postToIframe({ type: 'bp:unpin', pickId });
    }

    // ---- asset rendering ----
    function addAsset(asset) {
      if (seenAssetUrls.has(asset.url)) return;
      seenAssetUrls.add(asset.url);
      const row = document.createElement('div');
      row.className = 'asset-row';
      const t = document.createElement('span'); t.className = 'type'; t.textContent = asset.type || 'other';
      const p = document.createElement('span'); p.className = 'path'; p.textContent = asset.sourcePath || asset.url;
      row.title = asset.url;
      row.appendChild(t); row.appendChild(p);
      assetsList.appendChild(row);
    }

    // ---- toolbar buttons ----
    btnReload && btnReload.addEventListener('click', () => vscode.postMessage({ type: 'manualReload' }));
    btnEdit && btnEdit.addEventListener('click', () => vscode.postMessage({ type: 'editSource' }));
    btnOpen && btnOpen.addEventListener('click', () => vscode.postMessage({ type: 'openExternal' }));
    btnInspector && btnInspector.addEventListener('click', () => setInspector(!inspectorOn));
    btnSave && btnSave.addEventListener('click', () => {
      postToIframe({ type: 'bp:collectSnapshot' });
    });
    overlayRetry && overlayRetry.addEventListener('click', () => vscode.postMessage({ type: 'retry' }));

    // ---- messages from extension host ----
    window.addEventListener('message', (event) => {
      const msg = event.data;
      if (!msg || typeof msg !== 'object') return;
      // bp:* messages come from the iframe; everything else from the ext host
      if (typeof msg.type === 'string' && msg.type.startsWith('bp:')) {
        switch (msg.type) {
          case 'bp:ready':
            // iframe inspector ready — apply current toggle state
            postToIframe({ type: 'bp:setInspectorMode', on: inspectorOn });
            break;
          case 'bp:pinned':
            addPin(msg.pick);
            break;
          case 'bp:assetAdded':
            addAsset(msg.asset);
            break;
          case 'bp:snapshotData':
            vscode.postMessage({ type: 'snapshotData', payload: msg.payload });
            break;
        }
        return;
      }
      switch (msg.type) {
        case 'serverReady':
          baseUrl = msg.url;
          urlLabel.textContent = msg.url;
          setOverlay(null);
          setSrc();
          break;
        case 'reload':
          setSrc();
          break;
        case 'serverError':
          setOverlay({ title: msg.title, body: msg.body, retryLabel: msg.retryLabel, showRetry: true });
          break;
        case 'noWorkspace':
          setOverlay({ title: msg.title, body: msg.body, showRetry: false });
          break;
        case 'snapshotSaved':
          showToast(msg.text, msg.actionLabel, () => vscode.postMessage({ type: 'openSnapshotFolder', path: msg.path }));
          break;
        case 'snapshotError':
          showToast(msg.text, null, null);
          break;
      }
    });

    vscode.postMessage({ type: 'ready' });
  })();
`;
```

- [ ] **Step 2: Typecheck + commit**

```bash
cd vibecode-browser-preview-pro && npm run typecheck
cd /Users/jeonghan/Documents/WORK/WORKSPACE/apps/vscode-extension-mono
git add vibecode-browser-preview-pro/src/webview/client-script.ts
git commit -m "feat(browser-preview-pro): webview client-script inspector panel + iframe bridge"
```

---

### Task 8: Editor provider — wire snapshot + new messages

**Files:**
- Modify: `vibecode-browser-preview-pro/src/editor-provider.ts`

- [ ] **Step 1: Replace the file**

Path: `vibecode-browser-preview-pro/src/editor-provider.ts`

```typescript
import * as vscode from 'vscode';
import * as path from 'path';
import { PreviewServerRegistry } from './preview-server';
import { ReloadWatcher } from './reload-watcher';
import { buildHtml } from './webview/html';
import { getL10nBundle, type L10nBundle } from './l10n-bundle';
import { SnapshotWriter } from './snapshot-writer';
import type { SnapshotPayload } from './snapshot-types';

export const VIEW_TYPE = 'vibecodeBrowserPreviewPro.editor';

export class BrowserPreviewEditorProvider implements vscode.CustomTextEditorProvider {
  private readonly registry = new PreviewServerRegistry();
  private readonly watcher = new ReloadWatcher();
  private readonly snapshotWriter = new SnapshotWriter();
  private readonly panelReloadCallbacks = new Set<() => void>();
  private readonly watcherSub: vscode.Disposable;

  constructor() {
    this.watcherSub = this.watcher.onReload(() => {
      for (const cb of this.panelReloadCallbacks) cb();
    });
  }

  static register(_context: vscode.ExtensionContext): vscode.Disposable {
    const provider = new BrowserPreviewEditorProvider();
    const registration = vscode.window.registerCustomEditorProvider(
      VIEW_TYPE,
      provider,
      {
        webviewOptions: { retainContextWhenHidden: true },
        supportsMultipleEditorsPerDocument: false
      }
    );
    return vscode.Disposable.from(
      registration,
      new vscode.Disposable(() => provider.dispose())
    );
  }

  dispose(): void {
    this.watcherSub.dispose();
    this.watcher.dispose();
  }

  async resolveCustomTextEditor(
    document: vscode.TextDocument,
    panel: vscode.WebviewPanel
  ): Promise<void> {
    const l10n = getL10nBundle();
    panel.webview.options = { enableScripts: true };
    panel.webview.html = buildHtml(panel.webview, l10n);

    const rootDir = this.pickRootDir(document.uri);

    if (!rootDir) {
      panel.webview.postMessage({
        type: 'noWorkspace',
        title: l10n.openFolderFirst,
        body: l10n.openFolderHint
      });
      return;
    }

    let serverUrl: URL | null = null;
    let release: (() => Promise<void>) | null = null;
    let panelReload: (() => void) | null = null;
    let disposed = false;

    const cleanup = async (): Promise<void> => {
      if (disposed) return;
      disposed = true;
      if (panelReload) this.panelReloadCallbacks.delete(panelReload);
      if (release) await release();
    };

    const relPath = (): string =>
      path.relative(rootDir, document.uri.fsPath).split(path.sep).join('/');

    const start = async (): Promise<void> => {
      try {
        const handle = await this.registry.acquire(rootDir);
        if (disposed) {
          await handle.release();
          return;
        }
        serverUrl = handle.url;
        release = handle.release;
        const fullUrl = serverUrl.toString() + relPath();
        panel.webview.postMessage({
          type: 'serverReady',
          url: fullUrl,
          relativePath: relPath()
        });
        panelReload = () => panel.webview.postMessage({ type: 'reload' });
        this.panelReloadCallbacks.add(panelReload);
      } catch (err) {
        panel.webview.postMessage({
          type: 'serverError',
          title: l10n.serverError.replace('{0}', (err as Error).message),
          body: '',
          retryLabel: l10n.retry
        });
      }
    };

    const saveSnapshot = async (payload: SnapshotPayload): Promise<void> => {
      try {
        const result = await this.snapshotWriter.write(rootDir, document.uri.fsPath, payload);
        panel.webview.postMessage({
          type: 'snapshotSaved',
          text: l10n.snapshotSaved.replace('{0}', result.folderRelPath),
          path: result.folderAbsPath,
          actionLabel: l10n.openSnapshotFolder
        });
      } catch (err) {
        panel.webview.postMessage({
          type: 'snapshotError',
          text: l10n.snapshotFailed.replace('{0}', (err as Error).message)
        });
      }
    };

    panel.webview.onDidReceiveMessage(async (msg: { type?: string; [k: string]: any }) => {
      if (!msg || typeof msg.type !== 'string') return;
      switch (msg.type) {
        case 'ready':
          await start();
          break;
        case 'manualReload':
          if (panelReload) panelReload();
          break;
        case 'editSource':
          await vscode.commands.executeCommand(
            'vscode.openWith',
            document.uri,
            'default',
            vscode.ViewColumn.Beside
          );
          break;
        case 'openExternal':
          if (serverUrl) {
            await vscode.env.openExternal(vscode.Uri.parse(serverUrl.toString() + relPath()));
          }
          break;
        case 'retry':
          await start();
          break;
        case 'toggleInspector':
          // Currently no host-side state; accepted for future-proofing.
          break;
        case 'snapshotData':
          if (msg.payload) await saveSnapshot(msg.payload as SnapshotPayload);
          break;
        case 'openSnapshotFolder':
          if (typeof msg.path === 'string') {
            await this.snapshotWriter.revealInFinder(msg.path);
          }
          break;
      }
    });

    panel.onDidDispose(() => {
      void cleanup();
    });
  }

  private pickRootDir(uri: vscode.Uri): string | null {
    const folder = vscode.workspace.getWorkspaceFolder(uri);
    if (folder) return folder.uri.fsPath;
    if (uri.scheme === 'file') return path.dirname(uri.fsPath);
    return null;
  }
}

export type { L10nBundle };
```

- [ ] **Step 2: Full build (sync + tsc) + lint + sync:check**

```bash
cd vibecode-browser-preview-pro && npm run build && npm run lint && npm run sync:check
```

Expected: all exit 0.

- [ ] **Step 3: Commit**

```bash
cd /Users/jeonghan/Documents/WORK/WORKSPACE/apps/vscode-extension-mono
git add vibecode-browser-preview-pro/src/editor-provider.ts
git commit -m "feat(browser-preview-pro): editor provider wires snapshot writer + inspector messages"
```

---

### Task 9: README + package + install + hand off manual verify

**Files:**
- Modify: `vibecode-browser-preview-pro/README.md` (update Pro 전용 섹션 status from "예정" to v0.2 shipped list)

- [ ] **Step 1: Update README — flip Pro 전용 section to shipped**

Path: `vibecode-browser-preview-pro/README.md`

Replace the `## Pro 전용 (예정 / v0.2+)` block with:

```markdown
## Pro 전용 (v0.2 shipped)

- 🎯 **Inspector toggle** — 호버 시 요소 outline + selector tooltip, 클릭 시 우측 패널에 핀
- 핀 카드: matched CSS (heuristic) / computed style (화이트리스트 24 properties) / class toggle / 인라인 스타일 / force state 라벨
- **자동 에셋 수집** — CSS / JS / 이미지 / 폰트 (DOM 초기 스캔 + PerformanceObserver)
- 💾 **Save Snapshot** — `.vibecode/browser-preview/YYYYMMDDHHMMSS/` 에 4파일 (`state.html`, `picks.json`, `assets.json`, `meta.json`). `.vibecode/.gitignore` 자동 생성.
- Toast 알림 + "스냅샷 폴더 열기" 액션

## 알려진 한계 (v0.2)

- Force state 셀렉트는 v0.2 에선 **라벨링만** (실제 `:hover` 등 pseudo-class 시뮬레이션은 v0.3 예정 — 그때까진 인라인 스타일로 직접 적용)
- 페이지 리로드 시 핀/변형은 초기화됨 (Inspector toggle 만 유지)
- 5MB 초과 HTML 은 inspector 자동 비활성 (성능)
- 요소별 메모/주석, 디바이스 프리셋, diff 뷰, ZIP export 는 v0.3
```

- [ ] **Step 2: Commit README update**

```bash
cd /Users/jeonghan/Documents/WORK/WORKSPACE/apps/vscode-extension-mono
git add vibecode-browser-preview-pro/README.md
git commit -m "docs(browser-preview-pro): README — v0.2 shipped features"
```

- [ ] **Step 3: Clean old vsix + repackage**

```bash
cd vibecode-browser-preview-pro
find . -maxdepth 1 -name '*.vsix' -delete
npm run build
npx --yes @vscode/vsce@latest package --no-dependencies --allow-missing-repository --skip-license --baseContentUrl https://dalsoop.com
```

Expected: `vibecode-browser-preview-pro-0.1.0.vsix` produced.

- [ ] **Step 4: Install vsix**

```bash
code --install-extension vibecode-browser-preview-pro-0.1.0.vsix --force
```

Expected: "successfully installed."

- [ ] **Step 5: Hand off manual verify to user**

Tell user: ⌘R to Reload Window, then run through spec §7 checklist (18 items). Report any failures for follow-up commits.

---

## Self-review notes

- **Spec coverage**:
  - §2 in scope — collapsible panel ✓ (Task 6), inspector inject ✓ (Task 4), hover/click/pin ✓ (Task 3), variant controls ✓ (Tasks 3/7), asset collection ✓ (Task 3), save snapshot ✓ (Tasks 2/7/8), new i18n keys ✓ (Tasks 1/5), separate viewType ✓ (already done in v0.1 fork commit).
  - §3.1 inspector injection ✓ Task 4 (5MB limit, `</body>` then `</html>` fallback).
  - §3.2 inspector script behavior ✓ Task 3 (selector path, matched rules, computed whitelist, hover overlay, pin registry, force state label-only, asset collection, postMessage).
  - §3.3 webview layout (flex split, side panel, 320px default) ✓ Task 6.
  - §3.4 save snapshot 4-step message dance ✓ Tasks 7/8.
  - §3.5 file schemas — picks.json / assets.json / meta.json shapes ✓ Tasks 2 (types) + 3 (snapshot collector emits matching shape) + 8 (writer enriches with meta).
  - §3.6 message protocol — all 11 new types covered.
  - §4 file layout — Tasks map 1:1.
  - §5 security — 127.0.0.1 binding unchanged, path traversal preserved, inspector script same-origin, `<script src="/__bp_inspector.js"></script>` strip on save (Task 2 regex).
  - §6 edge cases — `.vibecode/.gitignore` auto-create (Task 2), same-second suffix (Task 2 uniqueFolder), 5MB limit (Task 4), force state v0.2 simplification (Task 3 comment).
  - §7 manual verify — covered by Task 9 hand-off.
- **No placeholders**: grep'd for "TBD"/"TODO"/"implement later" — clean. Every code step has full code, every command has expected output.
- **Type consistency**: `PickData.id` is `number` everywhere (Tasks 2/3/7/8). `SnapshotPayload` shape matches what Task 3 emits from `collectSnapshot()`. `applyToggleClass(pickId, className, enabled)` parameter order matches Task 7's `postToIframe({type:'bp:toggleClass', pickId, className, enabled})`. `MatchedRule` fields `{selector, source, declarations}` match across types (Task 2) and emitter (Task 3) and renderer (Task 7). `forceState` literal type `'hover'|'focus'|'active'|null` matches the select options in Task 7 (`hover`/`focus`/`active`/empty-string→`null`).
- **Iframe sandbox** — kept `allow-same-origin` so inspector script can read stylesheets cross-stylesheet (same origin only — external CDN stylesheets will throw on `.cssRules` and are silently skipped per Task 3 `try { sheet.cssRules } catch`).
