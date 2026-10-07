/**
 * Generative plainchant. Phrases move mostly by step inside the mode, start on the final
 * or the fifth, and cadence on the final, as chant does. Pure, so it can be tested.
 */

import type { Rng } from '../engine/rng';

/** The Book motif (DESIGN.md §7.2): D F G A G F E D as degrees of D Dorian. */
export const BOOK_MOTIF = [0, 2, 3, 4, 3, 2, 1, 0] as const;

export interface Note {
  degree: number;
  /** Length in beats. */
  beats: number;
}

export function chantPhrase(rng: Rng, minLen = 6, maxLen = 10): Note[] {
  if (rng.chance(0.25)) return BOOK_MOTIF.map((d, i) => ({ degree: d, beats: i === BOOK_MOTIF.length - 1 ? 2.5 : 1 }));
  const len = rng.int(minLen, maxLen);
  const notes: number[] = [rng.chance(0.6) ? 0 : 4];
  for (let i = 1; i < len - 2; i++) {
    const prev = notes[i - 1]!;
    let step = rng.pick([-1, -1, 1, 1, 1, -2, 2, 0]);
    // Lean back towards the middle of the range.
    if (prev >= 6) step = -Math.abs(step) || -1;
    if (prev <= -2) step = Math.abs(step) || 1;
    notes.push(Math.max(-2, Math.min(7, prev + step)));
  }
  // Cadence: approach the final by step from above or below.
  notes.push(rng.chance(0.7) ? 1 : -1);
  notes.push(0);
  return notes.map((d, i) => ({ degree: d, beats: i === notes.length - 1 ? 2.5 : rng.chance(0.15) ? 2 : 1 }));
}
