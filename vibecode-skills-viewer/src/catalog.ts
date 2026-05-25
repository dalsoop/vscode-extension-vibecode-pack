import * as fs from 'fs';
import * as path from 'path';
import { log } from './logger';

export type RemoteTier = 'official' | 'curated' | 'community';

export interface RemoteSource {
  id: string;
  name: string;
  tier: RemoteTier;
  repo: string;
  branch?: string;
  skillsPath?: string;
}

export interface Bundle {
  id: string;
  name: string;
  skills: string[]; // skill IDs
}

export interface RemoteCatalog {
  version: string;
  lastUpdated?: string;
  sources: RemoteSource[];
  categories: string[];
  bundles?: Bundle[];
}

class CatalogError extends Error {
  constructor(message: string) {
    super(`catalog.json: ${message}`);
  }
}

function isStr(x: unknown): x is string {
  return typeof x === 'string';
}
function isArr<T = unknown>(x: unknown): x is T[] {
  return Array.isArray(x);
}

export function validate(raw: unknown): RemoteCatalog {
  if (!raw || typeof raw !== 'object') throw new CatalogError('not an object');
  const c = raw as Record<string, unknown>;
  if (!isStr(c.version)) throw new CatalogError('missing/invalid `version`');
  if (!isArr(c.sources)) throw new CatalogError('missing/invalid `sources`');
  if (!isArr(c.categories)) throw new CatalogError('missing/invalid `categories`');

  const sources: RemoteSource[] = c.sources.map((s, i) => {
    if (!s || typeof s !== 'object') throw new CatalogError(`sources[${i}] not an object`);
    const so = s as Record<string, unknown>;
    if (!isStr(so.id)) throw new CatalogError(`sources[${i}].id missing`);
    if (!isStr(so.name)) throw new CatalogError(`sources[${i}].name missing`);
    if (!isStr(so.repo)) throw new CatalogError(`sources[${i}].repo missing`);
    if (so.tier !== 'official' && so.tier !== 'curated' && so.tier !== 'community') {
      throw new CatalogError(`sources[${i}].tier invalid (got ${String(so.tier)})`);
    }
    return {
      id: so.id,
      name: so.name,
      tier: so.tier,
      repo: so.repo,
      branch: isStr(so.branch) ? so.branch : undefined,
      skillsPath: isStr(so.skillsPath) ? so.skillsPath : undefined
    };
  });

  return {
    version: c.version,
    lastUpdated: isStr(c.lastUpdated) ? c.lastUpdated : undefined,
    sources,
    categories: c.categories.filter(isStr),
    bundles: isArr(c.bundles) ? (c.bundles as Bundle[]) : undefined
  };
}

let cached: RemoteCatalog | { error: string } | null = null;

export function loadCatalog(extensionPath: string): RemoteCatalog {
  if (cached && !('error' in cached)) return cached;
  const file = path.join(extensionPath, 'resources/catalog.json');
  let raw: unknown;
  try {
    raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e: any) {
    cached = { error: e.message };
    throw new CatalogError(`unreadable: ${e.message}`);
  }
  try {
    cached = validate(raw);
    return cached;
  } catch (e: any) {
    cached = { error: e.message };
    throw e;
  }
}

export function getCatalogOrEmpty(extensionPath: string): RemoteCatalog {
  try {
    return loadCatalog(extensionPath);
  } catch (e: any) {
    log.error('catalog load failed', e.message);
    return { version: '0.0.0', sources: [], categories: [] };
  }
}
