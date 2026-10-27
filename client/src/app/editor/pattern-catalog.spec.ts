import { Color, Pattern } from '../core/models';
import { accentColors, categoriesFor, categoryOf, filterPatterns, neutralColors, surprise } from './pattern-catalog';

const pat = (name: string, style?: string, description = ''): Pattern => ({ _id: name, name, style, description, imageUrl: '/x.png' });
const col = (name: string, tags: string[] = []): Color => ({ _id: name, name, hex: '#112233', tags });

describe('pattern catalogue', () => {
  const all = [pat('Classic Stripes', 'Stripes'), pat('Polka Dots', 'Playful'), pat('Brick', 'Textured'), pat('Chevron', 'Modern'), pat('Floral Dots', 'Wallpaper', 'blush flowers'), pat('Odd', 'Whatever')];

  it('maps older styles onto the new chips', () => {
    expect(categoryOf('Textured')).toBe('Textures');
    expect(categoryOf('Playful')).toBe('Geometric');
    expect(categoryOf('Modern')).toBe('Geometric');
    expect(categoryOf(undefined)).toBe('Other');
  });

  it('only shows the Other chip when a pattern needs it', () => {
    expect(categoriesFor(all)).toContain('Other');
    expect(categoriesFor(all.slice(0, 5))).not.toContain('Other');
  });

  it('filters by category and by search text', () => {
    expect(filterPatterns(all, 'All', '').length).toBe(6);
    expect(filterPatterns(all, 'Geometric', '').map((p) => p.name)).toEqual(['Polka Dots', 'Chevron']);
    expect(filterPatterns(all, 'All', 'FLOWER').map((p) => p.name)).toEqual(['Floral Dots']);
    expect(filterPatterns(all, 'Stripes', 'brick')).toEqual([]);
  });

  it('surprise picks one pattern and one colour, and copes with empty lists', () => {
    const r = surprise(all, [col('A'), col('B')], () => 0.99);
    expect(r?.pattern.name).toBe('Odd');
    expect(r?.color.name).toBe('B');
    expect(surprise([], [col('A')])).toBeNull();
  });

  it('picks accent and neutral colours from the catalogue', () => {
    const colors = [col('Midnight Navy', ['Accent']), col('Warm Ivory'), col('Mint Fresh')];
    expect(accentColors(colors).map((c) => c.name)).toEqual(['Midnight Navy']);
    expect(neutralColors(colors).map((c) => c.name)).toEqual(['Warm Ivory']);
  });
});
