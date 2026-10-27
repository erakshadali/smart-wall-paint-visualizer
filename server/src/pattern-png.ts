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

export interface PatternSeed {
  name: string;
  style: string;
  description: string;
  /** Default pattern size multiplier used by the editor. */
  scale?: number;
  /** Per-pixel colour function (x, y in 0..S-1); exposed so tiles can be tested. */
  pixel?: (x: number, y: number) => Rgb;
  build: () => Buffer;
}

// ---------- helpers for the procedural tiles ----------
// Every tile is a pure function of (x mod S, y mod S), so it repeats seamlessly. All periods divide S.
const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
const mod = (a: number, n: number) => ((a % n) + n) % n;
/** Signed distance to the nearest repeat of a point, in the range [-n/2, n/2). */
const wrap = (d: number, n: number) => mod(d + n / 2, n) - n / 2;
const mix = (a: Rgb, b: Rgb, t: number): Rgb => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const shade = (c: Rgb, k: number): Rgb => [c[0] * k, c[1] * k, c[2] * k];
const finish = (c: Rgb): Rgb => [Math.round(clamp(c[0], 0, 255)), Math.round(clamp(c[1], 0, 255)), Math.round(clamp(c[2], 0, 255))];
/** Anti-aliased coverage from a signed distance in pixels (negative = inside). */
const cover = (d: number) => clamp(0.5 - d);
/** Coverage of the interval [from, to) repeated every `period`, with a one-pixel soft edge. */
const bandCov = (pos: number, period: number, from: number, to: number) => {
  const p = mod(pos, period);
  return clamp(0.5 + Math.min(p - from, to - p));
};
const hash = (i: number, j: number, seed = 0) => {
  let h = (Math.imul(i | 0, 374761393) + Math.imul(j | 0, 668265263) + Math.imul(seed + 1, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};
/** Value noise that wraps every S pixels (cx by cy lattice cells), range 0..1. */
function noise(x: number, y: number, cx: number, cy: number, seed = 0) {
  const u = (mod(x, S) / S) * cx;
  const v = (mod(y, S) / S) * cy;
  const i = Math.floor(u);
  const j = Math.floor(v);
  const f = (t: number) => t * t * (3 - 2 * t);
  const fu = f(u - i);
  const fv = f(v - j);
  const a = hash(mod(i, cx), mod(j, cy), seed);
  const b = hash(mod(i + 1, cx), mod(j, cy), seed);
  const c = hash(mod(i, cx), mod(j + 1, cy), seed);
  const d = hash(mod(i + 1, cx), mod(j + 1, cy), seed);
  return a + (b - a) * fu + (c - a) * fv + (a - b - c + d) * fu * fv;
}
const fbm = (x: number, y: number, cx: number, cy: number, seed = 0) =>
  noise(x, y, cx, cy, seed) * 0.6 + noise(x, y, cx * 2, cy * 2, seed + 1) * 0.3 + noise(x, y, cx * 4, cy * 4, seed + 2) * 0.1;

/** Nearest and second-nearest point of a repeating lattice (period px by py). */
function lattice(x: number, y: number, pts: [number, number][], px: number, py: number) {
  let d1 = Infinity;
  let d2 = Infinity;
  for (const [cx, cy] of pts) {
    const bx = wrap(x - cx, px);
    const by = wrap(y - cy, py);
    for (let ox = -1; ox <= 1; ox++) {
      for (let oy = -1; oy <= 1; oy++) {
        const d = Math.hypot(bx + ox * px, by + oy * py);
        if (d < d1) {
          d2 = d1;
          d1 = d;
        } else if (d < d2) d2 = d;
      }
    }
  }
  return { d1, d2 };
}

function seed(name: string, style: string, description: string, scale: number, f: (x: number, y: number) => Rgb): PatternSeed {
  const pixel = (x: number, y: number) => finish(f(mod(x, S) + 0.5, mod(y, S) + 0.5));
  return { name, style, description, scale, pixel, build: () => makePng(S, pixel) };
}

// ----- Stripes -----
const pinstripe = (name: string, description: string, base: Rgb, line: Rgb) =>
  seed(name, 'Stripes', description, 1, (x) => mix(base, line, bandCov(x, 16, 7, 9)));

const wideStripe = (name: string, description: string, a: Rgb, b: Rgb) =>
  seed(name, 'Stripes', description, 1, (x) => mix(a, b, bandCov(x, 64, 0, 32)));

// ----- Wall panels -----
const brickLike = (
  name: string, style: string, description: string, scale: number,
  tileW: number, tileH: number, gap: number, unit: Rgb, joint: Rgb, variation: number
) =>
  seed(name, style, description, scale, (x, y) => {
    const row = Math.floor(y / tileH);
    const xo = x + (row % 2 ? tileW / 2 : 0);
    const col = mod(Math.floor(xo / tileW), S / tileW);
    const lx = mod(xo, tileW);
    const ly = mod(y, tileH);
    const edge = Math.min(lx, tileW - lx, ly, tileH - ly);
    const tone = 1 + (hash(row, col, 11) - 0.5) * variation;
    const body = shade(unit, tone * (0.97 + 0.03 * (ly / tileH)));
    return mix(joint, body, clamp(edge - gap / 2 + 0.5));
  });

const woodSlats = (name: string, description: string, wood: Rgb) =>
  seed(name, 'Panels', description, 1.2, (x, y) => {
    const i = Math.floor(x / 16);
    const lx = mod(x, 16);
    const grain = noise(x, y, 64, 3, 20 + (i % 4));
    const body = shade(wood, (0.92 + 0.16 * hash(i, 0, 7)) * (0.95 + 0.1 * grain));
    return mix(shade(wood, 0.62), body, clamp(Math.min(lx, 16 - lx) - 1.2 + 0.5));
  });

// ----- Wallpaper -----
const leafShape = (u: number, v: number, cx: number, cy: number, deg: number, L: number, w: number) => {
  const t = (deg * Math.PI) / 180;
  const dx = u - cx;
  const dy = v - cy;
  const a = dx * Math.cos(t) + dy * Math.sin(t);
  const b = -dx * Math.sin(t) + dy * Math.cos(t);
  return { d: (Math.hypot(a / L, b / w) - 1) * w, a, b, L };
};

const damask = (name: string, description: string, wall: Rgb, motif: Rgb, inner: Rgb) =>
  seed(name, 'Wallpaper', description, 1.2, (x, y) => {
    const yy = y + (Math.floor(x / 64) % 2 ? 32 : 0);
    const u = mod(x, 64) - 32;
    const v = mod(yy, 64) - 32;
    const lozenge = (Math.hypot(u / 9, v / 22) - 1) * 9;
    const d = Math.min(
      lozenge,
      Math.hypot(u, Math.abs(v) - 27) - 4,
      Math.hypot(Math.abs(u) - 13, v) - 5,
      Math.hypot(u, Math.abs(v) - 16) - 3
    );
    const core = (Math.hypot(u / 4, v / 12) - 1) * 4;
    return mix(mix(wall, motif, cover(d)), inner, cover(core) * 0.9);
  });

const fan = (name: string, description: string, wall: Rgb, ring: Rgb) =>
  seed(name, 'Wallpaper', description, 0.8, (x, y) => {
    const { d1 } = lattice(x, y, [[0, 0], [16, 8]], 32, 16);
    return mix(wall, ring, bandCov(d1, 5, 0, 1.5) * (d1 > 2 ? 1 : 0.6));
  });

const NEW_PATTERN_SEEDS: PatternSeed[] = [
  // Stripes
  pinstripe('Pinstripe', 'Fine slate pinstripes on soft ivory', [243, 240, 232], [150, 160, 176]),
  pinstripe('Pinstripe Charcoal', 'Fine light pinstripes on charcoal', [74, 78, 86], [128, 132, 140]),
  wideStripe('Bold Wide Stripe', 'Wide sage and cream stripes', [226, 232, 220], [168, 186, 160]),
  wideStripe('Bold Wide Stripe Dusk', 'Wide dusk blue stripes', [88, 100, 128], [122, 136, 164]),
  seed('Horizontal Stripe', 'Stripes', 'Warm sand horizontal bands', 1, (_x, y) => mix([238, 230, 214], [214, 196, 170], bandCov(y, 32, 0, 16))),
  seed('Diagonal Stripe', 'Stripes', 'Cool grey-blue diagonal stripes', 1, (x, y) => mix([232, 238, 242], [190, 208, 222], bandCov(x + y, 32, 0, 16))),
  seed('Gold Line Stripe', 'Stripes', 'Mint stripes edged with a thin gold line', 1, (x) => {
    const base = mix([233, 236, 230], [196, 214, 208], bandCov(x, 64, 0, 28));
    return mix(base, [201, 168, 98], bandCov(x, 64, 28, 30));
  }),

  // Geometric
  seed('Herringbone', 'Geometric', 'Warm taupe herringbone zig-zag', 1, (x, y) => {
    const v = mod(y + Math.abs(wrap(x, 32)), 32);
    const body = mix([214, 200, 178], [200, 184, 160], bandCov(v, 32, 0, 16));
    return mix([160, 144, 120], body, clamp(Math.abs(wrap(v, 16)) - 0.3));
  }),
  seed('Herringbone Charcoal', 'Geometric', 'Charcoal herringbone zig-zag', 1, (x, y) => {
    const v = mod(y + Math.abs(wrap(x, 32)), 32);
    const body = mix([96, 98, 104], [84, 86, 92], bandCov(v, 32, 0, 16));
    return mix([58, 60, 66], body, clamp(Math.abs(wrap(v, 16)) - 0.3));
  }),
  seed('Honeycomb Hexagon', 'Geometric', 'Soft honeycomb hexagons with thin outlines', 1, (x, y) => {
    const { d1, d2 } = lattice(x, y, [[0, 0], [16, 32]], 32, 64);
    return mix([236, 232, 222], [188, 176, 152], cover((d2 - d1) / 2 - 0.9));
  }),
  seed('Harlequin Diamond', 'Geometric', 'Dusty rose and cream harlequin diamonds', 1, (x, y) => {
    const odd = (Math.floor((x + y) / 32) + Math.floor((x - y + S) / 32)) % 2;
    return odd ? [236, 222, 218] : [220, 196, 194];
  }),
  seed('Mini Dots', 'Geometric', 'Small sage dots in a staggered grid', 1, (x, y) => {
    const { d1 } = lattice(x, y, [[8, 8], [24, 24]], 32, 32);
    return mix([244, 240, 230], [168, 184, 150], cover(d1 - 3.2));
  }),
  seed('Gingham Check', 'Geometric', 'Classic powder-blue gingham', 0.8, (x, y) => {
    const base = mix([242, 240, 236], [196, 206, 222], 0.5 * bandCov(x, 32, 0, 16));
    return mix(base, [196, 206, 222], 0.5 * bandCov(y, 32, 0, 16));
  }),
  seed('Moroccan Quatrefoil', 'Geometric', 'Teal quatrefoil tile outlines', 1, (x, y) => {
    const u = mod(x, 64) - 32;
    const v = mod(y, 64) - 32;
    const f = Math.min(Math.hypot(u - 10, v), Math.hypot(u + 10, v), Math.hypot(u, v - 10), Math.hypot(u, v + 10)) - 13;
    const star = Math.abs(wrap(x, 64)) + Math.abs(wrap(y, 64)) - 9;
    const base = mix([238, 232, 220], [226, 236, 236], cover(f));
    return mix(mix(base, [150, 176, 186], cover(Math.abs(f) - 1) * 0.9), [150, 176, 186], cover(star) * 0.6);
  }),

  // Textures
  seed('Microcement', 'Textures', 'Soft, cloudy microcement', 2, (x, y) =>
    shade([190, 188, 184], 0.91 + 0.18 * fbm(x, y, 4, 4, 1) + (hash(Math.floor(x), Math.floor(y), 3) - 0.5) * 0.03)
  ),
  seed('Microcement Dark', 'Textures', 'Dark cloudy microcement', 2, (x, y) =>
    shade([112, 114, 118], 0.9 + 0.2 * fbm(x, y, 4, 4, 1) + (hash(Math.floor(x), Math.floor(y), 3) - 0.5) * 0.04)
  ),
  seed('Linen Weave', 'Textures', 'Natural woven linen fabric', 1, (x, y) => {
    const cx = Math.floor(x / 2);
    const cy = Math.floor(y / 2);
    const warpOver = (cx + cy) % 2 === 0;
    const t = warpOver ? mod(x, 2) - 1 : mod(y, 2) - 1;
    const thread = hash(warpOver ? cx : cy, warpOver ? 0 : 1, 5);
    const slub = noise(x, y, 6, 48, 9);
    return shade([226, 216, 196], (1 - 0.06 * t * t) * (0.95 + 0.06 * thread) * (0.96 + 0.08 * slub));
  }),
  seed('Stucco Plaster', 'Textures', 'Hand-troweled warm stucco', 2, (x, y) => {
    const bump = noise(x, y, 32, 32, 6) - noise(x + 1.5, y + 1.5, 32, 32, 6);
    return shade([231, 224, 210], 0.92 + 0.16 * fbm(x, y, 6, 6, 4) + 0.2 * bump);
  }),
  seed('Brushed Sand', 'Textures', 'Horizontal brushed sand finish', 2, (x, y) => {
    const n = noise(x, y, 4, 48, 2) * 0.65 + noise(x, y, 8, 96, 3) * 0.35;
    return shade([221, 204, 172], 0.92 + 0.15 * n);
  }),
  seed('Marble Veins', 'Textures', 'Pale marble with subtle grey veins', 2, (x, y) => {
    const warp = (fbm(x, y, 3, 3, 8) - 0.5) * 7;
    const vein = 1 - clamp(Math.abs(Math.sin(((x + 2 * y) / S) * Math.PI * 2 + warp)) / 0.14);
    return shade(mix([236, 234, 230], [164, 166, 172], vein * 0.55), 0.95 + 0.07 * fbm(x, y, 2, 2, 12));
  }),
  seed('Marble Veins Charcoal', 'Textures', 'Charcoal marble with light veins', 2, (x, y) => {
    const warp = (fbm(x, y, 3, 3, 8) - 0.5) * 7;
    const vein = 1 - clamp(Math.abs(Math.sin(((x + 2 * y) / S) * Math.PI * 2 + warp)) / 0.14);
    return shade(mix([70, 72, 78], [140, 142, 150], vein * 0.5), 0.95 + 0.08 * fbm(x, y, 2, 2, 12));
  }),

  // Wall panels
  woodSlats('Vertical Wood Slats', 'Oak vertical wood slats', [196, 160, 116]),
  woodSlats('Walnut Wood Slats', 'Walnut vertical wood slats', [122, 88, 62]),
  seed('Horizontal Wood Planks', 'Panels', 'Staggered oak planks', 1.2, (x, y) => {
    const r = Math.floor(y / 32);
    const xs = x - Math.floor(hash(r, 0, 3) * 2) * 64;
    const board = Math.floor(mod(xs, S) / 64);
    const grain = noise(x, y, 3, 64, 30 + r);
    const wood = shade([186, 150, 108], (0.9 + 0.2 * hash(r, board, 5)) * (0.95 + 0.1 * grain));
    const edge = Math.min(mod(y, 32), 32 - mod(y, 32), mod(xs, 64), 64 - mod(xs, 64));
    return mix(shade(wood, 0.62), wood, clamp(edge - 1.2 + 0.5));
  }),
  brickLike('Stretcher Brick', 'Panels', 'Red-brown stretcher-bond brick', 1, 32, 16, 2, [184, 116, 96], [196, 188, 176], 0.16),
  brickLike('Whitewashed Brick', 'Panels', 'Whitewashed stretcher-bond brick', 1, 32, 16, 2, [226, 222, 214], [206, 202, 194], 0.06),
  brickLike('Subway Tile', 'Panels', 'Glossy white subway tile', 0.8, 32, 16, 1.5, [240, 240, 238], [190, 190, 186], 0.03),
  brickLike('Subway Tile Charcoal', 'Panels', 'Charcoal subway tile', 0.8, 32, 16, 1.5, [78, 82, 88], [48, 50, 54], 0.05),
  seed('Board and Batten', 'Panels', 'Painted board-and-batten wall panels', 1, (x, y) => {
    const d = Math.abs(wrap(x, 32));
    if (d < 2) return [238, 236, 230];
    const wall = shade([226, 224, 216], 0.98 + 0.03 * noise(x, y, 2, 24, 14));
    return mix(wall, [196, 194, 186], clamp(1 - (d - 2) / 3) * 0.8);
  }),

  // Wallpaper
  damask('Damask Motif', 'Tone-on-tone damask motif on warm cream', [232, 222, 206], [208, 194, 170], [220, 208, 188]),
  damask('Damask Midnight', 'Tone-on-tone damask motif on midnight blue', [52, 62, 86], [78, 90, 118], [66, 78, 104]),
  seed('Botanical Leaf', 'Wallpaper', 'Sage leaves on soft cream', 1.2, (x, y) => {
    const yy = y + (Math.floor(x / 64) % 2 ? 32 : 0);
    const u = mod(x, 64) - 32;
    const v = mod(yy, 64) - 32;
    let col: Rgb = [238, 236, 224];
    for (const [cx, cy, deg] of [[-9, -6, -40], [9, -6, 40], [0, 10, 90]]) {
      const l = leafShape(u, v, cx, cy, deg, 13, 5);
      col = mix(col, [168, 184, 150], cover(l.d));
      if (Math.abs(l.a) < l.L - 2) col = mix(col, [140, 160, 124], cover(Math.abs(l.b) - 0.5) * cover(l.d + 0.5) * 0.6);
    }
    return col;
  }),
  fan('Art Deco Fan', 'Gold scalloped fans on ivory', [236, 230, 214], [196, 176, 128]),
  fan('Art Deco Fan Midnight', 'Muted gold scalloped fans on deep teal', [58, 84, 92], [102, 126, 128]),
  seed('Floral Dots', 'Wallpaper', 'Tiny blush flowers with gold centres', 1, (x, y) => {
    let best = { dx: 99, dy: 99, d: 99 };
    for (const [cx, cy] of [[8, 8], [24, 24]]) {
      const dx = wrap(x - cx, 32);
      const dy = wrap(y - cy, 32);
      const d = Math.hypot(dx, dy);
      if (d < best.d) best = { dx, dy, d };
    }
    let col: Rgb = [244, 238, 230];
    for (let k = 0; k < 5; k++) {
      const t = (k / 5) * Math.PI * 2 - Math.PI / 2;
      col = mix(col, [228, 176, 172], cover(Math.hypot(best.dx - Math.cos(t) * 4.2, best.dy - Math.sin(t) * 4.2) - 2.6));
    }
    return mix(col, [214, 176, 98], cover(best.d - 2));
  }),
];

export const PATTERN_SEEDS: PatternSeed[] = [
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
    style: 'Geometric',
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
    style: 'Geometric',
    description: 'Navy chevron zig-zag',
    build: () =>
      makePng(S, (x, y) => {
        const wave = Math.abs(((x % 64) - 32)) + y;
        return wave % 32 < 12 ? [40, 56, 94] : [238, 240, 246];
      }),
  },
  {
    name: 'Brick',
    style: 'Panels',
    description: 'Terracotta brick wall',
    build: () =>
      makePng(S, (x, y) => {
        const row = Math.floor(y / 32);
        const xo = (x + (row % 2 ? 32 : 0)) % 64;
        const mortar = y % 32 < 3 || xo < 3;
        return mortar ? [214, 206, 192] : [178 + ((row * 13 + xo) % 9), 92, 70];
      }),
  },
  ...NEW_PATTERN_SEEDS,
];
