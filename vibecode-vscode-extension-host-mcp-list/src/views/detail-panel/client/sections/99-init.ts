/// <reference path="../_refs.d.ts" />

namespace DetailClient {
  window.addEventListener('message', (ev) => {
    const msg = ev.data as DetailContract.Inbound;
    if (msg.type === 'setEntry') render(msg.entry);
  });
  wireActions();
  vscode.postMessage({ type: 'ready' });
}
