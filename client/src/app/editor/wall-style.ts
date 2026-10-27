export type Rgb = [number, number, number];
export type StyleKind = 'split' | 'gradient' | 'border';

/**
 * Optional vertical effect on a wall, measured over the wall's own height (0 = top edge, 1 = bottom edge).
 * - split: below `at` the wall uses the second colour (dado / wainscot look)
 * - border: a band from `at` to `at + size` uses the second colour
 * - gradient: blends from the wall colour (top) to the second colour (bottom); `at` is where the halfway blend sits
 */
export interface WallStyle {
  kind: StyleKind;
  at: number;
  size: number;
  colorId?: string;
  hex: string;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export function mixRgb(a: Rgb, b: Rgb, t: number): Rgb {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

/** Gradient blend factor at height `t`, with the 50% blend placed at `mid`. */
export function gradientT(t: number, mid: number): number {
  const m = Math.min(0.95, Math.max(0.05, mid));
  const x = clamp01(t);
  return x <= m ? (0.5 * x) / m : 0.5 + (0.5 * (x - m)) / (1 - m);
}

/**
 * How much of the second colour to use at height `t` (0..1) on a wall `heightPx` tall.
 * Hard edges get a one-pixel soft edge so they do not look jagged.
 */
export function styleWeight(s: Pick<WallStyle, 'kind' | 'at' | 'size'>, t: number, heightPx: number): number {
  const h = Math.max(1, heightPx);
  switch (s.kind) {
    case 'split':
      return clamp01((t - s.at) * h + 0.5);
    case 'border':
      return clamp01(Math.min(t - s.at, s.at + s.size - t) * h + 0.5);
    case 'gradient':
      return gradientT(t, s.at);
  }
}

export function styledColor(s: WallStyle, base: Rgb, second: Rgb, t: number, heightPx: number): Rgb {
  return mixRgb(base, second, styleWeight(s, t, heightPx));
}

// ----- slider helpers: the UI speaks in "height above the floor", walls store distance from the top -----

export const DEFAULT_BORDER_SIZE = 0.06;

export function styleFromHeight(kind: StyleKind, heightFromFloor: number, size = DEFAULT_BORDER_SIZE): Pick<WallStyle, 'at' | 'size'> {
  const h = clamp01(heightFromFloor);
  if (kind === 'border') {
    const s = Math.min(0.5, Math.max(0.01, size));
    return { at: Math.min(1 - s, Math.max(0, 1 - h - s / 2)), size: s };
  }
  return { at: 1 - h, size: 0 };
}

export function heightFromStyle(s: Pick<WallStyle, 'kind' | 'at' | 'size'>): number {
  return s.kind === 'border' ? clamp01(1 - s.at - s.size / 2) : clamp01(1 - s.at);
}
