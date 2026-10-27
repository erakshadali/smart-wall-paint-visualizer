import { Color, Pattern } from '../core/models';

/** Category chips shown above the pattern grid (built from each pattern's `style`). */
export const PATTERN_CATEGORIES = ['Stripes', 'Geometric', 'Textures', 'Panels', 'Wallpaper'] as const;

/** Older seed styles map onto the new chips so nothing disappears from the catalogue. */
const ALIASES: Record<string, string> = {
  stripes: 'Stripes',
  geometric: 'Geometric',
  playful: 'Geometric',
  modern: 'Geometric',
  textures: 'Textures',
  textured: 'Textures',
  panels: 'Panels',
  wallpaper: 'Wallpaper',
};

export function categoryOf(style?: string): string {
  return ALIASES[(style ?? '').trim().toLowerCase()] ?? 'Other';
}

/** Chips to show: the five categories, plus "Other" only when some pattern needs it. */
export function categoriesFor(patterns: Pattern[]): string[] {
  const cats: string[] = [...PATTERN_CATEGORIES];
  if (patterns.some((p) => categoryOf(p.style) === 'Other')) cats.push('Other');
  return cats;
}

export function filterPatterns(patterns: Pattern[], category: string, query: string): Pattern[] {
  const q = query.trim().toLowerCase();
  return patterns.filter(
    (p) =>
      (category === 'All' || categoryOf(p.style) === category) &&
      (!q || `${p.name} ${p.description ?? ''} ${p.style ?? ''}`.toLowerCase().includes(q))
  );
}

export function surprise(patterns: Pattern[], colors: Color[], rand: () => number = Math.random): { pattern: Pattern; color: Color } | null {
  if (!patterns.length || !colors.length) return null;
  const pick = <T>(list: T[]) => list[Math.min(list.length - 1, Math.floor(rand() * list.length))];
  return { pattern: pick(patterns), color: pick(colors) };
}

/** Preset helpers: bold accent colours and calm neutrals taken from the existing colour catalogue. */
const NEUTRAL_NAMES = ['Warm Ivory', 'Cream Silk', 'Beige Linen', 'Light Grey', 'Dove Grey', 'Pure White', 'Sand Dune'];

export function accentColors(colors: Color[]): Color[] {
  return colors.filter((c) => c.tags?.includes('Accent'));
}

export function neutralColors(colors: Color[]): Color[] {
  const named = NEUTRAL_NAMES.map((n) => colors.find((c) => c.name === n)).filter((c): c is Color => !!c);
  return named.length ? named : colors.slice(0, 6);
}
