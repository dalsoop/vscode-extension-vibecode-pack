
export const CLIENT_SCRIPT = String.raw`
(function () {
  const vscode = acquireVsCodeApi();
  const $ = (id) => document.getElementById(id);

  let l10n = null;
  let basename = '';
  const sourceCanvas = document.createElement('canvas');
  const sourceCtx = sourceCanvas.getContext('2d', { willReadFrequently: true });
  const display = $('canvas-display');
  const displayCtx = display.getContext('2d');
  let sourceImageData = null; // cached for chroma key
  let activeTab = 'eyedropper';
  let chromaPicking = false;
  let chromaState = { hex: '#00ff00', tol: 40, soft: 20 };
  let cropDrag = null; // { startNX, startNY, endNX, endNY } in natural pixels

  window.addEventListener('message', (event) => {
    const msg = event.data;
    if (msg && msg.type === 'init') init(msg);
  });

  function init(msg) {
    l10n = msg.l10n;
    basename = msg.basename;
    applyL10n();

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      sourceCanvas.width = img.naturalWidth;
      sourceCanvas.height = img.naturalHeight;
      sourceCtx.drawImage(img, 0, 0);
      sourceImageData = sourceCtx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
      display.width = img.naturalWidth;
      display.height = img.naturalHeight;
      displayCtx.drawImage(img, 0, 0);
      $('loading').classList.add('hidden');
      $('filename').textContent = basename;
      wireInteractions();
    };
    img.onerror = () => {
      $('loading').textContent = 'Failed to load image.';
    };
    $('loading').textContent = l10n.loading;
    img.src = msg.imageSrc;
  }

  function applyL10n() {
    $('tab-eyedropper').textContent = l10n.eyedropper;
    $('tab-chroma').textContent = l10n.chroma;
    $('tab-crop').textContent = l10n.crop;
    $('hint-eyedropper').textContent = l10n.eyedropperHint;
    $('eye-hex-key').textContent = l10n.hex;
    $('eye-rgb-key').textContent = l10n.rgb;
    $('eye-hsl-key').textContent = l10n.hsl;
    $('chroma-target-label').textContent = l10n.targetColor;
    $('chroma-pick').textContent = l10n.pickFromImage;
    $('chroma-tol-label').textContent = l10n.tolerance;
    $('chroma-soft-label').textContent = l10n.softenEdges;
    $('chroma-reset').textContent = l10n.reset;
    $('chroma-save').textContent = l10n.savePng;
    $('hint-crop').textContent = l10n.cropHint;
    $('crop-status').textContent = l10n.noSelection;
    $('crop-save').textContent = l10n.cropAndSave;
  }

  function switchTab(name) {
    activeTab = name;
    document.querySelectorAll('.tab').forEach((b) => {
      b.classList.toggle('active', b.dataset.tab === name);
    });
    document.querySelectorAll('.panel').forEach((p) => {
      p.hidden = p.dataset.panel !== name;
    });
    if (name === 'chroma') {
      applyChroma();
    } else {
      displayCtx.putImageData(sourceImageData, 0, 0);
    }
    if (name === 'crop') {
      $('stage').classList.add('crop-mode');
    } else {
      $('stage').classList.remove('crop-mode');
      hideSelection();
    }
    chromaPicking = false;
    $('chroma-pick').classList.remove('active');
    $('stage').classList.remove('picking');
  }

  function wireInteractions() {
    document.querySelectorAll('.tab').forEach((b) => {
      b.addEventListener('click', () => switchTab(b.dataset.tab));
    });

    display.addEventListener('mousemove', (e) => {
      const { nx, ny } = displayToNatural(e);
      const c = pixelAt(nx, ny);
      if (!c) return;
      if (activeTab === 'eyedropper') updateEyedropper(c);
    });
    display.addEventListener('click', (e) => {
      const { nx, ny } = displayToNatural(e);
      const c = pixelAt(nx, ny);
      if (!c) return;
      if (activeTab === 'eyedropper') {
        copyToHost(rgbToHex(c));
      } else if (activeTab === 'chroma' && chromaPicking) {
        chromaState.hex = rgbToHex(c);
        $('chroma-hex').value = chromaState.hex;
        $('chroma-swatch').style.setProperty('--swatch-color', chromaState.hex);
        chromaPicking = false;
        $('chroma-pick').classList.remove('active');
        $('stage').classList.remove('picking');
        applyChroma();
      }
    });

    $('chroma-hex').value = chromaState.hex;
    $('chroma-swatch').style.setProperty('--swatch-color', chromaState.hex);
    $('chroma-hex').addEventListener('input', () => {
      const v = $('chroma-hex').value.trim();
      if (/^#[0-9a-fA-F]{6}$/.test(v)) {
        chromaState.hex = v.toLowerCase();
        $('chroma-swatch').style.setProperty('--swatch-color', chromaState.hex);
        applyChroma();
      }
    });
    $('chroma-tol').addEventListener('input', () => {
      chromaState.tol = parseInt($('chroma-tol').value, 10);
      $('chroma-tol-val').textContent = String(chromaState.tol);
      applyChroma();
    });
    $('chroma-soft').addEventListener('input', () => {
      chromaState.soft = parseInt($('chroma-soft').value, 10);
      $('chroma-soft-val').textContent = String(chromaState.soft);
      applyChroma();
    });
    $('chroma-pick').addEventListener('click', () => {
      chromaPicking = !chromaPicking;
      $('chroma-pick').classList.toggle('active', chromaPicking);
      $('stage').classList.toggle('picking', chromaPicking);
    });
    $('chroma-reset').addEventListener('click', () => {
      chromaState = { hex: '#00ff00', tol: 40, soft: 20 };
      $('chroma-hex').value = chromaState.hex;
      $('chroma-tol').value = String(chromaState.tol);
      $('chroma-soft').value = String(chromaState.soft);
      $('chroma-tol-val').textContent = String(chromaState.tol);
      $('chroma-soft-val').textContent = String(chromaState.soft);
      $('chroma-swatch').style.setProperty('--swatch-color', chromaState.hex);
      applyChroma();
    });
    $('chroma-save').addEventListener('click', saveChroma);

    display.addEventListener('mousedown', startCropDrag);
    window.addEventListener('mousemove', updateCropDrag);
    window.addEventListener('mouseup', endCropDrag);
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        cropDrag = null;
        hideSelection();
        $('crop-status').textContent = l10n.noSelection;
        $('crop-save').disabled = true;
      }
    });
    $('crop-save').addEventListener('click', saveCrop);

    document.querySelectorAll('.copy-btn').forEach((b) => {
      b.addEventListener('click', () => {
        const target = $(b.dataset.copy);
        if (target) copyToHost(target.textContent || '');
      });
    });
  }

  function displayToNatural(e) {
    const r = display.getBoundingClientRect();
    const sx = display.width / r.width;
    const sy = display.height / r.height;
    const nx = Math.max(0, Math.min(display.width - 1, Math.floor((e.clientX - r.left) * sx)));
    const ny = Math.max(0, Math.min(display.height - 1, Math.floor((e.clientY - r.top) * sy)));
    return { nx, ny, displayRect: r, sx, sy };
  }

  function pixelAt(nx, ny) {
    if (!sourceImageData) return null;
    const i = (ny * sourceImageData.width + nx) * 4;
    return {
      r: sourceImageData.data[i],
      g: sourceImageData.data[i + 1],
      b: sourceImageData.data[i + 2],
      a: sourceImageData.data[i + 3]
    };
  }

  function updateEyedropper(c) {
    $('eye-swatch').style.setProperty('--swatch-color', \`rgba(\${c.r},\${c.g},\${c.b},\${c.a / 255})\`);
    $('eye-hex-val').textContent = rgbToHex(c);
    $('eye-rgb-val').textContent = \`rgb(\${c.r}, \${c.g}, \${c.b})\`;
    const h = rgbToHsl(c);
    $('eye-hsl-val').textContent = \`hsl(\${h.h}, \${h.s}%, \${h.l}%)\`;
  }

  function rgbToHex(c) {
    const h = (n) => n.toString(16).padStart(2, '0');
    return '#' + h(c.r) + h(c.g) + h(c.b);
  }

  function rgbToHsl(c) {
    const r = c.r / 255, g = c.g / 255, b = c.b / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h *= 60;
    }
    return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
  }

  function hexToRgb(hex) {
    const m = /^#?([0-9a-fA-F]{6})$/.exec(hex);
    if (!m) return { r: 0, g: 255, b: 0 };
    const n = parseInt(m[1], 16);
    return { r: (n >> 16) & 0xff, g: (n >> 8) & 0xff, b: n & 0xff };
  }

  function applyChroma() {
    if (!sourceImageData || activeTab !== 'chroma') return;
    const target = hexToRgb(chromaState.hex);
    const tol = chromaState.tol;
    const soft = chromaState.soft;
    const tol2 = tol * tol;
    const total = tol + soft;
    const total2 = total * total;

    const out = new ImageData(
      new Uint8ClampedArray(sourceImageData.data),
      sourceImageData.width,
      sourceImageData.height
    );
    const data = out.data;
    for (let i = 0; i < data.length; i += 4) {
      const dr = data[i] - target.r;
      const dg = data[i + 1] - target.g;
      const db = data[i + 2] - target.b;
      const d2 = dr * dr + dg * dg + db * db;
      if (d2 <= tol2) {
        data[i + 3] = 0;
      } else if (d2 <= total2 && soft > 0) {
        const d = Math.sqrt(d2);
        const ramp = (d - tol) / soft;
        data[i + 3] = Math.round(data[i + 3] * ramp);
      }
    }
    displayCtx.putImageData(out, 0, 0);
  }

  function saveChroma() {
    applyChroma();
    display.toBlob(
      (blob) => {
        if (!blob) return;
        blobToBase64(blob).then((b64) =>
          vscode.postMessage({ type: 'savePng', base64: b64, suffix: 'chroma' })
        );
      },
      'image/png'
    );
  }

  function startCropDrag(e) {
    if (activeTab !== 'crop') return;
    e.preventDefault();
    const { nx, ny } = displayToNatural(e);
    cropDrag = { startNX: nx, startNY: ny, endNX: nx, endNY: ny, active: true };
    updateSelectionBox();
  }
  function updateCropDrag(e) {
    if (!cropDrag || !cropDrag.active) return;
    const { nx, ny } = displayToNatural(e);
    cropDrag.endNX = nx;
    cropDrag.endNY = ny;
    updateSelectionBox();
  }
  function endCropDrag() {
    if (!cropDrag) return;
    cropDrag.active = false;
    const w = Math.abs(cropDrag.endNX - cropDrag.startNX);
    const h = Math.abs(cropDrag.endNY - cropDrag.startNY);
    if (w < 2 || h < 2) {
      cropDrag = null;
      hideSelection();
      $('crop-status').textContent = l10n.noSelection;
      $('crop-save').disabled = true;
      return;
    }
    $('crop-status').textContent = l10n.selectionLabel.replace('{0}', String(w)).replace('{1}', String(h));
    $('crop-save').disabled = false;
  }

  function updateSelectionBox() {
    if (!cropDrag) {
      hideSelection();
      return;
    }
    const box = $('selection-box');
    const r = display.getBoundingClientRect();
    const sx = r.width / display.width;
    const sy = r.height / display.height;
    const stageRect = $('stage').getBoundingClientRect();
    const x = Math.min(cropDrag.startNX, cropDrag.endNX);
    const y = Math.min(cropDrag.startNY, cropDrag.endNY);
    const w = Math.abs(cropDrag.endNX - cropDrag.startNX);
    const h = Math.abs(cropDrag.endNY - cropDrag.startNY);
    box.hidden = false;
    box.style.left = \`\${r.left - stageRect.left + x * sx}px\`;
    box.style.top = \`\${r.top - stageRect.top + y * sy}px\`;
    box.style.width = \`\${w * sx}px\`;
    box.style.height = \`\${h * sy}px\`;
  }
  function hideSelection() {
    $('selection-box').hidden = true;
  }

  function saveCrop() {
    if (!cropDrag) return;
    const x = Math.min(cropDrag.startNX, cropDrag.endNX);
    const y = Math.min(cropDrag.startNY, cropDrag.endNY);
    const w = Math.abs(cropDrag.endNX - cropDrag.startNX);
    const h = Math.abs(cropDrag.endNY - cropDrag.startNY);
    if (w < 2 || h < 2) return;
    const out = document.createElement('canvas');
    out.width = w;
    out.height = h;
    const ctx = out.getContext('2d');
    ctx.drawImage(sourceCanvas, x, y, w, h, 0, 0, w, h);
    out.toBlob(
      (blob) => {
        if (!blob) return;
        blobToBase64(blob).then((b64) =>
          vscode.postMessage({ type: 'savePng', base64: b64, suffix: 'crop' })
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

  function copyToHost(text) {
    if (!text || text === '—') return;
    vscode.postMessage({ type: 'copyText', text });
    showToast(l10n.copiedToast);
  }

  function showToast(text) {
    const t = $('toast');
    t.textContent = text;
    t.classList.add('visible');
    setTimeout(() => t.classList.remove('visible'), 1500);
  }
})();
`;
