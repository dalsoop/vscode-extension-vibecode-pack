import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { URL } from 'url';
import { contentTypeFor } from './mime';

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
      const ext = path.extname(absPath);
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
