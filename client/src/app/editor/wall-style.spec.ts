import { gradientT, heightFromStyle, mixRgb, styleFromHeight, styleWeight, styledColor, WallStyle } from './wall-style';

describe('wall-style maths', () => {
  const split = (at: number): WallStyle => ({ kind: 'split', at, size: 0, hex: '#000000' });

  it('split: top part keeps the wall colour, lower part takes the second colour', () => {
    const s = split(0.65); // 35% up from the floor
    expect(styleWeight(s, 0.1, 400)).toBe(0);
    expect(styleWeight(s, 0.9, 400)).toBe(1);
    expect(styleWeight(s, 0.65, 400)).toBeCloseTo(0.5, 5);
  });

  it('split: height above the floor round-trips through the stored value', () => {
    const { at } = styleFromHeight('split', 0.35);
    expect(at).toBeCloseTo(0.65, 5);
    expect(heightFromStyle({ kind: 'split', at, size: 0 })).toBeCloseTo(0.35, 5);
  });

  it('gradient: runs from first to second colour with the midpoint where requested', () => {
    expect(gradientT(0, 0.5)).toBe(0);
    expect(gradientT(1, 0.5)).toBe(1);
    expect(gradientT(0.5, 0.5)).toBeCloseTo(0.5, 5);
    expect(gradientT(0.3, 0.3)).toBeCloseTo(0.5, 5);
    expect(gradientT(0.2, 0.5)).toBeLessThan(gradientT(0.8, 0.5));
    const s: WallStyle = { kind: 'gradient', at: 0.5, size: 0, hex: '#ffffff' };
    expect(styledColor(s, [0, 0, 0], [200, 100, 50], 1, 300)).toEqual([200, 100, 50]);
    expect(styledColor(s, [0, 0, 0], [200, 100, 50], 0.5, 300)).toEqual([100, 50, 25]);
  });

  it('border: only the band around the chosen height uses the second colour', () => {
    const { at, size } = styleFromHeight('border', 0.5, 0.1);
    const s: WallStyle = { kind: 'border', at, size, hex: '#000000' };
    expect(styleWeight(s, 0.5, 500)).toBe(1);
    expect(styleWeight(s, 0.2, 500)).toBe(0);
    expect(styleWeight(s, 0.8, 500)).toBe(0);
    expect(heightFromStyle(s)).toBeCloseTo(0.5, 5);
  });

  it('border: the band is kept inside the wall even at the extremes', () => {
    for (const h of [0, 1]) {
      const { at, size } = styleFromHeight('border', h, 0.1);
      expect(at).toBeGreaterThanOrEqual(0);
      expect(at + size).toBeLessThanOrEqual(1.0000001);
    }
  });

  it('mixRgb blends channel by channel', () => {
    expect(mixRgb([0, 100, 200], [100, 200, 0], 0.5)).toEqual([50, 150, 100]);
  });
});
