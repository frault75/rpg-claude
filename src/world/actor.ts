/**
 * Actors: chibi figures that stand, breathe and walk on a map in four directions, with a
 * soft contact shadow. Sheets are drawn once per character and shared.
 */

import type * as THREE from 'three';
import { type CharSpec, characterSheet, DIRS, type Dir, FRAME_H, FRAME_W, FRAMES } from '../pixel/characters';
import { hex, PixelImage } from '../pixel/pixel';
import { LAYER, PixelSprite, PX, pixelTexture } from '../pixel/sprite';

const sheets = new Map<string, THREE.Texture>();
let shadowTex: THREE.Texture | null = null;
let rippleTex: THREE.Texture | null = null;
const RIPPLE_FRAMES = 4;

/** Rings spreading on the water around a wading figure. */
function rippleTexture(): THREE.Texture {
  if (!rippleTex) {
    const img = new PixelImage(22 * RIPPLE_FRAMES, 8);
    const foam = hex('#D8E8F2');
    for (let f = 0; f < RIPPLE_FRAMES; f++) {
      const rx = 7 + f * 1.2;
      const ry = 2 + f * 0.4;
      for (let a = 0; a < 96; a++) {
        const t = (a / 96) * Math.PI * 2;
        // The ring breaks up as it spreads.
        if (Math.sin(t * 5 + f * 2) < -0.2 + f * 0.25) continue;
        img.set(f * 22 + Math.round(11 + Math.cos(t) * rx), Math.round(4 + Math.sin(t) * ry), foam);
      }
    }
    rippleTex = pixelTexture(img);
  }
  return rippleTex;
}

function sheet(spec: CharSpec): THREE.Texture {
  let t = sheets.get(spec.id);
  if (!t) {
    t = pixelTexture(characterSheet(spec));
    sheets.set(spec.id, t);
  }
  return t;
}

function shadowTexture(): THREE.Texture {
  if (!shadowTex) {
    const img = new PixelImage(16, 6);
    img.ellipse(8, 3, 7.5, 2.6, [0, 0, 0, 255]);
    shadowTex = pixelTexture(img);
  }
  return shadowTex;
}

/** Walking speed in world units per second. */
export const WALK_SPEED = 150;
const STEP_TIME = 0.15;

export class Actor {
  readonly sprite: PixelSprite;
  readonly shadow: PixelSprite;
  x = 0;
  y = 0;
  dir: Dir = 'down';
  speed = WALK_SPEED;
  visible = true;
  /** Art pixels hidden under water (0 on dry land). */
  wade = 0;
  /** True while moving this frame. */
  moving = false;
  /** Set on the frame a foot lands, for footstep sounds. */
  stepped = false;
  private walkClock = 0;
  private walkFrame = 0;
  private idleClock = Math.random() * 2;
  private path: [number, number][] = [];
  private arrived: (() => void) | null = null;
  private ripple: PixelSprite | null = null;
  private clock = 0;

  constructor(
    readonly id: string,
    readonly spec: CharSpec,
    private readonly world: THREE.Scene,
  ) {
    this.sprite = new PixelSprite(sheet(spec), FRAME_W, FRAME_H, { cols: FRAMES.length, rows: DIRS.length }, [FRAME_W / 2, FRAME_H - 1]);
    this.shadow = new PixelSprite(shadowTexture(), 16, 6, { cols: 1, rows: 1 }, [8, 3]);
    this.shadow.layer = LAYER.decal;
    this.shadow.opacity = 0.32;
    world.add(this.shadow.mesh, this.sprite.mesh);
  }

  /** Walk along waypoints; resolves on arrival (or at once for an empty path). */
  walk(path: [number, number][]): Promise<void> {
    this.arrived?.();
    this.path = path.slice();
    if (!this.path.length) return Promise.resolve();
    return new Promise((resolve) => (this.arrived = resolve));
  }

  stop(): void {
    this.path = [];
    const a = this.arrived;
    this.arrived = null;
    a?.();
  }

  get walking(): boolean {
    return this.path.length > 0;
  }

  face(dx: number, dy: number): void {
    if (Math.abs(dx) > Math.abs(dy) * 1.1) this.dir = dx > 0 ? 'right' : 'left';
    else if (dy !== 0) this.dir = dy > 0 ? 'down' : 'up';
  }

  /** Move directly (player control); the caller handles collision. */
  step(dx: number, dy: number, dt: number): void {
    this.x += dx;
    this.y += dy;
    if (dx || dy) this.face(dx, dy);
    this.animate(dt, dx !== 0 || dy !== 0);
  }

  update(dt: number): void {
    if (!this.path.length) {
      if (!this.moving) this.animate(dt, false);
      this.moving = false;
      return;
    }
    const [tx, ty] = this.path[0]!;
    const dx = tx - this.x;
    const dy = ty - this.y;
    const d = Math.hypot(dx, dy);
    const len = this.speed * dt;
    if (d > 0.5) this.face(dx, dy);
    if (d <= len) {
      this.x = tx;
      this.y = ty;
      this.path.shift();
      if (!this.path.length) {
        const a = this.arrived;
        this.arrived = null;
        this.animate(dt, false);
        a?.();
        return;
      }
    } else {
      this.x += (dx / d) * len;
      this.y += (dy / d) * len;
    }
    this.animate(dt, true);
  }

  private animate(dt: number, moving: boolean): void {
    this.clock += dt;
    this.moving = moving;
    this.stepped = false;
    if (moving) {
      this.walkClock += dt;
      if (this.walkClock > STEP_TIME) {
        this.walkClock -= STEP_TIME;
        this.walkFrame = (this.walkFrame + 1) % 4;
        if (this.walkFrame % 2 === 1) this.stepped = true;
      }
    } else {
      this.walkFrame = 0;
      this.walkClock = STEP_TIME * 0.9;
      this.idleClock += dt;
    }
  }

  sync(): void {
    const row = DIRS.indexOf(this.dir);
    const col = this.moving ? 2 + this.walkFrame : this.idleClock % 1.6 < 0.8 ? 0 : 1;
    const s = this.sprite;
    s.setFrame(col, row);
    s.x = this.x;
    s.y = this.y;
    s.visible = this.visible;
    s.clipY = this.wade > 0 ? this.y - this.wade * PX + 0.5 : 1e9;
    s.sync();
    const sh = this.shadow;
    sh.x = this.x;
    sh.y = this.y;
    sh.visible = this.visible && this.wade === 0;
    sh.sync();
    if (this.wade > 0 && !this.ripple) {
      this.ripple = new PixelSprite(rippleTexture(), 22, 8, { cols: RIPPLE_FRAMES, rows: 1 }, [11, 4]);
      this.ripple.opacity = 0.75;
      this.world.add(this.ripple.mesh);
    }
    if (this.ripple) {
      const rp = this.ripple;
      rp.visible = this.visible && this.wade > 0;
      rp.x = this.x;
      rp.y = this.y - this.wade * PX + 2 * PX;
      rp.depth = this.y + 1;
      rp.setFrame(Math.floor(this.clock * 3) % RIPPLE_FRAMES, 0);
      rp.sync();
    }
  }

  dispose(): void {
    // Sheets are shared between actors; only the meshes are this actor's.
    this.sprite.dispose();
    this.shadow.dispose();
    this.ripple?.dispose();
  }
}
