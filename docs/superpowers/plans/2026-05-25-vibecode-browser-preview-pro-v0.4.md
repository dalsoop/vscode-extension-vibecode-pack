# vibecode-browser-preview-pro v0.4 Implementation Plan

> **For agentic workers:** Inline execution per user preference (see `MEMORY.md` → `feedback_execute_directly`). Steps use checkbox (`- [ ]`) syntax for tracking. No automated tests — verification is `npm run typecheck && npm run lint && npm run sync:check` per task plus the manual checklist at the end of Task 10. All session changes commit as one MR per `MEMORY.md` → `feedback_bundle_mrs`.

**Goal:** Add three publisher-workflow features on top of v0.3 — device-frame presets (Auto / Desktop 1280 / Tablet 768 / Mobile 375), a Changes tab inside the inspector panel that mirrors `changes.md` live, and real force-state simulation (`:hover` / `:focus` / `:focus-visible` / `:active`) via stylesheet rewrite + class swap.

**Architecture:** Device preset wraps `<iframe>` in a `.device-frame` whose `data-mode` toggles fixed pixel widths. Panel layout swaps Pins-then-Assets stack to Pins/Changes tabs with Assets/snapshot-hint remaining below; Changes tab is rendered by a new `webview/sections/diff-tab.ts` IIFE. Force state ships as a sibling iframe script `inspector/force-state-script.ts` concatenated to inspector-script at serve time — it scans every same-origin stylesheet at startup, finds `:hover` / `:focus` / `:focus-visible` / `:active` rules, and inserts duplicates whose selectors swap the pseudo-class for `.vibecode-force-{state}`. Toggling state on a pinned element becomes a class add/remove. Snapshot bundles the duplicated rules into `state.html` as `<style id="vibecode-force-rules">` so the saved HTML renders the forced styles standalone.

**Tech Stack:** Same as v0.3 — TypeScript 5, no bundler, all in-iframe code lives in template-literal strings. Force state requires zero new runtime deps; it uses `document.styleSheets` + `CSSStyleRule` + `sheet.insertRule()` (standard DOM APIs).

**Spec:** [docs/superpowers/specs/2026-05-25-vibecode-browser-preview-pro-v0.4-design.md](../specs/2026-05-25-vibecode-browser-preview-pro-v0.4-design.md)

**Working directory:** `/Users/jeonghan/Documents/WORK/WORKSPACE/apps/vscode-extension-mono/vibecode-browser-preview-pro/`

---

## File change map

```
vibecode-browser-preview-pro/
├── package.json                              # MODIFY — Task 1 (version 0.4.0)
├── README.md                                 # MODIFY — Task 10 (v0.4 features + limits)
├── i18n/ko.json                              # MODIFY — Task 1 (new runtime keys)
├── src/
│   ├── l10n-bundle.ts                        # MODIFY — Task 1 (new keys)
│   ├── snapshot-types.ts                     # MODIFY — Task 2 (forceState string[])
│   ├── preview-server.ts                     # MODIFY — Task 7 (concat force-state script)
│   ├── inspector/
│   │   ├── inspector-script.ts               # MODIFY — Task 7 (multi-state apply + snapshot rules)
│   │   └── force-state-script.ts             # NEW    — Task 6 (scanner + class swap)
│   ├── webview/
│   │   ├── styles.ts                         # MODIFY — Tasks 3, 4, 8, 9 (device + tabs + warning + checkboxes)
│   │   ├── html.ts                           # MODIFY — Tasks 3, 4 (toolbar select + panel tabs)
│   │   ├── client-script.ts                  # MODIFY — Tasks 3, 4, 5, 8, 9 (device + tabs + diff + multi-state + warning)
│   │   └── sections/
│   │       └── diff-tab.ts                   # NEW    — Task 5 (Changes renderer)
│   └── snapshot-writer.ts                    # MODIFY — Task 9 (forceState[] in md/json + state.html injection)
```

---

### Task 1: version bump + l10n keys

**Files:**
- Modify: `vibecode-browser-preview-pro/package.json`
- Modify: `vibecode-browser-preview-pro/i18n/ko.json`
- Modify: `vibecode-browser-preview-pro/src/l10n-bundle.ts`

- [ ] **Step 1: Bump `version` to `0.4.0` in `package.json`**

Change exactly the `"version"` field; do not touch any other field.

```json
  "version": "0.4.0",
```

- [ ] **Step 2: Add new runtime keys to `i18n/ko.json`**

Append these key-value pairs **inside the existing `runtime` block** (after `"ZIP also saved": "ZIP 도 함께 저장됨"`). Do not remove existing keys, do not reformat existing keys.

```json
    "Device": "디바이스",
    "Auto": "자동",
    "Desktop": "데스크탑",
    "Tablet": "태블릿",
    "Mobile": "모바일",
    "Changes": "변경사항",
    "No changes yet — toggle a class, add inline style, change force state, or write notes.": "아직 변경사항 없음 — 클래스를 토글하거나, 인라인 스타일을 추가하거나, force state 를 바꾸거나, 메모를 작성해보세요.",
    "Added classes": "추가된 클래스",
    "Force states": "강제 상태",
    "Some hover/focus rules in external stylesheets are not simulatable (cross-origin).": "일부 hover/focus 룰이 외부 stylesheet 라 시뮬레이션 불가합니다 (cross-origin)."
```

- [ ] **Step 3: Add matching keys to `src/l10n-bundle.ts`**

Read the file first to see the current `L10nBundle` shape and `EN` / `KO` defaults. Add these fields to the interface and to both EN/KO maps:

```ts
  device: string;             // 'Device' / '디바이스'
  deviceAuto: string;         // 'Auto' / '자동'
  deviceDesktop: string;      // 'Desktop' / '데스크탑'
  deviceTablet: string;       // 'Tablet' / '태블릿'
  deviceMobile: string;       // 'Mobile' / '모바일'
  tabChanges: string;         // 'Changes' / '변경사항'
  changesEmpty: string;       // 'No changes yet — toggle a class, …' / '아직 변경사항 없음 — …'
  addedClasses: string;       // 'Added classes' / '추가된 클래스'
  forceStates: string;        // 'Force states' / '강제 상태'
  forceStateWarning: string;  // 'Some hover/focus rules …' / '일부 hover/focus 룰이 …'
```

Map each new key to the exact English/Korean string used in `i18n/ko.json` above. Keep `tabPins` etc. handled via the existing `pins` key — only `Changes` is new on the tab side.

- [ ] **Step 4: Verify sync + types**

Run: `npm run sync:check && npm run typecheck`
Expected: both exit 0. `sync:check` confirms `package.nls.ko.json` re-derives correctly from `i18n/ko.json` + `l10n-bundle.ts`.

---

### Task 2: snapshot-types.ts — multi-state forceState

**Files:**
- Modify: `vibecode-browser-preview-pro/src/snapshot-types.ts`

The v0.3 `forceState` was a nullable single-string. v0.4 stores an array because multiple states are togglable simultaneously.

- [ ] **Step 1: Replace `forceState` field in `PickOverrides`**

Find lines 33-38 (`export interface PickOverrides {`). Change line 36 from:

```ts
  forceState: 'hover' | 'focus' | 'active' | null;
```

to:

```ts
  forceStates: ('hover' | 'focus' | 'focus-visible' | 'active')[];
```

(field renamed singular→plural, type changed to array, removed `null`.)

- [ ] **Step 2: Replace `forceState` field in `Delta`**

Find line 60. Change from:

```ts
  forceState: { before: 'hover' | 'focus' | 'active' | null; after: 'hover' | 'focus' | 'active' | null; changed: boolean };
```

to:

```ts
  forceStates: { before: ('hover' | 'focus' | 'focus-visible' | 'active')[]; after: ('hover' | 'focus' | 'focus-visible' | 'active')[]; changed: boolean };
```

- [ ] **Step 3: Add `forceRules` field to `SnapshotPayload`**

Find the `SnapshotPayload` interface (lines 72-79). Add a single field after `userAgent`:

```ts
export interface SnapshotPayload {
  outerHTML: string;
  picks: PickData[];
  assets: AssetData[];
  changes: ChangeData[];
  viewport: { width: number; height: number };
  userAgent: string;
  forceRules: string[];     // NEW — duplicated :hover→.vibecode-force-hover rules from force-state scanner
}
```

- [ ] **Step 4: Verify typecheck fails informatively**

Run: `npm run typecheck`
Expected: FAIL with errors only in `snapshot-writer.ts` (line ~93 `p.overrides.forceState`, lines ~146-150 `d.forceState.*`). `inspector-script.ts` and `client-script.ts` keep their iframe/webview code inside template literals so the legacy `forceState` references there are not TS-checked — they get fixed at runtime by Tasks 7-8. **Do not commit yet** — the snapshot-writer errors resolve in Task 9.

---

### Task 3: device-frame wrapper

**Files:**
- Modify: `vibecode-browser-preview-pro/src/webview/html.ts`
- Modify: `vibecode-browser-preview-pro/src/webview/styles.ts`
- Modify: `vibecode-browser-preview-pro/src/webview/client-script.ts`

- [ ] **Step 1: Add device select to toolbar in `html.ts`**

In `buildHtml()`, find the `<div class="toolbar">` block (around line 31). Insert a select **just before** the `<span class="url" id="url-label">`:

```html
    <label class="device-label" title="${esc(l10n.device)}">${esc(l10n.device)}:
      <select id="sel-device">
        <option value="auto">${esc(l10n.deviceAuto)}</option>
        <option value="desktop">${esc(l10n.deviceDesktop)} 1280</option>
        <option value="tablet">${esc(l10n.deviceTablet)} 768</option>
        <option value="mobile">${esc(l10n.deviceMobile)} 375</option>
      </select>
    </label>
    <span class="url" id="url-label"></span>
```

- [ ] **Step 2: Nest iframe inside `.device-frame` in `html.ts`**

In the same `buildHtml()`, find the `<div class="frame-wrap">` block. Wrap the `<iframe>` (and only the iframe — leave `<div class="overlay">` and `<div class="toast">` as siblings):

```html
    <div class="frame-wrap">
      <div class="device-frame" id="device-frame" data-mode="auto">
        <iframe id="preview-frame" sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-modals"></iframe>
      </div>
      <div class="overlay" id="overlay">
        ...
      </div>
      <div class="toast" id="toast">
        ...
      </div>
    </div>
```

- [ ] **Step 3: Add device-frame CSS to `styles.ts`**

Find the `iframe { border: 0; width: 100%; height: 100%; display: block; }` line in `STYLES`. Replace it with the following block (iframe rule is preserved but moved inside `.device-frame` selectors):

```css
  .device-frame { width: 100%; height: 100%; }
  .device-frame[data-mode="auto"] iframe { width: 100%; height: 100%; border: 0; display: block; }
  .device-frame[data-mode="desktop"], .device-frame[data-mode="tablet"], .device-frame[data-mode="mobile"] {
    display: flex; align-items: stretch; justify-content: center;
    background: var(--vscode-editorWidget-background, #2a2a2a);
  }
  .device-frame[data-mode="desktop"] iframe { width: 1280px; height: 100%; border: 0; display: block; background: white; }
  .device-frame[data-mode="tablet"]  iframe { width:  768px; height: 100%; border: 0; display: block; background: white; }
  .device-frame[data-mode="mobile"]  iframe { width:  375px; height: 100%; border: 0; display: block; background: white; }
  .device-label { font-size: 11px; color: var(--vscode-descriptionForeground); display: inline-flex; align-items: center; gap: 4px; }
  .device-label select { font: inherit; font-size: 11px; background: var(--vscode-dropdown-background, var(--vscode-input-background)); color: var(--vscode-dropdown-foreground, var(--vscode-input-foreground)); border: 1px solid var(--vscode-dropdown-border, transparent); border-radius: 3px; padding: 2px 4px; }
```

(Delete the original standalone `iframe { ... }` line — its rule moved into `.device-frame[data-mode="auto"] iframe`.)

- [ ] **Step 4: Wire device select in `client-script.ts`**

In the top-of-IIFE element grab block (around lines 4-23, where `const iframe = document.getElementById(...)` lives), add two lines:

```js
    const selDevice = document.getElementById('sel-device');
    const deviceFrame = document.getElementById('device-frame');
```

Then near the bottom of the IIFE (after other event wirings, before `vscode.postMessage({type:'ready'})` or similar bootstrap), add:

```js
    selDevice.addEventListener('change', () => {
      deviceFrame.setAttribute('data-mode', selDevice.value);
    });
```

That's the entire feature for device presets — state lives only in the select element's value and the data-mode attribute. No persistence (per spec §Feature A).

- [ ] **Step 5: typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: typecheck still FAILs on `snapshot-writer.ts` (carry-over from Task 2 — resolved in Task 9); lint green; no new errors introduced.

---

### Task 4: panel tabs structure

**Files:**
- Modify: `vibecode-browser-preview-pro/src/webview/html.ts`
- Modify: `vibecode-browser-preview-pro/src/webview/styles.ts`
- Modify: `vibecode-browser-preview-pro/src/webview/client-script.ts`

- [ ] **Step 1: Restructure panel in `html.ts`**

Find the `<aside class="panel" id="panel">` block. Replace its **first two** `<div class="panel-section">` children (Pins + Assets) with a tabs structure followed by Assets — leaving the third section (`snapshotsHint`) untouched:

```html
    <aside class="panel" id="panel">
      <div class="panel-tabs">
        <button class="panel-tab active" data-tab="pins" id="tab-pins">
          <span class="tab-label">${esc(l10n.pins)}</span>
          <span class="tab-count" id="tab-pins-count">0</span>
        </button>
        <button class="panel-tab" data-tab="changes" id="tab-changes">
          <span class="tab-label">${esc(l10n.tabChanges)}</span>
          <span class="tab-count" id="tab-changes-count">▲0</span>
        </button>
      </div>
      <div class="panel-warning" id="panel-warning" hidden></div>
      <div class="tab-panel" id="tabpanel-pins" data-tab="pins">
        <div id="pins-list">
          <div class="panel-empty" id="pins-empty">${esc(l10n.noPins)}</div>
        </div>
      </div>
      <div class="tab-panel" id="tabpanel-changes" data-tab="changes" hidden>
        <div id="changes-list">
          <div class="panel-empty" id="changes-empty">${esc(l10n.changesEmpty)}</div>
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
```

(The old `<h3 id="panel-pins-title">` is gone — its label moved into `.tab-label`.)

- [ ] **Step 2: Add tabs CSS to `styles.ts`**

Append (at the end of `STYLES`, before the closing backtick):

```css
  .panel-tabs { display: flex; border-bottom: 1px solid var(--vscode-panel-border, transparent); background: var(--vscode-editorWidget-background, var(--vscode-editor-background)); }
  .panel-tab { flex: 1 1 auto; background: transparent; border: 0; padding: 6px 8px; font: inherit; font-size: 11px; cursor: pointer; color: var(--vscode-descriptionForeground); display: flex; align-items: center; justify-content: center; gap: 4px; border-bottom: 2px solid transparent; }
  .panel-tab:hover { background: var(--vscode-list-hoverBackground, transparent); }
  .panel-tab.active { color: var(--vscode-foreground); border-bottom-color: var(--vscode-focusBorder, var(--vscode-button-background)); }
  .panel-tab .tab-count { font-size: 10px; padding: 0 5px; border-radius: 8px; background: var(--vscode-badge-background, rgba(127,127,127,0.2)); color: var(--vscode-badge-foreground, var(--vscode-foreground)); }
  .panel-tab .tab-count.zero { opacity: 0.45; }
  .tab-panel { padding: 8px 10px; border-bottom: 1px solid var(--vscode-panel-border, transparent); }
  .tab-panel[hidden] { display: none; }
  .panel-warning { padding: 6px 10px; font-size: 11px; color: var(--vscode-editorWarning-foreground, var(--vscode-descriptionForeground)); background: var(--vscode-inputValidation-warningBackground, transparent); border-bottom: 1px solid var(--vscode-editorWarning-border, var(--vscode-panel-border, transparent)); }
  .panel-warning[hidden] { display: none; }
```

- [ ] **Step 3: Wire tab switching in `client-script.ts`**

In the IIFE element grab block, add:

```js
    const tabBtns = document.querySelectorAll('.panel-tab');
    const tabPanels = document.querySelectorAll('.tab-panel');
    const tabPinsCount = document.getElementById('tab-pins-count');
    const tabChangesCount = document.getElementById('tab-changes-count');
    const panelWarning = document.getElementById('panel-warning');
```

Add a helper near the other UI helpers (after `hideToast` / before `addPin` works):

```js
    let activeTab = 'pins';
    function activateTab(name) {
      activeTab = name;
      tabBtns.forEach(b => b.classList.toggle('active', b.dataset.tab === name));
      tabPanels.forEach(p => p.hidden = (p.dataset.tab !== name));
      if (name === 'changes') renderChangesList();
    }
    tabBtns.forEach(b => b.addEventListener('click', () => activateTab(b.dataset.tab)));
```

(`renderChangesList` is defined in Task 5 — declare a no-op stub `function renderChangesList() {}` immediately above `activateTab` for now to avoid a ReferenceError; Task 5 replaces the stub.)

Also add a small helper for the count labels:

```js
    function updateTabCounts() {
      const pinsTotal = pins.size;
      let changesTotal = 0;
      for (const entry of pins.values()) changesTotal += currentOverrideCount(entry);
      tabPinsCount.textContent = String(pinsTotal);
      tabPinsCount.classList.toggle('zero', pinsTotal === 0);
      tabChangesCount.textContent = '▲' + changesTotal;
      tabChangesCount.classList.toggle('zero', changesTotal === 0);
    }
```

And factor out the per-pin counter (the body of the existing `recomputeBadge` from Task 5 of v0.3) into `currentOverrideCount(entry)`. Change `recomputeBadge` to:

```js
    function currentOverrideCount(entry) {
      const s = entry.overrideState;
      let count = 0;
      for (const v of s.classToggles.values()) if (v) count++;
      if (s.inlineStyle.trim()) count++;
      count += (s.forceStates ? s.forceStates.size : 0);   // v0.4: was `if (s.forceState) count++;`
      if (s.notes.trim()) count++;
      return count;
    }
    function recomputeBadge(pickId) {
      const entry = pins.get(pickId);
      if (!entry) return;
      const count = currentOverrideCount(entry);
      entry.badgeEl.textContent = '▲' + count;
      entry.badgeEl.classList.toggle('zero', count === 0);
      entry.badgeEl.title = (l10n.changesLabel || 'Changes ({0})').replace('{0}', String(count));
      updateTabCounts();
      if (activeTab === 'changes') renderChangesList();
    }
```

Initialize counts on bootstrap (somewhere after `addPin`/`unpinLocal` are defined, e.g. at the end of the IIFE before `vscode.postMessage`):

```js
    updateTabCounts();
```

Also call `updateTabCounts()` inside `addPin` (after `pins.set(...)`) and inside `unpinLocal` (after `pins.delete(...)`). Search the file for those two functions and add the call as the last statement before the closing brace.

- [ ] **Step 4: typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: typecheck still FAILs on `snapshot-writer.ts` (carry-over from Task 2); `client-script.ts` is a template-literal string so its inner JS changes are not TS-checked — no new errors.

---

### Task 5: Changes tab content renderer

**Files:**
- Create: `vibecode-browser-preview-pro/src/webview/sections/diff-tab.ts`
- Modify: `vibecode-browser-preview-pro/src/webview/html.ts`
- Modify: `vibecode-browser-preview-pro/src/webview/client-script.ts`

`webview/sections/diff-tab.ts` is a string export following the same IIFE pattern as `client-script.ts`. It is concatenated into the inline `<script>` tag immediately after the main client IIFE so its definitions are available in the same scope.

- [ ] **Step 1: Create `webview/sections/diff-tab.ts`**

Path: `vibecode-browser-preview-pro/src/webview/sections/diff-tab.ts`

```ts
// Concatenated into the webview's inline <script> tag right after client-script.
// Exposes window.__bp_renderChangesList(pins, l10n, container, emptyEl, onSelectorClick)
// where `pins` is the Map from client-script and `onSelectorClick(pickId)` switches
// back to the Pins tab and scrolls the matching card into view.

export const DIFF_TAB_SCRIPT = `
(function () {
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  function renderEntry(entry, pickId, l10n, onSelectorClick) {
    var s = entry.overrideState;
    var sel = entry.data && entry.data.selector ? entry.data.selector : '';
    var addedClasses = [];
    for (var pair of s.classToggles) { if (pair[1]) addedClasses.push(pair[0]); }
    var forceArr = s.forceStates ? Array.from(s.forceStates) : [];

    var card = document.createElement('div');
    card.className = 'diff-card';
    var head = document.createElement('div');
    head.className = 'diff-head';
    var idEl = document.createElement('span');
    idEl.className = 'diff-id';
    idEl.textContent = '#' + pickId;
    var selEl = document.createElement('a');
    selEl.className = 'diff-sel';
    selEl.textContent = sel;
    selEl.href = '#';
    selEl.onclick = function (e) { e.preventDefault(); onSelectorClick(pickId); };
    head.appendChild(idEl); head.appendChild(selEl);
    card.appendChild(head);

    function row(label, value) {
      var r = document.createElement('div'); r.className = 'diff-row';
      var k = document.createElement('div'); k.className = 'diff-k'; k.textContent = label;
      var v = document.createElement('div'); v.className = 'diff-v'; v.textContent = value;
      r.appendChild(k); r.appendChild(v); card.appendChild(r);
    }

    if (addedClasses.length) row(l10n.addedClasses || 'Added classes', addedClasses.join(', '));
    if (s.inlineStyle && s.inlineStyle.trim()) row(l10n.inlineStyle || 'Inline style', s.inlineStyle.trim());
    if (forceArr.length) row(l10n.forceStates || 'Force states', forceArr.join(', '));
    if (s.notes && s.notes.trim()) {
      var nr = document.createElement('div'); nr.className = 'diff-row diff-notes';
      var nk = document.createElement('div'); nk.className = 'diff-k'; nk.textContent = l10n.notes || 'Notes';
      var nv = document.createElement('div'); nv.className = 'diff-v diff-notes-body'; nv.textContent = s.notes;
      nr.appendChild(nk); nr.appendChild(nv); card.appendChild(nr);
    }
    return card;
  }

  window.__bp_renderChangesList = function (pins, l10n, container, emptyEl, onSelectorClick) {
    container.innerHTML = '';
    var any = false;
    for (var pair of pins) {
      var pickId = pair[0]; var entry = pair[1];
      var s = entry.overrideState;
      var has = false;
      for (var v of s.classToggles.values()) { if (v) { has = true; break; } }
      if (!has && s.inlineStyle.trim()) has = true;
      if (!has && s.forceStates && s.forceStates.size > 0) has = true;
      if (!has && s.notes.trim()) has = true;
      if (!has) continue;
      any = true;
      container.appendChild(renderEntry(entry, pickId, l10n, onSelectorClick));
    }
    if (emptyEl) emptyEl.hidden = any;
  };
})();
`;
```

- [ ] **Step 2: Add diff card CSS to `styles.ts`**

Append (at the end of `STYLES`):

```css
  .diff-card { background: var(--vscode-editor-background); border: 1px solid var(--vscode-panel-border, transparent); border-radius: 4px; padding: 6px 8px; margin-bottom: 6px; font-size: 11px; }
  .diff-head { display: flex; align-items: baseline; gap: 6px; margin-bottom: 4px; }
  .diff-id { font-family: var(--vscode-editor-font-family, monospace); color: var(--vscode-descriptionForeground); font-size: 10px; }
  .diff-sel { font-family: var(--vscode-editor-font-family, monospace); font-size: 11px; word-break: break-all; flex: 1 1 auto; color: var(--vscode-textLink-foreground, var(--vscode-foreground)); text-decoration: none; }
  .diff-sel:hover { text-decoration: underline; }
  .diff-row { display: grid; grid-template-columns: 110px 1fr; gap: 4px 8px; margin-top: 3px; font-family: var(--vscode-editor-font-family, monospace); font-size: 11px; }
  .diff-k { color: var(--vscode-descriptionForeground); font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em; }
  .diff-v { word-break: break-all; }
  .diff-notes-body { white-space: pre-wrap; font-family: inherit; }
```

- [ ] **Step 3: Include diff-tab script in `html.ts`**

In `webview/html.ts`, import the new constant at the top:

```ts
import { DIFF_TAB_SCRIPT } from './sections/diff-tab';
```

Replace the existing `<script nonce="${nonce}">${CLIENT_SCRIPT}</script>` line with:

```ts
  <script nonce="${nonce}">${CLIENT_SCRIPT}\n${DIFF_TAB_SCRIPT}</script>
```

(Order matters — `client-script` defines `pins`, `l10n`, etc.; `diff-tab` exposes `window.__bp_renderChangesList` afterwards.)

- [ ] **Step 4: Replace `renderChangesList` stub in `client-script.ts`**

Find the no-op stub added in Task 4 (`function renderChangesList() {}`). Replace it with:

```js
    const changesList = document.getElementById('changes-list');
    const changesEmpty = document.getElementById('changes-empty');
    function selectPinTab(pickId) {
      activateTab('pins');
      const card = document.querySelector('.pin-card[data-pick-id="' + pickId + '"]');
      if (card) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    function renderChangesList() {
      if (typeof window.__bp_renderChangesList !== 'function') return;
      window.__bp_renderChangesList(pins, l10n, changesList, changesEmpty, selectPinTab);
    }
```

Move the `changesList` / `changesEmpty` declarations to the IIFE's element grab block at the top if you prefer; keeping them next to `renderChangesList` is fine since the DOM is ready by the time the IIFE runs.

- [ ] **Step 5: typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: typecheck still FAILs on `snapshot-writer.ts` (carry-over from Task 2 — resolved in Task 9). New `diff-tab.ts` exports a string constant so no new TS surface; lint green.

---

### Task 6: force-state-script.ts scanner

**Files:**
- Create: `vibecode-browser-preview-pro/src/inspector/force-state-script.ts`

This script is concatenated to inspector-script.ts in Task 7. It runs in the iframe, scans every same-origin stylesheet, duplicates `:hover` / `:focus` / `:focus-visible` / `:active` rules with the pseudo replaced by `.vibecode-force-{state}`, and exposes:

- `window.__bpApplyForceStates(pickId, states)` — receives an array of state names; the inspector calls this when the user toggles checkboxes
- `window.__bpGetForceRules()` — returns the array of duplicated CSS rule texts (called by inspector during snapshot)
- `window.__bpForceScanResult` — `{ duplicated: number, skippedSheets: number }` for the warning banner

- [ ] **Step 1: Create the file**

Path: `vibecode-browser-preview-pro/src/inspector/force-state-script.ts`

```ts
// Concatenated to inspector-script at serve time. Runs inside the preview iframe.
// Plain JS string — no TS type-checking inside the template literal.

export const FORCE_STATE_SCRIPT = `
(function () {
  'use strict';
  var STATES = ['hover', 'focus', 'focus-visible', 'active'];
  var FORCE_CLASS = function (s) { return 'vibecode-force-' + s; };
  var duplicatedRules = [];
  var skippedSheets = 0;

  function rewriteSelector(sel) {
    var modified = false;
    var parts = sel.split(',').map(function (s) {
      var part = s;
      var partModified = false;
      for (var i = 0; i < STATES.length; i++) {
        var pseudo = ':' + STATES[i];
        // Use a non-regex replace to avoid escaping headaches with :focus-visible
        while (part.indexOf(pseudo) !== -1) {
          part = part.replace(pseudo, '.' + FORCE_CLASS(STATES[i]));
          partModified = true;
        }
      }
      if (partModified) modified = true;
      return partModified ? part : null;   // drop selectors that weren't rewritten
    }).filter(function (s) { return s !== null && s.trim().length > 0; });
    return modified && parts.length ? parts.join(',') : null;
  }

  function scanSheet(sheet) {
    var rules;
    try { rules = sheet.cssRules; }
    catch (_e) { skippedSheets++; return; }
    if (!rules) return;
    for (var i = 0; i < rules.length; i++) {
      var rule = rules[i];
      if (!(rule instanceof CSSStyleRule)) continue;
      var newSel = rewriteSelector(rule.selectorText);
      if (!newSel) continue;
      var newText = newSel + ' { ' + rule.style.cssText + ' }';
      try {
        sheet.insertRule(newText, sheet.cssRules.length);
        duplicatedRules.push(newText);
      } catch (_err) { /* invalid after rewrite — skip silently */ }
    }
  }

  for (var s = 0; s < document.styleSheets.length; s++) {
    scanSheet(document.styleSheets[s]);
  }

  window.__bpForceScanResult = { duplicated: duplicatedRules.length, skippedSheets: skippedSheets };

  window.__bpApplyForceStates = function (el, states) {
    if (!el) return;
    for (var i = 0; i < STATES.length; i++) {
      var cls = FORCE_CLASS(STATES[i]);
      var on = states && states.indexOf(STATES[i]) !== -1;
      if (on) el.classList.add(cls); else el.classList.remove(cls);
    }
  };

  window.__bpGetForceRules = function () { return duplicatedRules.slice(); };
})();
`;
```

- [ ] **Step 2: typecheck**

Run: `npm run typecheck`
Expected: still FAILs on `snapshot-writer.ts` (carry-over from Task 2). `force-state-script.ts` is a template-literal string export — no TS check inside. The new constant has no consumer yet (Task 7 wires it).

---

### Task 7: inspector-script.ts — multi-state apply + snapshot integration + concat wiring

**Files:**
- Modify: `vibecode-browser-preview-pro/src/preview-server.ts`
- Modify: `vibecode-browser-preview-pro/src/inspector/inspector-script.ts`

- [ ] **Step 1: Concat force-state script to inspector route in `preview-server.ts`**

Open `src/preview-server.ts`. The inspector script is served at `/__bp_inspector.js` and constructed at line 86 (`const body = Buffer.from(INSPECTOR_SCRIPT, 'utf8');`).

Add import at the top (next to the existing `import { INSPECTOR_SCRIPT } from './inspector/inspector-script';` at line 6):

```ts
import { FORCE_STATE_SCRIPT } from './inspector/force-state-script';
```

Change line 86 from:

```ts
    const body = Buffer.from(INSPECTOR_SCRIPT, 'utf8');
```

to:

```ts
    const body = Buffer.from(INSPECTOR_SCRIPT + '\n' + FORCE_STATE_SCRIPT, 'utf8');
```

(Both are IIFEs; concatenation is safe — no scope leakage.)

- [ ] **Step 2: Rename `forceState` → `forceStates` in `inspector-script.ts` pin model**

Find the `pins` map initialization (search for `// pickId -> { el, overrides, baseline, originalInlineStyle }` or just for `forceState`). In the click handler / pin creation site, change the initial `overrides` object:

OLD:
```js
forceState: null,
```

NEW:
```js
forceStates: [],
```

- [ ] **Step 3: Replace `applyForceState` with `applyForceStates`**

Find `applyForceState` (around lines 305-309). Replace the entire function with:

```js
  function applyForceStates(pickId, states) {
    const pin = pins.get(pickId); if (!pin) return;
    pin.overrides.forceStates = Array.isArray(states) ? states.slice() : [];
    if (typeof window.__bpApplyForceStates === 'function') {
      window.__bpApplyForceStates(pin.el, pin.overrides.forceStates);
    }
  }
```

- [ ] **Step 4: Update message handler**

Find the `switch (msg.type)` block (around lines 361-384). Change the `bp:setForceState` case to:

```js
      case 'bp:setForceStates':
        applyForceStates(msg.pickId, Array.isArray(msg.states) ? msg.states : []);
        break;
```

(Message type renamed plural; payload field is `states: string[]`.)

- [ ] **Step 5: Update Delta computation for forceStates**

Find `computeDelta` (search for `forceState:` in the function). The current shape returns `{ before, after, changed }` for `forceState`. Change to:

```js
    forceStates: {
      before: [],
      after: (pin.overrides.forceStates || []).slice(),
      changed: (pin.overrides.forceStates && pin.overrides.forceStates.length > 0)
    },
```

(`before` is always `[]` because force state isn't part of page baseline — any non-empty `after` counts as changed.)

Also delete or remove the old `forceState:` field from the returned delta object — search the function body for `forceState:` and remove that line.

- [ ] **Step 6: Update snapshot collection to include duplicated rules**

Find `collectSnapshot` (lines 321-351). Add a single field to the returned object:

```js
    return {
      outerHTML,
      picks: picksArr,
      assets: assets.slice(),
      changes: changesArr,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      userAgent: navigator.userAgent,
      forceRules: (typeof window.__bpGetForceRules === 'function') ? window.__bpGetForceRules() : []
    };
```

Also — to keep `state.html` standalone-renderable — modify the `outerHTML` construction to inject the duplicated rules into a `<style>` element **after** copying. Replace the existing block:

```js
    const outerHTML = '<!DOCTYPE html>\\n' + document.documentElement.outerHTML;
```

with:

```js
    let outerHTML = '<!DOCTYPE html>\\n' + document.documentElement.outerHTML;
    const _rules = (typeof window.__bpGetForceRules === 'function') ? window.__bpGetForceRules() : [];
    if (_rules.length) {
      const _styleTag = '<style id="vibecode-force-rules">\\n' + _rules.join('\\n') + '\\n</style>';
      // Inject just before </head> if present, else at top of <html>
      if (outerHTML.indexOf('</head>') !== -1) {
        outerHTML = outerHTML.replace('</head>', _styleTag + '</head>');
      } else {
        outerHTML = outerHTML.replace('<html', _styleTag + '<html');
      }
    }
```

(Backslashes are doubled because this is inside a TS template literal.)

- [ ] **Step 7: Update `snapshotPick` to serialize `forceStates` (not `forceState`)**

Find `snapshotPick` (the helper that builds the PickData object). It currently has:

```js
forceState: pin.overrides.forceState,
```

Replace with:

```js
forceStates: (pin.overrides.forceStates || []).slice(),
```

If you can't locate it, grep the file: `grep -n 'forceState' src/inspector/inspector-script.ts` — every occurrence other than the new `forceStates` plural needs to die.

- [ ] **Step 8: typecheck**

Run: `npm run typecheck`
Expected: `snapshot-writer.ts` still has the errors from Task 2 (resolved in Task 9). `preview-server.ts` is now clean (FORCE_STATE_SCRIPT import resolves). `inspector-script.ts` is a template-literal string export — no TS errors regardless of its inner JS rewrites.

---

### Task 8: client-script.ts pin card — multi-checkbox + cross-origin warning

**Files:**
- Modify: `vibecode-browser-preview-pro/src/webview/client-script.ts`
- Modify: `vibecode-browser-preview-pro/src/webview/styles.ts`

- [ ] **Step 1: Change `overrideState.forceState` → `forceStates: Set` everywhere in `client-script.ts`**

Find `addPin` (around line 280). The initial `overrideState` currently has `forceState: null`. Change to `forceStates: new Set()` (a Set of state strings).

Find `recomputeBadge` — already touched in Task 4 step 3 to use `s.forceStates.size`. Confirm the change is in place.

Find `updateForceStateState(pickId, state)` (around line 113). Replace the whole function with:

```js
    function updateForceStateStates(pickId, states) {
      const entry = pins.get(pickId);
      if (!entry) return;
      entry.overrideState.forceStates = new Set(states || []);
      recomputeBadge(pickId);
    }
```

- [ ] **Step 2: Replace the force-state `<select>` with checkboxes**

Find the pin-card render block around lines 229-242 (`forceLabel` + `forceSel`). Replace it with:

```js
      const forceLabel = document.createElement('label');
      forceLabel.textContent = l10n.forceState || 'Force state';
      ov.appendChild(forceLabel);
      const forceWrap = document.createElement('div');
      forceWrap.className = 'force-toggles';
      const FORCE_STATES = ['hover', 'focus', 'focus-visible', 'active'];
      const forceCheckboxes = {};
      for (const st of FORCE_STATES) {
        const lab = document.createElement('label');
        lab.className = 'force-toggle';
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.dataset.state = st;
        cb.onchange = () => {
          const states = FORCE_STATES.filter(s => forceCheckboxes[s].checked);
          updateForceStateStates(pick.id, states);
          postToIframe({ type: 'bp:setForceStates', pickId: pick.id, states });
        };
        forceCheckboxes[st] = cb;
        lab.appendChild(cb);
        const txt = document.createElement('span');
        txt.textContent = ':' + st;
        lab.appendChild(txt);
        forceWrap.appendChild(lab);
      }
      ov.appendChild(forceWrap);
```

(The old `forceSel` select element and its `.onchange` are now deleted. Make sure no other reference to `forceSel` remains — grep for it.)

- [ ] **Step 3: Add `.force-toggles` CSS to `styles.ts`**

Append:

```css
  .force-toggles { display: flex; flex-wrap: wrap; gap: 6px 12px; margin-top: 2px; }
  .force-toggle { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; color: inherit; text-transform: none; }
  .force-toggle input[type="checkbox"] { margin: 0; }
  .force-toggle span { font-family: var(--vscode-editor-font-family, monospace); }
```

- [ ] **Step 4: Show cross-origin warning when iframe reports scan result**

Find the message handler in `client-script.ts` that listens to messages from the iframe (search for `window.addEventListener('message'` or `event.data.type`). Add a new case:

```js
        case 'bp:force-state-scan':
          {
            const r = msg.result || {};
            if (r.skippedSheets > 0) {
              panelWarning.hidden = false;
              panelWarning.textContent = l10n.forceStateWarning || 'Some hover/focus rules in external stylesheets are not simulatable (cross-origin).';
            }
          }
          break;
```

- [ ] **Step 5: Have inspector script send scan result to webview**

In `src/inspector/inspector-script.ts`, find the `post({ type: 'bp:ready' })` at the bottom (line 393). Add **immediately after** it:

```js
  if (window.__bpForceScanResult) {
    post({ type: 'bp:force-state-scan', result: window.__bpForceScanResult });
  }
```

(The force-state IIFE has already run by this point because it's concatenated **before** the `post({type:'bp:ready'})` line — wait, it's concatenated **after** inspector-script. The IIFE itself runs synchronously when the script tag executes, so by the time the last line of inspector-script runs, force-state hasn't executed yet. Solution: wrap the scan-result post in a setTimeout 0:)

```js
  setTimeout(function () {
    if (window.__bpForceScanResult) {
      post({ type: 'bp:force-state-scan', result: window.__bpForceScanResult });
    }
  }, 0);
```

- [ ] **Step 6: typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: typecheck still FAILs on `snapshot-writer.ts` (carry-over from Task 2 — resolved in Task 9). All other TS surface clean; lint green.

---

### Task 9: snapshot-writer.ts — forceStates rendering + summary count

**Files:**
- Modify: `vibecode-browser-preview-pro/src/snapshot-writer.ts`

- [ ] **Step 1: Update `summarize()` for the new array field**

Find lines 89-95 in `summarize`. Replace:

```ts
      if (p.overrides.forceState) overridesCount++;
```

with:

```ts
      if (p.overrides.forceStates && p.overrides.forceStates.length > 0) overridesCount++;
```

- [ ] **Step 2: Update changes.md rendering for `forceStates`**

Find the `d.forceState.changed` block (around lines 146-150). Replace with:

```ts
      if (d.forceStates.changed) {
        const after = d.forceStates.after.length ? d.forceStates.after.join(', ') : '(none)';
        lines.push(`- Force states: \`${after}\``);
      }
```

(No before→after for force state because before is always `[]`. Just list what's now active.)

- [ ] **Step 3: Update `changes.json` serialization**

`changes.json` is just `JSON.stringify(changes, null, 2)` of the ChangeData array — the type change in Task 2 already propagates. Search the file for `JSON.stringify(changes` to confirm; if a custom serializer exists, ensure it forwards `delta.forceStates` as-is.

- [ ] **Step 4: typecheck + lint + sync:check (FULL pass should now be green)**

Run: `npm run typecheck && npm run lint && npm run sync:check`
Expected: all three PASS, no errors anywhere.

---

### Task 10: README + final build + install + manual verify + MR

**Files:**
- Modify: `vibecode-browser-preview-pro/README.md`

- [ ] **Step 1: Update README**

In `vibecode-browser-preview-pro/README.md`:

1. Change `## Pro 전용 (v0.3 shipped)` → `## Pro 전용 (v0.4 shipped)`
2. Add three bullets to the Pro 전용 list (after the existing bullets):

```markdown
- 📱 **디바이스 프리셋** — 툴바에서 Auto / Desktop 1280 / Tablet 768 / Mobile 375 즉시 전환
- 📊 **Changes 탭** — 인스펙터 패널에 Pins/Changes 탭 — 현재 적용된 override 들이 changes.md 와 동일 구조로 실시간 렌더
- 🎨 **Force state 실제 시뮬레이션** — :hover / :focus / :focus-visible / :active 체크박스로 토글, 동일 origin stylesheet 의 룰 자동 복제·적용. 스냅샷에도 결과 보존
```

3. Update `## 알려진 한계 (v0.3)` → `## 알려진 한계 (v0.4)` and replace its body with:

```markdown
- Cross-origin stylesheet 의 :hover/:focus 룰은 시뮬레이션 불가 (panel 상단에 경고 표시)
- 페이지 리로드 시 핀/override/force state 는 초기화됨 (Inspector toggle 만 유지)
- 5MB 초과 HTML 은 inspector 자동 비활성 (성능)
- 요소 영역 스크린샷, 핀 영속화는 v0.5+
```

- [ ] **Step 2: Build the vsix**

Run:

```bash
cd /Users/jeonghan/Documents/WORK/WORKSPACE/apps/vscode-extension-mono/vibecode-browser-preview-pro
npm run sync && npm run typecheck && npm run lint && npm run sync:check
```

Expected: all clean.

Then:

```bash
npm run package
```

Expected: creates `vibecode-browser-preview-pro-0.4.0.vsix` in the package dir.

- [ ] **Step 3: Install the vsix**

Run:

```bash
code --install-extension /Users/jeonghan/Documents/WORK/WORKSPACE/apps/vscode-extension-mono/vibecode-browser-preview-pro/vibecode-browser-preview-pro-0.4.0.vsix --force
```

Expected: VSCode reports successful install. Then prompt the user to ⌘R Reload Window.

- [ ] **Step 4: Hand off manual verification checklist to user**

Tell the user to perform exactly these checks before approving the MR:

```
1. ⌘R Reload Window
2. Double-click a small .html → preview opens
3. Device select: switch through Auto / Desktop / Tablet / Mobile → iframe width changes,
   gray padding bars appear when not Auto
4. 🎯 Inspector → click an element → pin created → Pins tab shows "Pins 1", Changes tab shows "▲0"
5. In pin card: type a class name & Enter → ▲N goes to 1, Changes tab count to "▲1"
6. Click Changes tab → see "#1 selector / Added classes: <yourclass>" card
7. Click the selector link in the Changes card → switches back to Pins tab, card scrolls into view
8. Check 2+ force-state checkboxes (e.g. :hover + :focus) → element visually adopts those styles
   (use an element that has a :hover rule like a link/button), ▲N reflects each state, Changes tab
   shows "Force states: hover, focus"
9. If the page uses any cross-origin stylesheet (CDN), confirm the panel-top warning banner appears
   exactly once
10. 💾 Save Snapshot → check .vibecode/browser-preview/YYYYMMDDHHMMSS/:
    a. state.html → open standalone in browser, force-state styles still apply (look for <style id="vibecode-force-rules"> in head)
    b. changes.md → has "Force states: hover, focus" line per modified pin
    c. changes.json → contains forceStates: [...] arrays
    d. YYYYMMDDHHMMSS.zip exists at sibling location, contains all 6 files
```

- [ ] **Step 5: Commit + push + open MR**

Bundle everything per the user's one-MR convention. Run:

```bash
cd /Users/jeonghan/Documents/WORK/WORKSPACE/apps/vscode-extension-mono
git status
```

Then stage (explicit paths — no `-A`):

```bash
git add \
  docs/superpowers/specs/2026-05-25-vibecode-browser-preview-pro-v0.4-design.md \
  docs/superpowers/plans/2026-05-25-vibecode-browser-preview-pro-v0.4.md \
  vibecode-browser-preview-pro/package.json \
  vibecode-browser-preview-pro/README.md \
  vibecode-browser-preview-pro/i18n/ko.json \
  vibecode-browser-preview-pro/package.nls.ko.json \
  vibecode-browser-preview-pro/package.nls.json \
  vibecode-browser-preview-pro/src/l10n-bundle.ts \
  vibecode-browser-preview-pro/src/snapshot-types.ts \
  vibecode-browser-preview-pro/src/preview-server.ts \
  vibecode-browser-preview-pro/src/inspector/inspector-script.ts \
  vibecode-browser-preview-pro/src/inspector/force-state-script.ts \
  vibecode-browser-preview-pro/src/webview/styles.ts \
  vibecode-browser-preview-pro/src/webview/html.ts \
  vibecode-browser-preview-pro/src/webview/client-script.ts \
  vibecode-browser-preview-pro/src/webview/sections/diff-tab.ts \
  vibecode-browser-preview-pro/src/snapshot-writer.ts \
  vibecode-browser-preview-pro/vibecode-browser-preview-pro-0.4.0.vsix
```

(Delete the older `vibecode-browser-preview-pro-0.3.0.vsix` from the working tree first with `rm` if it's still around.)

Commit with HEREDOC:

```bash
git commit -m "$(cat <<'EOF'
feat(browser-preview-pro): v0.4 — device presets, Changes tab, real force-state simulation

- 디바이스 프리셋 (Auto/Desktop 1280/Tablet 768/Mobile 375) — 툴바 select 로 iframe wrap width 전환
- Changes 탭 — 인스펙터 패널에 Pins/Changes 탭 분리, changes.md 와 동일 구조로 실시간 렌더, 셀렉터 클릭으로 Pins 탭 점프
- Force state 실제 시뮬레이션 — same-origin stylesheet 의 :hover/:focus/:focus-visible/:active 룰을 .vibecode-force-{state} class 룰로 복제 → 체크박스 토글로 적용. cross-origin 룰은 패널 상단 경고 1 회
- 스냅샷 state.html 에 복제된 force rule 들 <style id="vibecode-force-rules"> 로 inject → 단독 렌더 가능
- forceState 타입 string→string[] 로 변경 (PickOverrides / Delta / changes.md / changes.json 동기 갱신)
- 신규 파일: inspector/force-state-script.ts (스캐너+토글) + webview/sections/diff-tab.ts (Changes 렌더러)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

Push and open the MR:

```bash
git push -u origin feat/env-v0.2-and-more
```

Then check the gitlab MR URL pattern (existing project uses `https://gitlab.ranode.net/workspace/apps/vscode-extension-mono/-/merge_requests/`). Use `glab mr create` if available, or output the gitlab "create new MR" URL with branch pre-filled for the user to click.

- [ ] **Step 6: Hand off MR link to user**

Report the MR URL back, listing the file count, total LOC delta, and remind the user to re-run the §4 manual verification before approving merge.
