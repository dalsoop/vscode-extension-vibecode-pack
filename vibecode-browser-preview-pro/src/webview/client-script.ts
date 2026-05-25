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
