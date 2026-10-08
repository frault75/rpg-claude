import { describe, expect, it } from 'vitest';
import { textZoom } from '../src/engine/view';
import { wrap } from '../src/ui/ui';

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

describe('wrapping text', () => {
  // Ten units a character.
  const ctx = { measureText: (t: string) => ({ width: t.length * 10 }) as TextMetrics };

  it('breaks between words to fit', () => {
    expect(wrap(ctx, 'the tide is coming in', 120)).toEqual(['the tide is', 'coming in']);
  });

  it('never leaves French punctuation alone at the start of a line', () => {
    // "debout !" would break before the "!" at this width.
    expect(wrap(ctx, 'et te voilà debout !', 190)).toEqual(['et te voilà', 'debout !']);
    expect(wrap(ctx, '« Me voici, saint Georges »', 130)).toEqual(['« Me voici,', 'saint', 'Georges »']);
  });
});
