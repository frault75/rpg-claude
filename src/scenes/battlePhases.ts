/**
 * How a boss's phase change looks on the field (DESIGN.md §5.15), beyond its banner:
 * - High Water (B1): the Great Snail's shell cracks on a glowing spiral of writing, and
 *   Gaudry's torches come down the causeway from the Abbey.
 * - The Clean Page (B5): the church folds flat into the Book. The floor turns to ruled
 *   vellum, the nave behind Aumery becomes a page with the great initial M of MERCY in
 *   gold, and he stands in it gilded.
 */

import * as THREE from 'three';
import { SZ, world } from '../engine/diorama/space';
import type { GameLight, WorldRenderer } from '../engine/diorama/renderer';
import { hex, PixelImage } from '../pixel/pixel';
import type { BattleSet } from '../maps/battleSets';
import { Billboard, pixelTexture } from '../world3d/billboard';
import { type Stage, tiles } from '../world3d/stage';

/** What the staging needs to know of a figure on the field. */
export interface FigureView {
  x: number;
  y: number;
  ox: number;
  alpha: number;
  /** A steady glow under the hit flash (the gilding). */
  gild: number;
}

export class PhaseStaging {
  private spiral: Billboard | null = null;
  private torches: { flame: Billboard; light: GameLight; x: number; y: number; to: [number, number] }[] = [];
  private torchT = -1;
  private page: { floor: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshLambertMaterial>; back: Billboard; t: number; light: GameLight } | null = null;
  private readonly gilded = new Set<string>();

  constructor(
    private readonly r: WorldRenderer,
    private readonly stage: Stage,
    private readonly set: BattleSet,
    encounter: string,
  ) {
    if (encounter === 'b1') {
      // Gaudry's Brothers, waiting at the Abbey end of the causeway, unlit until High Water.
      const [px, py] = set.party[2] ?? [400, 90];
      for (let i = 0; i < 4; i++) {
        const x = px + 96 + i * 12;
        const y = py - 40 + i * 20;
        const c = stage.addTorch(x, y, 20, 70);
        c.flame.visible = false;
        c.light.intensity = 0;
        this.torches.push({ flame: c.flame, light: c.light, x, y, to: [px + 44 + i * 8, py - 36 + i * 20] });
      }
    }
  }

  /** A phase change has been announced. */
  trigger(id: string | undefined, unitOf: (kind: string) => string | undefined): void {
    if (id === 'highWater') {
      const snail = unitOf('greatSnail');
      if (snail && !this.spiral) {
        const { a, e } = spiralOfWriting();
        this.spiral = Billboard.fromImage(a, { glow: e, anchor: [a.w / 2, a.h / 2], castShadow: false });
        this.spiral.h = 43;
        this.r.scene.add(this.spiral.mesh);
        this.spiralOf = snail;
      }
      this.torchT = 0;
      for (const t of this.torches) {
        t.flame.visible = true;
        t.light.intensity = 0.7;
      }
    }
    if (id === 'cleanPage' && !this.page) {
      this.page = this.foldIntoThePage();
      const aumery = unitOf('aumery');
      if (aumery) this.gilded.add(aumery);
    }
  }

  private spiralOf: string | null = null;

  update(dt: number, figure: (unit: string) => FigureView | undefined): void {
    if (this.spiral && this.spiralOf) {
      const f = figure(this.spiralOf);
      if (f) {
        // The shell's centre sits 8 pixels behind the snail's foot anchor, 43 up.
        this.spiral.x = f.x + f.ox - 8;
        this.spiral.y = f.y + 1;
        this.spiral.opacity = f.alpha;
        this.spiral.visible = f.alpha > 0.05;
        this.spiral.sync();
      }
    }
    if (this.torchT >= 0 && this.torchT < 1) {
      // The torches come down the causeway, slowly, while the fight goes on.
      this.torchT = Math.min(1, this.torchT + dt / 14);
      for (const t of this.torches) {
        t.flame.x = t.x + (t.to[0] - t.x) * this.torchT;
        t.flame.y = t.y + (t.to[1] - t.y) * this.torchT;
        t.light.x = t.flame.x;
        t.light.y = t.flame.y + 2;
      }
    }
    if (this.page && this.page.t < 1) {
      const p = this.page;
      p.t = Math.min(1, p.t + dt / 1.1);
      const k = p.t * p.t * (3 - 2 * p.t);
      p.floor.material.opacity = Math.min(1, k * 1.4);
      p.back.h = -112 * (1 - k);
      p.back.opacity = k;
      p.back.sync();
      p.light.intensity = 0.2 * k;
    }
    for (const id of this.gilded) {
      const f = figure(id);
      if (f) f.gild = Math.min(0.22, (this.page?.t ?? 1) * 0.22);
    }
  }

  /** The floor becomes vellum and the nave behind him a page with the initial M of MERCY. */
  private foldIntoThePage(): NonNullable<PhaseStaging['page']> {
    const W = tiles(32);
    const D = tiles(9);
    const floorCanvas = vellumFloor(W, D);
    const geo = new THREE.PlaneGeometry(W, D * SZ);
    geo.rotateX(-Math.PI / 2);
    const floor = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ map: pixelTexture(floorCanvas), color: new THREE.Color(0.62, 0.58, 0.52), transparent: true, opacity: 0 }));
    const [fx, fy, fz] = world(tiles(1) + W / 2, tiles(2) + D / 2, 0.4);
    floor.position.set(fx, fy, fz);
    floor.receiveShadow = true;
    this.r.scene.add(floor);
    const [ax] = this.set.enemies[1] ?? [tiles(14), 0];
    // The page fills the nave wall; the initial stands behind Aumery.
    const { a, e } = initialPage(W, ax - tiles(1));
    const back = Billboard.fromImage(a, { glow: e, anchor: [a.w / 2, a.h - 1], castShadow: false });
    back.x = tiles(1) + W / 2;
    back.y = tiles(2.4);
    back.h = -112;
    back.opacity = 0;
    this.r.scene.add(back.mesh);
    const light = this.stage.addLight(ax, tiles(3), 60, 150, '#FFD890', 0, 'none');
    return { floor, back, t: 0, light };
  }

  /** On a retry, the field is as it was. */
  reset(): void {
    this.disposeAdded();
    this.torchT = -1;
    for (const t of this.torches) {
      t.flame.visible = false;
      t.light.intensity = 0;
      t.flame.x = t.x;
      t.flame.y = t.y;
    }
    this.gilded.clear();
  }

  private disposeAdded(): void {
    if (this.spiral) {
      this.spiral.dispose();
      this.spiral = null;
      this.spiralOf = null;
    }
    if (this.page) {
      this.page.floor.removeFromParent();
      this.page.floor.geometry.dispose();
      this.page.floor.material.map?.dispose();
      this.page.floor.material.dispose();
      this.page.back.dispose();
      this.page.light.intensity = 0;
      this.page = null;
    }
  }

  dispose(): void {
    this.disposeAdded();
  }
}

/** A crack across the shell and, inside, a spiral of gold writing that glows. */
function spiralOfWriting(): { a: PixelImage; e: PixelImage } {
  const S = 56;
  const a = new PixelImage(S, S);
  const e = new PixelImage(S, S);
  const gold = hex('#F2C850');
  const ink = hex('#3A2410');
  // The crack: a jagged dark line through the whorls.
  let y = 6;
  for (let x = 10; x < 46; x++) {
    y += ((x * 7) % 5) - 2 > 0 ? 1 : (x * 3) % 4 === 0 ? -1 : 0;
    a.set(x, Math.max(2, Math.min(S - 3, y + 14)), ink);
    a.set(x, Math.max(2, Math.min(S - 3, y + 15)), hex('#120A04'));
  }
  // The spiral: short strokes like letters, along an Archimedean curve.
  for (let i = 0; i < 260; i++) {
    const th = i * 0.12;
    const r = 2 + th * 1.55;
    if (r > 24) break;
    if (i % 5 === 4) continue; // gaps between the words
    const x = Math.round(S / 2 + Math.cos(th) * r);
    const yy = Math.round(S / 2 + Math.sin(th) * r * 0.96);
    a.set(x, yy, gold);
    e.set(x, yy, hex('#D8A030'));
    if (i % 3 === 0) {
      a.set(x, yy - 1, gold);
      e.set(x, yy - 1, hex('#8A6020'));
    }
  }
  return { a, e };
}

/** Ruled vellum with lines of faint writing and a vine border: the floor of the page. */
function vellumFloor(w: number, d: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = d;
  const g = c.getContext('2d')!;
  g.fillStyle = '#DCCCA8';
  g.fillRect(0, 0, w, d);
  for (let i = 0; i < 1600; i++) {
    g.fillStyle = `rgba(120, 90, 50, ${0.05 + (i % 4) * 0.02})`;
    g.fillRect((i * 7919) % w, (i * 104729) % d, 1 + (i % 3), 1);
  }
  g.fillStyle = 'rgba(160, 120, 90, 0.35)';
  for (let y = 18; y < d - 10; y += 9) g.fillRect(24, y, w - 48, 1);
  // Lines of writing, scraped pale.
  for (let y = 15; y < d - 12; y += 9)
    for (let x = 28; x < w - 30; ) {
      const len = 4 + ((x * 13 + y * 7) % 14);
      g.fillStyle = 'rgba(70, 46, 28, 0.28)';
      g.fillRect(x, y, len, 2);
      x += len + 3;
    }
  // The border: gold bars and leaves at the edges.
  g.fillStyle = '#C9A23C';
  g.fillRect(8, 6, w - 16, 3);
  g.fillRect(8, d - 9, w - 16, 3);
  const colours = ['#24408E', '#B0302A', '#3E7A5A'];
  for (let x = 16, k = 0; x < w - 16; x += 22, k++) {
    g.fillStyle = colours[k % 3]!;
    g.fillRect(x, 2, 6, 4);
    g.fillRect(x + 8, d - 6, 6, 4);
  }
  return c;
}

/** The page behind Aumery: vellum, the initial M of MERCY in gold with lapis and rose
 * in it, the rest of the word in red, and lines of the names of Hollin. */
function initialPage(W: number, cx: number): { a: PixelImage; e: PixelImage } {
  const H = 112;
  const a = new PixelImage(W, H);
  const e = new PixelImage(W, H);
  const vellum = hex('#D8C8A4');
  const shade = hex('#C8B690');
  const rule = hex('#B8A07C');
  const gold = hex('#D9A52E');
  const goldHi = hex('#FFE08A');
  const lapis = hex('#24408E');
  const rose = hex('#C25A72');
  const red = hex('#A82A1E');
  const writing = hex('#5A4028');
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) a.set(x, y, (x * 31 + y * 17) % 23 === 0 ? shade : vellum);
  for (let y = 10; y < H - 6; y += 8) for (let x = 6; x < W - 6; x++) if (x % 3 !== 0) a.set(x, y, rule);
  // The initial: a gold square with a lapis field, rose diaper, and the M in gold.
  const s = 84;
  const x0 = Math.round(cx - s / 2);
  const y0 = 10;
  for (let y = y0; y < y0 + s; y++)
    for (let x = x0; x < x0 + s; x++) {
      const edge = x < x0 + 4 || x >= x0 + s - 4 || y < y0 + 4 || y >= y0 + s - 4;
      if (edge) {
        a.set(x, y, (x + y) % 5 === 0 ? goldHi : gold);
        e.set(x, y, hex('#3A2A08'));
      } else a.set(x, y, (x + y) % 9 === 0 || (x - y) % 9 === 0 ? rose : lapis);
    }
  // The M: two posts and a V between, thick strokes of gold that glow.
  const stroke = (px: number, py: number) => {
    for (let dy = 0; dy < 2; dy++)
      for (let dx = 0; dx < 7; dx++) {
        const x = px + dx;
        const y = py + dy;
        if (x < x0 + 6 || x >= x0 + s - 6 || y < y0 + 6 || y >= y0 + s - 6) continue;
        a.set(x, y, dx === 0 ? goldHi : gold);
        e.set(x, y, hex('#5A4010'));
      }
  };
  for (let y = y0 + 14; y < y0 + s - 12; y += 2) {
    stroke(x0 + 12, y);
    stroke(x0 + s - 19, y);
  }
  for (let k = 0; k <= 30; k++) {
    stroke(x0 + 14 + Math.round(k * 0.7), y0 + 14 + k);
    stroke(x0 + s - 21 - Math.round(k * 0.7), y0 + 14 + k);
  }
  // ERCY, in red, and the names, in brown, on the ruled lines either side.
  const letters = [
    [0b1111, 0b1000, 0b1110, 0b1000, 0b1111],
    [0b1110, 0b1001, 0b1110, 0b1010, 0b1001],
    [0b0111, 0b1000, 0b1000, 0b1000, 0b0111],
    [0b1001, 0b1001, 0b0110, 0b0100, 0b0100],
  ];
  letters.forEach((rows, i) =>
    rows.forEach((bits, ry) => {
      for (let bx = 0; bx < 4; bx++)
        if (bits & (1 << (3 - bx)))
          for (let k = 0; k < 4; k++) a.set(x0 + s + 8 + i * 20 + bx * 4 + (k % 2), y0 + 50 + ry * 4 + Math.floor(k / 2), red);
    }),
  );
  for (let y = 9; y < H - 6; y += 8)
    for (let x = 10; x < W - 10; ) {
      const len = 3 + ((x * 11 + y * 5) % 9);
      const inInitial = x + len > x0 - 4 && x < x0 + s + 92 && y > y0 - 2 && y < y0 + s + 2;
      if (!inInitial) for (let k = 0; k < len; k++) a.set(x + k, y - 1, writing);
      x += len + 2;
    }
  return { a, e };
}
