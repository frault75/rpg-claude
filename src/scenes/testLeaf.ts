/**
 * Milestone (a) test leaf: one character and one building, to judge the art style.
 * Isot walks a meadow below Saint Ebb's on its island; the border lives around the page.
 * Keys 1–5 repaint the leaf in each location's palette; F frays Isot; E makes her speak.
 */

import type * as THREE from 'three';
import { drawAbbey } from '../art/architecture';
import { drawBird, drawGryllus, drawSnail } from '../art/drolleries';
import { drawRobedFigure, ISOT, type Pose } from '../art/figures';
import { Illuminator, type IlluminatedImage } from '../art/illuminator';
import { drawLandscape, drawTree, drawWaysideCross, type LandscapeLayout } from '../art/nature';
import { drawBanderole, drawBorder, drawLocationCard } from '../art/ornament';
import { type LocationPalette, PALETTE_ORDER, PALETTES, PIGMENTS } from '../art/palettes';
import { Shadow, Sprite, spriteGlobals } from '../art/sprite';
import { font } from '../art/text';
import { EbbNightAmbience } from '../audio/ambient';
import type { AudioEngine } from '../audio/engine';
import { footstep, pageTurn, quill } from '../audio/sfx';
import type { DebugInfo } from '../debug/overlay';
import type { Action, Input } from '../engine/input';
import { PAGE_H, TEXT_BLOCK } from '../engine/page';
import type { PageRenderer } from '../engine/renderer';
import { type Scene, smoothstep } from '../engine/scene';

const LAYER_GROUND = 0;
const LAYER_ACTORS = 1;
const LAYER_FRAME = 2;
const LAYER_UI = 3;

const SPEED = 120;
const FIGURE_SCALE = 1.4;

const LINES = [
  "That's not a monster. That's a gryllus. A head with legs.",
  "I don't lie. I emend.",
  'Seventy years at that desk, and no one remembers him but me.',
];

const shore = (x: number): number => 414 + 7 * Math.sin(x * 0.011) + 3 * Math.sin(x * 0.037 + 1.3);

const LAYOUT: LandscapeLayout = {
  width: TEXT_BLOCK.w,
  height: TEXT_BLOCK.h,
  horizon: 196,
  shore,
  causeway: { x: 586, top: 384, width: 34 },
  path: [
    [586, 414],
    [566, 462],
    [600, 512],
    [646, 560],
    [622, 640],
  ],
  keepClear: [
    { x: 150, y: 520, r: 30 },
    { x: 1010, y: 560, r: 30 },
    { x: 380, y: 486, r: 30 },
  ],
};

const BLOCKERS = [
  { x: 150, y: 520, r: 13 },
  { x: 1010, y: 560, r: 13 },
  { x: 380, y: 486, r: 26 },
];

interface Reveal {
  sprite: Sprite;
  t0: number;
  dur: number;
  target: number;
}

export class TestLeaf implements Scene {
  readonly name = 'test leaf';
  private palette: LocationPalette = PALETTES.ebbNight!;
  private time = 0;
  private readonly env: Sprite[] = [];
  private readonly shadows: Shadow[] = [];
  private isotShadow!: Shadow;
  private readonly frame: Sprite[] = [];
  private readonly isot: Record<Pose, Sprite>;
  private pose: Pose = 'stand';
  private x = 586;
  private y = 575;
  private facing: 1 | -1 = 1;
  private walkClock = 0;
  private walkFrame = 0;
  private reveals: Reveal[] = [];
  private frayed = false;
  private isotStage = 1;
  private banderole: { sprite: Sprite; born: number } | null = null;
  private lineIndex = 0;
  private card: Sprite | null = null;
  private cardBorn = 0;
  private snail!: Sprite;
  private snailX = 520;
  private snailDir = 1;
  private gradeFrom = PALETTES.ebbNight!.grade;
  private gradeT = 1;
  private readonly ambience = new EbbNightAmbience();
  private readonly unsubscribe: () => void;

  constructor(
    private readonly r: PageRenderer,
    private readonly input: Input,
    private readonly audio: AudioEngine,
  ) {
    r.setWorldView(0, 0, TEXT_BLOCK.h);
    this.isot = {
      stand: this.makeSprite(drawRobedFigure(ISOT, 'stand', 'isot', 3), r.world),
      stepA: this.makeSprite(drawRobedFigure(ISOT, 'stepA', 'isot', 3), r.world),
      stepB: this.makeSprite(drawRobedFigure(ISOT, 'stepB', 'isot', 3), r.world),
    };
    for (const sp of Object.values(this.isot)) sp.scale = FIGURE_SCALE;
    this.isotShadow = new Shadow(24, 7, 0.34);
    r.world.add(this.isotShadow.mesh);
    this.buildEnvironment();
    this.buildFrame();
    this.r.post.setGrade(this.palette.grade);
    this.startReveal(true);
    this.showCard();
    this.audio.onStart(() => this.ambience.start(this.audio));
    this.unsubscribe = this.input.onAction((a) => this.onAction(a));
  }

  // ---- construction ------------------------------------------------------------------------

  private makeSprite(image: IlluminatedImage, scene: THREE.Scene, seed?: number): Sprite {
    const s = new Sprite(image, seed);
    scene.add(s.mesh);
    return s;
  }

  private buildEnvironment(): void {
    for (const s of this.env) {
      s.mesh.removeFromParent();
      s.dispose();
    }
    this.env.length = 0;
    for (const sh of this.shadows) {
      sh.mesh.removeFromParent();
      sh.dispose();
    }
    this.shadows.length = 0;
    const p = this.palette;
    const ground = this.makeSprite(drawLandscape(p, LAYOUT, 'test-leaf'), this.r.world);
    ground.depth = -1e4;
    const abbey = this.makeSprite(drawAbbey(p), this.r.world);
    abbey.x = 586;
    abbey.y = 392;
    abbey.scale = 0.84;
    const trees = [
      { x: 150, y: 520, seed: 'tree-west' },
      { x: 1010, y: 560, seed: 'tree-east' },
    ].map((t) => {
      const s = this.makeSprite(drawTree(p, t.seed), this.r.world);
      s.x = t.x;
      s.y = t.y;
      return s;
    });
    const cross = this.makeSprite(drawWaysideCross(p), this.r.world);
    cross.x = 380;
    cross.y = 486;
    this.env.push(ground, abbey, ...trees, cross);
    for (const [x, y, rx, ry] of [
      [150, 522, 34, 10],
      [1010, 562, 34, 10],
      [380, 488, 32, 8],
    ] as const) {
      const sh = new Shadow(rx, ry, 0.3);
      sh.x = x;
      sh.y = y;
      this.r.world.add(sh.mesh);
      this.shadows.push(sh);
    }
  }

  private buildFrame(): void {
    for (const s of this.frame) {
      s.mesh.removeFromParent();
      s.dispose();
    }
    this.frame.length = 0;
    const p = this.palette;
    const border = this.makeSprite(drawBorder(p), this.r.frame);
    const bottom = TEXT_BLOCK.y + TEXT_BLOCK.h;
    this.snail = this.makeSprite(drawSnail(p.roles.accent, 'margin-snail', 1), this.r.frame);
    this.snail.y = bottom + 57;
    const gryllus = this.makeSprite(drawGryllus(p.roles.accent === PIGMENTS.vermilion ? PIGMENTS.verdigris : PIGMENTS.vermilion, 'margin-gryllus', 1), this.r.frame);
    gryllus.x = 980;
    gryllus.y = bottom + 58;
    gryllus.flip = true;
    const bird = this.makeSprite(drawBird(p.roles.barA, 'margin-bird'), this.r.frame);
    bird.x = 862;
    bird.y = TEXT_BLOCK.y - 15;
    const hint = this.makeSprite(this.hintImage(), this.r.frame);
    this.frame.push(border, this.snail, gryllus, bird, hint);
  }

  private hintImage(): IlluminatedImage {
    const il = new Illuminator(520, 40, 'hint');
    il.inkText('WASD / arrows walk   ·   E speak   ·   1–5 palettes   ·   F fray   ·   M sound   ·   ` debug', 0, 22, font(11.5, { italic: true }), 'left', 0.75);
    il.anchor = [0, 0];
    const img = il.finish();
    return img;
  }

  private showCard(): void {
    if (this.card) {
      this.card.mesh.removeFromParent();
      this.card.dispose();
    }
    const titles: Record<string, [string, string]> = {
      ebbNight: ["Saint Ebb's", 'where the sea comes twice a day'],
      lychford: ['Lychford', 'where the roses never die'],
      blanchwood: ['The Blanchwood', 'where the colour runs out'],
      margin: ['The Margin', 'where the forgotten go'],
      ebbDawn: ["Saint Ebb's", 'at dawn, at last'],
    };
    const [title, line] = titles[this.palette.id] ?? ['', ''];
    this.card = this.makeSprite(drawLocationCard(title, line, this.palette), this.r.frame);
    this.card.x = TEXT_BLOCK.x + 16;
    this.card.y = TEXT_BLOCK.y + 14;
    this.cardBorn = this.time;
    this.card.material.setOpacity(0);
  }

  private startReveal(includeIsot: boolean): void {
    const t = this.time;
    const order: [Sprite | undefined, number, number][] = [
      [this.env[0], 0, 1.6],
      [this.env[1], 0.35, 2.2],
      [this.env[2], 0.9, 1.4],
      [this.env[3], 1.0, 1.4],
      [this.env[4], 1.1, 1.3],
      ...this.frame.map((s, i): [Sprite, number, number] => [s, i === 0 ? 0.1 : 1.4 + i * 0.15, i === 0 ? 1.8 : 1.0]),
    ];
    if (includeIsot) for (const s of Object.values(this.isot)) order.push([s, 1.5, 1.4]);
    this.reveals = order
      .filter((o): o is [Sprite, number, number] => !!o[0])
      .map(([sprite, delay, dur]) => {
        sprite.material.stage = 0;
        return { sprite, t0: t + delay, dur, target: 1 };
      });
  }

  /** Jump to the end of any paint-in in progress. */
  finishReveal(): void {
    for (const rv of this.reveals) rv.sprite.material.stage = rv.target;
    this.reveals = [];
    this.cardBorn = this.time - 2.2;
  }

  // ---- input ---------------------------------------------------------------------------------

  private onAction(a: Action): void {
    if (a.startsWith('palette')) {
      const idx = Number(a.slice(-1)) - 1;
      const id = PALETTE_ORDER[idx];
      if (id && id !== this.palette.id) this.setPalette(id);
    } else if (a === 'fray') {
      this.frayed = !this.frayed;
    } else if (a === 'confirm') {
      this.speak();
    } else if (a === 'mute') {
      this.audio.toggleMute();
    }
  }

  setPalette(id: string): void {
    const next = PALETTES[id];
    if (!next) return;
    this.gradeFrom = this.palette.grade;
    this.gradeT = 0;
    this.palette = next;
    this.buildEnvironment();
    this.buildFrame();
    this.startReveal(false);
    this.showCard();
    pageTurn(this.audio);
  }

  private speak(): void {
    if (this.banderole) {
      this.banderole.sprite.mesh.removeFromParent();
      this.banderole.sprite.dispose();
    }
    const text = LINES[this.lineIndex++ % LINES.length]!;
    const sprite = this.makeSprite(drawBanderole(text, { seed: text }), this.r.world);
    this.banderole = { sprite, born: this.time };
    sprite.material.stage = 0;
    quill(this.audio, Math.min(1.6, text.length * 0.03));
  }

  // ---- update --------------------------------------------------------------------------------

  private walkable(x: number, y: number): boolean {
    if (BLOCKERS.some((b) => Math.hypot((b.x - x) * 0.8, (b.y - y) * 1.6) < b.r)) return false;
    const onCauseway = Math.abs(x - LAYOUT.causeway.x) <= 12 && y >= 398 && y <= shore(x) + 32;
    const onMeadow = x >= 22 && x <= TEXT_BLOCK.w - 22 && y >= shore(x) + 30 && y <= TEXT_BLOCK.h - 8;
    return onCauseway || onMeadow;
  }

  update(dt: number): void {
    this.time += dt;
    const t = this.time;

    // Movement.
    let dx = 0;
    let dy = 0;
    if (this.input.isHeld('left')) dx -= 1;
    if (this.input.isHeld('right')) dx += 1;
    if (this.input.isHeld('up')) dy -= 1;
    if (this.input.isHeld('down')) dy += 1;
    const moving = dx !== 0 || dy !== 0;
    if (moving) {
      const l = Math.hypot(dx, dy);
      const sx = (dx / l) * SPEED * dt;
      const sy = (dy / l) * SPEED * dt * 0.8;
      if (this.walkable(this.x + sx, this.y + sy)) {
        this.x += sx;
        this.y += sy;
      } else if (this.walkable(this.x + sx, this.y)) this.x += sx;
      else if (this.walkable(this.x, this.y + sy)) this.y += sy;
      if (dx !== 0) this.facing = dx > 0 ? 1 : -1;
      this.walkClock += dt;
      if (this.walkClock > 0.17) {
        this.walkClock = 0;
        this.walkFrame = (this.walkFrame + 1) % 4;
        if (this.walkFrame % 2 === 1) footstep(this.audio, this.y < shore(this.x) + 30 ? 'stone' : 'grass');
      }
    } else {
      this.walkFrame = 0;
      this.walkClock = 0.17;
    }
    this.pose = !moving ? 'stand' : (['stepA', 'stand', 'stepB', 'stand'] as const)[this.walkFrame]!;

    // Paint-in and fray.
    for (const rv of this.reveals) rv.sprite.material.stage = smoothstep(0, 1, (t - rv.t0) / rv.dur) * rv.target;
    this.reveals = this.reveals.filter((rv) => t < rv.t0 + rv.dur + 0.1);
    const isotRevealing = this.reveals.some((rv) => rv.sprite === this.isot.stand);
    if (!isotRevealing) {
      const target = this.frayed ? 0.32 : 1;
      this.isotStage += (target - this.isotStage) * Math.min(1, dt * 1.6);
      for (const s of Object.values(this.isot)) s.material.stage = this.isotStage;
    }

    // Grade transition between palettes.
    if (this.gradeT < 1) {
      this.gradeT = Math.min(1, this.gradeT + dt / 1.6);
      this.r.post.setGradeMix(this.gradeFrom, this.palette.grade, smoothstep(0, 1, this.gradeT));
    }

    // The banderole inks in, holds, then fades.
    if (this.banderole) {
      const age = t - this.banderole.born;
      const m = this.banderole.sprite.material;
      m.stage = smoothstep(0, 0.7, age);
      m.setOpacity(1 - smoothstep(4.2, 5, age));
      if (age > 5) {
        this.banderole.sprite.mesh.removeFromParent();
        this.banderole.sprite.dispose();
        this.banderole = null;
      }
    }

    // The location card.
    if (this.card) {
      const age = t - this.cardBorn;
      this.card.material.setOpacity(smoothstep(1.0, 1.8, age) * (1 - smoothstep(6.5, 7.5, age)));
      this.card.material.stage = smoothstep(1.0, 2.2, age);
    }

    // The snail crawls along the foot of the page, very slowly.
    this.snailX += this.snailDir * 6 * dt;
    if (this.snailX > 820) this.snailDir = -1;
    if (this.snailX < 420) this.snailDir = 1;
    this.snail.x = this.snailX;
    this.snail.flip = this.snailDir < 0;
    spriteGlobals.uTime.value = t;
  }

  sync(): void {
    const H = this.r.worldHeight;
    for (const s of this.env) s.sync(H, s.depth === -1e4 ? LAYER_GROUND : LAYER_ACTORS);
    for (const sh of this.shadows) sh.sync(H, LAYER_GROUND);
    this.isotShadow.x = this.x;
    this.isotShadow.y = this.y + 1;
    this.isotShadow.sync(H, LAYER_GROUND);
    for (const [pose, s] of Object.entries(this.isot) as [Pose, Sprite][]) {
      s.mesh.visible = pose === this.pose;
      s.x = this.x;
      s.y = this.y;
      s.flip = this.facing < 0;
      s.lift = this.pose === 'stand' ? 0 : -Math.abs(Math.sin(this.time * 18)) * 1.2;
      s.sync(H, LAYER_ACTORS);
    }
    if (this.banderole) {
      const b = this.banderole.sprite;
      b.x = this.x + 6 * this.facing;
      b.y = this.y - 150;
      b.depth = 1e4;
      b.sync(H, LAYER_ACTORS);
    }
    this.frame.forEach((s, i) => {
      if (i === 4) {
        s.x = TEXT_BLOCK.x;
        s.y = TEXT_BLOCK.y + TEXT_BLOCK.h + 30;
      }
      s.sync(PAGE_H, LAYER_FRAME);
    });
    if (this.card) this.card.sync(PAGE_H, LAYER_UI);
  }

  debugInfo(): DebugInfo {
    return {
      scene: this.name,
      location: `${this.palette.name} (${this.palette.id})`,
      lines: [
        ['isot', `x ${this.x.toFixed(0)}  y ${this.y.toFixed(0)}  ${this.pose}  ${this.facing > 0 ? '→' : '←'}`],
        ['fray', `${(1 - this.isotStage).toFixed(2)}${this.frayed ? ' (fraying)' : ''}`],
        ['page scale', `${this.r.pixelsPerUnit.toFixed(2)} px per unit`],
        ['draw calls', String(this.r.renderer.info.render.calls)],
        ['textures', String(this.r.renderer.info.memory.textures)],
        ['audio', this.audio.ctx ? (this.audio.isMuted ? 'muted' : this.audio.ctx.state) : 'waiting for a key'],
      ],
    };
  }

  debugButtons(): { label: string; run: () => void }[] {
    return [
      ...PALETTE_ORDER.map((id, i) => ({ label: `${i + 1} ${PALETTES[id]!.name}`, run: () => this.setPalette(id) })),
      { label: 'Repaint', run: () => this.startReveal(true) },
      { label: 'Finish painting', run: () => this.finishReveal() },
      { label: 'Fray Isot', run: () => (this.frayed = !this.frayed) },
    ];
  }

  dispose(): void {
    this.unsubscribe();
    this.ambience.stop();
    for (const s of [...this.env, ...this.frame, ...Object.values(this.isot)]) {
      s.mesh.removeFromParent();
      s.dispose();
    }
  }
}
