import { describe, expect, it } from 'vitest';
import { abbeyChurch, seaGate } from '../src/pixel/buildings';
import { CHARACTERS, DIRS, drawCharacter, FRAME_H, FRAME_W, FRAMES } from '../src/pixel/characters';
import { oakTree, rock } from '../src/pixel/nature';
import { bayer, hex, PixelImage, ramp } from '../src/pixel/pixel';
import { flameSheet } from '../src/pixel/props';
import { KINDS, paintGround, parseLayout, TILE } from '../src/pixel/terrain';

const lum = (c: readonly number[]) => 0.299 * c[0]! + 0.587 * c[1]! + 0.114 * c[2]!;

function hue(c: readonly number[]): number {
  const [r, g, b] = [c[0]! / 255, c[1]! / 255, c[2]! / 255];
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  if (d === 0) return 0;
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (h * 60 + 360) % 360;
}

describe('pixel toolkit', () => {
  it('builds ramps that run from dark to light around the base colour', () => {
    const r = ramp('#5C9A3C', 6);
    expect(r).toHaveLength(6);
    for (let i = 1; i < r.length; i++) expect(lum(r[i]!)).toBeGreaterThan(lum(r[i - 1]!));
    // Shadows shift towards blue (hue 240), lights towards yellow (hue 60).
    const base = hue(hex('#5C9A3C'));
    expect(hue(r[0]!)).toBeGreaterThan(base);
    expect(hue(r[5]!)).toBeLessThan(base);
  });

  it('dithers with a 4x4 Bayer matrix covering every threshold once', () => {
    const seen = new Set<number>();
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) seen.add(bayer(x, y));
    expect(seen.size).toBe(16);
    expect(bayer(5, 6)).toBe(bayer(1, 2));
  });

  it('draws shapes, blends translucent pixels and outlines silhouettes', () => {
    const img = new PixelImage(10, 10);
    img.rect(3, 3, 4, 4, hex('#FF0000'));
    expect(img.alpha(3, 3)).toBe(255);
    expect(img.alpha(2, 3)).toBe(0);
    img.set(4, 4, [0, 0, 255, 128]);
    const c = img.get(4, 4);
    expect(c[0]).toBeGreaterThan(80);
    expect(c[2]).toBeGreaterThan(80);
    img.outline(null);
    expect(img.alpha(2, 3)).toBe(255);
    expect(img.alpha(2, 2)).toBe(0);
    expect(lum(img.get(2, 3))).toBeLessThan(lum(img.get(3, 3)));
  });
});

describe('characters', () => {
  it('draws every cast member in every direction and pose within the frame', () => {
    for (const spec of Object.values(CHARACTERS)) {
      for (const dir of DIRS) {
        for (const pose of FRAMES) {
          const img = drawCharacter(spec, dir, pose);
          expect(img.w).toBe(FRAME_W);
          expect(img.h).toBe(FRAME_H);
          let filled = 0;
          for (let i = 3; i < img.data.length; i += 4) if (img.data[i]! > 0) filled++;
          expect(filled).toBeGreaterThan(150);
        }
      }
    }
  });

  it('mirrors left and right', () => {
    const s = CHARACTERS.isot!;
    const l = drawCharacter(s, 'left', FRAMES[0]!);
    const r = drawCharacter(s, 'right', FRAMES[0]!);
    expect(r.get(FRAME_W - 1 - 8, 12)).toEqual(l.get(8, 12));
  });
});

describe('terrain', () => {
  const layout = ['~~~~~~', '~ss..~', '~sc..~', '~~~~~~'];

  it('parses layouts into terrain kinds, padding short rows with void', () => {
    const g = parseLayout(['~.', 'c']);
    expect(g[0]).toEqual(['water', 'grass']);
    expect(g[1]).toEqual(['cobble', 'void']);
  });

  it('paints the ground deterministically, leaving water transparent', () => {
    const a = paintGround(layout, 3);
    const b = paintGround(layout, 3);
    expect(a.w).toBe(6 * TILE);
    expect(a.h).toBe(4 * TILE);
    expect(a.image.data).toEqual(b.image.data);
    expect(a.image.alpha(2, 2)).toBe(0);
    expect(a.image.alpha(3 * TILE + 8, 1 * TILE + 8)).toBe(255);
  });

  it('measures how far water lies from the shore', () => {
    const g = paintGround(layout, 3);
    const water = KINDS.indexOf('water');
    // Land is distance 0; water far from land is further than water at the shore.
    const mid = (2 * TILE + 8) * g.w + 3 * TILE;
    expect(g.shore[mid]).toBe(0);
    const corner = 0;
    expect(g.kinds[corner]).toBe(water);
    expect(g.shore[corner]!).toBeGreaterThan(g.shore[(1 * TILE - 1) * g.w + 3 * TILE]!);
  });
});

describe('scenery', () => {
  it('generates the abbey church with lit glass and lights to cast', () => {
    const c = abbeyChurch(11, true);
    expect(c.a.w).toBe(c.e.w);
    let glow = 0;
    for (let i = 0; i < c.e.data.length; i += 4) if (c.e.data[i]! > 100) glow++;
    expect(glow).toBeGreaterThan(200);
    expect(c.lights.length).toBeGreaterThan(3);
    const dark = abbeyChurch(11, false);
    expect(dark.lights.length).toBe(0);
  });

  it('generates gates, trees, rocks and flames of the expected size', () => {
    expect(seaGate().anchor[1]).toBe(seaGate().a.h - 1);
    expect(oakTree(1).w).toBeGreaterThan(40);
    expect(rock(1, 2).w).toBe(52);
    const f = flameSheet(4, 9, 14);
    expect(f.a.w).toBe(36);
  });
});
