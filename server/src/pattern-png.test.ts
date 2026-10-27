import test from 'node:test';
import assert from 'node:assert/strict';
import { PATTERN_SEEDS } from './pattern-png.js';

const S = 128;
const lum = (c: number[]) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
const generated = PATTERN_SEEDS.filter((p) => p.pixel);

test('catalogue has the 6 original patterns plus at least 24 new, with unique names', () => {
  assert.ok(PATTERN_SEEDS.length >= 30);
  assert.equal(new Set(PATTERN_SEEDS.map((p) => p.name)).size, PATTERN_SEEDS.length);
  for (const original of ['Classic Stripes', 'Check Board', 'Polka Dots', 'Diamond Trellis', 'Chevron', 'Brick']) {
    assert.ok(PATTERN_SEEDS.some((p) => p.name === original), original);
  }
  assert.ok(generated.length >= 24);
});

test('every new tile has metadata and valid PNG output', () => {
  for (const p of generated) {
    assert.ok(p.description.length > 3, p.name);
    assert.ok(p.scale && p.scale >= 0.3 && p.scale <= 3, p.name);
    assert.deepEqual([...p.build().subarray(0, 4)], [137, 80, 78, 71], p.name);
  }
});

test('new tiles are seamless: they repeat exactly every 128px in both directions', () => {
  for (const p of generated) {
    for (let y = 0; y < S; y += 3) {
      for (let x = 0; x < S; x += 3) {
        const base = p.pixel!(x, y).join();
        for (const [dx, dy] of [[S, 0], [0, S], [-S, -S], [S, S]]) {
          assert.equal(p.pixel!(x + dx, y + dy).join(), base, `${p.name} at ${x},${y} offset ${dx},${dy}`);
        }
      }
    }
  }
});

test('new tiles are gentle enough for light and shadow to show through', () => {
  for (const p of generated) {
    const values: number[] = [];
    for (let y = 0; y < S; y += 2) for (let x = 0; x < S; x += 2) values.push(lum(p.pixel!(x, y)));
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const sd = Math.sqrt(values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length);
    assert.ok(sd < 28, `${p.name}: luminance spread ${sd.toFixed(1)}`);
    assert.ok(mean > 40 && mean < 245, `${p.name}: mean ${mean.toFixed(0)}`);
  }
});
