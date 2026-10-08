/**
 * Battle music: an estampie, the dance tune of the medieval margins, in D Dorian and
 * 6/8. A frame drum and tabor keep the dotted pulse, a psaltery plucks a two-bar
 * ostinato over a drone on D and A, and a shawm plays the puncta of the tune, open and
 * closed endings, then rests while the drum carries on. Scheduled ahead on the audio
 * clock so it never drifts.
 */

import type { AudioEngine } from './engine';
import { degreeToMidi, drone, midiToHz, MODES, noiseBurst } from './instruments';
import { trim } from './mix';

const FINAL = 62; // D4
const BPM = 150; // eighth notes per minute ÷ 3: a brisk dotted-quarter pulse
const EIGHTH = 60 / BPM / 2;
const BAR = EIGHTH * 6;

/** The shawm's tune: [degree, eighths] per bar, a punctum with open and closed endings. */
export const TUNE: [number, number][][] = [
  [[4, 2], [5, 1], [4, 2], [3, 1]],
  [[2, 2], [3, 1], [4, 3]],
  [[7, 2], [6, 1], [5, 2], [4, 1]],
  [[3, 2], [2, 1], [1, 3]],
  [[4, 2], [5, 1], [4, 2], [3, 1]],
  [[2, 2], [3, 1], [4, 3]],
  [[7, 2], [6, 1], [5, 2], [4, 1]],
  [[3, 2], [1, 1], [0, 3]],
  [[0, 1], [1, 1], [2, 1], [3, 2], [4, 1]],
  [[5, 3], [4, 3]],
  [[3, 1], [4, 1], [5, 1], [4, 2], [3, 1]],
  [[1, 2], [2, 1], [0, 3]],
];

/** The psaltery's ostinato: degrees per eighth, two bars (Dm, then C). */
export const OSTINATO = [0, 4, 7, 4, 2, 4, -1, 3, 6, 3, 1, 3];

/** Every bar adds up to six eighths. */
export function barLengths(): number[] {
  return TUNE.map((bar) => bar.reduce((s, [, n]) => s + n, 0));
}

function pluck(ctx: AudioContext, out: AudioNode, midi: number, t: number, level: number): void {
  const o = ctx.createOscillator();
  o.type = 'triangle';
  o.frequency.value = midiToHz(midi);
  const o2 = ctx.createOscillator();
  o2.type = 'sine';
  o2.frequency.value = midiToHz(midi) * 2.01;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(level, t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0005, t + 0.5);
  const g2 = ctx.createGain();
  g2.gain.value = 0.3;
  o.connect(g);
  o2.connect(g2).connect(g);
  g.connect(out);
  o.start(t);
  o2.start(t);
  o.stop(t + 0.55);
  o2.stop(t + 0.55);
}

function shawm(ctx: AudioContext, out: AudioNode, midi: number, t: number, dur: number, level: number): void {
  const hz = midiToHz(midi);
  const o = ctx.createOscillator();
  o.type = 'sawtooth';
  o.frequency.value = hz;
  const vib = ctx.createOscillator();
  vib.frequency.value = 5.5;
  const vd = ctx.createGain();
  vd.gain.value = hz * 0.004;
  vib.connect(vd).connect(o.frequency);
  // A reed's nasal formant, and a low-pass to take the edge off.
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 1400;
  bp.Q.value = 1.2;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 3200;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(level, t + 0.03);
  g.gain.setValueAtTime(level * 0.85, t + dur * 0.8);
  g.gain.linearRampToValueAtTime(0, t + dur + 0.04);
  o.connect(bp).connect(lp).connect(g).connect(out);
  o.start(t);
  vib.start(t);
  o.stop(t + dur + 0.1);
  vib.stop(t + dur + 0.1);
}

function drum(ctx: AudioContext, out: AudioNode, t: number, kind: 'low' | 'tap'): void {
  if (kind === 'low') {
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(130, t);
    o.frequency.exponentialRampToValueAtTime(55, t + 0.18);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.22, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0005, t + 0.3);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + 0.32);
    noiseBurst(ctx, out, t, 0.06, 300, 0.8, 0.12);
  } else noiseBurst(ctx, out, t, 0.04, 2600, 1.4, 0.07);
}

export class BattleMusic {
  private timer = 0;
  private stops: (() => void)[] = [];
  private next = 0;
  private bar = 0;
  private running = false;
  private out: GainNode | null = null;

  start(engine: AudioEngine): void {
    const ctx = engine.ctx;
    if (!ctx || this.running) return;
    this.running = true;
    const out = ctx.createGain();
    out.gain.setValueAtTime(0, ctx.currentTime);
    out.gain.linearRampToValueAtTime(trim('battle'), ctx.currentTime + 1.5);
    out.connect(engine.bus('music'));
    const wet = ctx.createGain();
    wet.gain.value = 0.25;
    out.connect(wet).connect(engine.reverbIn);
    this.out = out;
    const d = drone(ctx, out, [FINAL - 24, FINAL - 17], 0.03);
    this.stops.push(() => d.stop());
    this.next = ctx.currentTime + 0.2;
    // Schedule a little ahead, every tenth of a second.
    this.timer = window.setInterval(() => this.schedule(ctx), 100);
    this.schedule(ctx);
  }

  private schedule(ctx: AudioContext): void {
    if (!this.running || !this.out) return;
    while (this.next < ctx.currentTime + 0.4) {
      this.playBar(ctx, this.out, this.next, this.bar);
      this.next += BAR;
      this.bar++;
    }
  }

  private playBar(ctx: AudioContext, out: AudioNode, t: number, bar: number): void {
    // Drum: the dotted pulse, a tap on the off-eighths, a roll into every fourth bar.
    drum(ctx, out, t, 'low');
    drum(ctx, out, t + EIGHTH * 3, 'low');
    for (const k of [2, 5]) drum(ctx, out, t + EIGHTH * k, 'tap');
    if (bar % 4 === 3) for (const k of [4, 4.5]) drum(ctx, out, t + EIGHTH * k, 'tap');
    // Psaltery ostinato.
    for (let k = 0; k < 6; k++) {
      const deg = OSTINATO[(bar % 2) * 6 + k]!;
      pluck(ctx, out, degreeToMidi(FINAL - 12, MODES.dorian, deg), t + k * EIGHTH, k === 0 ? 0.07 : 0.045);
    }
    // The shawm: twelve bars of tune, then four of drum and psaltery alone.
    const cycle = bar % 16;
    if (bar >= 2 && cycle < 12) {
      let at = t;
      for (const [deg, n] of TUNE[cycle]!) {
        shawm(ctx, out, degreeToMidi(FINAL, MODES.dorian, deg), at, n * EIGHTH * 0.92, 0.05);
        at += n * EIGHTH;
      }
    }
  }

  stop(): void {
    this.running = false;
    clearInterval(this.timer);
    const ctx = this.out?.context;
    if (this.out && ctx) {
      this.out.gain.cancelScheduledValues(ctx.currentTime);
      this.out.gain.setTargetAtTime(0, ctx.currentTime, 0.25);
    }
    for (const s of this.stops) s();
    this.stops = [];
  }
}
