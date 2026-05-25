# vibecode-browser-preview-pro v0.3 Implementation Plan

> **For agentic workers:** Inline execution per user preference. Steps use checkbox (`- [ ]`) syntax for tracking. No automated tests — verification is `typecheck` + `lint` + `sync:check` per task, plus a manual checklist (spec §7) run by the user post-build.

**Goal:** Add element notes, baseline-vs-modified diff (changes.json + changes.md), and one-file ZIP export to the snapshot pipeline, plus a live override-count badge per pin card.

**Architecture:** Iframe inspector captures a baseline snapshot at pin creation time (className / inline style / computed whitelist). On `bp:collectSnapshot`, it computes a per-pin `Delta` and ships it alongside picks/assets. `SnapshotWriter` writes two new files (`changes.json`, `changes.md`) into the timestamp folder, then a hand-rolled minimal ZIP writer bundles the entire folder into a sibling `YYYYMMDDHHMMSS.zip`. The webview shows a live `▲N` badge per pin (count of currently-active overrides — class toggles + inline style + force state + notes) and a notes textarea.

**Tech Stack:** Same as v0.2 — TypeScript 5, Node `http`/`fs`/`zlib`, `@types/vscode ^1.95.0`, no bundler. The new ZIP writer uses only `zlib.deflateRawSync` plus a precomputed CRC32 table; no external runtime deps.

**Spec:** [docs/superpowers/specs/2026-05-25-vibecode-browser-preview-pro-v0.3-design.md](../specs/2026-05-25-vibecode-browser-preview-pro-v0.3-design.md)

**Working directory:** `/Users/jeonghan/Documents/WORK/WORKSPACE/apps/vscode-extension-mono/vibecode-browser-preview-pro/`

---

## File change map

```
vibecode-browser-preview-pro/
├── package.json                       # MODIFY — Task 1 (version 0.3.0)
├── README.md                          # MODIFY — Task 9 (v0.3 features)
├── i18n/ko.json                       # MODIFY — Task 1 (new runtime keys)
├── src/
│   ├── snapshot-types.ts              # MODIFY — Task 2 (Delta, ChangeData, notes)
│   ├── zip-writer.ts                  # NEW    — Task 3 (minimal ZIP encoder)
│   ├── inspector/inspector-script.ts  # MODIFY — Task 4 (baseline + diff)
│   ├── l10n-bundle.ts                 # MODIFY — Task 5 (new keys)
│   ├── webview/
│   │   ├── styles.ts                  # MODIFY — Task 6 (badge style)
│   │   ├── html.ts                    # MODIFY — Task 6 (notes/badge slots)
│   │   └── client-script.ts           # MODIFY — Task 7 (notes + badge update)
│   └── snapshot-writer.ts             # MODIFY — Task 8 (changes + zip)
```

---

### Task 1: version bump + i18n keys

**Files:**
- Modify: `vibecode-browser-preview-pro/package.json` (version)
- Modify: `vibecode-browser-preview-pro/i18n/ko.json` (runtime block — add notes/changes/zip keys)

- [ ] **Step 1: Bump version in `package.json`**

Path: `vibecode-browser-preview-pro/package.json`

Change the `"version"` field from `"0.1.0"` to `"0.3.0"`. (v0.2 didn't bump — we go straight to 0.3.0 to reflect the publisher-handoff package.)

```json
  "version": "0.3.0",
```

- [ ] **Step 2: Add new runtime keys to `i18n/ko.json`**

Path: `vibecode-browser-preview-pro/i18n/ko.json`

Append these key-value pairs to the existing `runtime` block (do not remove any existing key):

```json
    "Notes": "메모",
    "Notes for publisher…": "퍼블리셔용 메모…",
    "Changes ({0})": "변경 사항 ({0})",
    "ZIP also saved": "ZIP 도 함께 저장됨"
```

The full updated `runtime` block should look like:

```json
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
    "Snapshots are written to .vibecode/browser-preview/ — added to .gitignore automatically.": "스냅샷은 .vibecode/browser-preview/ 에 저장됩니다 — .gitignore 에 자동으로 추가됩니다.",
    "Notes": "메모",
    "Notes for publisher…": "퍼블리셔용 메모…",
    "Changes ({0})": "변경 사항 ({0})",
    "ZIP also saved": "ZIP 도 함께 저장됨"
  }
```

- [ ] **Step 3: Run sync + verify**

```bash
cd vibecode-browser-preview-pro && npm run sync && npm run sync:check
```

Expected: `Synced NLS — default + 1 locales (ko).` + `NLS bundles are in sync.`

- [ ] **Step 4: Commit**

```bash
cd /Users/jeonghan/Documents/WORK/WORKSPACE/apps/vscode-extension-mono
git add vibecode-browser-preview-pro/package.json vibecode-browser-preview-pro/i18n/ vibecode-browser-preview-pro/l10n/ vibecode-browser-preview-pro/package.nls.ko.json
git commit -m "feat(browser-preview-pro): bump 0.3.0 + notes/changes/zip i18n keys"
```

---

### Task 2: snapshot-types extensions

**Files:**
- Modify: `vibecode-browser-preview-pro/src/snapshot-types.ts`

- [ ] **Step 1: Replace the file**

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
  notes: string;
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

export interface Delta {
  classes: { added: string[]; removed: string[] };
  inlineStyle: { before: string; after: string; changed: boolean };
  forceState: { before: 'hover' | 'focus' | 'active' | null; after: 'hover' | 'focus' | 'active' | null; changed: boolean };
  notes: { before: string; after: string; changed: boolean };
  computed: Record<string, { before: string; after: string }>;
}

export interface ChangeData {
  pickId: number;
  selector: string;
  delta: Delta;
  hasAnyChange: boolean;
}

export interface SnapshotPayload {
  outerHTML: string;
  picks: PickData[];
  assets: AssetData[];
  changes: ChangeData[];
  viewport: { width: number; height: number };
  userAgent: string;
}

export interface SnapshotResult {
  folderAbsPath: string;
  folderRelPath: string;
  zipAbsPath: string | null;
  timestampLocal: string;
}
```

Note: `SnapshotResult` now has `zipAbsPath: string | null` (null if ZIP write failed; folder still wrote successfully).

- [ ] **Step 2: Typecheck**

```bash
cd vibecode-browser-preview-pro && npm run typecheck
```

Expected: exits 0. (You'll see this fails initially with errors in `snapshot-writer.ts` because `SnapshotPayload.changes` is now required, and `SnapshotResult.zipAbsPath` is new. That's fine — Task 8 will fix those errors. For now we want to confirm `snapshot-types.ts` itself compiles cleanly in isolation.)

Actually run it anyway and note the errors will be in snapshot-writer.ts only (lines referencing payload but the file currently passes payload without `changes`). Continue to next step regardless.

Actually to keep the tree green between tasks, do **not** commit this until Task 8 is done. Instead, after Step 1 here, move directly to Task 3 without intermediate commit. This is a multi-step refactor.

**REVISED Step 2: Defer commit — proceed to Task 3 directly.**

Do not run typecheck yet (it will fail because consumers haven't been updated). Move to Task 3.

---

### Task 3: zip-writer (new module)

**Files:**
- Create: `vibecode-browser-preview-pro/src/zip-writer.ts`

- [ ] **Step 1: Write `zip-writer.ts`**

Path: `vibecode-browser-preview-pro/src/zip-writer.ts`

```typescript
import { deflateRawSync } from 'zlib';

// CRC32 lookup table — built once at module load.
const CRC_TABLE: number[] = (() => {
  const t: number[] = new Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : (c >>> 1);
    }
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

interface ZipEntry {
  name: string;
  data: Buffer;
}

interface PreparedEntry {
  nameBuf: Buffer;
  compressed: Buffer;
  uncompressedSize: number;
  crc: number;
  localHeaderOffset: number;
  dosTime: number;
  dosDate: number;
}

// DOS-time encoding of "now" for the file headers.
function dosNow(): { time: number; date: number } {
  const d = new Date();
  const time = ((d.getHours() & 0x1f) << 11) | ((d.getMinutes() & 0x3f) << 5) | ((Math.floor(d.getSeconds() / 2)) & 0x1f);
  const date = (((d.getFullYear() - 1980) & 0x7f) << 9) | (((d.getMonth() + 1) & 0xf) << 5) | (d.getDate() & 0x1f);
  return { time, date };
}

/**
 * Builds a ZIP archive (DEFLATE compression) from the given entries.
 * No ZIP64, no encryption, no extra fields.
 * Safe for files < 4 GiB total and < 4 GiB each.
 */
export function buildZip(entries: ZipEntry[]): Buffer {
  const prepared: PreparedEntry[] = [];
  const { time: dosTime, date: dosDate } = dosNow();

  // Encode local file records first, tracking offsets.
  const localChunks: Buffer[] = [];
  let cursor = 0;

  for (const entry of entries) {
    const nameBuf = Buffer.from(entry.name, 'utf8');
    const compressed = deflateRawSync(entry.data);
    const uncompressedSize = entry.data.length;
    const crc = crc32(entry.data);
    const localHeaderOffset = cursor;

    // Local file header (30 bytes + name)
    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50, 0);          // signature
    header.writeUInt16LE(20, 4);                   // version needed (2.0)
    header.writeUInt16LE(0x0800, 6);               // general purpose flag — bit 11 = UTF-8 name
    header.writeUInt16LE(8, 8);                    // compression method = deflate
    header.writeUInt16LE(dosTime, 10);
    header.writeUInt16LE(dosDate, 12);
    header.writeUInt32LE(crc, 14);
    header.writeUInt32LE(compressed.length, 18);
    header.writeUInt32LE(uncompressedSize, 22);
    header.writeUInt16LE(nameBuf.length, 26);
    header.writeUInt16LE(0, 28);                   // no extra field

    localChunks.push(header, nameBuf, compressed);
    cursor += header.length + nameBuf.length + compressed.length;

    prepared.push({ nameBuf, compressed, uncompressedSize, crc, localHeaderOffset, dosTime, dosDate });
  }

  // Central directory
  const centralChunks: Buffer[] = [];
  const centralStart = cursor;
  for (const p of prepared) {
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);          // central directory signature
    central.writeUInt16LE(20, 4);                  // version made by (2.0)
    central.writeUInt16LE(20, 6);                  // version needed (2.0)
    central.writeUInt16LE(0x0800, 8);              // general purpose flag — UTF-8
    central.writeUInt16LE(8, 10);                  // method = deflate
    central.writeUInt16LE(p.dosTime, 12);
    central.writeUInt16LE(p.dosDate, 14);
    central.writeUInt32LE(p.crc, 16);
    central.writeUInt32LE(p.compressed.length, 20);
    central.writeUInt32LE(p.uncompressedSize, 24);
    central.writeUInt16LE(p.nameBuf.length, 28);
    central.writeUInt16LE(0, 30);                  // extra field length
    central.writeUInt16LE(0, 32);                  // comment length
    central.writeUInt16LE(0, 34);                  // disk number start
    central.writeUInt16LE(0, 36);                  // internal attrs
    central.writeUInt32LE(0, 38);                  // external attrs
    central.writeUInt32LE(p.localHeaderOffset, 42);

    centralChunks.push(central, p.nameBuf);
    cursor += central.length + p.nameBuf.length;
  }
  const centralSize = cursor - centralStart;

  // End-of-central-directory record
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);                        // disk number
  eocd.writeUInt16LE(0, 6);                        // disk where central dir starts
  eocd.writeUInt16LE(prepared.length, 8);          // entries on this disk
  eocd.writeUInt16LE(prepared.length, 10);         // total entries
  eocd.writeUInt32LE(centralSize, 12);
  eocd.writeUInt32LE(centralStart, 16);
  eocd.writeUInt16LE(0, 20);                       // comment length

  return Buffer.concat([...localChunks, ...centralChunks, eocd]);
}
```

- [ ] **Step 2: Defer typecheck — continue to Task 4.**

(The new module has no external dependents yet. Task 8 will use it; typecheck happens then.)

---

### Task 4: inspector-script — baseline + diff computation

**Files:**
- Modify: `vibecode-browser-preview-pro/src/inspector/inspector-script.ts`

- [ ] **Step 1: Replace the file**

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

  function classListOf(el) {
    return (el.className || '').toString().trim().split(/\\s+/).filter(Boolean);
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
  var pins = new Map();   // pickId -> { el, overrides, baseline, originalInlineStyle }
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
    const overrides = { classToggles: [], inlineStyle: '', forceState: null, notes: '' };
    const baseline = {
      className: el.className.toString(),
      classes: classListOf(el),
      inlineStyle: el.getAttribute('style') || '',
      forceState: null,
      notes: '',
      computed: computedFor(el)
    };
    pins.set(id, { el, overrides, baseline, originalInlineStyle: baseline.inlineStyle });
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
        forceState: overrides.forceState,
        notes: overrides.notes
      }
    };
  }

  function diffArrays(a, b) {
    const setA = new Set(a);
    const setB = new Set(b);
    const added = [];
    const removed = [];
    for (const x of b) if (!setA.has(x)) added.push(x);
    for (const x of a) if (!setB.has(x)) removed.push(x);
    return { added, removed };
  }

  function computeDelta(pin) {
    const el = pin.el;
    const baseline = pin.baseline;
    const overrides = pin.overrides;
    const currentClasses = classListOf(el);
    const classDiff = diffArrays(baseline.classes, currentClasses);
    const currentInline = el.getAttribute('style') || '';
    const inlineChanged = currentInline !== baseline.inlineStyle;
    const forceChanged = (overrides.forceState || null) !== (baseline.forceState || null);
    const notesChanged = (overrides.notes || '') !== (baseline.notes || '');
    const curComputed = computedFor(el);
    const computedDelta = {};
    for (const k of Object.keys(curComputed)) {
      const before = baseline.computed[k] || '';
      const after = curComputed[k] || '';
      if (before !== after) computedDelta[k] = { before, after };
    }
    const hasAnyChange =
      classDiff.added.length > 0 ||
      classDiff.removed.length > 0 ||
      inlineChanged ||
      forceChanged ||
      notesChanged ||
      Object.keys(computedDelta).length > 0;
    return {
      classes: classDiff,
      inlineStyle: { before: baseline.inlineStyle, after: currentInline, changed: inlineChanged },
      forceState: { before: baseline.forceState, after: overrides.forceState || null, changed: forceChanged },
      notes: { before: baseline.notes, after: overrides.notes || '', changed: notesChanged },
      computed: computedDelta,
      __hasAnyChange: hasAnyChange
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
    // v0.2/v0.3: label only — no actual pseudo-class simulation
  }

  function applyNotes(pickId, notes) {
    const pin = pins.get(pickId); if (!pin) return;
    pin.overrides.notes = String(notes || '');
  }

  function unpin(pickId) {
    pins.delete(pickId);
  }

  // ---- snapshot collector ----
  function collectSnapshot() {
    const picksArr = [];
    const changesArr = [];
    for (const [id, pin] of pins.entries()) {
      picksArr.push(snapshotPick(id, pin.el, pin.overrides));
      const delta = computeDelta(pin);
      const hasAnyChange = !!delta.__hasAnyChange;
      delete delta.__hasAnyChange;
      changesArr.push({
        pickId: id,
        selector: buildSelector(pin.el),
        delta,
        hasAnyChange
      });
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
      changes: changesArr,
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
      case 'bp:setNotes':
        applyNotes(msg.pickId, msg.notes);
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

- [ ] **Step 2: Defer typecheck — continue to Task 5.**

---

### Task 5: l10n-bundle keys

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
  notes: string;
  notesPlaceholder: string;
  changesLabel: string;        // template containing {0} placeholder for count
  zipAlsoSaved: string;
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
    snapshotsHint: vscode.l10n.t('Snapshots are written to .vibecode/browser-preview/ — added to .gitignore automatically.'),
    notes: vscode.l10n.t('Notes'),
    notesPlaceholder: vscode.l10n.t('Notes for publisher…'),
    changesLabel: vscode.l10n.t('Changes ({0})'),
    zipAlsoSaved: vscode.l10n.t('ZIP also saved')
  };
}
```

- [ ] **Step 2: Defer typecheck — continue to Task 6.**

---

### Task 6: Webview styles + html (notes textarea + badge slots)

**Files:**
- Modify: `vibecode-browser-preview-pro/src/webview/styles.ts`
- Modify: `vibecode-browser-preview-pro/src/webview/html.ts`

- [ ] **Step 1: Append badge style to `styles.ts`**

Path: `vibecode-browser-preview-pro/src/webview/styles.ts`

Add these rules INSIDE the existing template literal, immediately after the `.pin-header` block (or anywhere within the `.pin-*` cluster):

```css
  .pin-badge { display: inline-flex; align-items: center; gap: 2px; font-size: 10px; padding: 1px 5px; border-radius: 10px; background: var(--vscode-badge-background, rgba(127,127,127,0.2)); color: var(--vscode-badge-foreground, var(--vscode-foreground)); margin-right: 6px; }
  .pin-badge.zero { opacity: 0.4; }
  .pin-overrides .notes-ta { min-height: 32px; }
```

The full updated file should look like (just to keep context in plan readable — only the additions matter):

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
  .pin-badge { display: inline-flex; align-items: center; gap: 2px; font-size: 10px; padding: 1px 5px; border-radius: 10px; background: var(--vscode-badge-background, rgba(127,127,127,0.2)); color: var(--vscode-badge-foreground, var(--vscode-foreground)); margin-right: 6px; }
  .pin-badge.zero { opacity: 0.4; }
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
  .pin-overrides .notes-ta { min-height: 32px; }
  .pin-overrides .toggles label { display: inline-flex; align-items: center; gap: 4px; margin-right: 8px; font-size: 11px; text-transform: none; color: inherit; }
  .asset-row { display: flex; gap: 6px; font-family: var(--vscode-editor-font-family, monospace); font-size: 11px; padding: 2px 0; }
  .asset-row .type { width: 56px; color: var(--vscode-descriptionForeground); text-transform: uppercase; font-size: 10px; }
  .asset-row .path { flex: 1 1 auto; word-break: break-all; }

  .toast { position: absolute; left: 50%; bottom: 16px; transform: translateX(-50%); background: var(--vscode-notifications-background, #1f1f1f); color: var(--vscode-notifications-foreground, #fff); padding: 6px 12px; border-radius: 4px; font-size: 12px; display: none; z-index: 1000; }
  .toast.visible { display: flex; align-items: center; gap: 8px; }
  .toast button { font-size: 11px; padding: 2px 6px; }
`;
```

- [ ] **Step 2: `html.ts` requires no change**

(Notes textarea and badge are appended by `client-script.ts` `renderPinCard` — no static HTML to add in `html.ts`. Leave it as-is.)

- [ ] **Step 3: Defer typecheck — continue to Task 7.**

---

### Task 7: Webview client-script — notes input + live badge

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
    const pins = new Map(); // pickId -> { card, data, overrideState, badgeEl }
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

    // ---- per-pin override state + badge ----
    function recomputeBadge(pickId) {
      const entry = pins.get(pickId);
      if (!entry) return;
      const s = entry.overrideState;
      let count = 0;
      // count active class toggles
      for (const v of s.classToggles.values()) if (v) count++;
      if (s.inlineStyle.trim()) count++;
      if (s.forceState) count++;
      if (s.notes.trim()) count++;
      entry.badgeEl.textContent = '▲' + count;
      entry.badgeEl.classList.toggle('zero', count === 0);
      entry.badgeEl.title = (l10n.changesLabel || 'Changes ({0})').replace('{0}', String(count));
    }

    // ---- pin card rendering ----
    function renderPinCard(pick) {
      const card = document.createElement('div');
      card.className = 'pin-card';
      card.dataset.pickId = pick.id;

      const header = document.createElement('div');
      header.className = 'pin-header';
      const badge = document.createElement('span');
      badge.className = 'pin-badge zero';
      badge.textContent = '▲0';
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
      header.appendChild(badge);
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
          updateClassToggleState(pick.id, cls, true);
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
          updateInlineStyleState(pick.id, styleTa.value);
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
        updateForceStateState(pick.id, forceSel.value || null);
        postToIframe({ type: 'bp:setForceState', pickId: pick.id, state: forceSel.value || null });
      };
      ov.appendChild(forceSel);

      const notesLabel = document.createElement('label');
      notesLabel.textContent = l10n.notes || 'Notes';
      ov.appendChild(notesLabel);
      const notesTa = document.createElement('textarea');
      notesTa.className = 'notes-ta';
      notesTa.placeholder = l10n.notesPlaceholder || 'Notes for publisher…';
      let notesTimer = null;
      notesTa.oninput = () => {
        clearTimeout(notesTimer);
        notesTimer = setTimeout(() => {
          updateNotesState(pick.id, notesTa.value);
          postToIframe({ type: 'bp:setNotes', pickId: pick.id, notes: notesTa.value });
        }, 200);
      };
      ov.appendChild(notesTa);

      card.appendChild(ov);

      return { card, badge };
    }

    function updateClassToggleState(pickId, cls, enabled) {
      const entry = pins.get(pickId);
      if (!entry) return;
      entry.overrideState.classToggles.set(cls, enabled);
      recomputeBadge(pickId);
    }
    function updateInlineStyleState(pickId, css) {
      const entry = pins.get(pickId);
      if (!entry) return;
      entry.overrideState.inlineStyle = css || '';
      recomputeBadge(pickId);
    }
    function updateForceStateState(pickId, state) {
      const entry = pins.get(pickId);
      if (!entry) return;
      entry.overrideState.forceState = state || null;
      recomputeBadge(pickId);
    }
    function updateNotesState(pickId, notes) {
      const entry = pins.get(pickId);
      if (!entry) return;
      entry.overrideState.notes = notes || '';
      recomputeBadge(pickId);
    }

    function addToggle(pickId, togWrap, cls, enabled) {
      const id = 'tog_' + pickId + '_' + cls.replace(/[^a-zA-Z0-9_-]/g, '_');
      let existing = document.getElementById(id);
      if (existing) { existing.checked = enabled; return; }
      const lbl = document.createElement('label');
      const cb = document.createElement('input');
      cb.type = 'checkbox'; cb.id = id; cb.checked = enabled;
      cb.onchange = () => {
        updateClassToggleState(pickId, cls, cb.checked);
        postToIframe({ type: 'bp:toggleClass', pickId, className: cls, enabled: cb.checked });
      };
      lbl.appendChild(cb); lbl.appendChild(document.createTextNode(' ' + cls));
      togWrap.appendChild(lbl);
    }

    function addPin(pick) {
      if (pins.has(pick.id)) return;
      const { card, badge } = renderPinCard(pick);
      const overrideState = {
        classToggles: new Map(),  // className -> enabled bool
        inlineStyle: '',
        forceState: null,
        notes: ''
      };
      pins.set(pick.id, { card, data: pick, overrideState, badgeEl: badge });
      pinsEmpty.style.display = 'none';
      pinsList.appendChild(card);
      recomputeBadge(pick.id);
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

- [ ] **Step 2: Defer typecheck — continue to Task 8.**

---

### Task 8: snapshot-writer — changes.json + changes.md + zip

**Files:**
- Modify: `vibecode-browser-preview-pro/src/snapshot-writer.ts`

- [ ] **Step 1: Replace the file**

Path: `vibecode-browser-preview-pro/src/snapshot-writer.ts`

```typescript
import * as fs from 'fs/promises';
import * as path from 'path';
import * as vscode from 'vscode';
import type {
  AssetData,
  ChangeData,
  PickData,
  SnapshotPayload,
  SnapshotResult
} from './snapshot-types';
import { buildZip } from './zip-writer';

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
    const { folderAbs, folderName } = await this.uniqueFolder(baseDir, stamp);

    const stateHtml = payload.outerHTML.replace(INSPECTOR_SCRIPT_TAG_RE, '\n');

    const picks = { version: 1, picks: payload.picks };
    const assets = { version: 1, assets: payload.assets };
    const changes = { version: 1, changes: payload.changes };
    const meta = {
      version: 1,
      savedAt: new Date().toISOString(),
      savedAtLocal: stamp,
      sourceFile: path.relative(workspaceRoot, sourceFileAbsPath),
      workspaceRoot,
      viewport: payload.viewport,
      userAgent: payload.userAgent,
      summary: this.summarize(payload.picks, payload.assets, payload.changes)
    };
    const changesMdText = this.renderChangesMd(meta, payload.picks, payload.assets, payload.changes);

    const fileBlobs: { name: string; data: Buffer }[] = [
      { name: 'state.html', data: Buffer.from(stateHtml, 'utf8') },
      { name: 'picks.json', data: Buffer.from(JSON.stringify(picks, null, 2) + '\n', 'utf8') },
      { name: 'assets.json', data: Buffer.from(JSON.stringify(assets, null, 2) + '\n', 'utf8') },
      { name: 'changes.json', data: Buffer.from(JSON.stringify(changes, null, 2) + '\n', 'utf8') },
      { name: 'changes.md', data: Buffer.from(changesMdText, 'utf8') },
      { name: 'meta.json', data: Buffer.from(JSON.stringify(meta, null, 2) + '\n', 'utf8') }
    ];

    await Promise.all(
      fileBlobs.map(f => fs.writeFile(path.join(folderAbs, f.name), f.data))
    );

    let zipAbsPath: string | null = null;
    try {
      const zipBuf = buildZip(fileBlobs.map(f => ({ name: `${folderName}/${f.name}`, data: f.data })));
      zipAbsPath = path.join(baseDir, `${folderName}.zip`);
      await fs.writeFile(zipAbsPath, zipBuf);
    } catch (_err) {
      // ZIP failure should not poison the snapshot.
      zipAbsPath = null;
    }

    return {
      folderAbsPath: folderAbs,
      folderRelPath: path.relative(workspaceRoot, folderAbs),
      zipAbsPath,
      timestampLocal: stamp
    };
  }

  async revealInFinder(folderAbsPath: string): Promise<void> {
    await vscode.commands.executeCommand(
      'revealFileInOS',
      vscode.Uri.file(folderAbsPath)
    );
  }

  private summarize(picks: PickData[], assets: AssetData[], changes: ChangeData[]): {
    picksCount: number;
    assetsCount: number;
    pinsWithChanges: number;
    overridesCount: number;
  } {
    let overridesCount = 0;
    for (const p of picks) {
      if (p.overrides.classToggles.length > 0) overridesCount++;
      if (p.overrides.inlineStyle.trim()) overridesCount++;
      if (p.overrides.forceState) overridesCount++;
      if (p.overrides.notes.trim()) overridesCount++;
    }
    const pinsWithChanges = changes.filter(c => c.hasAnyChange).length;
    return {
      picksCount: picks.length,
      assetsCount: assets.length,
      pinsWithChanges,
      overridesCount
    };
  }

  private renderChangesMd(
    meta: { savedAtLocal: string; sourceFile: string; viewport: { width: number; height: number }; summary: { picksCount: number; pinsWithChanges: number } },
    picks: PickData[],
    assets: AssetData[],
    changes: ChangeData[]
  ): string {
    const escBacktick = (s: string) => s.replace(/`/g, '\\`');
    const lines: string[] = [];
    lines.push(`# Browser Preview Snapshot — ${meta.savedAtLocal}`);
    lines.push('');
    lines.push(`Source: \`${escBacktick(meta.sourceFile)}\``);
    lines.push(`Viewport: ${meta.viewport.width}×${meta.viewport.height}`);
    lines.push(`Pins: ${meta.summary.picksCount} (${meta.summary.pinsWithChanges} with changes)`);
    lines.push('');
    lines.push('---');
    lines.push('');

    const changeById = new Map<number, ChangeData>();
    for (const c of changes) changeById.set(c.pickId, c);

    for (const pick of picks) {
      lines.push(`## Pin ${pick.id}: \`${escBacktick(pick.selector)}\``);
      lines.push('');
      const c = changeById.get(pick.id);
      if (!c || !c.hasAnyChange) {
        lines.push('*No changes — pin recorded as-is.*');
        lines.push('');
        lines.push('---');
        lines.push('');
        continue;
      }
      const d = c.delta;
      lines.push('**Changes:**');
      lines.push('');
      if (d.classes.added.length) lines.push(`- Class added: \`${d.classes.added.join(', ')}\``);
      if (d.classes.removed.length) lines.push(`- Class removed: \`${d.classes.removed.join(', ')}\``);
      if (d.inlineStyle.changed) {
        const before = d.inlineStyle.before ? `\`${escBacktick(d.inlineStyle.before)}\`` : '*(empty)*';
        const after = d.inlineStyle.after ? `\`${escBacktick(d.inlineStyle.after)}\`` : '*(empty)*';
        lines.push(`- Inline style: ${before} → ${after}`);
      }
      if (d.forceState.changed) {
        const before = d.forceState.before || '(none)';
        const after = d.forceState.after || '(none)';
        lines.push(`- Force state: \`${before}\` → \`${after}\``);
      }
      if (d.notes.changed) {
        lines.push(`- **Notes:**`);
        lines.push('');
        for (const ln of (d.notes.after || '').split('\n')) {
          lines.push(`  > ${ln}`);
        }
      }
      const compKeys = Object.keys(d.computed);
      if (compKeys.length) {
        lines.push('');
        lines.push('Computed deltas:');
        for (const k of compKeys) {
          lines.push(`- \`${k}\`: \`${escBacktick(d.computed[k].before)}\` → \`${escBacktick(d.computed[k].after)}\``);
        }
      }
      lines.push('');
      lines.push('---');
      lines.push('');
    }

    lines.push(`## Assets (${assets.length})`);
    lines.push('');
    for (const a of assets) {
      const label = a.sourcePath || a.url;
      const sizeStr = a.size != null ? ` (${Math.round(a.size / 1024)} KB)` : '';
      lines.push(`- \`${a.type}\` \`${escBacktick(label)}\`${sizeStr}`);
    }
    lines.push('');

    return lines.join('\n');
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

  private async uniqueFolder(baseDir: string, stamp: string): Promise<{ folderAbs: string; folderName: string }> {
    let name = stamp;
    let candidate = path.join(baseDir, name);
    let n = 1;
    while (true) {
      try {
        await fs.mkdir(candidate);
        return { folderAbs: candidate, folderName: name };
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code !== 'EEXIST') throw err;
        n++;
        name = `${stamp}-${n}`;
        candidate = path.join(baseDir, name);
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

- [ ] **Step 2: Full build (sync + tsc) + lint + sync:check**

```bash
cd vibecode-browser-preview-pro && npm run build && npm run lint && npm run sync:check
```

Expected: all exit 0. (All deferred-typecheck files from Tasks 2-7 are now reachable; tsc compiles the whole graph.)

- [ ] **Step 3: Commit ALL pending source changes from Tasks 2-8**

```bash
cd /Users/jeonghan/Documents/WORK/WORKSPACE/apps/vscode-extension-mono
git add vibecode-browser-preview-pro/src/snapshot-types.ts \
        vibecode-browser-preview-pro/src/zip-writer.ts \
        vibecode-browser-preview-pro/src/inspector/inspector-script.ts \
        vibecode-browser-preview-pro/src/l10n-bundle.ts \
        vibecode-browser-preview-pro/src/webview/styles.ts \
        vibecode-browser-preview-pro/src/webview/client-script.ts \
        vibecode-browser-preview-pro/src/snapshot-writer.ts
git commit -m "$(cat <<'EOF'
feat(browser-preview-pro): v0.3 publisher handoff (notes, diff, zip)

- Inspector captures baseline at pin time, computes per-pin Delta
  at snapshot time (class diff, inline style before/after, force
  state, notes, computed property deltas).
- Snapshot folder grows: state.html, picks.json, assets.json,
  changes.json (structured), changes.md (publisher-readable),
  meta.json.
- Sibling YYYYMMDDHHMMSS.zip auto-written via hand-rolled
  minimal ZIP encoder (zlib deflate + CRC32 table, no deps).
- Notes textarea per pin card + live ▲N badge counting active
  overrides (class toggles + inline style + force state + notes).
EOF
)"
```

(One bundled commit for these 7 source files because they all hang together — type, encoder, payload, UI, and writer all coevolve.)

---

### Task 9: README + package + install

**Files:**
- Modify: `vibecode-browser-preview-pro/README.md`

- [ ] **Step 1: Replace the "Pro 전용 (v0.2 shipped)" + "알려진 한계" sections**

Path: `vibecode-browser-preview-pro/README.md`

Replace the existing `## Pro 전용 (v0.2 shipped)` block and the `## 알려진 한계 (v0.2)` block with these:

```markdown
## Pro 전용 (v0.3 shipped)

- 🎯 **Inspector toggle** — 호버 시 요소 outline + selector tooltip, 클릭 시 우측 패널에 핀
- 핀 카드: matched CSS (heuristic) / computed style (화이트리스트 24 properties) / class toggle / 인라인 스타일 / force state 라벨 / **Notes textarea (퍼블리셔용 자유 메모)**
- **▲N 뱃지** — 핀 카드 헤더에서 현재 적용된 override 개수 실시간 표시
- **자동 에셋 수집** — CSS / JS / 이미지 / 폰트 (DOM 초기 스캔 + PerformanceObserver)
- 💾 **Save Snapshot** — `.vibecode/browser-preview/YYYYMMDDHHMMSS/` 에 6 파일 (`state.html`, `picks.json`, `assets.json`, `changes.json`, `changes.md`, `meta.json`) + 같은 위치에 `YYYYMMDDHHMMSS.zip` 자동 동봉.
- `changes.md` 는 퍼블리셔가 그대로 읽도록 마크다운으로 렌더 — 핀별 변경사항 + Notes + computed delta.
- `.vibecode/.gitignore` 자동 생성, ZIP 작성 실패해도 폴더는 안전.
- Toast 알림 + "스냅샷 폴더 열기" 액션

## 알려진 한계 (v0.3)

- Force state 셀렉트는 v0.3 에도 **라벨링만** (실제 `:hover` 등 pseudo-class 시뮬레이션은 v0.4 예정)
- 페이지 리로드 시 핀/변형은 초기화됨 (Inspector toggle 만 유지)
- 5MB 초과 HTML 은 inspector 자동 비활성 (성능)
- 디바이스 프리셋 토글, 라이브 diff 패널, 요소 스크린샷은 v0.4
```

- [ ] **Step 2: Commit README**

```bash
cd /Users/jeonghan/Documents/WORK/WORKSPACE/apps/vscode-extension-mono
git add vibecode-browser-preview-pro/README.md
git commit -m "docs(browser-preview-pro): README — v0.3 shipped features"
```

- [ ] **Step 3: Clean old vsix + build + package**

```bash
cd vibecode-browser-preview-pro
find . -maxdepth 1 -name '*.vsix' -delete
npm run build
npx --yes @vscode/vsce@latest package --no-dependencies --allow-missing-repository --skip-license --baseContentUrl https://dalsoop.com
```

Expected: `vibecode-browser-preview-pro-0.3.0.vsix` produced.

- [ ] **Step 4: Install vsix**

```bash
code --install-extension vibecode-browser-preview-pro-0.3.0.vsix --force
```

Expected: "successfully installed."

- [ ] **Step 5: Hand off manual verify to user (spec §7, 15 items)**

Tell user: ⌘R to Reload Window, then run through the 15-item checklist. Report failures for follow-up commits.

---

## Self-review notes

- **Spec coverage**:
  - §2 in scope — Notes (Tasks 4/5/7), Baseline+Delta (Task 4), changes.json (Task 8), changes.md (Task 8), ZIP export (Tasks 3/8), Live badge (Tasks 6/7), i18n (Task 1), version bump (Task 1), README (Task 9). All present.
  - §3.1 Notes flow ✓ Tasks 7 + 4 (`bp:setNotes` message).
  - §3.2 Baseline + diff ✓ Task 4 (`pinElement` captures baseline, `computeDelta` runs at snapshot time, payload extended).
  - §3.3 SnapshotWriter extension ✓ Task 8 (writeChangesJson via JSON.stringify, renderChangesMd inline method).
  - §3.4 ZIP writer ✓ Task 3 (`buildZip`, no deps, CRC32 table, deflate-raw).
  - §3.5 Live badge ✓ Task 7 (`recomputeBadge` + per-update calls).
  - §3.6 `bp:setNotes` message ✓ Task 4 case + Task 7 emitter.
  - §3.7 PickOverrides.notes ✓ Task 2.
- **No placeholders**: every step has full code. No "implement details" filler.
- **Type consistency**:
  - `PickOverrides.notes: string` (Tasks 2, 4, 7, 8 all agree).
  - `ChangeData { pickId, selector, delta, hasAnyChange }` consistent between Task 2 (type) and Task 4 (emitter) and Task 8 (consumer in summarize / renderChangesMd).
  - `SnapshotResult` adds `zipAbsPath: string | null` (Task 2). Task 8 returns it. `editor-provider.ts` already accepts a `SnapshotResult` and only reads `folderAbsPath`/`folderRelPath` — `zipAbsPath` is unused there. (We don't need to touch editor-provider.ts in v0.3.)
  - Message `bp:setNotes { pickId, notes }` consistent: Task 7 sends, Task 4 receives.
  - `buildZip(entries: { name: string; data: Buffer }[])` — Task 3 signature, Task 8 caller passes that shape.
- **Deferred-commit strategy**: Tasks 2–7 modify source without committing because the tree is intentionally broken mid-refactor (consumers haven't caught up). Task 8 finishes the refactor, runs full build, and commits all 7 files in one logical "v0.3 publisher handoff" commit. Cleaner history than 6 broken-mid-tree commits.
- **Editor-provider unchanged**: v0.3 doesn't touch host-side messaging because all new behavior flows through existing channels (`requestSnapshot` → `snapshotData` → `saveSnapshot`). The writer's `SnapshotResult.zipAbsPath` is set but `editor-provider.ts` simply ignores it (still uses `folderAbsPath`). If we ever want the toast to mention "ZIP also saved", that's a single-line tweak — left for a follow-up if desired.
