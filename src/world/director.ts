/**
 * The director runs cinematics: it moves the camera (eased pans that can follow an
 * actor), shakes the screen, flashes it, and waits. Everything returns a promise, so a
 * cutscene reads as a plain sequence of awaits.
 */

import { prefs } from '../engine/prefs';

/** Logical screen units per art pixel. */
const PX = 3;

/** What the director needs of a renderer. */
export interface Screen {
  view: { shakeX: number; shakeY: number };
  screen: { flash: number };
}

export interface Bounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

interface Pan {
  from: [number, number, number];
  to: [number, number, number];
  t: number;
  dur: number;
  done: () => void;
}

const ease = (t: number): number => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

export class Director {
  /** When set, the camera is the director's; otherwise the scene follows the player. */
  active = false;
  /** Camera target while the director holds it: map x, y and height above the ground. */
  cam: [number, number, number] = [0, 0, 0];
  private pan: Pan | null = null;
  private shakeT = 0;
  private shakeDur = 0;
  private shakeAmp = 0;
  private flashV = 0;
  private waits: { t: number; done: () => void }[] = [];

  constructor(
    private readonly r: Screen,
    /** Where the camera target may go. */
    readonly bounds: Bounds,
  ) {}

  /** Take the camera from its current position. */
  take(x: number, y: number, h = 0): void {
    this.active = true;
    this.cam = [x, y, h];
  }

  release(): void {
    this.active = false;
    this.pan = null;
  }

  panTo(x: number, y: number, seconds: number, h = 0): Promise<void> {
    this.pan?.done();
    return new Promise((done) => {
      this.pan = { from: [...this.cam], to: [x, y, h], t: 0, dur: Math.max(0.01, seconds), done };
    });
  }

  shake(amplitude: number, seconds: number): void {
    this.shakeAmp = amplitude * prefs.shake;
    this.shakeDur = seconds;
    this.shakeT = seconds;
  }

  flash(v = 0.8): void {
    this.flashV = v;
  }

  wait(seconds: number): Promise<void> {
    return new Promise((done) => this.waits.push({ t: seconds, done }));
  }

  clamp(x: number, y: number): [number, number] {
    const b = this.bounds;
    return [Math.min(b.maxX, Math.max(b.minX, x)), Math.min(b.maxY, Math.max(b.minY, y))];
  }

  update(dt: number): void {
    if (this.pan) {
      const p = this.pan;
      p.t += dt;
      const k = ease(Math.min(1, p.t / p.dur));
      this.cam = [p.from[0] + (p.to[0] - p.from[0]) * k, p.from[1] + (p.to[1] - p.from[1]) * k, p.from[2] + (p.to[2] - p.from[2]) * k];
      if (p.t >= p.dur) {
        this.pan = null;
        p.done();
      }
    }
    for (let i = this.waits.length - 1; i >= 0; i--) {
      const w = this.waits[i]!;
      w.t -= dt;
      if (w.t <= 0) {
        this.waits.splice(i, 1);
        w.done();
      }
    }
    // Screen shake: decaying jitter, whole art pixels so the world stays crisp.
    const v = this.r.view;
    if (this.shakeT > 0) {
      this.shakeT -= dt;
      const a = this.shakeAmp * Math.max(0, this.shakeT / this.shakeDur);
      v.shakeX = Math.round(((Math.random() * 2 - 1) * a) / PX) * PX;
      v.shakeY = Math.round(((Math.random() * 2 - 1) * a) / PX) * PX;
    } else {
      v.shakeX = 0;
      v.shakeY = 0;
    }
    this.flashV = Math.max(0, this.flashV - dt * 2.5);
    this.r.screen.flash = this.flashV;
  }
}
