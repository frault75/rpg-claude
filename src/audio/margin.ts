/**
 * The Margin (DESIGN.md §7.4): F Lydian, bright and bouncy. Psaltery and recorder trade
 * the notes of one tune in hocket, over a tabor and a plucked vielle a little out of
 * tune, so it feels comic and dreamlike; a low minor drone underneath keeps it sad. At
 * Wystan's vine all of it falls away to a solo psaltery playing the Book motif.
 */

import { BOOK_MOTIF } from './chant';
import { drum, psaltery, recorder } from './blanchwood';
import type { AudioEngine } from './engine';
import { degreeToMidi, drone, MODES, noiseBurst } from './instruments';
import { trim } from './mix';

const FINAL = 65; // F4
const BEAT = 60 / 132;

/** The tune: [degree, beats], four beats to a bar. Its notes alternate between the two instruments. */
export const MARGIN_TUNE: [number, number][][] = [
  [[0, 0.5], [2, 0.5], [4, 0.5], [3, 0.5], [2, 1], [4, 1]],
  [[5, 0.5], [4, 0.5], [3, 0.5], [2, 0.5], [3, 2]],
  [[4, 0.5], [6, 0.5], [7, 1], [6, 0.5], [4, 0.5], [3, 1]],
  [[2, 0.5], [3, 0.5], [1, 1], [0, 2]],
];

/** Who plays the n-th note of the tune: 0 the psaltery, 1 the recorder. */
export const hocket = (n: number): 0 | 1 => (n % 2 === 0 ? 0 : 1);

export class MarginAmbience {
  private stops: (() => void)[] = [];
  private timer = 0;
  private next = 0;
  private bar = 0;
  private note = 0;
  private running = false;

  constructor(private readonly opts: { vine?: boolean; until?: () => boolean } = {}) {}

  start(engine: AudioEngine): void {
    const ctx = engine.ctx;
    if (!ctx || this.running) return;
    this.running = true;
    const out = ctx.createGain();
    out.gain.value = trim(this.opts.vine ? 'vine' : 'margin');
    out.connect(engine.bus('music'));
    const wet = ctx.createGain();
    wet.gain.value = 0.35;
    out.connect(wet).connect(engine.reverbIn);
    // Underneath it all, a low minor drone: the Margin is the saddest place in the game.
    const d = drone(ctx, out, this.opts.vine ? [FINAL - 24] : [FINAL - 24, FINAL - 21], 0.03);
    this.stops.push(() => d.stop());
    this.next = ctx.currentTime + 0.8;
    this.timer = window.setInterval(() => this.schedule(ctx, out), 120);
  }

  private schedule(ctx: AudioContext, out: AudioNode): void {
    if (!this.running) return;
    while (this.next < ctx.currentTime + 0.5) {
      const t0 = this.next;
      // Silent until the Margin opens (at the page's edge, it waits for the step off).
      if (this.opts.until && !this.opts.until()) {
        this.next += BEAT * 4;
        continue;
      }
      if (this.opts.vine) {
        // The Book motif, slowly, on a psaltery alone.
        let t = t0;
        for (const [i, deg] of BOOK_MOTIF.entries()) {
          psaltery(ctx, out, degreeToMidi(62, MODES.dorian, deg), t, 0.06);
          t += i === BOOK_MOTIF.length - 1 ? 2.4 : 0.9;
        }
        this.next = t + 3;
        continue;
      }
      const bar = MARGIN_TUNE[this.bar % MARGIN_TUNE.length]!;
      let t = t0;
      for (const [deg, beats] of bar) {
        const midi = degreeToMidi(FINAL + 12, MODES.lydian, deg);
        if (hocket(this.note) === 0) psaltery(ctx, out, midi, t, 0.05);
        else recorder(ctx, out, midi - 12 + 12, t, beats * BEAT * 0.95, 0.04);
        this.note++;
        t += beats * BEAT;
      }
      // The tabor on the beat, the vielle plucked a hair out of tune on the off-beats.
      for (let k = 0; k < 4; k++) {
        if (k % 2 === 0) drum(ctx, out, t0 + k * BEAT, 0.05);
        else noiseBurst(ctx, out, t0 + k * BEAT, 0.03, 1800, 2, 0.03);
        psaltery(ctx, out, FINAL - 12 + (k % 2 ? 7 : 0) + 0.3, t0 + k * BEAT + BEAT / 2, 0.025);
      }
      this.next += BEAT * 4;
      this.bar++;
    }
  }

  stop(): void {
    this.running = false;
    clearInterval(this.timer);
    for (const s of this.stops) s();
    this.stops = [];
  }
}
