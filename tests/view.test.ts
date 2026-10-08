import { describe, expect, it } from 'vitest';
import { textZoom } from '../src/engine/view';

describe('text zoom for small screens', () => {
  it('leaves desktop and tablet sizes alone', () => {
    expect(textZoom(720)).toBe(1);
    expect(textZoom(600)).toBe(1);
    expect(textZoom(560)).toBe(1);
  });

  it('grows on a phone held sideways, up to a limit', () => {
    expect(textZoom(390)).toBeCloseTo(1.436, 2);
    expect(textZoom(300)).toBe(1.45);
  });

  it('larger text in the settings adds a little, within its own limit', () => {
    expect(textZoom(720, true)).toBeCloseTo(1.15);
    expect(textZoom(300, true)).toBe(1.6);
  });
});
