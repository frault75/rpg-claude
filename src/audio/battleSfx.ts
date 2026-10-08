/**
 * The sounds of a battle, all synthesised: blows, the penknife on its cord, healing and
 * wards, the red line of Strike Through, the bell of a Reckoning, and the short phrases
 * of victory and defeat. Everything goes to the effects bus with a touch of reverb.
 */

import type { AudioEngine } from './engine';
import { bell, midiToHz, noiseBurst, sing } from './instruments';

function out(engine: AudioEngine): { ctx: AudioContext; bus: AudioNode; t: number } | null {
  const ctx = engine.ctx;
  if (!ctx) return null;
  return { ctx, bus: engine.bus('sfx'), t: ctx.currentTime };
}

/** A pitched sweep (thumps, whooshes, chimes). */
function sweep(ctx: AudioContext, bus: AudioNode, t: number, f0: number, f1: number, dur: number, level: number, type: OscillatorType = 'sine'): void {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(level, t + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0005, t + dur);
  o.connect(g).connect(bus);
  o.start(t);
  o.stop(t + dur + 0.02);
}

/** A blow landing: heavier ones are lower and longer. */
export function hitSound(engine: AudioEngine, weight = 1): void {
  const o = out(engine);
  if (!o) return;
  const { ctx, bus, t } = o;
  sweep(ctx, bus, t, 150 + 40 / weight, 42, 0.18 + weight * 0.06, 0.22 * Math.min(1.6, weight));
  noiseBurst(ctx, bus, t, 0.08 + weight * 0.03, 900, 0.8, 0.22 * Math.min(1.5, weight));
  noiseBurst(ctx, engine.reverbIn, t, 0.06, 1400, 1, 0.08);
}

/** A swing or lunge through the air. */
export function whoosh(engine: AudioEngine, high = false): void {
  const o = out(engine);
  if (!o) return;
  const { ctx, bus, t } = o;
  const len = Math.floor(ctx.sampleRate * 0.22);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.sin((i / len) * Math.PI);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.Q.value = 1.6;
  bp.frequency.setValueAtTime(high ? 1800 : 700, t);
  bp.frequency.exponentialRampToValueAtTime(high ? 5200 : 2400, t + 0.2);
  const g = ctx.createGain();
  g.gain.value = 0.14;
  src.connect(bp).connect(g).connect(bus);
  src.start(t);
}

/** The penknife: flung on its cord, a tick as it bites, the cord whipping back. */
export function knifeSound(engine: AudioEngine): void {
  const o = out(engine);
  if (!o) return;
  const { ctx, bus, t } = o;
  whoosh(engine, true);
  sweep(ctx, bus, t + 0.14, 3200, 2200, 0.05, 0.06, 'triangle');
  noiseBurst(ctx, bus, t + 0.14, 0.03, 5200, 3, 0.1);
}

/** Healing: a rising shimmer. */
export function healSound(engine: AudioEngine): void {
  const o = out(engine);
  if (!o) return;
  const { ctx, bus, t } = o;
  [74, 78, 81, 86].forEach((m, i) => sweep(ctx, bus, t + i * 0.07, midiToHz(m), midiToHz(m) * 1.002, 0.5, 0.05, 'sine'));
  [74, 81].forEach((m, i) => sweep(ctx, engine.reverbIn, t + i * 0.09, midiToHz(m), midiToHz(m), 0.6, 0.04, 'sine'));
}

/** A Ward forming: a glassy ring. */
export function wardSound(engine: AudioEngine): void {
  const o = out(engine);
  if (!o) return;
  const { ctx, bus, t } = o;
  bell(ctx, bus, midiToHz(84), t, 0.12, 1.6);
  bell(ctx, engine.reverbIn, midiToHz(91), t + 0.04, 0.06, 1.2);
}

/** Strike Through: the pen scratching a red line, and the intent's thud as it dies. */
export function strikeSound(engine: AudioEngine): void {
  const o = out(engine);
  if (!o) return;
  const { ctx, bus, t } = o;
  for (let i = 0; i < 9; i++) noiseBurst(ctx, bus, t + i * 0.025, 0.03, 3600 + i * 120, 3.5, 0.08);
  sweep(ctx, bus, t + 0.24, 220, 60, 0.3, 0.16);
}

/** Gloss: a short scribble and a soft chime. */
export function glossSound(engine: AudioEngine): void {
  const o = out(engine);
  if (!o) return;
  const { ctx, bus, t } = o;
  for (let i = 0; i < 6; i++) noiseBurst(ctx, bus, t + i * 0.03, 0.025, 4200, 4, 0.05);
  sweep(ctx, bus, t + 0.18, midiToHz(88), midiToHz(88), 0.5, 0.04, 'triangle');
}

/** A Reckoning: the bell tolls. */
export function reckoningSound(engine: AudioEngine): void {
  const o = out(engine);
  if (!o) return;
  const { ctx, bus, t } = o;
  bell(ctx, bus, midiToHz(48), t, 0.5, 6);
  bell(ctx, engine.reverbIn, midiToHz(48), t, 0.3, 6);
  hitSound(engine, 1.8);
}

/** Something falls: marginalia scatter back into the border with a papery rustle. */
export function fallSound(engine: AudioEngine, enemy: boolean): void {
  const o = out(engine);
  if (!o) return;
  const { ctx, bus, t } = o;
  if (enemy) {
    for (let i = 0; i < 14; i++) noiseBurst(ctx, bus, t + i * 0.035 + Math.random() * 0.02, 0.05, 2400 + Math.random() * 2600, 2, 0.06 * (1 - i / 14));
    sweep(ctx, bus, t, 420, 90, 0.6, 0.08, 'triangle');
  } else {
    sweep(ctx, bus, t, 300, 70, 0.9, 0.12, 'sine');
    noiseBurst(ctx, bus, t + 0.1, 0.3, 500, 0.8, 0.1);
  }
}

/** An intent that fizzles: a dull puff. */
export function fizzleSound(engine: AudioEngine): void {
  const o = out(engine);
  if (!o) return;
  const { ctx, bus, t } = o;
  noiseBurst(ctx, bus, t, 0.18, 400, 0.7, 0.12);
  sweep(ctx, bus, t, 180, 90, 0.2, 0.05, 'triangle');
}

/** A wave breaking over the causeway. */
export function waveSound(engine: AudioEngine): void {
  const o = out(engine);
  if (!o) return;
  const { ctx, t } = o;
  const len = Math.floor(ctx.sampleRate * 1.4);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) {
    const k = i / len;
    d[i] = (Math.random() * 2 - 1) * Math.pow(Math.sin(Math.min(1, k * 3) * Math.PI * 0.5), 2) * Math.pow(1 - k, 1.5);
  }
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(600, t);
  lp.frequency.linearRampToValueAtTime(2400, t + 0.4);
  lp.frequency.linearRampToValueAtTime(500, t + 1.4);
  const g = ctx.createGain();
  g.gain.value = 0.35;
  src.connect(lp).connect(g).connect(engine.bus('sfx'));
  g.connect(engine.reverbIn);
  src.start(t);
}

/** A shell closing: a hollow knock. */
export function shellSound(engine: AudioEngine): void {
  const o = out(engine);
  if (!o) return;
  const { ctx, bus, t } = o;
  sweep(ctx, bus, t, 320, 160, 0.14, 0.18, 'triangle');
  sweep(ctx, bus, t + 0.09, 260, 130, 0.18, 0.14, 'triangle');
}

/** The banderoles writing themselves at the Omen. */
export function omenSound(engine: AudioEngine): void {
  const o = out(engine);
  if (!o) return;
  const { ctx, bus, t } = o;
  sweep(ctx, bus, t, midiToHz(62), midiToHz(62), 0.9, 0.035, 'triangle');
  for (let i = 0; i < 10; i++) noiseBurst(ctx, bus, t + 0.05 + i * 0.03, 0.02, 3800 + Math.random() * 1800, 4, 0.04);
}

/** A short phrase on the chant voice: victory (a rising Dorian cadence) or defeat. */
export function phrase(engine: AudioEngine, kind: 'victory' | 'defeat'): void {
  const ctx = engine.ctx;
  if (!ctx) return;
  const t = ctx.currentTime + 0.05;
  const music = engine.bus('music');
  if (kind === 'victory') {
    const notes: [number, number, number][] = [
      [62, 0, 0.3],
      [64, 0.28, 0.3],
      [65, 0.56, 0.3],
      [67, 0.84, 0.5],
      [69, 1.3, 1.6],
    ];
    for (const [m, at, d] of notes) {
      sing(ctx, music, m, t + at, d, 0.1);
      sing(ctx, music, m - 12, t + at, d, 0.05);
    }
    bell(ctx, music, midiToHz(74), t + 1.3, 0.12, 4);
    bell(ctx, engine.reverbIn, midiToHz(81), t + 1.32, 0.06, 4);
  } else {
    for (const [m, at, d] of [
      [57, 0, 0.8],
      [55, 0.7, 0.8],
      [53, 1.4, 1.8],
    ] as const) {
      sing(ctx, music, m, t + at, d, 0.09);
      sing(ctx, music, m - 12, t + at, d, 0.05);
    }
  }
}
