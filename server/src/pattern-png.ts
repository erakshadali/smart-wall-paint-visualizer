import zlib from 'node:zlib';

const crcTable = new Int32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c;
});

function crc32(buf: Buffer) {
  let c = -1;
  for (const b of buf) c = crcTable[(c ^ b) & 255] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type: string, data: Buffer) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

type Rgb = [number, number, number];

/** Builds a small seamless-tile PNG from a per-pixel colour function. */
export function makePng(size: number, pixel: (x: number, y: number) => Rgb): Buffer {
  const raw = Buffer.alloc((size * 3 + 1) * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const [r, g, b] = pixel(x, y);
      const i = y * (size * 3 + 1) + 1 + x * 3;
      raw[i] = r;
      raw[i + 1] = g;
      raw[i + 2] = b;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const S = 128;

export const PATTERN_SEEDS: { name: string; style: string; description: string; build: () => Buffer }[] = [
  {
    name: 'Classic Stripes',
    style: 'Stripes',
    description: 'Vertical cream and sky blue stripes',
    build: () => makePng(S, (x) => (Math.floor(x / 16) % 2 ? [143, 188, 222] : [245, 240, 225])),
  },
  {
    name: 'Check Board',
    style: 'Geometric',
    description: 'Soft grey and white checks',
    build: () => makePng(S, (x, y) => ((Math.floor(x / 32) + Math.floor(y / 32)) % 2 ? [170, 174, 182] : [240, 241, 244])),
  },
  {
    name: 'Polka Dots',
    style: 'Playful',
    description: 'Coral dots on warm ivory',
    build: () =>
      makePng(S, (x, y) => {
        const dx = (x % 64) - 32;
        const dy = (y % 64) - 32;
        return dx * dx + dy * dy < 14 * 14 ? [232, 117, 102] : [250, 243, 228];
      }),
  },
  {
    name: 'Diamond Trellis',
    style: 'Geometric',
    description: 'Olive diamond lattice',
    build: () =>
      makePng(S, (x, y) => {
        const d = Math.abs((x % 64) - 32) + Math.abs((y % 64) - 32);
        return d % 32 < 4 || d === 0 ? [112, 128, 70] : [236, 233, 214];
      }),
  },
  {
    name: 'Chevron',
    style: 'Modern',
    description: 'Navy chevron zig-zag',
    build: () =>
      makePng(S, (x, y) => {
        const wave = Math.abs(((x % 64) - 32)) + y;
        return wave % 32 < 12 ? [40, 56, 94] : [238, 240, 246];
      }),
  },
  {
    name: 'Brick',
    style: 'Textured',
    description: 'Terracotta brick wall',
    build: () =>
      makePng(S, (x, y) => {
        const row = Math.floor(y / 32);
        const xo = (x + (row % 2 ? 32 : 0)) % 64;
        const mortar = y % 32 < 3 || xo < 3;
        return mortar ? [214, 206, 192] : [178 + ((row * 13 + xo) % 9), 92, 70];
      }),
  },
];
