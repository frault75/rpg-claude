/**
 * The Blanchwood (DESIGN.md §7.3, §9.3): a slow tune in E Phrygian on a solo recorder,
 * with a psaltery plucking the drone. The wood forgets as you go deeper, and so does the
 * music: notes drop out more often with depth, until only the wind and a very slow drum
 * are left at the chapel. The ossuary below has a low organ and the click of bones.
 */

import type { AudioEngine } from './engine';
import { degreeToMidi, drone, midiToHz, MODES, noiseBurst, noiseSource } from './instruments';

const FINAL = 64; // E4
const BEAT = 1; // 60 bpm

/** The tune: [degree, beats], four beats to a bar. */
export const BLANCH_TUNE: [number, number][][] = [
  [[4, 1], [3, 0.5], [2, 0.5], [1, 1], [0, 1]],
  [[2, 1], [3, 1], [4, 2]],
  [[5, 1], [4, 0.5], [3, 0.5], [4, 1], [2, 1]],
  [[1, 1.5], [2, 0.5], [1, 1], [0, 1]],
  [[0, 1], [1, 1], [2, 1], [4, 1]],
  [[5, 2], [4, 1], [3, 1]],
  [[2, 1], [1, 1], [0, 2]],
];

/** Is the n-th note forgotten at this depth (0 = the wood's edge, 1 = the chapel)? Deterministic. */
export function forgotten(n: number, depth: number): boolean {
  const h = (((n * 2654435761) >>> 0) % 1000) / 1000;
  return h < depth * 0.9;
}

/** A recorder: a soft sine with a breathy onset and a slow vibrato. */
function recorder(ctx: AudioContext, out: AudioNode, midi: number, t: number, dur: number, level: number): void {
  const hz = midiToHz(midi);
  const o = ctx.createOscillator();
  o.type = 'sine';
  o.frequency.value = hz;
  const o2 = ctx.createOscillator();
  o2.type = 'triangle';
  o2.frequency.value = hz * 2;
  const vib = ctx.createOscillator();
  vib.frequency.value = 4.6;
  const vg = ctx.createGain();
  vg.gain.setValueAtTime(0, t);
  vg.gain.linearRampToValueAtTime(hz * 0.006, t + Math.min(0.5, dur * 0.6));
  vib.connect(vg).connect(o.frequency);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(level, t + 0.06);
  g.gain.setValueAtTime(level, t + dur * 0.8);
  g.gain.linearRampToValueAtTime(0, t + dur * 0.98);
  const g2 = ctx.createGain();
  g2.gain.value = 0.12;
  o.connect(g).connect(out);
  o2.connect(g2).connect(g);
  for (const n of [o, o2, vib]) {
    n.start(t);
    n.stop(t + dur + 0.05);
  }
  // The chiff of breath at the start.
  noiseBurst(ctx, out, t, 0.05, hz * 2, 3, level * 0.5);
}

/** A psaltery: a plucked string, bright and quickly gone. */
function psaltery(ctx: AudioContext, out: AudioNode, midi: number, t: number, level: number): void {
  const hz = midiToHz(midi);
  for (const [mul, lv] of [
    [1, 1],
    [2, 0.5],
    [3.01, 0.25],
    [4.02, 0.12],
  ] as const) {
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.value = hz * mul;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(level * lv, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0003, t + 1.6 / mul);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + 1.7);
  }
}

/** A frame drum: a low thump with a skin's slap. */
function drum(ctx: AudioContext, out: AudioNode, t: number, level: number): void {
  const o = ctx.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(110, t);
  o.frequency.exponentialRampToValueAtTime(48, t + 0.25);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(level, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0005, t + 0.9);
  o.connect(g).connect(out);
  o.start(t);
  o.stop(t + 1);
  noiseBurst(ctx, out, t, 0.04, 900, 1.5, level * 0.25);
}

export interface BlanchOpts {
  /** How deep in the wood: 0 at its edge, 1 at the chapel. Read as the music plays. */
  depth?: () => number;
  /** No tune at all (the ossuary, or under a cutscene's own sound). */
  music?: boolean;
  /** The ossuary: a low organ and the click of bones. */
  ossuary?: boolean;
}

export class BlanchwoodAmbience {
  private stops: (() => void)[] = [];
  private timer = 0;
  private next = 0;
  private bar = 0;
  private note = 0;
  private running = false;

  constructor(private readonly opts: BlanchOpts = {}) {}

  start(engine: AudioEngine): void {
    const ctx = engine.ctx;
    if (!ctx || this.running) return;
    this.running = true;
    // Wind through bare branches: lower and stiller than Lychford's.
    const wind = noiseSource(ctx, 5);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 340;
    bp.Q.value = 0.9;
    const sway = ctx.createOscillator();
    sway.frequency.value = 0.05;
    const sd = ctx.createGain();
    sd.gain.value = 160;
    sway.connect(sd).connect(bp.frequency);
    const wg = ctx.createGain();
    wg.gain.value = this.opts.ossuary ? 0.04 : 0.1;
    wind.connect(bp).connect(wg).connect(engine.bus('ambience'));
    wind.start();
    sway.start();
    this.stops.push(() => {
      wg.gain.setTargetAtTime(0, ctx.currentTime, 0.6);
      wind.stop(ctx.currentTime + 3);
      sway.stop(ctx.currentTime + 3);
    });
    const out = ctx.createGain();
    out.connect(engine.bus('music'));
    const wet = ctx.createGain();
    wet.gain.value = 0.45;
    out.connect(wet).connect(engine.reverbIn);
    if (this.opts.ossuary) {
      const d = drone(ctx, out, [FINAL - 36, FINAL - 29], 0.05);
      this.stops.push(() => d.stop());
    }
    if (this.opts.music === false && !this.opts.ossuary) return;
    this.next = ctx.currentTime + 1;
    this.timer = window.setInterval(() => this.schedule(ctx, out), 150);
  }

  private schedule(ctx: AudioContext, out: AudioNode): void {
    if (!this.running) return;
    while (this.next < ctx.currentTime + 0.6) {
      const t0 = this.next;
      if (this.opts.ossuary) {
        // Bones clicking somewhere in the dark, and a slow drum.
        for (let k = 0; k < 3; k++) if (((this.bar * 7 + k * 13) % 5) < 2) noiseBurst(ctx, out, t0 + k * 1.3 + ((this.bar * 3) % 4) * 0.1, 0.02, 2600 + k * 500, 8, 0.05);
        if (this.bar % 2 === 0) drum(ctx, out, t0, 0.12);
        this.next += BEAT * 4;
        this.bar++;
        continue;
      }
      const depth = Math.max(0, Math.min(1, this.opts.depth?.() ?? 0));
      const bar = BLANCH_TUNE[this.bar % BLANCH_TUNE.length]!;
      let t = t0;
      // The psaltery's drone at the bar, which also fades with depth.
      if (!forgotten(this.bar * 31 + 7, depth * 0.8)) {
        psaltery(ctx, out, FINAL - 12, t, 0.05);
        psaltery(ctx, out, FINAL - 5, t + 0.03, 0.035);
      }
      for (const [deg, beats] of bar) {
        if (!forgotten(this.note, depth)) recorder(ctx, out, degreeToMidi(FINAL + 12, MODES.phrygian, deg), t, beats * BEAT, 0.055);
        this.note++;
        t += beats * BEAT;
      }
      // Near the chapel, only a very slow drum keeps time.
      if (depth > 0.55 && this.bar % 2 === 0) drum(ctx, out, t0, 0.08 + depth * 0.06);
      this.next += BEAT * 4;
      this.bar++;
      if (this.bar % BLANCH_TUNE.length === 0) this.next += BEAT * 4;
    }
  }

  stop(): void {
    this.running = false;
    clearInterval(this.timer);
    for (const s of this.stops) s();
    this.stops = [];
  }
}
