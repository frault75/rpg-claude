/**
 * Synthesised instruments (DESIGN.md §7.1): a chant voice through vowel formants,
 * an additive organ drone, bells with inharmonic partials, and noise beds.
 */

export const midiToHz = (m: number): number => 440 * Math.pow(2, (m - 69) / 12);

/** Medieval church modes as semitone steps from the final. */
export const MODES = {
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
} as const;

/** Pitch (MIDI) of a scale degree, which may be negative or above an octave. */
export function degreeToMidi(final: number, mode: readonly number[], degree: number): number {
  const n = mode.length;
  const oct = Math.floor(degree / n);
  const idx = ((degree % n) + n) % n;
  return final + oct * 12 + mode[idx]!;
}

/** Vowel formants for "ah", as sung by a male choir. */
const AH = [
  { f: 730, q: 6, g: 1 },
  { f: 1090, q: 8, g: 0.5 },
  { f: 2440, q: 10, g: 0.22 },
];

/** One sung note: two detuned saws through vowel formants, gentle vibrato. */
export function sing(ctx: AudioContext, out: AudioNode, midi: number, start: number, dur: number, level = 0.12): void {
  const hz = midiToHz(midi);
  const env = ctx.createGain();
  env.gain.setValueAtTime(0, start);
  env.gain.linearRampToValueAtTime(level, start + Math.min(0.35, dur * 0.3));
  env.gain.setValueAtTime(level, start + dur - 0.15);
  env.gain.linearRampToValueAtTime(0, start + dur + 0.45);
  const vib = ctx.createOscillator();
  vib.frequency.value = 4.8 + Math.random() * 0.6;
  const vibDepth = ctx.createGain();
  vibDepth.gain.setValueAtTime(0, start);
  vibDepth.gain.linearRampToValueAtTime(hz * 0.006, start + 0.6);
  vib.connect(vibDepth);
  const formants = AH.map(({ f, q, g }) => {
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = f;
    bp.Q.value = q;
    const fg = ctx.createGain();
    fg.gain.value = g;
    bp.connect(fg).connect(env);
    return bp;
  });
  for (const detune of [-6, 5]) {
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = hz;
    o.detune.value = detune;
    vibDepth.connect(o.frequency);
    for (const bp of formants) o.connect(bp);
    o.start(start);
    o.stop(start + dur + 0.6);
  }
  vib.start(start);
  vib.stop(start + dur + 0.6);
  env.connect(out);
}

/** A held organ drone (additive sines) that can be faded out. */
export function drone(ctx: AudioContext, out: AudioNode, midis: number[], level = 0.05): { stop: (at?: number) => void } {
  const g = ctx.createGain();
  g.gain.value = 0;
  g.gain.setTargetAtTime(level, ctx.currentTime, 2.5);
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.07;
  const lfoDepth = ctx.createGain();
  lfoDepth.gain.value = level * 0.3;
  lfo.connect(lfoDepth).connect(g.gain);
  lfo.start();
  const oscs: OscillatorNode[] = [lfo];
  for (const m of midis) {
    [1, 2, 3, 4].forEach((h, i) => {
      const o = ctx.createOscillator();
      o.frequency.value = midiToHz(m) * h;
      o.detune.value = (Math.random() - 0.5) * 4;
      const og = ctx.createGain();
      og.gain.value = [1, 0.35, 0.18, 0.08][i]!;
      o.connect(og).connect(g);
      o.start();
      oscs.push(o);
    });
  }
  g.connect(out);
  return {
    stop: (at = ctx.currentTime) => {
      g.gain.setTargetAtTime(0, at, 1.2);
      for (const o of oscs) o.stop(at + 6);
    },
  };
}

/** A bell: inharmonic partials with long, staggered decays. */
export function bell(ctx: AudioContext, out: AudioNode, hz: number, start: number, level = 0.2, length = 7): void {
  const partials = [
    { r: 0.5, a: 0.55, d: 1 },
    { r: 1, a: 1, d: 0.8 },
    { r: 1.183, a: 0.6, d: 0.6 },
    { r: 1.506, a: 0.5, d: 0.5 },
    { r: 2, a: 0.42, d: 0.42 },
    { r: 2.514, a: 0.3, d: 0.3 },
    { r: 2.662, a: 0.22, d: 0.25 },
    { r: 3.011, a: 0.16, d: 0.2 },
  ];
  for (const p of partials) {
    const o = ctx.createOscillator();
    o.frequency.value = hz * p.r;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(level * p.a * 0.25, start + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, start + length * p.d);
    o.connect(g).connect(out);
    o.start(start);
    o.stop(start + length * p.d + 0.1);
  }
}

/** A looping noise source (brown-ish), for sea, wind and breath. */
export function noiseSource(ctx: AudioContext, seconds = 3): AudioBufferSourceNode {
  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {
    last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
    d[i] = last * 3.5;
  }
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  return src;
}

/** A short burst of filtered noise (footsteps, quill scratches, ink). */
export function noiseBurst(ctx: AudioContext, out: AudioNode, start: number, dur: number, freq: number, q: number, level: number): void {
  const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = freq;
  bp.Q.value = q;
  const g = ctx.createGain();
  g.gain.value = level;
  src.connect(bp).connect(g).connect(out);
  src.start(start);
}
