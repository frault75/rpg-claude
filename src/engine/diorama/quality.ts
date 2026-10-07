/**
 * Quality tiers, so the same game runs on a phone and on a desktop GPU. The tier is
 * guessed from the device (and can be forced with ?quality=low|medium|high), and the
 * render scale then adapts to the frame time as the game runs.
 */

export type Tier = 'low' | 'medium' | 'high';

export interface Quality {
  tier: Tier;
  /** Highest device pixel ratio rendered. */
  maxDpr: number;
  /** Multisampling for the main pass (0 = off). */
  msaa: number;
  /** Shadow map size (0 = no shadows). */
  shadowMap: number;
  /** Point lights rendered at once; the nearest lights take the slots. */
  lights: number;
  /** Planar reflections in water, as a fraction of the screen resolution (0 = off). */
  reflections: number;
  bloom: boolean;
  dof: boolean;
  /** Particle counts are multiplied by this. */
  particles: number;
}

const TIERS: Record<Tier, Quality> = {
  low: { tier: 'low', maxDpr: 1, msaa: 0, shadowMap: 512, lights: 4, reflections: 0, bloom: true, dof: false, particles: 0.4 },
  medium: { tier: 'medium', maxDpr: 1.5, msaa: 0, shadowMap: 1024, lights: 8, reflections: 0.35, bloom: true, dof: true, particles: 0.7 },
  high: { tier: 'high', maxDpr: 2, msaa: 4, shadowMap: 2048, lights: 12, reflections: 0.5, bloom: true, dof: true, particles: 1 },
};

export interface DeviceHints {
  coarsePointer: boolean;
  memoryGb: number | undefined;
  cores: number | undefined;
  shortSide: number;
  forced: string | null;
}

/** Pure, for tests: pick a tier from what the browser tells us. */
export function pickTier(h: DeviceHints): Tier {
  if (h.forced === 'low' || h.forced === 'medium' || h.forced === 'high') return h.forced;
  const mobile = h.coarsePointer || h.shortSide < 600;
  if (mobile) return (h.memoryGb ?? 4) >= 6 && (h.cores ?? 4) >= 8 ? 'medium' : 'low';
  if ((h.memoryGb ?? 8) < 4 || (h.cores ?? 8) < 4) return 'medium';
  return 'high';
}

export function quality(tier: Tier): Quality {
  return { ...TIERS[tier] };
}

export function detectQuality(): Quality {
  const nav = navigator as Navigator & { deviceMemory?: number };
  const tier = pickTier({
    coarsePointer: matchMedia?.('(pointer: coarse)').matches ?? false,
    memoryGb: nav.deviceMemory,
    cores: nav.hardwareConcurrency,
    shortSide: Math.min(screen.width, screen.height),
    forced: new URLSearchParams(location.search).get('quality'),
  });
  return quality(tier);
}

/**
 * Adjusts the render scale to hold the frame rate: down quickly when frames are slow,
 * back up slowly when there is headroom.
 */
export class AdaptiveScale {
  scale = 1;
  private slow = 0;
  private fast = 0;
  private avg = 16;

  constructor(
    readonly min = 0.55,
    readonly max = 1,
  ) {}

  /** Feed a frame time in ms; returns true when the scale changed. */
  frame(ms: number): boolean {
    this.avg = this.avg * 0.92 + Math.min(ms, 100) * 0.08;
    if (this.avg > 24) {
      this.slow++;
      this.fast = 0;
    } else if (this.avg < 13) {
      this.fast++;
      this.slow = 0;
    } else {
      this.slow = 0;
      this.fast = 0;
    }
    if (this.slow > 45 && this.scale > this.min) {
      this.scale = Math.max(this.min, this.scale - 0.1);
      this.slow = 0;
      return true;
    }
    if (this.fast > 240 && this.scale < this.max) {
      this.scale = Math.min(this.max, this.scale + 0.05);
      this.fast = 0;
      return true;
    }
    return false;
  }
}
