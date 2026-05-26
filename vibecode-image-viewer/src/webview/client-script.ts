
export const CLIENT_SCRIPT = String.raw`
(function() {
  const vscode = acquireVsCodeApi();

  let state = null;

  const $ = (id) => document.getElementById(id);

  function setText(id, text) {
    const el = $(id);
    if (el) el.textContent = text == null ? '' : String(text);
  }

  function setButtonText(selector, text) {
    document.querySelectorAll(selector).forEach(el => { el.textContent = text; });
  }

  function formatBytes(n) {
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
    if (n < 1024 * 1024 * 1024) return (n / (1024 * 1024)).toFixed(2) + ' MB';
    return (n / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  }

  function formatDate(ms) {
    const d = new Date(ms);
    return d.toLocaleString();
  }

  function applyL10n(l10n) {
    document.querySelectorAll('[data-zoom="out"]').forEach(b => b.title = l10n.zoomOut);
    document.querySelectorAll('[data-zoom="in"]').forEach(b => b.title = l10n.zoomIn);
    document.querySelectorAll('[data-zoom="fit"]').forEach(b => b.textContent = l10n.fit);
    document.querySelectorAll('[data-zoom="100"]').forEach(b => b.textContent = l10n.actual);
    $('bg-label').textContent = l10n.backgroundLabel;
    document.querySelectorAll('[data-bg="checker"]').forEach(b => b.textContent = l10n.bgChecker);
    document.querySelectorAll('[data-bg="dark"]').forEach(b => b.textContent = l10n.bgDark);
    document.querySelectorAll('[data-bg="light"]').forEach(b => b.textContent = l10n.bgLight);
    $('raw-title').textContent = l10n.rawTitle;
    $('raw-toggle').textContent = l10n.hide;
    $('raw-copy').textContent = l10n.copyAsJson;
    $('action-reveal').textContent = l10n.openFolder;
    $('action-copy-path').textContent = l10n.copyPath;
    $('action-open-os').textContent = l10n.openOsDefault;
    $('action-reopen-text').textContent = l10n.reopenAsText;
  }

  function renderCards(s) {
    const l = s.l10n;
    const cards = [];

    const fileRows = [
      [l.pathLabel, s.file.path],
      [l.sizeLabel, formatBytes(s.file.sizeBytes)],
      s.file.width !== null && s.file.height !== null
        ? [l.dimensionsLabel, s.file.width + ' × ' + s.file.height + ' px']
        : null,
      [l.formatLabel, s.file.format],
      [l.modifiedLabel, formatDate(s.file.mtimeMs)],
      s.camera.colorSpace ? [l.colorSpaceLabel, s.camera.colorSpace] : null,
      s.camera.bitDepth !== null ? [l.bitDepthLabel, String(s.camera.bitDepth)] : null,
    ].filter(Boolean);
    cards.push(card(l.fileTitle, fileRows));

    const c = s.camera;
    const cameraName = [c.make, c.model].filter(Boolean).join(' ').trim();
    const cameraRows = [
      cameraName ? [l.cameraLabel, cameraName] : null,
      c.lens ? [l.lensLabel, c.lens] : null,
      c.exposureTime ? [l.exposureLabel, c.exposureTime] : null,
      c.fNumber ? [l.apertureLabel, c.fNumber] : null,
      c.iso !== null ? [l.isoLabel, String(c.iso)] : null,
      c.focalLength ? [l.focalLengthLabel, c.focalLength] : null,
      c.dateTaken ? [l.dateTakenLabel, c.dateTaken] : null,
      c.software ? [l.softwareLabel, c.software] : null,
      c.orientation ? [l.orientationLabel, c.orientation] : null,
    ].filter(Boolean);
    if (cameraRows.length) cards.push(card(l.cameraTitle, cameraRows));

    if (s.gps) {
      const lat = s.gps.latitude.toFixed(6);
      const lon = s.gps.longitude.toFixed(6);
      const coord = lat + ', ' + lon;
      const rows = [[l.gpsTitle, coord]];
      if (s.gps.altitude !== null) rows.push(['Alt', s.gps.altitude.toFixed(1) + ' m']);
      const c = card(l.gpsTitle, rows);
      const actions = document.createElement('div');
      actions.className = 'row-actions';

      const mapsBtn = document.createElement('button');
      mapsBtn.textContent = l.openInGoogleMaps;
      mapsBtn.addEventListener('click', () => {
        vscode.postMessage({
          type: 'openUrl',
          url: 'https://www.google.com/maps?q=' + lat + ',' + lon,
        });
      });
      actions.appendChild(mapsBtn);

      const copyBtn = document.createElement('button');
      copyBtn.textContent = l.copyCoordinates;
      copyBtn.addEventListener('click', () => {
        vscode.postMessage({ type: 'copyText', text: coord, toast: l.coordsCopied });
        toast(l.coordsCopied);
      });
      actions.appendChild(copyBtn);

      c.appendChild(actions);
      cards.push(c);
    }

    if (s.metaSegments) {
      const segOrder = ['ifd0', 'exif', 'gps', 'interop', 'thumbnail', 'iptc', 'xmp', 'icc', 'jfif', 'ihdr'];
      const seen = new Set();
      const renderSegment = (key) => {
        seen.add(key);
        const obj = s.metaSegments[key];
        if (!obj || typeof obj !== 'object') return;
        const rows = [];
        for (const [k, v] of Object.entries(obj)) {
          rows.push([k, formatValue(v)]);
        }
        if (rows.length) cards.push(card(segmentLabel(key, l), rows));
      };
      for (const key of segOrder) {
        if (key in s.metaSegments) renderSegment(key);
      }
      for (const key of Object.keys(s.metaSegments)) {
        if (!seen.has(key)) renderSegment(key);
      }
    }

    const host = $('cards');
    host.innerHTML = '';
    cards.forEach(el => host.appendChild(el));
  }

  function segmentLabel(key, l) {
    const map = {
      ifd0: l.segIfd0 || 'TIFF / IFD0',
      exif: l.segExif || 'EXIF',
      gps: l.segGps || 'GPS',
      interop: l.segInterop || 'Interop',
      thumbnail: l.segThumbnail || 'Thumbnail',
      iptc: l.segIptc || 'IPTC',
      xmp: l.segXmp || 'XMP',
      icc: l.segIcc || 'ICC Profile',
      jfif: l.segJfif || 'JFIF',
      ihdr: l.segIhdr || 'PNG / IHDR'
    };
    return map[key] || key.toUpperCase();
  }

  function formatValue(v) {
    if (v == null) return '—';
    if (typeof v === 'string') return v.length > 200 ? v.slice(0, 200) + '…' : v;
    if (typeof v === 'number' || typeof v === 'boolean') return String(v);
    if (Array.isArray(v)) return v.length <= 8 ? v.map(formatValue).join(', ') : v.slice(0, 8).map(formatValue).join(', ') + ' …(+' + (v.length - 8) + ')';
    if (typeof v === 'object') {
      try {
        const s = JSON.stringify(v);
        return s.length > 200 ? s.slice(0, 200) + '…' : s;
      } catch {
        return String(v);
      }
    }
    return String(v);
  }

  function card(title, rows) {
    const wrapper = document.createElement('div');
    wrapper.className = 'card';
    const h = document.createElement('h3');
    h.textContent = title;
    wrapper.appendChild(h);
    const dl = document.createElement('dl');
    rows.forEach(([k, v]) => {
      const dt = document.createElement('dt');
      dt.textContent = k;
      const dd = document.createElement('dd');
      dd.textContent = v;
      dl.appendChild(dt);
      dl.appendChild(dd);
    });
    wrapper.appendChild(dl);
    return wrapper;
  }

  function renderRaw(s) {
    const body = $('raw-body');
    const empty = $('raw-empty');
    if (!s.hasExif) {
      body.style.display = 'none';
      empty.style.display = 'block';
      empty.textContent = s.l10n.noExif;
      $('raw-toggle').style.display = 'none';
      $('raw-copy').style.display = 'none';
      return;
    }
    $('raw-toggle').style.display = '';
    $('raw-copy').style.display = '';
    empty.style.display = 'none';
    body.style.display = 'block';
    $('raw-toggle').textContent = s.l10n.hide;
    body.textContent = JSON.stringify(s.rawExif, null, 2);
  }

  function applyZoom(mode, deltaPercent) {
    const img = $('image');
    if (!img.src) return;
    if (mode === 'fit') {
      img.classList.add('fit');
      img.style.width = '';
      img.style.height = '';
      setZoomLabel('fit');
      markActive('zoom', 'fit');
      return;
    }
    img.classList.remove('fit');
    let pct;
    if (mode === '100') {
      pct = 100;
    } else {
      const cur = parseFloat(img.dataset.pct || '100');
      pct = Math.max(5, Math.min(2000, cur + (deltaPercent || 0)));
    }
    img.dataset.pct = String(pct);
    const naturalW = img.naturalWidth || 0;
    img.style.width = naturalW ? Math.round(naturalW * pct / 100) + 'px' : '';
    img.style.height = 'auto';
    setZoomLabel(pct + '%');
    markActive('zoom', mode === '100' ? '100' : null);
  }

  function setZoomLabel(text) {
    $('zoom-pct').textContent = text === 'fit' ? '' : text;
  }

  function markActive(group, value) {
    document.querySelectorAll('[data-' + group + ']').forEach(btn => {
      if (value !== null && btn.dataset[group] === value) btn.classList.add('active');
      else btn.classList.remove('active');
    });
  }

  function setBackground(mode) {
    const stage = $('stage');
    stage.classList.remove('bg-dark', 'bg-light');
    if (mode === 'dark') stage.classList.add('bg-dark');
    else if (mode === 'light') stage.classList.add('bg-light');
    markActive('bg', mode);
  }

  function toast(text) {
    let el = document.querySelector('.toast');
    if (!el) {
      el = document.createElement('div');
      el.className = 'toast';
      document.body.appendChild(el);
    }
    el.textContent = text;
    el.classList.add('visible');
    setTimeout(() => el.classList.remove('visible'), 1800);
  }

  function wireToolbar(l10n) {
    document.querySelectorAll('[data-zoom]').forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.zoom;
        if (mode === 'in') applyZoom('delta', 25);
        else if (mode === 'out') applyZoom('delta', -25);
        else applyZoom(mode);
      });
    });
    document.querySelectorAll('[data-bg]').forEach(btn => {
      btn.addEventListener('click', () => setBackground(btn.dataset.bg));
    });

    $('raw-toggle').addEventListener('click', () => {
      const body = $('raw-body');
      const isOpen = body.style.display !== 'none';
      body.style.display = isOpen ? 'none' : 'block';
      $('raw-toggle').textContent = isOpen ? l10n.showAll : l10n.hide;
    });
    $('raw-copy').addEventListener('click', () => {
      const text = JSON.stringify(state.rawExif, null, 2);
      vscode.postMessage({ type: 'copyText', text, toast: l10n.jsonCopied });
      toast(l10n.jsonCopied);
    });

    $('action-reveal').addEventListener('click', () => {
      vscode.postMessage({ type: 'revealInOs' });
    });
    $('action-copy-path').addEventListener('click', () => {
      vscode.postMessage({ type: 'copyText', text: state.file.path, toast: l10n.pathCopied });
      toast(l10n.pathCopied);
    });
    $('action-open-os').addEventListener('click', () => {
      vscode.postMessage({ type: 'openWithDefaultApp' });
    });
    $('action-reopen-text').addEventListener('click', () => {
      vscode.postMessage({ type: 'reopenAsText' });
    });
  }

  function init(msg) {
    state = msg;
    applyL10n(msg.l10n);
    wireToolbar(msg.l10n);

    setText('filename', msg.file.basename);
    setText('dim', msg.file.width !== null && msg.file.height !== null
      ? msg.file.width + ' × ' + msg.file.height + '  ·  ' + formatBytes(msg.file.sizeBytes)
      : formatBytes(msg.file.sizeBytes));

    const img = $('image');
    const placeholder = $('placeholder');
    const placeholderText = $('placeholder-text');

    if (msg.imageSrc && !msg.unsupportedPreview) {
      img.src = msg.imageSrc;
      img.addEventListener('error', () => {
        img.style.display = 'none';
        placeholder.style.display = 'flex';
        placeholderText.textContent = msg.l10n.loadError;
      }, { once: true });
      img.addEventListener('load', () => {
        applyZoom('fit');
      }, { once: true });
    } else {
      img.style.display = 'none';
      placeholder.style.display = 'flex';
      placeholderText.textContent = msg.l10n.loadError;
    }

    setBackground('checker');
    renderCards(msg);
    renderRaw(msg);
  }

  window.addEventListener('message', (event) => {
    const msg = event.data;
    if (msg && msg.type === 'init') init(msg);
  });
})();
`;
