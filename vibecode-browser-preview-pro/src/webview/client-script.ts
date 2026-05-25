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
    const selDevice = document.getElementById('sel-device');
    const deviceFrame = document.getElementById('device-frame');
    const panel = document.getElementById('panel');
    const pinsList = document.getElementById('pins-list');
    const pinsEmpty = document.getElementById('pins-empty');
    const assetsList = document.getElementById('assets-list');
    const tabBtns = document.querySelectorAll('.panel-tab');
    const tabPanels = document.querySelectorAll('.tab-panel');
    const tabPinsCount = document.getElementById('tab-pins-count');
    const tabChangesCount = document.getElementById('tab-changes-count');
    const panelWarning = document.getElementById('panel-warning');
    const changesList = document.getElementById('changes-list');
    const changesEmpty = document.getElementById('changes-empty');
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

    // ---- tab routing ----
    let activeTab = 'pins';
    function activateTab(name) {
      activeTab = name;
      tabBtns.forEach(b => b.classList.toggle('active', b.dataset.tab === name));
      tabPanels.forEach(p => p.hidden = (p.dataset.tab !== name));
      if (name === 'changes') renderChangesList();
    }
    tabBtns.forEach(b => b.addEventListener('click', () => activateTab(b.dataset.tab)));

    function selectPinTab(pickId) {
      activateTab('pins');
      const card = document.querySelector('.pin-card[data-pick-id="' + pickId + '"]');
      if (card) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    function renderChangesList() {
      if (typeof window.__bp_renderChangesList !== 'function') return;
      window.__bp_renderChangesList(pins, l10n, changesList, changesEmpty, selectPinTab);
    }

    // ---- per-pin override state + badge ----
    function currentOverrideCount(entry) {
      const s = entry.overrideState;
      let count = 0;
      for (const v of s.classToggles.values()) if (v) count++;
      if (s.inlineStyle.trim()) count++;
      count += (s.forceStates ? s.forceStates.size : 0);
      if (s.notes.trim()) count++;
      return count;
    }
    function updateTabCounts() {
      const pinsTotal = pins.size;
      let changesTotal = 0;
      for (const entry of pins.values()) changesTotal += currentOverrideCount(entry);
      tabPinsCount.textContent = String(pinsTotal);
      tabPinsCount.classList.toggle('zero', pinsTotal === 0);
      tabChangesCount.textContent = '▲' + changesTotal;
      tabChangesCount.classList.toggle('zero', changesTotal === 0);
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
    function updateForceStateStates(pickId, states) {
      const entry = pins.get(pickId);
      if (!entry) return;
      entry.overrideState.forceStates = new Set(states || []);
      recomputeBadge(pickId);
    }
    function updateNotesState(pickId, notes) {
      const entry = pins.get(pickId);
      if (!entry) return;
      entry.overrideState.notes = notes || '';
      recomputeBadge(pickId);
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
        classToggles: new Map(),
        inlineStyle: '',
        forceStates: new Set(),
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
      updateTabCounts();
      if (activeTab === 'changes') renderChangesList();
    }

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

    btnReload && btnReload.addEventListener('click', () => vscode.postMessage({ type: 'manualReload' }));
    btnEdit && btnEdit.addEventListener('click', () => vscode.postMessage({ type: 'editSource' }));
    btnOpen && btnOpen.addEventListener('click', () => vscode.postMessage({ type: 'openExternal' }));
    btnInspector && btnInspector.addEventListener('click', () => setInspector(!inspectorOn));
    btnSave && btnSave.addEventListener('click', () => {
      postToIframe({ type: 'bp:collectSnapshot' });
    });
    overlayRetry && overlayRetry.addEventListener('click', () => vscode.postMessage({ type: 'retry' }));

    window.addEventListener('message', (event) => {
      const msg = event.data;
      if (!msg || typeof msg !== 'object') return;
      if (typeof msg.type === 'string' && msg.type.startsWith('bp:')) {
        switch (msg.type) {
          case 'bp:ready':
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
          case 'bp:force-state-scan': {
            const r = msg.result || {};
            if (r.skippedSheets > 0) {
              panelWarning.hidden = false;
              panelWarning.textContent = l10n.forceStateWarning || 'Some hover/focus rules in external stylesheets are not simulatable (cross-origin).';
            } else {
              panelWarning.hidden = true;
            }
            break;
          }
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

    selDevice.addEventListener('change', () => {
      deviceFrame.setAttribute('data-mode', selDevice.value);
    });

    updateTabCounts();

    vscode.postMessage({ type: 'ready' });
  })();
`;
