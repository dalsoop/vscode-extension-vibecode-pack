export const CLIENT_SCRIPT = String.raw`
(function () {
  const vscode = acquireVsCodeApi();
  const $ = (id) => document.getElementById(id);

  let l10n = null;
  const sourceCanvas = document.createElement('canvas');
  const sourceCtx = sourceCanvas.getContext('2d');
  const display = $('canvas-display');
  const displayCtx = display.getContext('2d');

  let regions = [];
  let currentStyle = 'blur';
  let currentStrength = 12;
  let currentBlock = 16;
  let currentColor = '#000000';
  let dragging = null;

  window.addEventListener('message', (event) => {
    const msg = event.data;
    if (msg && msg.type === 'init') init(msg);
  });

  function init(msg) {
    l10n = msg.l10n;
    applyL10n();
    $('filename').textContent = msg.basename;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      sourceCanvas.width = img.naturalWidth;
      sourceCanvas.height = img.naturalHeight;
      sourceCtx.drawImage(img, 0, 0);
      display.width = img.naturalWidth;
      display.height = img.naturalHeight;
      render();
      $('loading').classList.add('hidden');
      wireUi();
    };
    img.onerror = () => {
      $('loading').textContent = 'Failed to load image.';
    };
    $('loading').textContent = l10n.loading;
    img.src = msg.imageSrc;
  }

  function applyL10n() {
    $('hint').textContent = l10n.dragHint;
    $('style-label').textContent = l10n.style;
    $('seg-blur').textContent = l10n.blur;
    $('seg-pixelate').textContent = l10n.pixelate;
    $('seg-solid').textContent = l10n.solid;
    $('strength-label').textContent = l10n.strength;
    $('block-label').textContent = l10n.blockSize;
    $('color-label').textContent = l10n.color;
    $('regions-title').textContent = l10n.regions;
    $('clear-all').textContent = l10n.clearAll;
    $('save').textContent = l10n.savePng;
    $('solid-swatch').style.setProperty('--swatch-color', currentColor);
  }

  function wireUi() {
    document.querySelectorAll('.seg-item').forEach((b) => {
      b.addEventListener('click', () => setStyle(b.dataset.style));
    });
    $('strength').addEventListener('input', () => {
      currentStrength = parseInt($('strength').value, 10);
      $('strength-val').textContent = String(currentStrength);
    });
    $('block').addEventListener('input', () => {
      currentBlock = parseInt($('block').value, 10);
      $('block-val').textContent = String(currentBlock);
    });
    $('solid-hex').addEventListener('input', () => {
      const v = $('solid-hex').value.trim();
      if (/^#[0-9a-fA-F]{6}$/.test(v)) {
        currentColor = v.toLowerCase();
        $('solid-swatch').style.setProperty('--swatch-color', currentColor);
      }
    });
    $('clear-all').addEventListener('click', () => {
      regions = [];
      renderRegionList();
      render();
    });
    $('save').addEventListener('click', save);

    display.addEventListener('mousedown', startDrag);
    window.addEventListener('mousemove', updateDrag);
    window.addEventListener('mouseup', endDrag);
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && dragging) {
        dragging = null;
        $('selection-box').hidden = true;
      }
    });

    renderRegionList();
  }

  function setStyle(name) {
    currentStyle = name;
    document.querySelectorAll('.seg-item').forEach((b) => {
      b.classList.toggle('active', b.dataset.style === name);
    });
    $('row-strength').hidden = name !== 'blur';
    $('row-block').hidden = name !== 'pixelate';
    $('row-color').hidden = name !== 'solid';
  }

  function displayToNatural(e) {
    const r = display.getBoundingClientRect();
    const sx = display.width / r.width;
    const sy = display.height / r.height;
    const nx = Math.max(0, Math.min(display.width, Math.round((e.clientX - r.left) * sx)));
    const ny = Math.max(0, Math.min(display.height, Math.round((e.clientY - r.top) * sy)));
    return { nx, ny };
  }

  function startDrag(e) {
    e.preventDefault();
    const { nx, ny } = displayToNatural(e);
    dragging = { startNX: nx, startNY: ny, endNX: nx, endNY: ny, active: true };
    updateSelectionBox();
  }
  function updateDrag(e) {
    if (!dragging || !dragging.active) return;
    const { nx, ny } = displayToNatural(e);
    dragging.endNX = nx;
    dragging.endNY = ny;
    updateSelectionBox();
  }
  function endDrag() {
    if (!dragging) return;
    const x = Math.min(dragging.startNX, dragging.endNX);
    const y = Math.min(dragging.startNY, dragging.endNY);
    const w = Math.abs(dragging.endNX - dragging.startNX);
    const h = Math.abs(dragging.endNY - dragging.startNY);
    dragging = null;
    $('selection-box').hidden = true;
    if (w < 4 || h < 4) return;
    regions.push({
      x, y, w, h,
      style: currentStyle,
      strength: currentStrength,
      blockSize: currentBlock,
      color: currentColor
    });
    renderRegionList();
    render();
  }

  function updateSelectionBox() {
    if (!dragging) return;
    const box = $('selection-box');
    const r = display.getBoundingClientRect();
    const stageRect = $('stage').getBoundingClientRect();
    const sx = r.width / display.width;
    const sy = r.height / display.height;
    const x = Math.min(dragging.startNX, dragging.endNX);
    const y = Math.min(dragging.startNY, dragging.endNY);
    const w = Math.abs(dragging.endNX - dragging.startNX);
    const h = Math.abs(dragging.endNY - dragging.startNY);
    box.hidden = false;
    box.style.left = \`\${r.left - stageRect.left + x * sx}px\`;
    box.style.top = \`\${r.top - stageRect.top + y * sy}px\`;
    box.style.width = \`\${w * sx}px\`;
    box.style.height = \`\${h * sy}px\`;
  }

  function renderRegionList() {
    const list = $('region-list');
    list.innerHTML = '';
    if (regions.length === 0) {
      const empty = document.createElement('li');
      empty.className = 'empty';
      empty.textContent = l10n.noRegions;
      list.appendChild(empty);
      return;
    }
    regions.forEach((r, i) => {
      const li = document.createElement('li');
      const tag = document.createElement('span');
      tag.className = 'region-tag';
      tag.textContent = r.style;
      const coord = document.createElement('span');
      coord.className = 'region-coord';
      coord.textContent = \`\${r.w}×\${r.h}\`;
      const x = document.createElement('button');
      x.className = 'remove-x';
      x.textContent = '×';
      x.title = l10n.remove;
      x.addEventListener('click', () => {
        regions.splice(i, 1);
        renderRegionList();
        render();
      });
      li.appendChild(tag);
      li.appendChild(coord);
      li.appendChild(x);
      list.appendChild(li);
    });
  }

  function render() {
    if (!sourceCanvas.width) return;
    displayCtx.filter = 'none';
    displayCtx.drawImage(sourceCanvas, 0, 0);
    for (const r of regions) {
      paintRegion(displayCtx, r);
    }
  }

  function paintRegion(ctx, r) {
    if (r.style === 'solid') {
      ctx.fillStyle = r.color;
      ctx.fillRect(r.x, r.y, r.w, r.h);
      return;
    }
    if (r.style === 'blur') {
      ctx.save();
      ctx.beginPath();
      ctx.rect(r.x, r.y, r.w, r.h);
      ctx.clip();
      ctx.filter = \`blur(\${r.strength}px)\`;
      ctx.drawImage(sourceCanvas, 0, 0);
      ctx.restore();
      return;
    }
    if (r.style === 'pixelate') {
      const block = Math.max(2, r.blockSize);
      const dw = Math.max(1, Math.floor(r.w / block));
      const dh = Math.max(1, Math.floor(r.h / block));
      const small = document.createElement('canvas');
      small.width = dw;
      small.height = dh;
      const sctx = small.getContext('2d');
      sctx.imageSmoothingEnabled = false;
      sctx.drawImage(sourceCanvas, r.x, r.y, r.w, r.h, 0, 0, dw, dh);
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(small, 0, 0, dw, dh, r.x, r.y, r.w, r.h);
      ctx.restore();
    }
  }

  function save() {
    render();
    display.toBlob(
      (blob) => {
        if (!blob) return;
        blobToBase64(blob).then((b64) =>
          vscode.postMessage({ type: 'savePng', base64: b64 })
        );
      },
      'image/png'
    );
  }

  function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result || ''));
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
  }
})();
`;
