/**
 * A diorama stage: everything placed in a scene (terrain, water, sky, buildings,
 * billboards, lights, flames, particles), kept together to update and dispose at once.
 * Positions are map coordinates in art pixels.
 */

import type * as THREE from 'three';
import { type Flicker, GameLight, type WorldRenderer } from '../engine/diorama/renderer';
import { SY } from '../engine/diorama/space';
import type { Art } from '../pixel/buildings';
import type { PixelImage } from '../pixel/pixel';
import { flameSheet } from '../pixel/props';
import { TILE } from '../pixel/terrain';
import { Billboard, pixelTexture } from './billboard';
import type { Builder } from './building';
import { Emitter, type EmitterDef } from './particles';
import { clump, Scatter, type ScatterKind } from './scatter';
import { LightShaft } from './shafts';
import { type Sky, Sky as SkyBackdrop, type SkyDef } from './sky';
import { buildTerrain, type TerrainBuild, type TerrainDef } from './terrain';
import { Water, type WaterColours } from './water';

export const tiles = (n: number): number => n * TILE;

let flameTex: { a: THREE.Texture; w: number; h: number; n: number } | null = null;
let candleTex: { a: THREE.Texture; w: number; h: number; n: number } | null = null;

export class Stage {
  readonly billboards: Billboard[] = [];
  readonly lights: GameLight[] = [];
  readonly emitters: Emitter[] = [];
  readonly buildings: Builder[] = [];
  readonly shafts: LightShaft[] = [];
  readonly scatters: Scatter[] = [];
  private readonly flames: { b: Billboard; phase: number; speed: number }[] = [];
  terrain: TerrainBuild | null = null;
  water: Water | null = null;
  sky: Sky | null = null;

  constructor(readonly r: WorldRenderer) {}

  get scene(): THREE.Scene {
    return this.r.scene;
  }

  ground(def: TerrainDef, water?: WaterColours): TerrainBuild {
    const t = buildTerrain(def);
    this.terrain = t;
    this.scene.add(t.group);
    // Only maps with open water get the sea; the void around a room stays dark.
    if (def.ground.some((row) => row.includes('~')) && t.ground.shore.some((d) => d > 0)) {
      this.water = new Water(t.ground.shore, t.ground.w, t.ground.h, water);
      this.scene.add(this.water.mesh);
      this.r.mirrors.add(this.water);
    }
    return t;
  }

  addSky(def: SkyDef, height = 220): Sky {
    const w = this.terrain?.ground.w ?? 600;
    this.sky = new SkyBackdrop(-600, w + 600, -2, height, def);
    this.scene.add(this.sky.mesh);
    return this.sky;
  }

  /** Put up a building, standing `h` art pixels up (on a terrace, say). */
  addBuilding(b: Builder, h = 0): Builder {
    this.buildings.push(b);
    b.group.position.y += h * SY;
    this.scene.add(b.group);
    for (const l of b.lights) this.addLight(l.x, l.y, l.h + h, l.r, l.color, l.intensity);
    return b;
  }

  /**
   * Stand an image up at (x, y), its anchor (default bottom centre) on the ground. Standing
   * decor is solid at its foot unless `solid` says otherwise (a width, or false to walk through).
   */
  addImage(img: PixelImage, x: number, y: number, opts: { h?: number; glow?: PixelImage | null; anchor?: readonly [number, number]; flip?: boolean; shadow?: boolean; solid?: number | false } = {}): Billboard {
    const b = Billboard.fromImage(img, { glow: opts.glow ?? null, anchor: opts.anchor ?? [img.w / 2, img.h - 1], castShadow: opts.shadow ?? true });
    b.x = x;
    b.y = y;
    b.h = opts.h ?? this.heightAt(x, y);
    b.flip = !!opts.flip;
    b.footprint = opts.solid;
    this.billboards.push(b);
    this.scene.add(b.mesh);
    return b;
  }

  /**
   * What standing decor a figure bumps into: the foot of everything on the ground and tall
   * enough to be in the way (a third of its width, the trunk of a tree), unless it asked for
   * another width or to be walked through. Hung, floating and small things have none.
   */
  footprints(): [number, number, number, number][] {
    const out: [number, number, number, number][] = [];
    for (const b of this.billboards) {
      if (b.footprint === false) continue;
      if (b.footprint === undefined && (b.frameH * b.scale < 18 || Math.abs(b.h - this.heightAt(b.x, b.y)) > 2)) continue;
      const w = b.footprint ?? Math.max(6, Math.min(30, b.frameW * b.scale * 0.32));
      out.push([b.x - w / 2, b.y - 3, w, 5]);
    }
    return out;
  }

  /** Stand generated art (with its glow and lights) at (x, y). */
  addArt(art: Art & { anchor: readonly [number, number] }, x: number, y: number, opts: { h?: number; flip?: boolean; solid?: number | false } = {}): Billboard {
    const glow = art.e.data.some((v, i) => i % 4 !== 3 && v > 0) ? art.e : null;
    const b = this.addImage(art.a, x, y, { ...opts, glow, anchor: art.anchor });
    for (const l of art.lights) this.addLight(x + (l.x - art.anchor[0]), y + 1, b.h + (art.anchor[1] - l.y), l.r, l.color, l.intensity);
    return b;
  }

  addShaft(from: readonly [number, number, number], to: readonly [number, number, number], w0: number, w1: number, color: string, intensity = 0.35): LightShaft {
    const s = new LightShaft(from, to, w0, w1, color, intensity);
    this.shafts.push(s);
    this.scene.add(s.mesh);
    return s;
  }

  /**
   * Scatter small clumps over the tiles whose ground character is in `on`, with a
   * density per tile, avoiding the given rectangles.
   */
  scatter(kind: ScatterKind, on: string, perTile: number, seed: number, avoid: readonly (readonly [number, number, number, number])[] = []): void {
    const t = this.terrain;
    if (!t) return;
    const variants = [0, 1, 2].map((v) => clump(kind, seed * 7 + v, kind === 'reedlet' ? '#8E9A5A' : undefined));
    const pts: [number, number, number][][] = [[], [], []];
    const rows = t.model.rows;
    const cols = t.model.cols;
    let k = 0;
    for (let ty = 0; ty < rows; ty++) {
      for (let tx = 0; tx < cols; tx++) {
        const ch = t.def.ground[ty]?.[tx] ?? ' ';
        if (!on.includes(ch)) continue;
        for (let i = 0; i < perTile; i++) {
          k++;
          const x = tx * TILE + ((k * 7919 + seed * 31) % 1000) / 1000 * TILE;
          const y = ty * TILE + ((k * 104729 + seed * 17) % 1000) / 1000 * TILE;
          if (avoid.some(([ax, ay, aw, ad]) => x >= ax && x < ax + aw && y >= ay && y < ay + ad)) continue;
          pts[k % 3]!.push([x, y, t.model.heightAt(x, y)]);
        }
      }
    }
    variants.forEach((img, i) => {
      if (!pts[i]!.length) return;
      const s = new Scatter(img, pts[i]!);
      this.scatters.push(s);
      this.scene.add(s.mesh);
    });
  }

  heightAt(x: number, y: number): number {
    return this.terrain ? this.terrain.model.heightAt(x, y) : 0;
  }

  addLight(x: number, y: number, h: number, radius: number, color: string, intensity = 1, flicker: Flicker = 'none'): GameLight {
    const l = new GameLight(x, y, h, radius, color, intensity, flicker);
    this.lights.push(l);
    this.r.lights.add(l);
    return l;
  }

  addEmitter(def: EmitterDef, seed = 1): Emitter {
    const e = new Emitter(def, seed, this.r.quality.particles);
    this.emitters.push(e);
    this.scene.add(e.points);
    return e;
  }

  /** A burning flame at (x, y) and height h, with its flickering light and embers. */
  addFlame(x: number, y: number, h: number, opts: { light?: number; embers?: boolean } = {}): Billboard {
    if (!flameTex) {
      const f = flameSheet(4, 9, 14);
      flameTex = { a: pixelTexture(f.a), w: f.w, h: f.h, n: 4 };
    }
    const b = new Billboard(flameTex.a, flameTex.w, flameTex.h, { cols: flameTex.n, rows: 1, anchor: [flameTex.w / 2, flameTex.h - 1], unlit: true, castShadow: false });
    b.x = x;
    b.y = y;
    b.h = h;
    this.billboards.push(b);
    this.flames.push({ b, phase: Math.random() * 4, speed: 9 + Math.random() * 3 });
    this.scene.add(b.mesh);
    this.addLight(x, y + 3, h + 6, opts.light ?? 80, '#FF9A48', 0.8, 'flame');
    if (opts.embers !== false) this.addEmitter({ kind: 'ember', area: [x - 2, y, 4, 1], heights: [h + 8, h + 11], count: 2.5, color: '#FFA040', size: 1.2, intensity: 1.6 }, Math.floor(x * 7 + y));
    return b;
  }

  /** A torch: a full flame whose light can be turned up and down (the flame hidden). */
  addTorch(x: number, y: number, h: number, radius = 80): { flame: Billboard; light: GameLight } {
    const flame = this.addFlame(x, y, h, { light: radius, embers: false });
    return { flame, light: this.lights[this.lights.length - 1]! };
  }

  /** A candle flame at (x, y), height h: small, steady, a warm pool of light. */
  addCandle(x: number, y: number, h: number, light = 0.5, radius = 46): { flame: Billboard; light: GameLight } {
    if (!candleTex) {
      const f = flameSheet(4, 5, 8, 7);
      candleTex = { a: pixelTexture(f.a), w: f.w, h: f.h, n: 4 };
    }
    const b = new Billboard(candleTex.a, candleTex.w, candleTex.h, { cols: candleTex.n, rows: 1, anchor: [candleTex.w / 2, candleTex.h - 1], unlit: true, castShadow: false });
    b.x = x;
    b.y = y;
    b.h = h;
    this.billboards.push(b);
    this.flames.push({ b, phase: Math.random() * 4, speed: 6 + Math.random() * 2 });
    this.scene.add(b.mesh);
    const l = this.addLight(x, y + 2, h + 4, radius, '#FFB866', light, 'candle');
    return { flame: b, light: l };
  }

  update(dt: number, time: number): void {
    for (const f of this.flames) f.b.setFrame(Math.floor(time * f.speed + f.phase) % 4, 0);
    for (const b of this.billboards) b.sync();
    for (const e of this.emitters) e.update(dt, time);
    for (const s of this.shafts) s.update(time);
    this.water?.update(time);
    this.sky?.update(time);
  }

  dispose(): void {
    for (const b of this.billboards) b.dispose();
    for (const l of this.lights) this.r.lights.delete(l);
    for (const e of this.emitters) e.dispose();
    for (const s of this.shafts) s.dispose();
    for (const s of this.scatters) s.dispose();
    for (const b of this.buildings) b.group.removeFromParent();
    if (this.water) {
      this.r.mirrors.delete(this.water);
      this.water.dispose();
    }
    this.sky?.dispose();
    this.terrain?.group.removeFromParent();
  }
}
