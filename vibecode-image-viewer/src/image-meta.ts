
import * as fs from 'fs/promises';
import * as path from 'path';
import * as exifr from 'exifr';
import sizeOf from 'image-size';
import type { CameraSummary, FileInfo, GpsInfo } from './messages';

export interface ImageMeta {
  file: FileInfo;
  camera: CameraSummary;
  gps: GpsInfo | null;
  rawExif: Record<string, unknown>;
  hasExif: boolean;
  error: string | null;
}

const HEIF_EXTS = new Set(['.heic', '.heif']);
const UNSUPPORTED_PREVIEW = HEIF_EXTS;

export function isUnsupportedForPreview(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return UNSUPPORTED_PREVIEW.has(ext);
}

export function detectFormat(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase().replace(/^\./, '');
  return ext ? ext.toUpperCase() : '—';
}

export async function readImageMeta(filePath: string): Promise<ImageMeta> {
  const stat = await fs.stat(filePath);
  const format = detectFormat(filePath);
  const basename = path.basename(filePath);

  let width: number | null = null;
  let height: number | null = null;
  let buffer: Buffer | null = null;
  let dimsError: string | null = null;

  try {
    buffer = await fs.readFile(filePath);
    const dims = sizeOf(buffer);
    width = dims.width ?? null;
    height = dims.height ?? null;
  } catch (err) {
    dimsError = String((err as Error)?.message ?? err);
  }

  const file: FileInfo = {
    path: filePath,
    basename,
    sizeBytes: stat.size,
    mtimeMs: stat.mtimeMs,
    format,
    width,
    height,
  };

  let rawExif: Record<string, unknown> = {};
  let parseError: string | null = null;
  if (buffer) {
    try {
      const parsed = await exifr.parse(buffer, {
        tiff: true,
        exif: true,
        gps: true,
        xmp: true,
        iptc: true,
        icc: true,
        jfif: true,
        ihdr: true,
        translateKeys: true,
        translateValues: true,
        reviveValues: true,
        mergeOutput: true,
      });
      if (parsed && typeof parsed === 'object') {
        rawExif = parsed as Record<string, unknown>;
      }
    } catch (err) {
      parseError = String((err as Error)?.message ?? err);
    }
  }

  const camera = summarizeCamera(rawExif);
  const gps = summarizeGps(rawExif);

  if (rawExif.ColorSpace || rawExif.BitsPerSample || rawExif.BitDepth) {
  }

  const errorParts: string[] = [];
  if (dimsError) errorParts.push(dimsError);
  if (parseError) errorParts.push(parseError);

  return {
    file,
    camera,
    gps,
    rawExif,
    hasExif: Object.keys(rawExif).length > 0,
    error: errorParts.length ? errorParts.join('; ') : null,
  };
}

function summarizeCamera(raw: Record<string, unknown>): CameraSummary {
  const make = asString(raw.Make);
  const model = asString(raw.Model);
  const lens = asString(raw.LensModel) ?? asString(raw.Lens) ?? asString(raw.LensInfo);

  const exposureTime = formatExposure(raw.ExposureTime);
  const fNumber = formatFNumber(raw.FNumber ?? raw.ApertureValue);
  const iso = asNumber(raw.ISO ?? raw.ISOSpeedRatings ?? raw.PhotographicSensitivity);
  const focalLength = formatFocalLength(raw.FocalLength, raw.FocalLengthIn35mmFormat);
  const dateTaken =
    formatDate(raw.DateTimeOriginal) ??
    formatDate(raw.CreateDate) ??
    formatDate(raw.ModifyDate) ??
    formatDate(raw.DateTime);
  const software = asString(raw.Software);
  const orientation = formatOrientation(raw.Orientation);
  const colorSpace = formatColorSpace(raw.ColorSpace);
  const bitDepth = asNumber(raw.BitsPerSample ?? raw.BitDepth);

  return {
    make,
    model,
    lens,
    exposureTime,
    fNumber,
    iso,
    focalLength,
    dateTaken,
    software,
    orientation,
    colorSpace,
    bitDepth,
  };
}

function summarizeGps(raw: Record<string, unknown>): GpsInfo | null {
  const lat = asNumber(raw.latitude);
  const lon = asNumber(raw.longitude);
  if (lat === null || lon === null) return null;
  const alt = asNumber(raw.GPSAltitude ?? raw.altitude);
  return { latitude: lat, longitude: lon, altitude: alt };
}

function asString(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v === 'string') return v.trim() || null;
  if (Array.isArray(v)) return v.length ? v.join(', ') : null;
  return String(v);
}

function asNumber(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function formatExposure(v: unknown): string | null {
  const n = asNumber(v);
  if (n === null) return null;
  if (n >= 1) return `${n}s`;
  const denom = Math.round(1 / n);
  return `1/${denom}s`;
}

function formatFNumber(v: unknown): string | null {
  const n = asNumber(v);
  if (n === null) return null;
  return `f/${n.toFixed(n < 10 ? 1 : 0)}`;
}

function formatFocalLength(focal: unknown, equiv: unknown): string | null {
  const f = asNumber(focal);
  const e = asNumber(equiv);
  if (f === null && e === null) return null;
  if (f !== null && e !== null && Math.round(f) !== Math.round(e)) {
    return `${f}mm (35mm eq. ${e}mm)`;
  }
  if (f !== null) return `${f}mm`;
  return `35mm eq. ${e}mm`;
}

function formatDate(v: unknown): string | null {
  if (v instanceof Date) return v.toISOString().replace('T', ' ').slice(0, 19);
  if (typeof v === 'string') return v;
  return null;
}

function formatOrientation(v: unknown): string | null {
  const n = asNumber(v);
  if (n === null) return null;
  const map: Record<number, string> = {
    1: 'Normal',
    2: 'Mirror horizontal',
    3: 'Rotate 180°',
    4: 'Mirror vertical',
    5: 'Mirror horizontal + rotate 270° CW',
    6: 'Rotate 90° CW',
    7: 'Mirror horizontal + rotate 90° CW',
    8: 'Rotate 270° CW',
  };
  return map[n] ?? `Code ${n}`;
}

function formatColorSpace(v: unknown): string | null {
  if (v === 1 || v === '1') return 'sRGB';
  if (v === 2 || v === '2') return 'Adobe RGB';
  if (v === 65535 || v === '65535') return 'Uncalibrated';
  return asString(v);
}
