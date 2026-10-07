/**
 * Actors in the diorama: figures standing upright on the ground, in four directions,
 * breathing when idle and walking in steps. They are lit and shadowed with the scene;
 * standing in water hides their legs under the surface by itself.
 */

import type * as THREE from 'three';
import { type CharSpec, characterSheet, DIRS, type Dir, FRAME_H, FRAME_W, FRAMES } from '../pixel/characters';
import { hex, PixelImage } from '../pixel/pixel';
import { Billboard, pixelTexture } from './billboard';

const sheets = new Map<string, THREE.Texture>();

function sheet(spec: CharSpec): THREE.Texture {
  let t = sheets.get(spec.id);
  if (!t) {
    t = pixelTexture(characterSheet(spec));
    sheets.set(spec.id, t);
  }
  return t;
}

export type Emote = 'alarm' | 'question' | 'silence' | 'note';
const EMOTES: Emote[] = ['alarm', 'question', 'silence', 'note'];
let emoteTex: THREE.Texture | null = null;

function emoteTexture(): THREE.Texture {
  if (!emoteTex) {
    const img = new PixelImage(14 * EMOTES.length, 14);
    const ink = hex('#1A1424');
    const paper = hex('#FBF6EA');
    const red = hex('#D8343A');
    EMOTES.forEach((e, i) => {
      const o = i * 14;
      img.ellipse(o + 7, 6, 6, 5.2, paper);
      img.set(o + 4, 11, paper);
      img.set(o + 3, 12, paper);
      if (e === 'alarm') {
        img.vline(o + 7, 2, 7, red);
        img.set(o + 7, 9, red);
      } else if (e === 'question') {
        img.hline(o + 6, o + 8, 2, ink);
        img.set(o + 9, 3, ink);
        img.set(o + 9, 4, ink);
        img.set(o + 8, 5, ink);
        img.set(o + 7, 6, ink);
        img.set(o + 7, 9, ink);
      } else if (e === 'silence') {
        for (const x of [4, 7, 10]) img.set(o + x, 6, ink);
      } else {
        img.vline(o + 8, 2, 7, ink);
        img.hline(o + 8, o + 10, 2, ink);
        img.rect(o + 6, 7, 2, 2, ink);
      }
    });
    img.outline(hex('#3A2E44'));
    emoteTex = pixelTexture(img);
  }
  return emoteTex;
}

export const WALK_SPEED = 52;
const STEP_TIME = 0.15;

export class Actor {
  readonly sprite: Billboard;
  x = 0;
  y = 0;
  /** Height of the ground under the feet (set by the scene from the terrain). */
  h = 0;
  dir: Dir = 'down';
  speed = WALK_SPEED;
  visible = true;
  moving = false;
  stepped = false;
  private walkClock = 0;
  private walkFrame = 0;
  private idleClock = Math.random() * 2;
  private path: [number, number][] = [];
  private arrived: (() => void) | null = null;
  private bubble: Billboard | null = null;
  private bubbleT = 0;
  private bubbleLen = 1;

  constructor(
    readonly id: string,
    readonly spec: CharSpec,
    private readonly scene: THREE.Scene,
  ) {
    this.sprite = new Billboard(sheet(spec), FRAME_W, FRAME_H, { cols: FRAMES.length, rows: DIRS.length, anchor: [FRAME_W / 2, FRAME_H - 1] });
    scene.add(this.sprite.mesh);
  }

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

  emote(kind: Emote, seconds = 1.4): void {
    if (!this.bubble) {
      this.bubble = new Billboard(emoteTexture(), 14, 14, { cols: EMOTES.length, rows: 1, anchor: [7, 13], unlit: true, castShadow: false });
      this.scene.add(this.bubble.mesh);
    }
    this.bubble.setFrame(EMOTES.indexOf(kind), 0);
    this.bubbleT = seconds;
    this.bubbleLen = seconds;
  }

  face(dx: number, dy: number): void {
    if (Math.abs(dx) > Math.abs(dy) * 1.1) this.dir = dx > 0 ? 'right' : 'left';
    else if (dy !== 0) this.dir = dy > 0 ? 'down' : 'up';
  }

  step(dx: number, dy: number, dt: number): void {
    this.x += dx;
    this.y += dy;
    if (dx || dy) this.face(dx, dy);
    this.animate(dt, dx !== 0 || dy !== 0);
  }

  update(dt: number): void {
    if (!this.path.length) {
      this.animate(dt, false);
      return;
    }
    const [tx, ty] = this.path[0]!;
    const dx = tx - this.x;
    const dy = ty - this.y;
    const d = Math.hypot(dx, dy);
    const len = this.speed * dt;
    if (d > 0.3) this.face(dx, dy);
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
    this.bubbleT = Math.max(0, this.bubbleT - dt);
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
    s.h = this.h;
    s.visible = this.visible;
    s.sync();
    if (this.bubble) {
      const b = this.bubble;
      b.visible = this.visible && this.bubbleT > 0;
      const age = this.bubbleLen - this.bubbleT;
      b.x = this.x + 6;
      b.y = this.y + 0.5;
      b.h = this.h + FRAME_H - 1 + (age < 0.12 ? (0.12 - age) * 20 : 0);
      b.sync();
    }
  }

  dispose(): void {
    this.sprite.dispose();
    this.bubble?.dispose();
  }
}
