
export const CLIENT_SCRIPT = String.raw`
(function() {
  const vscode = acquireVsCodeApi();

  let state = null;
  let currentTab = 'overview';

  const $ = (id) => document.getElementById(id);

  function setText(id, text) {
    const el = $(id);
    if (el) el.textContent = text == null ? '' : String(text);
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
    $('open-settings').textContent = l10n.openSettings;
    $('open-settings').title = l10n.openSettings;
  }

  function renderTabBar(s) {
    const l = s.l10n;
    const exifCount = countExifEntries(s);
    const pngCount = (s.pngText || []).length;
    $('tab-overview').innerHTML = l.tabOverview;
    $('tab-exif').innerHTML = l.tabExif + (exifCount ? ' <span class="count">' + exifCount + '</span>' : '');
    $('tab-png-text').innerHTML = l.tabPngText + (pngCount ? ' <span class="count">' + pngCount + '</span>' : '');
    $('tab-raw').innerHTML = l.tabRaw;
  }

  function countExifEntries(s) {
    if (!s.metaSegments) return 0;
    let count = 0;
    for (const v of Object.values(s.metaSegments)) {
      if (v && typeof v === 'object') count += Object.keys(v).length;
    }
    return count;
  }

  function setActiveTab(name) {
    currentTab = name;
    document.querySelectorAll('.tabbar .tab').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === name);
    });
    document.querySelectorAll('.tab-panel').forEach(panel => {
      panel.classList.toggle('active', panel.id === 'panel-' + name);
    });
  }

  function segmentLabel(key, l) {
    const map = {
      ifd0: l.segIfd0 || 'TIFF / IFD0',
      ifd1: l.segIfd1 || 'Thumbnail IFD (IFD1)',
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

  function renderOverview(s) {
    const l = s.l10n;
    const host = $('cards-overview');
    host.innerHTML = '';

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
    host.appendChild(card(l.fileTitle, fileRows));

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
    if (cameraRows.length) host.appendChild(card(l.cameraTitle, cameraRows));

    if (s.gps) {
      const lat = s.gps.latitude.toFixed(6);
      const lon = s.gps.longitude.toFixed(6);
      const coord = lat + ', ' + lon;
      const rows = [[l.gpsTitle, coord]];
      if (s.gps.altitude !== null) rows.push(['Alt', s.gps.altitude.toFixed(1) + ' m']);
      const gpsCard = card(l.gpsTitle, rows);
      const actions = document.createElement('div');
      actions.className = 'row-actions';

      const mapsBtn = document.createElement('button');
      mapsBtn.textContent = l.openInGoogleMaps;
      mapsBtn.addEventListener('click', () => {
        vscode.postMessage({ type: 'openUrl', url: 'https://www.google.com/maps?q=' + lat + ',' + lon });
      });
      actions.appendChild(mapsBtn);

      const copyBtn = document.createElement('button');
      copyBtn.textContent = l.copyCoordinates;
      copyBtn.addEventListener('click', () => {
        vscode.postMessage({ type: 'copyText', text: coord, toast: l.coordsCopied });
        toast(l.coordsCopied);
      });
      actions.appendChild(copyBtn);

      gpsCard.appendChild(actions);
      host.appendChild(gpsCard);
    }
  }

  function renderExif(s) {
    const l = s.l10n;
    const host = $('cards-exif');
    host.innerHTML = '';
    if (!s.metaSegments || Object.keys(s.metaSegments).length === 0) {
      const empty = document.createElement('div');
      empty.className = 'raw-empty';
      empty.textContent = l.noExif;
      host.appendChild(empty);
      return;
    }
    const segOrder = ['ifd0', 'ifd1', 'exif', 'gps', 'interop', 'thumbnail', 'iptc', 'xmp', 'icc', 'jfif', 'ihdr'];
    const seen = new Set();
    const renderSegment = (key) => {
      seen.add(key);
      const obj = s.metaSegments[key];
      if (!obj || typeof obj !== 'object') return;
      const rows = [];
      for (const [k, v] of Object.entries(obj)) {
        rows.push([k, formatValue(v)]);
      }
      if (rows.length) host.appendChild(card(segmentLabel(key, l), rows));
    };
    for (const key of segOrder) if (key in s.metaSegments) renderSegment(key);
    for (const key of Object.keys(s.metaSegments)) if (!seen.has(key)) renderSegment(key);
  }

  function aiPromptKeyword(keyword) {
    if (!keyword) return false;
    const k = keyword.toLowerCase();
    return k === 'parameters' || k === 'prompt' || k === 'negative_prompt' || k === 'workflow' || k === 'comment';
  }

  function renderPngText(s) {
    const l = s.l10n;
    const host = $('png-text-list');
    const empty = $('png-text-empty');
    const chunks = s.pngText || [];
    host.innerHTML = '';
    if (chunks.length === 0) {
      host.style.display = 'none';
      empty.style.display = 'block';
      empty.textContent = l.noPngText;
      return;
    }
    host.style.display = '';
    empty.style.display = 'none';

    chunks.forEach((chunk, idx) => {
      const wrap = document.createElement('div');
      wrap.className = 'png-text-chunk';
      if (chunk.parseError) wrap.classList.add('has-error');

      const header = document.createElement('header');

      const chip = document.createElement('span');
      const type = chunk.type;
      chip.className = 'chip ' + (type === 'iTXt' ? 'chip-itxt' : type === 'zTXt' ? 'chip-ztxt' : 'chip-text');
      chip.textContent = type;
      chip.title = type === 'iTXt' ? l.itxtTooltip : type === 'zTXt' ? l.ztxtTooltip : l.textTooltip;
      header.appendChild(chip);

      const kw = document.createElement('span');
      kw.className = 'keyword';
      kw.textContent = chunk.keyword || '(unnamed)';
      header.appendChild(kw);

      if (chunk.translatedKeyword) {
        const tk = document.createElement('span');
        tk.className = 'keyword-translated';
        tk.textContent = '— ' + chunk.translatedKeyword;
        header.appendChild(tk);
      }

      if (chunk.languageTag) {
        const lang = document.createElement('span');
        lang.className = 'lang';
        lang.textContent = '[' + chunk.languageTag + ']';
        header.appendChild(lang);
      }

      if (chunk.compressed) {
        const cmp = document.createElement('span');
        cmp.className = 'chip chip-compressed';
        cmp.textContent = l.compressed;
        cmp.title = l.compressedTooltip;
        header.appendChild(cmp);
      }

      if (chunk.parseError) {
        const warn = document.createElement('span');
        warn.className = 'chip chip-warn';
        warn.textContent = l.parseError;
        warn.title = chunk.parseError;
        header.appendChild(warn);
      }

      const spacer = document.createElement('span');
      spacer.className = 'header-spacer';
      header.appendChild(spacer);

      const actions = document.createElement('div');
      actions.className = 'actions';
      const copyBtn = document.createElement('button');
      copyBtn.textContent = l.copy;
      copyBtn.addEventListener('click', () => {
        vscode.postMessage({ type: 'copyText', text: chunk.text, toast: l.copied });
        toast(l.copied);
      });
      actions.appendChild(copyBtn);
      header.appendChild(actions);

      wrap.appendChild(header);

      const body = document.createElement('div');
      body.className = 'body';
      const formatted = aiPromptKeyword(chunk.keyword) && s.settings && s.settings.pngTextShowAiPromptFormatted;
      body.textContent = formatted ? chunk.text : chunk.text;
      if (formatted) body.style.whiteSpace = 'pre-wrap';
      wrap.appendChild(body);

      host.appendChild(wrap);
    });
  }

  function renderRaw(s) {
    const body = $('raw-body');
    const empty = $('raw-empty');
    if (!s.hasExif && (!s.pngText || s.pngText.length === 0)) {
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
    const expanded = s.settings && s.settings.rawJsonExpanded !== false;
    body.style.display = expanded ? 'block' : 'none';
    $('raw-toggle').textContent = expanded ? s.l10n.hide : s.l10n.showAll;
    const fullDump = { ...s.rawExif };
    if (s.pngText && s.pngText.length) fullDump.__pngText = s.pngText;
    body.textContent = JSON.stringify(fullDump, null, 2);
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
    document.querySelectorAll('.tabbar .tab').forEach(btn => {
      btn.addEventListener('click', () => setActiveTab(btn.dataset.tab));
    });

    $('open-settings').addEventListener('click', () => {
      vscode.postMessage({ type: 'openSettings' });
    });

    $('raw-toggle').addEventListener('click', () => {
      const body = $('raw-body');
      const isOpen = body.style.display !== 'none';
      body.style.display = isOpen ? 'none' : 'block';
      $('raw-toggle').textContent = isOpen ? l10n.showAll : l10n.hide;
    });
    $('raw-copy').addEventListener('click', () => {
      const fullDump = { ...state.rawExif };
      if (state.pngText && state.pngText.length) fullDump.__pngText = state.pngText;
      const text = JSON.stringify(fullDump, null, 2);
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
    renderTabBar(msg);

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
    renderOverview(msg);
    renderExif(msg);
    renderPngText(msg);
    renderRaw(msg);

    const initialTab = msg.settings && msg.settings.defaultTab ? msg.settings.defaultTab : 'overview';
    setActiveTab(initialTab);
  }

  window.addEventListener('message', (event) => {
    const m = event.data;
    if (m && m.type === 'init') init(m);
  });
})();
`;
