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
        while (part.indexOf(pseudo) !== -1) {
          part = part.replace(pseudo, '.' + FORCE_CLASS(STATES[i]));
          partModified = true;
        }
      }
      if (partModified) modified = true;
      return partModified ? part : null;
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
