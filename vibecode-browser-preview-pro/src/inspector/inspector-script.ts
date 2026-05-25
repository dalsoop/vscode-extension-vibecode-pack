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
