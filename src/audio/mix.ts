/**
 * The mix (DESIGN.md §7.5): a level trim for each location's score, so that walking from
 * one place to the next doesn't jump in loudness. Each was measured through the master,
 * before the compressor, over 40 seconds of play: exploration now sits near −32 dB RMS,
 * battles about 2 dB above it, and two places stay quieter on purpose (Wystan's vine, and
 * the deep Blanchwood, where the music forgets its notes).
 */

export const TRIM_DB = {
  ebb: -1.5,
  winter: 1.5,
  blanchwood: 1,
  ossuary: -2,
  margin: 0.5,
  vine: 1.5,
  battle: -1,
} as const;

/** The trim for a piece, as a gain. */
export function trim(piece: keyof typeof TRIM_DB): number {
  return Math.pow(10, TRIM_DB[piece] / 20);
}
