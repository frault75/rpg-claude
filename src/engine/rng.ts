/** Seeded randomness. Every generator takes a seed so the same art is drawn every time. */

/** 32-bit FNV-1a hash of a string, used to turn names into seeds. */
export function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Mulberry32: small, fast, good enough for art and scripted combat. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Rng {
  private readonly next: () => number;
  readonly seed: number;

  constructor(seed: number | string) {
    this.seed = typeof seed === 'string' ? hashString(seed) : seed >>> 0;
    this.next = mulberry32(this.seed);
  }

  /** Uniform in [0, 1). */
  float(): number {
    return this.next();
  }

  /** Uniform in [min, max). */
  range(min: number, max: number): number {
    return min + (max - min) * this.next();
  }

  /** Integer in [min, max] inclusive. */
  int(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }

  chance(p: number): boolean {
    return this.next() < p;
  }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new Error('Rng.pick on empty list');
    return items[Math.floor(this.next() * items.length)]!;
  }

  /** Roughly normal (sum of three uniforms), centred on 0 with the given spread. */
  jitter(spread: number): number {
    return ((this.next() + this.next() + this.next()) / 3 - 0.5) * 2 * spread;
  }

  /** A child generator whose sequence depends only on this seed and the label. */
  fork(label: string): Rng {
    return new Rng((this.seed ^ hashString(label)) >>> 0);
  }
}
