/**
 * The audio engine: one AudioContext, buses for music, ambience, effects and UI feeding
 * a master compressor, and convolution reverbs whose impulse responses are generated at
 * runtime (no samples). DESIGN.md §7.5.
 */

export type Bus = 'music' | 'ambience' | 'sfx' | 'ui' | 'voice';

/** Generate a stereo impulse response: decaying noise with a darkening tail. */
export function makeImpulse(ctx: BaseAudioContext, seconds: number, decay: number, brightness = 0.5): AudioBuffer {
  const len = Math.max(1, Math.floor(ctx.sampleRate * seconds));
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let lp = 0;
    for (let i = 0; i < len; i++) {
      const t = i / len;
      const white = Math.random() * 2 - 1;
      // One-pole low-pass whose cutoff falls over time: stone rooms lose highs first.
      const k = brightness * (1 - t) * 0.9 + 0.05;
      lp += (white - lp) * k;
      // A few early reflections in the first 60 ms.
      const early = i < ctx.sampleRate * 0.06 && Math.random() < 0.002 ? (Math.random() - 0.5) * 3 : 0;
      d[i] = (lp + early) * Math.pow(1 - t, decay);
    }
  }
  return buf;
}

export class AudioEngine {
  ctx: AudioContext | null = null;
  private master!: GainNode;
  private buses = new Map<Bus, GainNode>();
  /** Send into the location's reverb. */
  reverbIn!: GainNode;
  private reverb!: ConvolverNode;
  private muted = false;
  private masterLevel = 0.8;
  private readonly levels: Record<Bus, number> = { music: 0.7, ambience: 0.6, sfx: 0.8, ui: 0.6, voice: 0.6 };
  private readonly startListeners: ((ctx: AudioContext) => void)[] = [];

  /** Create (or resume) the context. Must be called from a user gesture. */
  start(): void {
    if (this.ctx) {
      void this.ctx.resume();
      return;
    }
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    this.ctx = ctx;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.ratio.value = 3;
    comp.attack.value = 0.01;
    comp.release.value = 0.25;
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : this.masterLevel;
    this.master.connect(comp).connect(ctx.destination);
    for (const bus of ['music', 'ambience', 'sfx', 'ui', 'voice'] as Bus[]) {
      const g = ctx.createGain();
      g.gain.value = this.levels[bus];
      g.connect(this.master);
      this.buses.set(bus, g);
    }
    this.reverb = ctx.createConvolver();
    this.reverb.buffer = makeImpulse(ctx, 3.6, 2.6, 0.35);
    this.reverbIn = ctx.createGain();
    this.reverbIn.gain.value = 1;
    const wet = ctx.createGain();
    wet.gain.value = 0.55;
    this.reverbIn.connect(this.reverb).connect(wet).connect(this.master);
    for (const fn of this.startListeners.splice(0)) fn(ctx);
  }

  onStart(fn: (ctx: AudioContext) => void): void {
    if (this.ctx) fn(this.ctx);
    else this.startListeners.push(fn);
  }

  bus(b: Bus): GainNode {
    const g = this.buses.get(b);
    if (!g) throw new Error('Audio not started');
    return g;
  }

  /** Swap the reverb for a different room (a church, a cloister, the open air). */
  setRoom(seconds: number, decay: number, brightness: number): void {
    if (!this.ctx) return;
    this.reverb.buffer = makeImpulse(this.ctx, seconds, decay, brightness);
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    if (this.ctx) this.master.gain.setTargetAtTime(this.muted ? 0 : this.masterLevel, this.ctx.currentTime, 0.05);
    return this.muted;
  }

  /** Set the volumes (0–1) from the settings; applies now or when audio starts. */
  setVolumes(v: { master: number; music: number; ambience: number; sfx: number; voices: number }): void {
    this.masterLevel = v.master;
    Object.assign(this.levels, { music: v.music, ambience: v.ambience, sfx: v.sfx, ui: Math.max(0.35, v.sfx * 0.8), voice: v.voices });
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.muted ? 0 : this.masterLevel, t, 0.05);
    for (const [bus, g] of this.buses) g.gain.setTargetAtTime(this.levels[bus], t, 0.05);
  }

  get isMuted(): boolean {
    return this.muted;
  }
}
