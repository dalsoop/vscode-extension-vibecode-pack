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

    let baseUrl = null;

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
    }

    btnReload && btnReload.addEventListener('click', () => vscode.postMessage({ type: 'manualReload' }));
    btnEdit && btnEdit.addEventListener('click', () => vscode.postMessage({ type: 'editSource' }));
    btnOpen && btnOpen.addEventListener('click', () => vscode.postMessage({ type: 'openExternal' }));
    overlayRetry && overlayRetry.addEventListener('click', () => vscode.postMessage({ type: 'retry' }));

    window.addEventListener('message', (event) => {
      const msg = event.data;
      if (!msg || typeof msg !== 'object') return;
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
      }
    });

    vscode.postMessage({ type: 'ready' });
  })();
`;
