/**
 * A stage: everything placed in an HD-2D scene (ground, water, sky, art, lights, flames,
 * particles), kept together so the scene can update and dispose it in one go.
 * Positions are world units (3 per art pixel); `tiles(n)` converts from map tiles.
 */

import type * as THREE from 'three';
import { Light, type Flicker, Shade } from '../engine/hd2d/light';
import { Emitter, type EmitterDef } from '../engine/hd2d/particles';
import type { WorldRenderer } from '../engine/hd2d/renderer';
import { SkySurface, type SkyDef, type WaterColours, WaterSurface } from '../engine/hd2d/surfaces';
import type { Art } from '../pixel/buildings';
import type { PixelImage } from '../pixel/pixel';
import { flameSheet } from '../pixel/props';
import { LAYER, PixelSprite, pixelTexture, PX } from '../pixel/sprite';
import { type Ground, type GroundPalette, KINDS, paintGround, TILE } from '../pixel/terrain';

export const tiles = (n: number): number => n * TILE * PX;

let flameTex: { a: THREE.Texture; e: THREE.Texture; w: number; h: number; n: number } | null = null;

export class Stage {
  readonly sprites: PixelSprite[] = [];
  readonly lights: Light[] = [];
  readonly shades: Shade[] = [];
  readonly emitters: Emitter[] = [];
  private readonly flames: { s: PixelSprite; phase: number; speed: number }[] = [];
  water: WaterSurface | null = null;
  sky: SkySurface | null = null;
  ground: Ground | null = null;

  constructor(readonly r: WorldRenderer) {}

  /** Paint the ground from a layout and lay water under it. Returns the ground data. */
  paint(layout: readonly string[], seed: number, palette?: GroundPalette, water?: WaterColours): Ground {
    const g = paintGround(layout, seed, palette);
    this.ground = g;
    const s = PixelSprite.fromImage(g.image, [0, 0]);
    s.layer = LAYER.ground;
    s.depth = 0;
    this.sprites.push(s);
    this.r.world.add(s.mesh);
    if (g.shore.some((d) => d > 0)) {
      const id = KINDS.indexOf('water');
      this.water = new WaterSurface(g.shore, (i) => g.kinds[i] === id, g.w, g.h, water);
      this.r.world.add(this.water.mesh);
    }
    return g;
  }

  addSky(x: number, y: number, w: number, h: number, def?: SkyDef): SkySurface {
    this.sky = new SkySurface(x, y, w, h, def);
    this.r.world.add(this.sky.mesh);
    return this.sky;
  }

  /** Place generated art with its anchor at (x, y); its lights come with it. */
  addArt(art: Art & { anchor: readonly [number, number] }, x: number, y: number, opts: { layer?: number; depth?: number; flip?: boolean; lights?: boolean } = {}): PixelSprite {
    const s = new PixelSprite(pixelTexture(art.a), art.a.w, art.a.h, { cols: 1, rows: 1 }, art.anchor, art.lights.length || hasGlow(art.e) ? pixelTexture(art.e) : null);
    s.x = x;
    s.y = y;
    s.flip = !!opts.flip;
    s.layer = opts.layer ?? LAYER.objects;
    if (opts.depth !== undefined) s.depth = opts.depth;
    this.sprites.push(s);
    this.r.world.add(s.mesh);
    if (opts.lights !== false) {
      for (const l of art.lights) {
        const lx = x + (opts.flip ? art.anchor[0] - l.x : l.x - art.anchor[0]) * PX;
        this.addLight(lx, y + (l.y - art.anchor[1]) * PX, l.r * PX, l.color, l.intensity);
      }
    }
    return s;
  }

  addImage(img: PixelImage, x: number, y: number, opts: { anchor?: readonly [number, number]; layer?: number; flip?: boolean } = {}): PixelSprite {
    const s = PixelSprite.fromImage(img, opts.anchor);
    s.x = x;
    s.y = y;
    s.flip = !!opts.flip;
    s.layer = opts.layer ?? LAYER.objects;
    this.sprites.push(s);
    this.r.world.add(s.mesh);
    return s;
  }

  addLight(x: number, y: number, radius: number, color: string, intensity = 1, flicker: Flicker = 'none'): Light {
    const l = new Light(x, y, radius, color, intensity, flicker);
    this.lights.push(l);
    this.r.lights.add(l.mesh);
    return l;
  }

  addShade(x: number, y: number, rx: number, ry: number, strength = 0.4): Shade {
    const s = new Shade(x, y, rx, ry, strength);
    this.shades.push(s);
    this.r.lights.add(s.mesh);
    return s;
  }

  addEmitter(def: EmitterDef, seed = 1): Emitter {
    const e = new Emitter(def, seed);
    this.emitters.push(e);
    this.r.fx.add(e.points);
    return e;
  }

  /** A burning flame (torch, brazier) with its flickering light and rising embers. */
  addFlame(x: number, y: number, opts: { light?: number; embers?: boolean; depth?: number } = {}): PixelSprite {
    if (!flameTex) {
      const f = flameSheet(4, 9, 14);
      flameTex = { a: pixelTexture(f.a), e: pixelTexture(f.e), w: f.w, h: f.h, n: 4 };
    }
    const s = new PixelSprite(flameTex.a, flameTex.w, flameTex.h, { cols: flameTex.n, rows: 1 }, [flameTex.w / 2, flameTex.h - 1], flameTex.e);
    s.x = x;
    s.y = y;
    s.layer = LAYER.objects;
    s.depth = opts.depth ?? y;
    s.glow = 0.9;
    this.sprites.push(s);
    this.flames.push({ s, phase: Math.random() * 4, speed: 9 + Math.random() * 3 });
    this.r.world.add(s.mesh);
    this.addLight(x, y - 10, opts.light ?? 230, '#FF9A48', 0.85, 'flame');
    if (opts.embers !== false) this.addEmitter({ kind: 'ember', rect: [x - 6, y - 30, 12, 8], count: 2.5, color: '#FFA040', size: 3, intensity: 1.4 }, Math.floor(x));
    return s;
  }

  update(dt: number, time: number): void {
    for (const f of this.flames) f.s.setFrame(Math.floor(time * f.speed + f.phase) % 4, 0);
    for (const s of this.sprites) s.sync();
    for (const l of this.lights) l.update(time);
    for (const s of this.shades) s.update(time);
    for (const e of this.emitters) e.update(dt, time);
    this.water?.update(time);
    this.sky?.update(time);
  }

  dispose(): void {
    for (const s of this.sprites) s.dispose();
    for (const l of this.lights) l.dispose();
    for (const s of this.shades) s.dispose();
    for (const e of this.emitters) e.dispose();
    this.water?.dispose();
    this.sky?.dispose();
  }
}

function hasGlow(img: PixelImage): boolean {
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) if (d[i]! + d[i + 1]! + d[i + 2]! > 0) return true;
  return false;
}
