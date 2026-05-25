// Browser-side script for the env-import webview. Runs inside the webview iframe.
// Communicates with the host via `acquireVsCodeApi().postMessage(...)` and
// receives messages via `window.addEventListener('message', ...)`.
//
// Stored as a string so it can be injected with a CSP nonce in <script nonce="...">.
// Keep DOM access self-contained — no module loaders inside the webview.

export const CLIENT_SCRIPT = `
const vscode = acquireVsCodeApi();
let l10n = {};
let keyNameRe = /^[A-Za-z_][A-Za-z0-9_]*$/;
let currentEntries = [];

const el = id => document.getElementById(id);

function showError(msg) {
  const e = el('error');
  e.textContent = msg;
  e.classList.add('visible');
  clearTimeout(showError.t);
  showError.t = setTimeout(() => e.classList.remove('visible'), 5000);
}
function clearError() {
  el('error').classList.remove('visible');
}

function makeButton(label, onClick, opts) {
  opts = opts || {};
  const b = document.createElement('button');
  b.textContent = label;
  if (opts.primary) b.classList.add('primary');
  if (opts.danger) b.classList.add('danger');
  if (opts.disabled) b.disabled = true;
  b.addEventListener('click', onClick);
  return b;
}

function makeValueInput(entry) {
  const input = document.createElement('input');
  input.type = 'password';
  input.autocomplete = 'off';
  input.spellcheck = false;
  input.placeholder = entry && entry.hasValue ? l10n.placeholderSet : l10n.placeholderEmpty;
  input.addEventListener('keydown', e => {
    const isPaste = (e.metaKey || e.ctrlKey) && (e.key === 'v' || e.key === 'V');
    const isNav = ['Tab', 'Escape', 'Enter'].includes(e.key);
    if (!isPaste && !isNav) e.preventDefault();
  });
  input.addEventListener('beforeinput', e => {
    if (e.inputType !== 'insertFromPaste') e.preventDefault();
  });
  return input;
}

function renderAddRow() {
  el('add-section-title').textContent = l10n.addSectionTitle;

  const addRow = el('add-row');
  addRow.innerHTML = '';

  const keyInput = document.createElement('input');
  keyInput.type = 'text';
  keyInput.autocomplete = 'off';
  keyInput.spellcheck = false;
  keyInput.placeholder = l10n.keyPlaceholder;

  const valueInput = makeValueInput(null);
  let pendingValue = '';
  valueInput.addEventListener('paste', e => {
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData)?.getData('text') ?? '';
    pendingValue = text;
    valueInput.value = '';
    if (text) valueInput.placeholder = '··· ' + (l10n.set || '');
  });

  const submit = () => {
    clearError();
    const key = keyInput.value.trim();
    if (!key) {
      keyInput.classList.add('invalid');
      keyInput.focus();
      return;
    }
    if (!keyNameRe.test(key)) {
      keyInput.classList.add('invalid');
      showError(l10n.invalidKeyName);
      return;
    }
    if (currentEntries.some(e => e.key === key)) {
      keyInput.classList.add('invalid');
      showError(l10n.keyExists.replace('{0}', key));
      return;
    }
    keyInput.classList.remove('invalid');
    vscode.postMessage({ type: 'addKey', key, value: pendingValue });
    keyInput.value = '';
    valueInput.value = '';
    valueInput.placeholder = l10n.placeholderEmpty;
    pendingValue = '';
    keyInput.focus();
  };

  keyInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') submit();
    keyInput.classList.remove('invalid');
  });
  valueInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') submit();
  });

  addRow.appendChild(keyInput);
  addRow.appendChild(valueInput);
  addRow.appendChild(makeButton(l10n.add, submit, { primary: true }));
}

function renderExistingRow(entry) {
  const row = document.createElement('div');
  row.className = 'row';

  const keyCell = document.createElement('div');
  keyCell.className = 'key';
  keyCell.textContent = entry.key;
  row.appendChild(keyCell);

  const valueInput = makeValueInput(entry);
  valueInput.addEventListener('paste', e => {
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData)?.getData('text') ?? '';
    if (!text) return;
    vscode.postMessage({ type: 'setValue', key: entry.key, value: text });
    valueInput.value = '';
  });
  row.appendChild(valueInput);

  const status = document.createElement('div');
  status.className = 'status ' + (entry.hasValue ? 'set' : 'empty');
  status.textContent = entry.hasValue ? l10n.set : l10n.empty;
  row.appendChild(status);

  row.appendChild(makeButton(l10n.clear, () => {
    vscode.postMessage({ type: 'clearValue', key: entry.key });
  }, { disabled: !entry.hasValue }));

  row.appendChild(makeButton(l10n.rename, () => {
    const editWrap = document.createElement('div');
    editWrap.className = 'key-edit';

    const renameInput = document.createElement('input');
    renameInput.type = 'text';
    renameInput.value = entry.key;
    renameInput.autocomplete = 'off';
    renameInput.spellcheck = false;

    const saveBtn = makeButton(l10n.save, () => {
      clearError();
      const newKey = renameInput.value.trim();
      if (!keyNameRe.test(newKey)) {
        renameInput.classList.add('invalid');
        showError(l10n.invalidKeyName);
        return;
      }
      if (newKey === entry.key) {
        keyCell.replaceChildren(document.createTextNode(entry.key));
        return;
      }
      if (currentEntries.some(e => e.key === newKey)) {
        renameInput.classList.add('invalid');
        showError(l10n.keyExists.replace('{0}', newKey));
        return;
      }
      vscode.postMessage({ type: 'renameKey', oldKey: entry.key, newKey });
    }, { primary: true });

    const cancelBtn = makeButton(l10n.cancel, () => {
      keyCell.replaceChildren(document.createTextNode(entry.key));
      clearError();
    });

    renameInput.addEventListener('keydown', e => {
      renameInput.classList.remove('invalid');
      if (e.key === 'Enter') saveBtn.click();
      if (e.key === 'Escape') cancelBtn.click();
    });

    editWrap.appendChild(renameInput);
    editWrap.appendChild(saveBtn);
    editWrap.appendChild(cancelBtn);
    keyCell.replaceChildren(editWrap);
    renameInput.focus();
    renameInput.select();
  }));

  row.appendChild(makeButton(l10n.delete, () => {
    vscode.postMessage({ type: 'requestDelete', key: entry.key });
  }, { danger: true }));

  return row;
}

function render(state) {
  el('title').textContent = l10n.title || '';
  if (state.filename != null) el('filename').textContent = state.filename;
  el('hint').textContent = l10n.hint || '';
  el('save-hint').textContent = l10n.saveHint || '';

  renderAddRow();

  const rows = el('rows');
  rows.innerHTML = '';
  currentEntries = state.entries || [];

  if (currentEntries.length === 0) {
    el('keys-section-title').style.display = 'none';
    const div = document.createElement('div');
    div.style.color = 'var(--vscode-descriptionForeground)';
    div.style.padding = '16px 0';
    div.style.fontStyle = 'italic';
    div.textContent = l10n.noKeys || '';
    rows.appendChild(div);
    return;
  }

  el('keys-section-title').style.display = 'block';
  el('keys-section-title').textContent = l10n.keysSectionTitle || 'Keys';
  for (const entry of currentEntries) {
    rows.appendChild(renderExistingRow(entry));
  }
}

window.addEventListener('message', e => {
  const msg = e.data;
  if (msg.type === 'init') {
    l10n = msg.l10n || {};
    keyNameRe = new RegExp(msg.keyNamePattern || '^[A-Za-z_][A-Za-z0-9_]*$');
    render({ filename: msg.filename, entries: msg.entries });
  } else if (msg.type === 'update') {
    render({ entries: msg.entries });
  } else if (msg.type === 'error') {
    showError(msg.message);
  }
});
`;
