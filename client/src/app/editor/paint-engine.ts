import { Finish } from '../core/models';

export interface Pt {
  x: number;
  y: number;
}

export interface Wall {
  id: string;
  type: 'polygon' | 'brush';
  points: Pt[];
  brushSize?: number;
  colorId?: string;
  hex: string;
  opacity: number;
  finish: Finish;
}

/** How strongly each finish keeps the wall's own light and shadow. */
const CONTRAST: Record<Finish, number> = { matte: 0.85, satin: 1, glossy: 1.2 };

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function tracePath(ctx: CanvasRenderingContext2D, wall: Wall) {
  ctx.beginPath();
  wall.points.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  if (wall.type === 'polygon') ctx.closePath();
}

/**
 * Paints walls while preserving the photo's luminance: every pixel of the wall
 * keeps its relative brightness, so shadows, light falloff and texture stay
 * visible under the new colour instead of looking like a flat fill.
 */
export class PaintEngine {
  width = 0;
  height = 0;
  readonly original = document.createElement('canvas');
  private baseData!: ImageData;
  private lum!: Float32Array;
  private mask = document.createElement('canvas');
  private maskCtx!: CanvasRenderingContext2D;

  load(img: HTMLImageElement, maxWidth = 1600) {
    const scale = Math.min(1, maxWidth / img.naturalWidth);
    this.width = Math.round(img.naturalWidth * scale);
    this.height = Math.round(img.naturalHeight * scale);
    this.original.width = this.mask.width = this.width;
    this.original.height = this.mask.height = this.height;

    const ctx = this.original.getContext('2d', { willReadFrequently: true })!;
    ctx.drawImage(img, 0, 0, this.width, this.height);
    this.baseData = ctx.getImageData(0, 0, this.width, this.height);

    const d = this.baseData.data;
    this.lum = new Float32Array(this.width * this.height);
    for (let i = 0; i < this.lum.length; i++) {
      this.lum[i] = (0.2126 * d[i * 4] + 0.7152 * d[i * 4 + 1] + 0.0722 * d[i * 4 + 2]) / 255;
    }
    this.maskCtx = this.mask.getContext('2d', { willReadFrequently: true })!;
  }

  /** Renders the painted image. `compareX` shows the original to the left of that x. */
  render(target: HTMLCanvasElement, walls: Wall[], compareX: number | null) {
    if (target.width !== this.width) target.width = this.width;
    if (target.height !== this.height) target.height = this.height;
    const out = new ImageData(new Uint8ClampedArray(this.baseData.data), this.width, this.height);
    for (const wall of walls) this.paintWall(out, wall);

    const ctx = target.getContext('2d')!;
    ctx.putImageData(out, 0, 0);
    if (compareX !== null && compareX > 0) {
      const cx = Math.min(compareX, this.width);
      ctx.drawImage(this.original, 0, 0, cx, this.height, 0, 0, cx, this.height);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(cx - 1.5, 0, 3, this.height);
    }
  }

  private paintWall(out: ImageData, wall: Wall) {
    if (wall.points.length < 2) return;
    const W = this.width;
    const pad = (wall.type === 'brush' ? (wall.brushSize ?? 24) / 2 : 0) + 2;
    const xs = wall.points.map((p) => p.x);
    const ys = wall.points.map((p) => p.y);
    const x0 = Math.max(0, Math.floor(Math.min(...xs) - pad));
    const y0 = Math.max(0, Math.floor(Math.min(...ys) - pad));
    const x1 = Math.min(this.width, Math.ceil(Math.max(...xs) + pad));
    const y1 = Math.min(this.height, Math.ceil(Math.max(...ys) + pad));
    const bw = x1 - x0;
    const bh = y1 - y0;
    if (bw <= 0 || bh <= 0) return;

    const ctx = this.maskCtx;
    ctx.clearRect(0, 0, this.width, this.height);
    ctx.fillStyle = ctx.strokeStyle = '#fff';
    tracePath(ctx, wall);
    if (wall.type === 'polygon') {
      ctx.fill();
    } else {
      ctx.lineWidth = wall.brushSize ?? 24;
      ctx.lineCap = ctx.lineJoin = 'round';
      ctx.stroke();
    }
    const m = ctx.getImageData(x0, y0, bw, bh).data;

    let sum = 0;
    let weight = 0;
    for (let j = 0; j < bh; j++) {
      for (let i = 0; i < bw; i++) {
        const a = m[(j * bw + i) * 4 + 3];
        if (a) {
          sum += this.lum[(y0 + j) * W + x0 + i] * a;
          weight += a;
        }
      }
    }
    if (!weight) return;
    const avg = Math.max(sum / weight, 0.05);

    const [r, g, b] = hexToRgb(wall.hex);
    const contrast = CONTRAST[wall.finish];
    const od = out.data;
    for (let j = 0; j < bh; j++) {
      for (let i = 0; i < bw; i++) {
        const a = (m[(j * bw + i) * 4 + 3] / 255) * wall.opacity;
        if (a <= 0) continue;
        const l = this.lum[(y0 + j) * W + x0 + i];
        let ratio = 1 + (l / avg - 1) * contrast;
        ratio = Math.min(1.9, Math.max(0.3, ratio));
        const spec = wall.finish === 'glossy' && l > 0.82 ? ((l - 0.82) / 0.18) * 55 : 0;
        const idx = ((y0 + j) * W + x0 + i) * 4;
        od[idx] = od[idx] * (1 - a) + Math.min(255, r * ratio + spec) * a;
        od[idx + 1] = od[idx + 1] * (1 - a) + Math.min(255, g * ratio + spec) * a;
        od[idx + 2] = od[idx + 2] * (1 - a) + Math.min(255, b * ratio + spec) * a;
      }
    }
  }
}
