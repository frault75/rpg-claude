import { describe, expect, it } from 'vitest';
import { combineMove } from '../src/engine/input';
import { drawIcon, encodePng } from '../build/pwa';

describe('movement input', () => {
  it('prefers keys, then the gamepad stick, then the touch stick', () => {
    expect(combineMove({ x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 })).toEqual({ x: 1, y: 0 });
    expect(combineMove({ x: 0, y: 0 }, { x: 0, y: 0.5 }, { x: -1, y: 0 })).toEqual({ x: 0, y: 0.5 });
    expect(combineMove({ x: 0, y: 0 }, { x: 0, y: 0 }, { x: -0.3, y: 0 })).toEqual({ x: -0.3, y: 0 });
  });

  it('never moves faster on diagonals', () => {
    const m = combineMove({ x: 1, y: 1 }, { x: 0, y: 0 }, { x: 0, y: 0 });
    expect(Math.hypot(m.x, m.y)).toBeCloseTo(1);
  });
});

describe('app icon', () => {
  it('encodes a valid PNG of the procedural icon', () => {
    const png = encodePng(drawIcon());
    expect([...png.slice(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    const ihdr = new DataView(png.buffer, png.byteOffset + 16, 8);
    expect(ihdr.getUint32(0)).toBe(32);
    expect(ihdr.getUint32(4)).toBe(32);
  });
});
