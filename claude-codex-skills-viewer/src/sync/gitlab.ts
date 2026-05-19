// Minimal raw-content fetcher. Accepts any HTTPS URL (GitLab raw, GitHub raw,
// generic). If the host matches a GitLab instance we know, sends the GitLab
// PRIVATE-TOKEN header. Otherwise plain GET with optional Authorization Bearer.

import { log } from '../logger';

export interface FetchResult {
  ok: boolean;
  bytes: number;
  text?: string;
  status: number;
  contentType?: string;
  error?: string;
}

const KNOWN_GITLAB_HOSTS = ['gitlab.ranode.net', 'gitlab.internal.kr', 'gitlab.com'];

function isGitLab(url: string): boolean {
  try {
    const u = new URL(url);
    return KNOWN_GITLAB_HOSTS.includes(u.host) || u.host.startsWith('gitlab.');
  } catch {
    return false;
  }
}

function isGitHub(url: string): boolean {
  try {
    const u = new URL(url);
    return u.host === 'raw.githubusercontent.com' || u.host === 'github.com' || u.host === 'api.github.com';
  } catch {
    return false;
  }
}

export interface FetchOptions {
  gitlabToken?: string | null;
  githubToken?: string | null;
  maxBytes?: number; // default 1 MB
}

export async function fetchRaw(url: string, opts: FetchOptions = {}): Promise<FetchResult> {
  const headers: Record<string, string> = {
    Accept: 'text/plain, text/markdown, */*',
    'User-Agent': 'ccskills-viewer'
  };
  if (isGitLab(url) && opts.gitlabToken) headers['PRIVATE-TOKEN'] = opts.gitlabToken;
  if (isGitHub(url) && opts.githubToken) headers.Authorization = `Bearer ${opts.githubToken}`;

  const max = opts.maxBytes ?? 1_000_000;

  try {
    const r = await fetch(url, { headers, redirect: 'follow' });
    const ct = r.headers.get('content-type') || undefined;
    const sizeHeader = r.headers.get('content-length');
    if (sizeHeader && Number(sizeHeader) > max) {
      return {
        ok: false,
        bytes: 0,
        status: r.status,
        contentType: ct,
        error: `Response too large (${sizeHeader} > ${max})`
      };
    }
    const text = await r.text();
    if (text.length > max) {
      return {
        ok: false,
        bytes: text.length,
        status: r.status,
        contentType: ct,
        error: `Response too large (${text.length} > ${max})`
      };
    }
    if (!r.ok) {
      return { ok: false, bytes: text.length, status: r.status, contentType: ct, error: `HTTP ${r.status}` };
    }
    // Guard: GitLab returns HTML login page on auth failure even though status is 200.
    if (ct && ct.startsWith('text/html') && /sign in|<title>.*GitLab/i.test(text.slice(0, 500))) {
      return {
        ok: false,
        bytes: text.length,
        status: r.status,
        contentType: ct,
        error: 'Got HTML (likely auth required)'
      };
    }
    return { ok: true, bytes: text.length, text, status: r.status, contentType: ct };
  } catch (e: any) {
    log.error('fetchRaw failed', url, e.message);
    return { ok: false, bytes: 0, status: 0, error: e.message };
  }
}

// Helper to construct a GitLab raw URL from project/path/ref.
export function gitlabRawUrl(host: string, projectPath: string, filePath: string, ref = 'main'): string {
  return `https://${host}/${projectPath}/-/raw/${ref}/${filePath}`;
}
