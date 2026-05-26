import * as zlib from 'zlib';

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export interface PngTextChunk {
  type: 'tEXt' | 'zTXt' | 'iTXt';
  keyword: string;
  text: string;
  unicode: boolean;
  compressed: boolean;
  languageTag?: string;
  translatedKeyword?: string;
  parseError?: string;
}

export function isPng(buffer: Buffer): boolean {
  if (buffer.length < PNG_SIGNATURE.length) return false;
  for (let i = 0; i < PNG_SIGNATURE.length; i++) {
    if (buffer[i] !== PNG_SIGNATURE[i]) return false;
  }
  return true;
}

export function extractPngTextChunks(buffer: Buffer): PngTextChunk[] {
  if (!isPng(buffer)) return [];
  const out: PngTextChunk[] = [];

  let offset = PNG_SIGNATURE.length;
  while (offset + 12 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.slice(offset + 4, offset + 8).toString('ascii');
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    if (dataEnd + 4 > buffer.length) break;
    const data = buffer.slice(dataStart, dataEnd);

    try {
      if (type === 'tEXt') {
        const chunk = parseTextChunk(data);
        if (chunk) out.push(chunk);
      } else if (type === 'zTXt') {
        const chunk = parseZTextChunk(data);
        if (chunk) out.push(chunk);
      } else if (type === 'iTXt') {
        const chunk = parseITextChunk(data);
        if (chunk) out.push(chunk);
      } else if (type === 'IEND') {
        break;
      }
    } catch (err) {
      out.push({
        type: type as PngTextChunk['type'],
        keyword: '',
        text: '',
        unicode: false,
        compressed: false,
        parseError: String((err as Error)?.message ?? err)
      });
    }

    offset = dataEnd + 4;
  }

  return out;
}

function findNull(buf: Buffer, from: number): number {
  for (let i = from; i < buf.length; i++) {
    if (buf[i] === 0) return i;
  }
  return -1;
}

function parseTextChunk(data: Buffer): PngTextChunk | null {
  const sep = findNull(data, 0);
  if (sep < 0) return null;
  const keyword = data.slice(0, sep).toString('latin1');
  const text = data.slice(sep + 1).toString('latin1');
  return { type: 'tEXt', keyword, text, unicode: false, compressed: false };
}

function parseZTextChunk(data: Buffer): PngTextChunk | null {
  const sep = findNull(data, 0);
  if (sep < 0) return null;
  const keyword = data.slice(0, sep).toString('latin1');
  const compressionMethod = data[sep + 1];
  const compressed = data.slice(sep + 2);
  let text: string;
  try {
    text = zlib.inflateSync(compressed).toString('latin1');
  } catch (err) {
    return {
      type: 'zTXt',
      keyword,
      text: '',
      unicode: false,
      compressed: true,
      parseError: `inflate failed: ${(err as Error)?.message ?? err}`
    };
  }
  if (compressionMethod !== 0) {
    return { type: 'zTXt', keyword, text, unicode: false, compressed: true, parseError: `unknown compression method ${compressionMethod}` };
  }
  return { type: 'zTXt', keyword, text, unicode: false, compressed: true };
}

function parseITextChunk(data: Buffer): PngTextChunk | null {
  const sep1 = findNull(data, 0);
  if (sep1 < 0) return null;
  const keyword = data.slice(0, sep1).toString('latin1');

  const compressionFlag = data[sep1 + 1];
  const compressionMethod = data[sep1 + 2];

  const sep2 = findNull(data, sep1 + 3);
  if (sep2 < 0) return null;
  const languageTag = data.slice(sep1 + 3, sep2).toString('ascii');

  const sep3 = findNull(data, sep2 + 1);
  if (sep3 < 0) return null;
  const translatedKeyword = data.slice(sep2 + 1, sep3).toString('utf8');

  const textBytes = data.slice(sep3 + 1);
  let text: string;
  const compressed = compressionFlag === 1;
  if (compressed) {
    try {
      text = zlib.inflateSync(textBytes).toString('utf8');
    } catch (err) {
      return {
        type: 'iTXt',
        keyword,
        text: '',
        unicode: true,
        compressed: true,
        languageTag: languageTag || undefined,
        translatedKeyword: translatedKeyword || undefined,
        parseError: `inflate failed: ${(err as Error)?.message ?? err}`
      };
    }
    if (compressionMethod !== 0) {
      return {
        type: 'iTXt',
        keyword,
        text,
        unicode: true,
        compressed: true,
        languageTag: languageTag || undefined,
        translatedKeyword: translatedKeyword || undefined,
        parseError: `unknown compression method ${compressionMethod}`
      };
    }
  } else {
    text = textBytes.toString('utf8');
  }

  return {
    type: 'iTXt',
    keyword,
    text,
    unicode: true,
    compressed,
    languageTag: languageTag || undefined,
    translatedKeyword: translatedKeyword || undefined
  };
}
