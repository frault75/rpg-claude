import { describe, expect, it } from 'vitest';
import { BOOK_MOTIF, chantPhrase } from '../src/audio/chant';
import { degreeToMidi, midiToHz, MODES } from '../src/audio/instruments';
import { actionFor } from '../src/engine/input';
import { fitView, VIEW_H, VIEW_W, windowToView } from '../src/engine/view';
import { Rng } from '../src/engine/rng';

describe('input mapping', () => {
  it('reads movement by physical key, so ZQSD works on AZERTY', () => {
    // On AZERTY the key in the W position prints "z" but reports code KeyW.
    expect(actionFor('KeyW', 'z', false)).toBe('up');
    expect(actionFor('KeyA', 'q', false)).toBe('left');
    expect(actionFor('KeyS', 's', false)).toBe('down');
    expect(actionFor('KeyD', 'd', false)).toBe('right');
    expect(actionFor('ArrowLeft', 'ArrowLeft', false)).toBe('left');
  });

  it('reads letter shortcuts by the printed letter', () => {
    expect(actionFor('KeyE', 'e', false)).toBe('confirm');
    expect(actionFor('KeyR', 'r', false)).toBe('rake');
    expect(actionFor('KeyM', 'm', false)).toBe('mute');
  });

  it('opens the debug overlay and menu from the key left of 1', () => {
    expect(actionFor('Backquote', '²', false)).toBe('debug');
    expect(actionFor('Backquote', '`', true)).toBe('debugMenu');
  });

  it('reads digits by position (AZERTY digits need no shift)', () => {
    expect(actionFor('Digit1', '&', false)).toBe('n1');
    expect(actionFor('Digit5', '(', false)).toBe('n5');
    expect(actionFor('Numpad3', '3', false)).toBe('n3');
  });

  it('ignores unmapped keys', () => {
    expect(actionFor('KeyX', 'x', false)).toBeNull();
  });
});

describe('view geometry', () => {
  it('letterboxes the 16:9 view inside any window', () => {
    const wide = fitView(2000, 720);
    expect(wide).toEqual({ x: 360, y: 0, w: 1280, h: 720 });
    const tall = fitView(1280, 1400);
    expect(tall.w).toBe(1280);
    expect(tall.h).toBe(720);
    expect(tall.y).toBe(340);
  });

  it('maps window pixels to logical units and rejects the bars', () => {
    const box = fitView(2560, 1440);
    expect(windowToView(1280, 720, box)).toEqual({ x: 640, y: 360 });
    const bars = fitView(2000, 720);
    expect(windowToView(5, 5, bars)).toBeNull();
    expect(VIEW_W / VIEW_H).toBeCloseTo(16 / 9);
  });
});

describe('chant', () => {
  it('maps Dorian degrees to pitches', () => {
    expect(degreeToMidi(50, MODES.dorian, 0)).toBe(50);
    expect(degreeToMidi(50, MODES.dorian, 2)).toBe(53); // F
    expect(degreeToMidi(50, MODES.dorian, 7)).toBe(62); // D an octave up
    expect(degreeToMidi(50, MODES.dorian, -1)).toBe(48); // C below
    expect(midiToHz(69)).toBeCloseTo(440);
  });

  it('always cadences on the final and stays in range', () => {
    for (let s = 0; s < 200; s++) {
      const phrase = chantPhrase(new Rng(s));
      expect(phrase[phrase.length - 1]!.degree).toBe(0);
      for (const n of phrase) {
        expect(n.degree).toBeGreaterThanOrEqual(-2);
        expect(n.degree).toBeLessThanOrEqual(7);
        expect(n.beats).toBeGreaterThan(0);
      }
    }
  });

  it('sometimes sings the Book motif itself', () => {
    const motif = [...BOOK_MOTIF].join(',');
    let found = false;
    for (let s = 0; s < 100 && !found; s++) found = chantPhrase(new Rng(s)).map((n) => n.degree).join(',') === motif;
    expect(found).toBe(true);
  });
});
