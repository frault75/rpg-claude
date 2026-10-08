/**
 * Saint Ebb's by night (DESIGN.md §7.3): D Dorian plainchant in organum (a second voice
 * a fifth below), a soft organ drone, the sea breathing, a distant bell now and then.
 */

import { Rng } from '../engine/rng';
import { chantPhrase } from './chant';
import type { AudioEngine } from './engine';
import { bell, degreeToMidi, drone, MODES, noiseSource, sing } from './instruments';

const FINAL = 50; // D3

export class EbbNightAmbience {
  private timers: number[] = [];
  private stops: (() => void)[] = [];
  private readonly rng = new Rng('ebb-night');
  private running = false;

  /** `music: false` keeps only the sea and the bell (under the battle music). */
  constructor(private readonly opts: { music?: boolean } = {}) {}

  start(engine: AudioEngine): void {
    const ctx = engine.ctx;
    if (!ctx || this.running) return;
    this.running = true;
    const music = engine.bus('music');
    const amb = engine.bus('ambience');

    const withMusic = this.opts.music !== false;
    // Musical bed: a low drone on D and A.
    if (withMusic) {
      const d = drone(ctx, music, [FINAL - 12, FINAL - 5], 0.035);
      this.stops.push(() => d.stop());
    }

    // The sea: brown noise through a low-pass, swelling slowly like waves on the causeway.
    const sea = noiseSource(ctx, 4);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 420;
    const swell = ctx.createGain();
    swell.gain.value = 0.18;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.09;
    const lfoDepth = ctx.createGain();
    lfoDepth.gain.value = 0.12;
    lfo.connect(lfoDepth).connect(swell.gain);
    sea.connect(lp).connect(swell).connect(amb);
    sea.start();
    lfo.start();
    this.stops.push(() => {
      swell.gain.setTargetAtTime(0, ctx.currentTime, 0.8);
      sea.stop(ctx.currentTime + 4);
      lfo.stop(ctx.currentTime + 4);
    });

    if (withMusic) this.scheduleChant(engine, 3);
    this.scheduleBell(engine, 9);
  }

  private scheduleChant(engine: AudioEngine, delay: number): void {
    const id = window.setTimeout(() => {
      const ctx = engine.ctx;
      if (!ctx || !this.running) return;
      const phrase = chantPhrase(this.rng);
      const beat = 0.95;
      let t = ctx.currentTime + 0.1;
      const dry = engine.bus('music');
      for (const n of phrase) {
        const dur = n.beats * beat;
        const m = degreeToMidi(FINAL, MODES.dorian, n.degree);
        // Organum: the principal voice and a voice a fifth below, mostly into the reverb.
        sing(ctx, engine.reverbIn, m, t, dur, 0.06);
        sing(ctx, engine.reverbIn, m - 7, t, dur, 0.045);
        sing(ctx, dry, m, t, dur, 0.018);
        t += dur;
      }
      const length = t - ctx.currentTime;
      this.scheduleChant(engine, length + this.rng.range(5, 11));
    }, delay * 1000);
    this.timers.push(id);
  }

  private scheduleBell(engine: AudioEngine, delay: number): void {
    const id = window.setTimeout(() => {
      const ctx = engine.ctx;
      if (!ctx || !this.running) return;
      // Distant: quiet, mostly reverb.
      bell(ctx, engine.reverbIn, 146.8, ctx.currentTime + 0.05, 0.22, 9);
      bell(ctx, engine.bus('ambience'), 146.8, ctx.currentTime + 0.05, 0.04, 9);
      this.scheduleBell(engine, this.rng.range(34, 52));
    }, delay * 1000);
    this.timers.push(id);
  }

  stop(): void {
    this.running = false;
    for (const t of this.timers) clearTimeout(t);
    this.timers = [];
    for (const s of this.stops) s();
    this.stops = [];
  }
}
