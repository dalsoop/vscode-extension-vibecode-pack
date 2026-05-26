import * as pdfjsLib from 'pdfjs-dist';

interface L10nBundle {
  loading: string;
  loadFailed: string;
  page: string;
  ofN: string;
  prevPage: string;
  nextPage: string;
  fitWidth: string;
  fitPage: string;
  zoomOut: string;
  zoomIn: string;
  copyPageText: string;
  pageTextCopied: string;
  metadata: string;
  title: string;
  author: string;
  subject: string;
  keywords: string;
  creator: string;
  producer: string;
  created: string;
  modified: string;
  pdfVersion: string;
  pages: string;
  encrypted: string;
  yes: string;
  no: string;
  outline: string;
  noOutline: string;
}

interface InitMessage {
  type: 'init';
  pdfSrc: string;
  workerSrc: string;
  basename: string;
  l10n: L10nBundle;
}

interface PdfInfo {
  Title?: string;
  Author?: string;
  Subject?: string;
  Keywords?: string;
  Creator?: string;
  Producer?: string;
  CreationDate?: string;
  ModDate?: string;
  PDFFormatVersion?: string;
  IsEncrypted?: boolean;
}

interface OutlineItem {
  title: string;
  dest: string | unknown[] | null;
  items?: OutlineItem[];
}

declare global {
  interface Window {
    acquireVsCodeApi?: () => { postMessage: (msg: unknown) => void };
  }
}

const vscode = window.acquireVsCodeApi ? window.acquireVsCodeApi() : null;
const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d');
const loading = document.getElementById('loading') as HTMLDivElement;
const pageInput = document.getElementById('page-input') as HTMLInputElement;
const stage = document.getElementById('stage') as HTMLDivElement;

let pdfDoc: pdfjsLib.PDFDocumentProxy | null = null;
let l10n: L10nBundle | null = null;
let pageNum = 1;
let scale = 1;
let fitMode: 'width' | 'page' | null = 'width';

window.addEventListener('message', event => {
  const msg = event.data as InitMessage;
  if (msg && msg.type === 'init') {
    init(msg);
  }
});

function setText(id: string, value: string): void {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function init(msg: InitMessage): void {
  l10n = msg.l10n;
  pdfjsLib.GlobalWorkerOptions.workerSrc = msg.workerSrc;
  setText('filename', msg.basename);
  setText('page-label-text', l10n.page);
  setText('prev', l10n.prevPage);
  setText('next', l10n.nextPage);
  setText('fit-width', l10n.fitWidth);
  setText('fit-page', l10n.fitPage);
  setText('zoom-out', l10n.zoomOut);
  setText('zoom-in', l10n.zoomIn);
  setText('copy-text', l10n.copyPageText);
  setText('meta-title', l10n.metadata);
  setText('outline-title', l10n.outline);
  wire();
  loadPdf(msg.pdfSrc);
}

function wire(): void {
  document.getElementById('prev')?.addEventListener('click', () => goTo(pageNum - 1));
  document.getElementById('next')?.addEventListener('click', () => goTo(pageNum + 1));
  document.getElementById('zoom-out')?.addEventListener('click', () => zoom(0.85));
  document.getElementById('zoom-in')?.addEventListener('click', () => zoom(1.15));
  document.getElementById('fit-width')?.addEventListener('click', () => setFit('width'));
  document.getElementById('fit-page')?.addEventListener('click', () => setFit('page'));
  document.getElementById('copy-text')?.addEventListener('click', copyPageText);
  pageInput.addEventListener('change', () => goTo(Number(pageInput.value)));
  window.addEventListener('resize', () => {
    if (fitMode) renderPage();
  });
}

async function loadPdf(src: string): Promise<void> {
  if (!l10n) return;
  try {
    loading.classList.remove('hidden');
    loading.textContent = l10n.loading;
    pdfDoc = await pdfjsLib.getDocument({ url: src }).promise;
    pageInput.max = String(pdfDoc.numPages);
    updatePageLabels();
    await renderMetadata();
    await renderOutline();
    await renderPage();
    loading.classList.add('hidden');
  } catch (err) {
    loading.classList.remove('hidden');
    loading.textContent = l10n.loadFailed.replace('{0}', String((err as Error)?.message ?? err));
  }
}

async function goTo(next: number): Promise<void> {
  if (!pdfDoc) return;
  pageNum = Math.max(1, Math.min(pdfDoc.numPages, next));
  updatePageLabels();
  await renderPage();
}

function zoom(multiplier: number): void {
  fitMode = null;
  scale = Math.max(0.2, Math.min(4, scale * multiplier));
  renderPage();
}

function setFit(mode: 'width' | 'page'): void {
  fitMode = mode;
  renderPage();
}

function updatePageLabels(): void {
  if (!pdfDoc || !l10n) return;
  pageInput.value = String(pageNum);
  setText('page-of', l10n.ofN.replace('{0}', String(pdfDoc.numPages)));
}

async function renderPage(): Promise<void> {
  if (!pdfDoc || !ctx) return;
  const page = await pdfDoc.getPage(pageNum);
  const base = page.getViewport({ scale: 1 });
  if (fitMode === 'width') {
    scale = Math.max(0.2, (stage.clientWidth - 32) / base.width);
  } else if (fitMode === 'page') {
    scale = Math.max(0.2, Math.min((stage.clientWidth - 32) / base.width, (stage.clientHeight - 32) / base.height));
  }
  const viewport = page.getViewport({ scale });
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  setText('zoom-pct', `${Math.round(scale * 100)}%`);
  await page.render({ canvasContext: ctx, viewport }).promise;
}

async function copyPageText(): Promise<void> {
  if (!pdfDoc || !l10n) return;
  const page = await pdfDoc.getPage(pageNum);
  const content = await page.getTextContent();
  const text = content.items.map(item => ('str' in item ? item.str : '')).join(' ').trim();
  if (vscode) {
    vscode.postMessage({ type: 'copyText', text, toast: l10n.pageTextCopied });
  } else {
    await navigator.clipboard.writeText(text);
  }
}

async function renderMetadata(): Promise<void> {
  if (!pdfDoc || !l10n) return;
  const meta = await pdfDoc.getMetadata().catch(() => null);
  const info = (meta?.info ?? {}) as PdfInfo;
  const rows = [
    tuple(l10n.title, info.Title || ''),
    tuple(l10n.author, info.Author || ''),
    tuple(l10n.subject, info.Subject || ''),
    tuple(l10n.keywords, info.Keywords || ''),
    tuple(l10n.creator, info.Creator || ''),
    tuple(l10n.producer, info.Producer || ''),
    tuple(l10n.created, parsePdfDate(info.CreationDate)),
    tuple(l10n.modified, parsePdfDate(info.ModDate)),
    tuple(l10n.pdfVersion, info.PDFFormatVersion || ''),
    tuple(l10n.pages, String(pdfDoc.numPages)),
    tuple(l10n.encrypted, info.IsEncrypted ? l10n.yes : l10n.no)
  ].filter(([, value]) => value !== '');
  const host = document.getElementById('meta-list') as HTMLDListElement;
  host.innerHTML = '';
  for (const [key, value] of rows) {
    const dt = document.createElement('dt');
    const dd = document.createElement('dd');
    dt.textContent = key;
    dd.textContent = value;
    host.appendChild(dt);
    host.appendChild(dd);
  }
}

async function renderOutline(): Promise<void> {
  if (!pdfDoc || !l10n) return;
  const outline = await pdfDoc.getOutline().catch(() => null);
  const host = document.getElementById('outline-list') as HTMLUListElement;
  const empty = document.getElementById('outline-empty') as HTMLDivElement;
  host.innerHTML = '';
  if (!outline || outline.length === 0) {
    empty.style.display = 'block';
    empty.textContent = l10n.noOutline;
    return;
  }
  empty.style.display = 'none';
  appendOutline(host, outline as OutlineItem[]);
}

function appendOutline(parent: HTMLElement, items: OutlineItem[]): void {
  for (const item of items) {
    const li = document.createElement('li');
    li.textContent = item.title;
    li.addEventListener('click', event => {
      event.stopPropagation();
      jumpToDestination(item.dest);
    });
    parent.appendChild(li);
    if (item.items && item.items.length) {
      const nested = document.createElement('ul');
      li.appendChild(nested);
      appendOutline(nested, item.items);
    }
  }
}

async function jumpToDestination(dest: string | unknown[] | null): Promise<void> {
  if (!pdfDoc || !dest) return;
  const resolved = typeof dest === 'string' ? await pdfDoc.getDestination(dest) : dest;
  const ref = resolved ? resolved[0] : null;
  if (!ref) return;
  const pageIndex = await pdfDoc.getPageIndex(ref);
  await goTo(pageIndex + 1);
}

function tuple(a: string, b: string): [string, string] {
  return [a, b];
}

function parsePdfDate(raw: string | undefined): string {
  if (!raw) return '';
  const m = /^D:(\d{4})(\d{2})?(\d{2})?(\d{2})?(\d{2})?(\d{2})?/.exec(raw);
  if (!m) return raw;
  const [, y, mo = '01', d = '01', h = '00', mi = '00', s = '00'] = m;
  return `${y}-${mo}-${d} ${h}:${mi}:${s}`;
}
