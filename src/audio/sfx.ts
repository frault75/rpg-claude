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
