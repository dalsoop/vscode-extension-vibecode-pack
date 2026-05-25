// Concatenated into the webview's inline <script> tag right after client-script.
// Exposes window.__bp_renderChangesList(pins, l10n, container, emptyEl, onSelectorClick)
// where `pins` is the Map from client-script and `onSelectorClick(pickId)` switches
// back to the Pins tab and scrolls the matching card into view.

export const DIFF_TAB_SCRIPT = `
(function () {
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
    // Remove old diff cards but keep emptyEl in place
    var cards = container.querySelectorAll('.diff-card');
    for (var i = 0; i < cards.length; i++) cards[i].remove();
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
      container.insertBefore(renderEntry(entry, pickId, l10n, onSelectorClick), emptyEl || null);
    }
    if (emptyEl) emptyEl.hidden = any;
  };
})();
`;
