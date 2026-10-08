/**
 * Lychford at Midwinter (DESIGN.md §7.3): wind over the snow, and the village carol in
 * G Mixolydian, 6/8 at about 92, on a hurdy-gurdy drone and a plucked lute. The tune
 * never reaches its last note: it loops just short of the cadence, the way a village
 * without an ending would sing. Once the passing bell has rung, it resolves.
 */

import { session } from '../engine/session';
import type { AudioEngine } from './engine';
import { degreeToMidi, midiToHz, MODES, noiseSource } from './instruments';

const FINAL = 55; // G3
const EIGHTH = 60 / 92 / 3 * 1.5;

/** The carol: [degree, eighths]. The last bar is held back until the bell has rung. */
export const CAROL: [number, number][][] = [
  [[4, 2], [5, 1], [4, 2], [2, 1]],
  [[3, 2], [4, 1], [5, 3]],
  [[7, 2], [6, 1], [5, 2], [4, 1]],
  [[3, 2], [2, 1], [1, 3]],
  [[4, 2], [5, 1], [6, 2], [7, 1]],
  [[8, 3], [7, 2], [6, 1]],
  [[5, 2], [4, 1], [3, 2], [2, 1]],
];
/** Where the tune would end: on the final, at last. */
export const CADENCE: [number, number][] = [[1, 2], [0, 4]];
/** Where it hangs instead: on the second degree, unresolved, and back to the top. */
export const HANG: [number, number][] = [[1, 3], [1, 3]];

function lute(ctx: AudioContext, out: AudioNode, midi: number, t: number, level: number): void {
  const hz = midiToHz(midi);
  for (const [mul, lv] of [
    [1, 1],
    [2.003, 0.35],
    [3.01, 0.12],
  ] as const) {
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.value = hz * mul;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(level * lv, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0004, t + 0.9);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + 0.95);
  }
}

/** The hurdy-gurdy: a buzzing drone on G and D, its wheel never stopping. */
function gurdy(ctx: AudioContext, out: AudioNode): { stop: () => void } {
  const g = ctx.createGain();
  g.gain.value = 0;
  g.gain.setTargetAtTime(0.03, ctx.currentTime, 2);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 1400;
  const oscs: OscillatorNode[] = [];
  for (const m of [FINAL - 12, FINAL - 5]) {
    for (const det of [-5, 4]) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = midiToHz(m);
      o.detune.value = det;
      o.connect(lp);
      o.start();
      oscs.push(o);
    }
  }
  // The wheel's rasp: a slow wobble in level.
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 2.7;
  const lg = ctx.createGain();
  lg.gain.value = 0.008;
  lfo.connect(lg).connect(g.gain);
  lfo.start();
  oscs.push(lfo);
  lp.connect(g).connect(out);
  return {
    stop: () => {
      g.gain.setTargetAtTime(0, ctx.currentTime, 0.8);
      for (const o of oscs) o.stop(ctx.currentTime + 4);
    },
  };
}

export class WinterAmbience {
  private stops: (() => void)[] = [];
  private timer = 0;
  private next = 0;
  private bar = 0;
  private running = false;

  constructor(private readonly opts: { music?: boolean } = {}) {}

  start(engine: AudioEngine): void {
    const ctx = engine.ctx;
    if (!ctx || this.running) return;
    this.running = true;
    // Wind: noise through a swaying band-pass.
    const wind = noiseSource(ctx, 5);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 520;
    bp.Q.value = 0.7;
    const sway = ctx.createOscillator();
    sway.frequency.value = 0.07;
    const sd = ctx.createGain();
    sd.gain.value = 260;
    sway.connect(sd).connect(bp.frequency);
    const wg = ctx.createGain();
    wg.gain.value = 0.16;
    wind.connect(bp).connect(wg).connect(engine.bus('ambience'));
    wind.start();
    sway.start();
    this.stops.push(() => {
      wg.gain.setTargetAtTime(0, ctx.currentTime, 0.6);
      wind.stop(ctx.currentTime + 3);
      sway.stop(ctx.currentTime + 3);
    });
    if (this.opts.music === false) return;
    const out = ctx.createGain();
    out.gain.value = 1;
    out.connect(engine.bus('music'));
    const wet = ctx.createGain();
    wet.gain.value = 0.3;
    out.connect(wet).connect(engine.reverbIn);
    const d = gurdy(ctx, out);
    this.stops.push(() => d.stop());
    this.next = ctx.currentTime + 1.5;
    this.timer = window.setInterval(() => this.schedule(ctx, out), 120);
  }

  private schedule(ctx: AudioContext, out: AudioNode): void {
    if (!this.running) return;
    while (this.next < ctx.currentTime + 0.5) {
      const resolved = !!session.game.flags.bellRung;
      const k = this.bar % (CAROL.length + 1);
      const bar = k < CAROL.length ? CAROL[k]! : resolved ? CADENCE : HANG;
      let t = this.next;
      for (const [deg, n] of bar) {
        lute(ctx, out, degreeToMidi(FINAL + 12, MODES.mixolydian, deg), t, 0.07);
        if (n >= 3) lute(ctx, out, degreeToMidi(FINAL, MODES.mixolydian, deg - 2), t, 0.04);
        t += n * EIGHTH;
      }
      this.next += EIGHTH * 6;
      this.bar++;
      // A breath between verses.
      if (k === CAROL.length) this.next += EIGHTH * 6 * (resolved ? 3 : 1);
    }
  }

  stop(): void {
    this.running = false;
    clearInterval(this.timer);
    for (const s of this.stops) s();
    this.stops = [];
  }
}
