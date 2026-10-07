import { describe, expect, it } from 'vitest';
import { hexToRgb, mix, PALETTE_ORDER, PALETTES, PIGMENTS, rgbToHex, shade } from '../src/art/palettes';
import { cubicAt, dist, ellipse, polylineLength, rect, smooth } from '../src/art/path';
import { nibFactor, pressureAt, strokeOutline } from '../src/art/pen';

describe('palettes', () => {
  const isHex = (v: string) => /^#[0-9A-F]{6}$/i.test(v);

  it('has one palette per location, in order', () => {
    expect(PALETTE_ORDER).toEqual(['ebbNight', 'lychford', 'blanchwood', 'margin', 'ebbDawn']);
    for (const id of PALETTE_ORDER) expect(PALETTES[id]?.id).toBe(id);
  });

  it('gives every role a valid colour in every palette', () => {
    for (const id of PALETTE_ORDER) {
      const roles = PALETTES[id]!.roles;
      for (const [role, value] of Object.entries(roles)) {
        if (Array.isArray(value)) {
          expect(value.length, `${id}.${role}`).toBeGreaterThan(0);
          for (const c of value) expect(isHex(c), `${id}.${role}`).toBe(true);
        } else {
          expect(isHex(value), `${id}.${role}`).toBe(true);
        }
      }
    }
  });

  it('keeps grades sane', () => {
    for (const id of PALETTE_ORDER) {
      const g = PALETTES[id]!.grade;
      expect(g.blanch).toBeGreaterThanOrEqual(0);
      expect(g.blanch).toBeLessThanOrEqual(1);
      expect(g.gamma).toBeGreaterThan(0.5);
      expect(g.saturation).toBeGreaterThanOrEqual(0);
    }
  });

  it('round-trips hex colours and mixes them', () => {
    for (const hex of Object.values(PIGMENTS)) expect(rgbToHex(hexToRgb(hex))).toBe(hex.toUpperCase());
    expect(mix('#000000', '#FFFFFF', 0.5)).toBe('#808080');
    expect(shade(PIGMENTS.lapis, 0)).toBe(PIGMENTS.lapis);
    expect(() => hexToRgb('blue')).toThrow();
  });
});

describe('paths', () => {
  it('samples a closed rectangle into a closed polyline of the right length', () => {
    const [pts] = rect(0, 0, 10, 20).polylines(1);
    expect(pts).toBeDefined();
    expect(dist(pts![0]!, pts![pts!.length - 1]!)).toBeLessThan(1e-9);
    expect(polylineLength(pts!)).toBeCloseTo(60, 6);
  });

  it('passes a smooth curve through its control points', () => {
    const points = [
      [0, 0],
      [10, 5],
      [20, -3],
      [30, 0],
    ] as const;
    const [pts] = smooth(points, false).polylines(0.5);
    for (const p of points) expect(Math.min(...pts!.map((q) => dist(p, q)))).toBeLessThan(1e-6);
  });

  it('approximates a circle closely', () => {
    const [pts] = ellipse(0, 0, 10, 10).polylines(0.5);
    for (const p of pts!) expect(Math.hypot(p[0], p[1])).toBeCloseTo(10, 1);
  });

  it('evaluates cubic endpoints exactly', () => {
    expect(cubicAt([0, 0], [1, 2], [3, 4], [5, 6], 0)).toEqual([0, 0]);
    expect(cubicAt([0, 0], [1, 2], [3, 4], [5, 6], 1)).toEqual([5, 6]);
  });
});

describe('the pen', () => {
  it('is thickest across the nib and thinnest along it', () => {
    const angle = -0.6;
    expect(nibFactor(angle, angle, 0.3)).toBeCloseTo(0.3);
    expect(nibFactor(angle + Math.PI / 2, angle, 0.3)).toBeCloseTo(1);
    expect(nibFactor(1.234, angle, 1)).toBeCloseTo(1);
  });

  it('tapers both ends down to the floor', () => {
    expect(pressureAt(0, 100, 5, 5, 0.3)).toBeCloseTo(0.3);
    expect(pressureAt(100, 100, 5, 5, 0.3)).toBeCloseTo(0.3);
    expect(pressureAt(50, 100, 5, 5, 0.3)).toBeCloseTo(1);
  });

  it('builds an outline with a left and a right edge', () => {
    const pts = Array.from({ length: 21 }, (_, i) => [i, 0] as const);
    const outline = strokeOutline(pts, { width: 2, nibRatio: 1, wobble: 0, taperIn: 0, taperOut: 0 });
    expect(outline).toHaveLength(42);
    // A round pen moving along x is about `width` tall everywhere (the tremor varies it a little).
    const mid = outline[10]!;
    const opposite = outline[outline.length - 11]!;
    expect(mid[0]).toBeCloseTo(opposite[0]);
    expect(Math.abs(mid[1] - opposite[1])).toBeGreaterThan(1.4);
    expect(Math.abs(mid[1] - opposite[1])).toBeLessThan(2.6);
  });

  it('ignores degenerate strokes', () => {
    expect(strokeOutline([[1, 1]], { width: 1 })).toEqual([]);
    expect(strokeOutline([[1, 1], [1, 1]], { width: 1 })).toEqual([]);
  });
});
