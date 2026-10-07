/** Sound effects, all from filtered noise and oscillators (DESIGN.md §7.4). */

import type { AudioEngine } from './engine';
import { noiseBurst } from './instruments';

export function footstep(engine: AudioEngine, surface: 'grass' | 'stone'): void {
  const ctx = engine.ctx;
  if (!ctx) return;
  const t = ctx.currentTime;
  if (surface === 'grass') noiseBurst(ctx, engine.bus('sfx'), t, 0.07, 900 + Math.random() * 300, 1.2, 0.07);
  else noiseBurst(ctx, engine.bus('sfx'), t, 0.045, 1800 + Math.random() * 400, 2.5, 0.08);
}

/** The scratch of a quill: a run of tiny high grains, for text being written. */
export function quill(engine: AudioEngine, seconds: number): void {
  const ctx = engine.ctx;
  if (!ctx) return;
  const n = Math.max(3, Math.floor(seconds * 22));
  for (let i = 0; i < n; i++) {
    const t = ctx.currentTime + (i / n) * seconds + Math.random() * 0.02;
    noiseBurst(ctx, engine.bus('ui'), t, 0.018 + Math.random() * 0.02, 3800 + Math.random() * 2400, 4, 0.05 + Math.random() * 0.03);
  }
}

/** A page turning: a swoosh and a soft flap. */
export function pageTurn(engine: AudioEngine): void {
  const ctx = engine.ctx;
  if (!ctx) return;
  const t = ctx.currentTime;
  noiseBurst(ctx, engine.bus('ui'), t, 0.35, 1400, 0.7, 0.12);
  noiseBurst(ctx, engine.bus('ui'), t + 0.3, 0.08, 600, 1.4, 0.12);
}

/** A speaker's voice: a soft, short pitched blip per syllable, as in the old RPGs. */
export function voiceBlip(engine: AudioEngine, pitch: number): void {
  const ctx = engine.ctx;
  if (!ctx) return;
  const t = ctx.currentTime;
  const o = ctx.createOscillator();
  o.type = 'triangle';
  o.frequency.setValueAtTime(pitch * (0.96 + Math.random() * 0.08), t);
  o.frequency.exponentialRampToValueAtTime(pitch * 0.85, t + 0.06);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.05, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0005, t + 0.07);
  o.connect(g).connect(engine.bus('voice'));
  o.start(t);
  o.stop(t + 0.08);
}

/** The menu cursor moving, and a choice confirmed. */
export function uiTick(engine: AudioEngine, confirm = false): void {
  const ctx = engine.ctx;
  if (!ctx) return;
  const t = ctx.currentTime;
  for (const [f, d] of confirm ? ([[1320, 0], [1980, 0.05]] as const) : ([[1760, 0]] as const)) {
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = f;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t + d);
    g.gain.linearRampToValueAtTime(0.04, t + d + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0005, t + d + 0.12);
    o.connect(g).connect(engine.bus('ui'));
    o.start(t + d);
    o.stop(t + d + 0.13);
  }
}
