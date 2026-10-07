import { describe, expect, it } from 'vitest';
import { AdaptiveScale, pickTier, quality } from '../src/engine/diorama/quality';
import { mapOf, PITCH, SY, SZ, world } from '../src/engine/diorama/space';
import { TerrainModel, WATER_LEVEL } from '../src/world3d/terrain';

describe('diorama space', () => {
  it('stretches depth and height so texels come out square on screen', () => {
    // A ground pixel's depth and a wall pixel's height both project to one screen pixel.
    expect(SZ * Math.sin(PITCH)).toBeCloseTo(1);
    expect(SY * Math.cos(PITCH)).toBeCloseTo(1);
    const [x, y, z] = world(10, 20, 4);
    expect(x).toBe(10);
    expect(y).toBeCloseTo(4 * SY);
    expect(mapOf(x, z)[1]).toBeCloseTo(20);
  });
});

describe('quality tiers', () => {
  const base = { coarsePointer: false, memoryGb: 8, cores: 8, shortSide: 1080, forced: null };

  it('picks high on capable desktops and low on small phones', () => {
    expect(pickTier(base)).toBe('high');
    expect(pickTier({ ...base, coarsePointer: true, memoryGb: 3, cores: 6, shortSide: 390 })).toBe('low');
    expect(pickTier({ ...base, coarsePointer: true, memoryGb: 8, cores: 8, shortSide: 820 })).toBe('medium');
    expect(pickTier({ ...base, cores: 2 })).toBe('medium');
  });

  it('honours a forced tier', () => {
    expect(pickTier({ ...base, forced: 'low' })).toBe('low');
    expect(quality('low').reflections).toBe(0);
    expect(quality('high').shadowMap).toBeGreaterThan(quality('low').shadowMap);
  });

  it('lowers the render scale when frames are slow and recovers slowly', () => {
    const a = new AdaptiveScale(0.5, 1);
    let changed = false;
    for (let i = 0; i < 120; i++) changed = a.frame(40) || changed;
    expect(changed).toBe(true);
    expect(a.scale).toBeLessThan(1);
    const low = a.scale;
    for (let i = 0; i < 600; i++) a.frame(8);
    expect(a.scale).toBeGreaterThan(low);
  });
});

describe('terrain model', () => {
  const m = new TerrainModel({
    ground: ['....', '.==.', '.==.', 'ssss', '~~~~'],
    heights: ['6666', '6006', '6006', '0000', '0000'],
    seed: 1,
  });

  it('gives tiles their heights in steps of eight pixels', () => {
    expect(m.tileHeight(0, 0)).toBe(48);
    expect(m.tileHeight(0, 3)).toBe(0);
    expect(m.tileHeight(0, 4)).toBeLessThan(WATER_LEVEL);
  });

  it('slopes stairs smoothly between the ground above and below', () => {
    expect(m.heightAt(24, 16)).toBeCloseTo(48);
    expect(m.heightAt(24, 32)).toBeCloseTo(24);
    expect(m.heightAt(24, 47.9)).toBeCloseTo(0, 0);
    expect(m.isStairs(1, 1)).toBe(true);
    expect(m.isStairs(0, 1)).toBe(false);
  });
});
