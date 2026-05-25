import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { URL } from 'url';
import { contentTypeFor } from './mime';
import { INSPECTOR_SCRIPT } from './inspector/inspector-script';
import { FORCE_STATE_SCRIPT } from './inspector/force-state-script';

const INSPECTOR_VIRTUAL_PATH = '/__bp_inspector.js';
const INSPECTOR_TAG = '<script src="/__bp_inspector.js"></script>';
const HTML_INJECT_LIMIT = 5 * 1024 * 1024; // 5MB

class PreviewServer {
  private server: http.Server | null = null;
  private refCount = 0;
  private url: URL | null = null;

  constructor(private readonly rootDir: string) {}

  async start(): Promise<URL> {
    if (this.url) return this.url;
    this.server = http.createServer((req, res) => this.handle(req, res));
    await new Promise<void>((resolve, reject) => {
      this.server!.once('error', reject);
      this.server!.listen(0, '127.0.0.1', () => {
        this.server!.off('error', reject);
        resolve();
      });
    });
    const addr = this.server.address();
    if (!addr || typeof addr === 'string') {
      throw new Error('preview-server: failed to obtain bound port');
    }
    this.url = new URL(`http://127.0.0.1:${addr.port}/`);
    return this.url;
  }

  acquire(): void {
    this.refCount++;
  }

  async release(): Promise<void> {
    this.refCount = Math.max(0, this.refCount - 1);
    if (this.refCount === 0 && this.server) {
      const server = this.server;
      this.server = null;
      this.url = null;
      await new Promise<void>(resolve => server.close(() => resolve()));
    }
  }

  isIdle(): boolean {
    return this.refCount === 0;
  }

  private handle(req: http.IncomingMessage, res: http.ServerResponse): void {
    try {
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.statusCode = 405;
        res.end();
        return;
      }
      const rawPath = decodeURIComponent((req.url ?? '/').split('?')[0]);

      if (rawPath === INSPECTOR_VIRTUAL_PATH) {
        this.serveInspector(res);
        return;
      }

      const resolved = path.normalize(path.join(this.rootDir, rawPath));
      if (
        resolved !== this.rootDir &&
        !resolved.startsWith(this.rootDir + path.sep)
      ) {
        res.statusCode = 403;
        res.end('Forbidden');
        return;
      }
      this.serveFile(resolved, res);
    } catch (err) {
      res.statusCode = 500;
      res.end(`Internal error: ${(err as Error).message}`);
    }
  }

  private serveInspector(res: http.ServerResponse): void {
    const body = Buffer.from(INSPECTOR_SCRIPT + '\n' + FORCE_STATE_SCRIPT, 'utf8');
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/javascript; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Length', body.byteLength);
    res.end(body);
  }

  private serveFile(absPath: string, res: http.ServerResponse): void {
    fs.stat(absPath, (err, stat) => {
      if (err) {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.end('Not found');
        return;
      }
      if (stat.isDirectory()) {
        this.serveFile(path.join(absPath, 'index.html'), res);
        return;
      }
      const ext = path.extname(absPath).toLowerCase();
      const isHtml = ext === '.html' || ext === '.htm';
      if (isHtml && stat.size <= HTML_INJECT_LIMIT) {
        this.serveHtmlWithInjection(absPath, res);
        return;
      }
      res.statusCode = 200;
      res.setHeader('Content-Type', contentTypeFor(ext));
      res.setHeader('Cache-Control', 'no-store');
      const stream = fs.createReadStream(absPath);
      stream.on('error', () => {
        if (!res.headersSent) {
          res.statusCode = 500;
        }
        res.end();
      });
      stream.pipe(res);
    });
  }

  private serveHtmlWithInjection(absPath: string, res: http.ServerResponse): void {
    fs.readFile(absPath, 'utf8', (err, html) => {
      if (err) {
        res.statusCode = 500;
        res.end('Read error');
        return;
      }
      const injected = injectInspectorTag(html);
      const body = Buffer.from(injected, 'utf8');
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Content-Length', body.byteLength);
      res.end(body);
    });
  }
}

export function injectInspectorTag(html: string): string {
  if (html.includes(INSPECTOR_TAG)) return html;
  const lower = html.toLowerCase();
  const bodyClose = lower.lastIndexOf('</body>');
  if (bodyClose >= 0) {
    return html.slice(0, bodyClose) + INSPECTOR_TAG + '\n' + html.slice(bodyClose);
  }
  const htmlClose = lower.lastIndexOf('</html>');
  if (htmlClose >= 0) {
    return html.slice(0, htmlClose) + INSPECTOR_TAG + '\n' + html.slice(htmlClose);
  }
  return html + '\n' + INSPECTOR_TAG + '\n';
}

export class PreviewServerRegistry {
  private readonly servers = new Map<string, PreviewServer>();

  async acquire(rootDir: string): Promise<{ url: URL; release: () => Promise<void> }> {
    const key = path.resolve(rootDir);
    let server = this.servers.get(key);
    if (!server) {
      server = new PreviewServer(key);
      this.servers.set(key, server);
    }
    const url = await server.start();
    server.acquire();
    const ownedServer = server;
    const release = async (): Promise<void> => {
      await ownedServer.release();
      if (ownedServer.isIdle()) {
        this.servers.delete(key);
      }
    };
    return { url, release };
  }
}
