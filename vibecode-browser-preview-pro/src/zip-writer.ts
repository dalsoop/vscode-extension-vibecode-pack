import { deflateRawSync } from 'zlib';

const CRC_TABLE: number[] = (() => {
  const t: number[] = new Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : (c >>> 1);
    }
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

interface ZipEntry {
  name: string;
  data: Buffer;
}

interface PreparedEntry {
  nameBuf: Buffer;
  compressed: Buffer;
  uncompressedSize: number;
  crc: number;
  localHeaderOffset: number;
  dosTime: number;
  dosDate: number;
}

function dosNow(): { time: number; date: number } {
  const d = new Date();
  const time = ((d.getHours() & 0x1f) << 11) | ((d.getMinutes() & 0x3f) << 5) | ((Math.floor(d.getSeconds() / 2)) & 0x1f);
  const date = (((d.getFullYear() - 1980) & 0x7f) << 9) | (((d.getMonth() + 1) & 0xf) << 5) | (d.getDate() & 0x1f);
  return { time, date };
}

export function buildZip(entries: ZipEntry[]): Buffer {
  const prepared: PreparedEntry[] = [];
  const { time: dosTime, date: dosDate } = dosNow();

  const localChunks: Buffer[] = [];
  let cursor = 0;

  for (const entry of entries) {
    const nameBuf = Buffer.from(entry.name, 'utf8');
    const compressed = deflateRawSync(entry.data);
    const uncompressedSize = entry.data.length;
    const crc = crc32(entry.data);
    const localHeaderOffset = cursor;

    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50, 0);
    header.writeUInt16LE(20, 4);
    header.writeUInt16LE(0x0800, 6);
    header.writeUInt16LE(8, 8);
    header.writeUInt16LE(dosTime, 10);
    header.writeUInt16LE(dosDate, 12);
    header.writeUInt32LE(crc, 14);
    header.writeUInt32LE(compressed.length, 18);
    header.writeUInt32LE(uncompressedSize, 22);
    header.writeUInt16LE(nameBuf.length, 26);
    header.writeUInt16LE(0, 28);

    localChunks.push(header, nameBuf, compressed);
    cursor += header.length + nameBuf.length + compressed.length;

    prepared.push({ nameBuf, compressed, uncompressedSize, crc, localHeaderOffset, dosTime, dosDate });
  }

  const centralChunks: Buffer[] = [];
  const centralStart = cursor;
  for (const p of prepared) {
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt16LE(p.dosTime, 12);
    central.writeUInt16LE(p.dosDate, 14);
    central.writeUInt32LE(p.crc, 16);
    central.writeUInt32LE(p.compressed.length, 20);
    central.writeUInt32LE(p.uncompressedSize, 24);
    central.writeUInt16LE(p.nameBuf.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(p.localHeaderOffset, 42);

    centralChunks.push(central, p.nameBuf);
    cursor += central.length + p.nameBuf.length;
  }
  const centralSize = cursor - centralStart;

  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(prepared.length, 8);
  eocd.writeUInt16LE(prepared.length, 10);
  eocd.writeUInt32LE(centralSize, 12);
  eocd.writeUInt32LE(centralStart, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...localChunks, ...centralChunks, eocd]);
}
