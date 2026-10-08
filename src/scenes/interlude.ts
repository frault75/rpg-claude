/**
 * An interlude (DESIGN.md §10.5): a page of Isot's chronicle on the desk by candlelight.
 * The historiated initial is there first, then her prose inks itself in line by line under
 * a pen of light, to a solo psaltery and a quiet chant. Confirm turns the page, and the
 * next chapter's card comes up out of the dark.
 */

import * as THREE from 'three';
import { psaltery } from '../audio/blanchwood';
import type { AudioEngine } from '../audio/engine';
import { drone, sing } from '../audio/instruments';
import { pageTurn, quill } from '../audio/sfx';
import type { DebugInfo } from '../debug/overlay';
import { SZ, world } from '../engine/diorama/space';
import type { GameLight, WorldRenderer } from '../engine/diorama/renderer';
import type { Input } from '../engine/input';
import type { Scene } from '../engine/scene';
import { VIEW_H, VIEW_W } from '../engine/view';
import { t, tr } from '../i18n/i18n';
import { type InitialScene, type Interlude, INTERLUDES, splitInitial } from '../story/interludes';
import { LocationCard } from '../ui/card';
import { drawManicule, INK, SERIF, shadowText, UiLayer, type UiPanel, wrap } from '../ui/ui';
import { Director } from '../world/director';
import { Stage, tiles } from '../world3d/stage';
import { enemyStill } from '../pixel/enemies';
import { candleImage } from './prologue';

const PAGE = { x: tiles(4), y: tiles(3), w: 200, h: 128 };
const RES = 6;
const CW = PAGE.w * RES;
const CH = PAGE.h * RES;
/** The initial's box on the page canvas. */
const INI = { x: 150, y: 74, s: 230 };
const TEXT_X = INI.x + INI.s + 34;
const RIGHT = CW - 90;
const FONT = 40;
const LEAD = 56;
/** Characters inked per second. */
const INK_CPS = 30;

interface Row {
  text: string;
  x: number;
  y: number;
  /** Characters before this row, for the inking. */
  from: number;
}

export class InterludeScene implements Scene {
  readonly name = 'interlude';
  readonly pausable = false;
  private readonly def: Interlude;
  private readonly stage: Stage;
  private readonly ui: UiLayer;
  private readonly card: LocationCard;
  private readonly hint: UiPanel;
  private readonly director: Director;
  private readonly pivot = new THREE.Group();
  private readonly page: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshLambertMaterial>;
  private readonly under: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshLambertMaterial>;
  private readonly pageCanvas = document.createElement('canvas');
  private readonly glowCanvas = document.createElement('canvas');
  private readonly pageTex: THREE.CanvasTexture;
  private readonly glowTex: THREE.CanvasTexture;
  private readonly pen: GameLight;
  private readonly rows: Row[] = [];
  private readonly total: number;
  private readonly initial: string;
  private readonly drollery: HTMLCanvasElement | null;
  private time = 0;
  private inked = 0;
  private painted = -1;
  private appear = 0;
  private turn = 0;
  private quillAt = 0;
  private state: 'appear' | 'ink' | 'wait' | 'turn' | 'card' | 'done' = 'appear';
  private readonly music: GainNode | null = null;
  private stopDrone: (() => void) | null = null;
  private readonly unsubs: (() => void)[] = [];

  constructor(
    private readonly r: WorldRenderer,
    input: Input,
    private readonly audio: AudioEngine,
    n: number,
    private readonly onDone: () => void,
  ) {
    this.def = INTERLUDES[n] ?? INTERLUDES[1]!;
    const still = enemyStill(this.def.drollery);
    this.drollery = still ? still.toCanvas() : null;
    if (this.drollery && this.def.drollery !== 'greatSnail') {
      // Drolleries face into the text, the way they look in from the margin.
      const f = document.createElement('canvas');
      f.width = this.drollery.width;
      f.height = this.drollery.height;
      const fc = f.getContext('2d')!;
      fc.scale(-1, 1);
      fc.drawImage(this.drollery, -f.width, 0);
      this.drollery = f;
    }
    const st = (this.stage = new Stage(r));
    r.atmosphere = {
      sky: [0.5, 0.4, 0.32],
      ground: [0.08, 0.06, 0.05],
      ambient: 0.42,
      key: [1, 0.88, 0.7],
      keyLevel: 0.08,
      keyDir: [0.4, -0.9, -0.2],
      fogColor: [0.02, 0.015, 0.01],
      fogDist: [200, 600],
      fogMax: 0.6,
      mist: [10, 0, 0.01],
      mistDrift: [0, 0],
      background: [0.01, 0.008, 0.006],
    };
    r.grade = { exposure: 1.12, contrast: 1.06, saturation: 1.05, lift: [0.01, 0.006, 0], gain: [1.05, 1, 0.92], vignette: 1.5, grain: 0.03, bloom: 0.9, bloomThreshold: 0.72, dof: 0.6, focusBand: 90, focusRange: 220 };
    const rows = Array.from({ length: 14 }, () => 'w'.repeat(20));
    st.ground({ ground: rows, heights: rows.map((row) => '0'.repeat(row.length)), seed: 9, palette: { grass: '#4E7E48', dirt: '#5A3E2A', sand: '#C8B080', stone: '#6E6A66', wood: '#4A2E1E', snow: '#E6ECF4', rock: '#5A5650', ice: '#62788E', vellum: '#EDE3CC', gold: '#C9A23C', flowers: ['#FFFFFF'] } });

    // The page, hinged at its left edge so that it can be turned over.
    this.pageCanvas.width = this.glowCanvas.width = CW;
    this.pageCanvas.height = this.glowCanvas.height = CH;
    this.pageTex = new THREE.CanvasTexture(this.pageCanvas);
    this.glowTex = new THREE.CanvasTexture(this.glowCanvas);
    for (const tx of [this.pageTex, this.glowTex]) {
      tx.colorSpace = THREE.NoColorSpace;
      tx.anisotropy = 8;
    }
    const geo = new THREE.PlaneGeometry(PAGE.w, PAGE.h * SZ);
    geo.rotateX(-Math.PI / 2);
    geo.translate(PAGE.w / 2, 0, 0);
    this.page = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ map: this.pageTex, emissiveMap: this.glowTex, emissive: new THREE.Color(1, 0.85, 0.5), emissiveIntensity: 0.9, side: THREE.DoubleSide, transparent: true }));
    this.page.receiveShadow = true;
    const [px, py, pz] = world(PAGE.x, PAGE.y + PAGE.h / 2, 1.2);
    this.pivot.position.set(px, py, pz);
    this.pivot.add(this.page);
    r.scene.add(this.pivot);
    // The next leaf under it: blank vellum, with the ghost of the writing coming through.
    const under = document.createElement('canvas');
    under.width = CW / 2;
    under.height = CH / 2;
    const u = under.getContext('2d')!;
    u.fillStyle = '#E4D6B6';
    u.fillRect(0, 0, under.width, under.height);
    const underTex = new THREE.CanvasTexture(under);
    underTex.colorSpace = THREE.NoColorSpace;
    const ugeo = new THREE.PlaneGeometry(PAGE.w, PAGE.h * SZ);
    ugeo.rotateX(-Math.PI / 2);
    this.under = new THREE.Mesh(ugeo, new THREE.MeshLambertMaterial({ map: underTex }));
    const [ux, uy, uz] = world(PAGE.x + PAGE.w / 2, PAGE.y + PAGE.h / 2, 0.6);
    this.under.position.set(ux, uy, uz);
    this.under.receiveShadow = true;
    r.scene.add(this.under);

    st.addImage(candleImage(), PAGE.x + PAGE.w + 16, PAGE.y + 16);
    st.addFlame(PAGE.x + PAGE.w + 16, PAGE.y + 16.5, 17, { light: 1, embers: false });
    st.addLight(PAGE.x + PAGE.w + 14, PAGE.y + 26, 80, 420, '#FFB868', 0.34, 'candle');
    this.pen = st.addLight(PAGE.x + PAGE.w / 2, PAGE.y + PAGE.h / 2, 10, 46, '#FFD890', 0, 'none');
    st.addEmitter({ kind: 'mote', area: [PAGE.x, PAGE.y - 10, PAGE.w + 30, PAGE.h], heights: [4, 60], count: 30, color: '#FFD8A0', size: 1.2, intensity: 0.5 }, 11);

    // Lay out the prose: beside the initial first, then the full measure.
    const c = this.pageCanvas.getContext('2d')!;
    c.font = `${FONT}px ${SERIF}`;
    const paras = this.def.prose.map((p) => tr(p));
    const [first, rest] = splitInitial(paras[0] ?? '');
    this.initial = first.toUpperCase();
    paras[0] = rest;
    let y = INI.y + 112;
    let from = 0;
    paras.forEach((para, i) => {
      if (i > 0) y += 14;
      // `wrap` joins words with single spaces, so the text it is given must not start with one.
      let left = para.replace(/\s+/g, ' ').trimStart();
      while (left.length) {
        const x = y < INI.y + INI.s + 18 ? TEXT_X : INI.x;
        const [row] = wrap(c, left, RIGHT - x);
        const take = row ?? left;
        this.rows.push({ text: take, x, y, from });
        from += take.length;
        left = left.slice(take.length).trimStart();
        y += LEAD;
      }
    });
    this.total = from;

    this.ui = new UiLayer(r);
    this.card = new LocationCard(this.ui);
    this.hint = this.ui.panel(340, 40, 12);
    this.hint.x = VIEW_W - 380;
    this.hint.y = VIEW_H - 64;
    this.hint.opacity = 0;
    this.hint.draw((g, w, h) => {
      g.font = `italic 19px ${SERIF}`;
      g.textAlign = 'right';
      g.textBaseline = 'middle';
      shadowText(g, t('interlude.turn'), w - 8, h / 2, INK.text);
      drawManicule(g, w - g.measureText(t('interlude.turn')).width - 34, h / 2, 1.2);
    });
    this.director = new Director(r, { minX: -1e4, maxX: 1e4, minY: -1e4, maxY: 1e4 });
    this.director.take(PAGE.x + PAGE.w / 2 + 4, PAGE.y + PAGE.h / 2 - 3, 1);

    const ctx = audio.ctx;
    if (ctx) {
      const out = (this.music = ctx.createGain());
      out.gain.value = 1;
      out.connect(audio.bus('music'));
      this.score(ctx, out);
    }
    this.unsubs.push(
      input.onAction((a) => {
        if (a === 'confirm' || a === 'cancel' || a === 'menu') this.advance();
      }),
      // A tap or a click turns the page too.
      input.onPointer((_x, _y, button) => {
        if (button === 0) this.advance();
      }),
    );
  }

  /** Solo psaltery on the Book motif, a chant an octave under it, and a drone. */
  private score(ctx: AudioContext, out: AudioNode): void {
    const t0 = ctx.currentTime + 0.6;
    const dr = drone(ctx, out, [38, 45], 0.03);
    this.stopDrone = () => dr.stop();
    const motif = [62, 65, 67, 69, 67, 65, 64, 62];
    const answer = [69, 67, 65, 67, 69, 72, 69, 67, 65, 64, 62];
    let at = t0;
    for (const m of motif) {
      psaltery(ctx, out, m, at, 0.07);
      at += 0.62;
    }
    at += 0.9;
    for (const [i, m] of answer.entries()) {
      psaltery(ctx, out, m, at, 0.06);
      if (i % 3 === 0) psaltery(ctx, out, m - 12, at + 0.02, 0.035);
      at += 0.55;
    }
    // A quiet voice under the psaltery, on the long notes.
    [50, 53, 55, 57, 55, 53, 52, 50].forEach((m, i) => sing(ctx, out, m, t0 + 3.2 + i * 1.6, 1.5, 0.035));
    psaltery(ctx, out, 62, at + 1, 0.06);
    psaltery(ctx, out, 69, at + 1.03, 0.05);
  }

  private advance(): void {
    if (this.state === 'appear' || this.state === 'ink') {
      this.appear = 1;
      this.inked = this.total;
      this.state = 'wait';
    } else if (this.state === 'wait') {
      this.state = 'turn';
      pageTurn(this.audio);
    } else if (this.state === 'card') this.finish();
  }

  private finish(): void {
    if (this.state === 'done') return;
    this.state = 'done';
    this.onDone();
  }

  update(dt: number): void {
    this.time += dt;
    const fade = this.r.screen;
    if (this.state === 'appear') {
      this.appear = Math.min(1, this.appear + dt / 1.6);
      if (this.appear >= 1) this.state = 'ink';
    } else if (this.state === 'ink') {
      // The pen scratches in short runs while the ink goes on.
      if (this.quillAt <= this.time) {
        quill(this.audio, 2.4);
        this.quillAt = this.time + 3;
      }
      this.inked = Math.min(this.total, this.inked + dt * INK_CPS);
      if (this.inked >= this.total) this.state = 'wait';
    } else if (this.state === 'turn') {
      // The leaf lifts from its right edge and goes over to the left.
      this.turn = Math.min(1, this.turn + dt / 1.3);
      const k = this.turn * this.turn * (3 - 2 * this.turn);
      this.pivot.rotation.z = k * Math.PI * 0.96;
      this.page.material.opacity = 1 - Math.max(0, (k - 0.55) / 0.45);
      fade.fade = Math.max(0, (this.turn - 0.5) / 0.5);
      if (this.turn >= 1) {
        this.state = 'card';
        fade.fade = 1;
        this.card.show(tr(this.def.chapter.title), tr(this.def.chapter.name));
        void this.director.wait(4.4).then(() => this.finish());
      }
    } else if (this.state === 'card') fade.fade = 1;
    if (this.state === 'appear' || this.state === 'ink' || this.state === 'wait') fade.fade = Math.max(0, 1 - this.appear);
    const key = Math.floor(this.inked);
    if (key !== this.painted) {
      this.painted = key;
      this.paint();
    }
    this.hint.opacity += ((this.state === 'wait' ? 1 : 0) - this.hint.opacity) * Math.min(1, dt * 4);
    this.updatePen();
    this.director.update(dt);
    const [cx, cy, ch] = this.director.cam;
    const v = this.r.view;
    v.x = cx;
    v.y = cy;
    v.h = ch;
    v.pitch = 0.3;
    v.zoom = 1.32;
    this.card.update(dt);
    this.stage.update(dt, this.time);
  }

  /** The pen of light rests where the ink is going on. */
  private updatePen(): void {
    if (this.state !== 'ink') {
      this.pen.intensity += (0 - this.pen.intensity) * 0.1;
      return;
    }
    const row = [...this.rows].reverse().find((r) => r.from <= this.inked) ?? this.rows[0];
    if (!row) return;
    const c = this.pageCanvas.getContext('2d')!;
    c.font = `${FONT}px ${SERIF}`;
    const done = row.text.slice(0, Math.max(0, Math.floor(this.inked - row.from)));
    const x = row.x + c.measureText(done).width;
    this.pen.intensity = 0.5;
    this.pen.x = PAGE.x + x / RES;
    this.pen.y = PAGE.y + row.y / RES - 1;
  }

  private paint(): void {
    const c = this.pageCanvas.getContext('2d')!;
    const g = this.glowCanvas.getContext('2d')!;
    paintVellum(c);
    g.fillStyle = '#000';
    g.fillRect(0, 0, CW, CH);
    paintBorder(c, g, this.time);
    paintInitial(c, g, this.initial, this.def.scene);
    // The rubric title.
    c.font = `italic 600 ${FONT + 2}px ${SERIF}`;
    c.textAlign = 'left';
    c.textBaseline = 'alphabetic';
    c.fillStyle = '#A82A1E';
    c.fillText(tr(this.def.title), TEXT_X, INI.y + 46);
    // Her hand, inked as far as the pen has gone.
    c.font = `${FONT}px ${SERIF}`;
    c.fillStyle = '#2A1E18';
    for (const row of this.rows) {
      const n = Math.floor(this.inked - row.from);
      if (n <= 0) break;
      const part = row.text.slice(0, Math.min(row.text.length, n));
      c.fillText(part, row.x, row.y);
      // The newest letters are still wet: a little darker and glossy.
      if (n < row.text.length) {
        const w0 = c.measureText(part.slice(0, Math.max(0, part.length - 3))).width;
        c.fillStyle = '#120A06';
        c.fillText(part.slice(Math.max(0, part.length - 3)), row.x + w0, row.y);
        c.fillStyle = '#2A1E18';
      }
    }
    // When the last line is done, a line-filler runs it out to the margin, as scribes did.
    const last = this.rows[this.rows.length - 1];
    if (last && this.inked >= this.total) {
      const x0 = last.x + c.measureText(last.text).width + 18;
      for (let x = x0, i = 0; x < RIGHT - 10; x += 16, i++) {
        c.fillStyle = i % 2 ? LAPIS : VERMILION;
        c.beginPath();
        c.moveTo(x, last.y - 12);
        c.lineTo(x + 8, last.y - 20);
        c.lineTo(x + 16, last.y - 12);
        c.lineTo(x + 8, last.y - 4);
        c.closePath();
        c.fill();
      }
    }
    if (this.drollery) {
      c.imageSmoothingEnabled = false;
      const d = this.drollery;
      const k = Math.max(1, Math.floor(130 / Math.max(d.width, d.height)));
      c.globalAlpha = 0.92;
      c.drawImage(d, RIGHT - 30 - d.width * k, CH - 50 - d.height * k, d.width * k, d.height * k);
      c.globalAlpha = 1;
    }
    this.pageTex.needsUpdate = true;
    this.glowTex.needsUpdate = true;
  }

  sync(): void {
    this.ui.sync();
  }

  debugInfo(): DebugInfo {
    return { scene: this.name, location: tr(this.def.title), lines: [['state', this.state], ['inked', `${Math.floor(this.inked)}/${this.total}`]] };
  }

  debugButtons(): { label: string; run: () => void }[] {
    return [{ label: 'turn the page', run: () => (this.advance(), this.advance()) }];
  }

  dispose(): void {
    for (const u of this.unsubs) u();
    this.stopDrone?.();
    const ctx = this.audio.ctx;
    if (ctx && this.music) {
      this.music.gain.setTargetAtTime(0, ctx.currentTime, 0.4);
      const m = this.music;
      setTimeout(() => m.disconnect(), 3000);
    }
    this.card.dispose();
    this.ui.dispose();
    this.stage.dispose();
    this.pivot.removeFromParent();
    this.page.geometry.dispose();
    this.page.material.dispose();
    this.under.removeFromParent();
    this.under.geometry.dispose();
    this.under.material.map?.dispose();
    this.under.material.dispose();
    this.pageTex.dispose();
    this.glowTex.dispose();
    const v = this.r.view;
    v.pitch = 0;
    v.zoom = 1;
  }
}

/** Warm vellum, uneven, with its grain and the drypoint ruling. */
function paintVellum(c: CanvasRenderingContext2D): void {
  const bg = c.createRadialGradient(CW * 0.45, CH * 0.42, 40, CW / 2, CH / 2, CW * 0.72);
  bg.addColorStop(0, '#F3E9D2');
  bg.addColorStop(0.75, '#E2D2AE');
  bg.addColorStop(1, '#C8B288');
  c.fillStyle = bg;
  c.fillRect(0, 0, CW, CH);
  for (let i = 0; i < 1400; i++) {
    c.fillStyle = `rgba(110, 80, 40, ${0.035 + (i % 5) * 0.006})`;
    c.fillRect((i * 7919) % CW, (i * 104729) % CH, 2 + (i % 4), 1);
  }
  c.strokeStyle = 'rgba(150, 110, 80, 0.14)';
  c.lineWidth = 1;
  for (let y = INI.y + 112 + 6; y < CH - 60; y += LEAD) {
    c.beginPath();
    c.moveTo(INI.x, y);
    c.lineTo(RIGHT, y);
    c.stroke();
  }
  c.strokeStyle = 'rgba(168, 42, 30, 0.3)';
  c.strokeRect(INI.x - 14, 46, RIGHT - INI.x + 28, CH - 92);
}

const LAPIS = '#24408E';
const VERMILION = '#B0302A';
const VERDIGRIS = '#3E7A5A';
const ROSE = '#C25A72';

/** A gold that is both painted and glowing (the glow canvas feeds the bloom). */
function gold(c: CanvasRenderingContext2D, g: CanvasRenderingContext2D, path: (ctx: CanvasRenderingContext2D) => void, glow = 0.55): void {
  c.fillStyle = '#C9A23C';
  path(c);
  c.fill();
  c.strokeStyle = '#7A5A18';
  c.lineWidth = 2;
  c.stroke();
  g.fillStyle = `rgba(255, 210, 122, ${glow})`;
  path(g);
  g.fill();
}

/** An ivy leaf, three-lobed, pointing along `a`. */
function leaf(c: CanvasRenderingContext2D, x: number, y: number, a: number, s: number, color: string): void {
  c.save();
  c.translate(x, y);
  c.rotate(a);
  c.fillStyle = color;
  c.beginPath();
  c.moveTo(0, 0);
  c.quadraticCurveTo(s * 0.4, -s * 0.7, s * 0.9, -s * 0.35);
  c.quadraticCurveTo(s * 0.7, -s * 0.1, s * 1.15, 0);
  c.quadraticCurveTo(s * 0.7, s * 0.1, s * 0.9, s * 0.35);
  c.quadraticCurveTo(s * 0.4, s * 0.7, 0, 0);
  c.fill();
  c.strokeStyle = 'rgba(255, 255, 255, 0.45)';
  c.lineWidth = 1.5;
  c.beginPath();
  c.moveTo(s * 0.1, 0);
  c.lineTo(s * 0.8, 0);
  c.stroke();
  c.restore();
}

/** The vine border: a bar of gold down the left and along the head and foot, an ivy stem
 * winding round it, leaves in the three colours, and gold bezants. */
function paintBorder(c: CanvasRenderingContext2D, g: CanvasRenderingContext2D, time: number): void {
  void time;
  const bx = 66;
  const top = 46;
  const foot = CH - 46;
  gold(c, g, (ctx) => {
    ctx.beginPath();
    ctx.rect(bx - 5, top, 10, foot - top);
  });
  gold(c, g, (ctx) => {
    ctx.beginPath();
    ctx.rect(bx, top - 4, RIGHT - bx + 20, 7);
  }, 0.4);
  gold(c, g, (ctx) => {
    ctx.beginPath();
    ctx.rect(bx, foot - 3, RIGHT - bx + 20, 7);
  }, 0.4);
  // The stem.
  c.strokeStyle = '#3A5A2A';
  c.lineWidth = 3;
  c.beginPath();
  for (let y = top + 8; y <= foot - 8; y += 4) {
    const x = bx + Math.sin(y / 34) * 24;
    if (y === top + 8) c.moveTo(x, y);
    else c.lineTo(x, y);
  }
  c.stroke();
  const colors = [LAPIS, VERMILION, VERDIGRIS];
  let k = 0;
  for (let y = top + 30; y < foot - 20; y += 34, k++) {
    const x = bx + Math.sin(y / 34) * 24;
    const side = Math.cos(y / 34) > 0 ? 1 : -1;
    leaf(c, x, y, side > 0 ? -0.5 : Math.PI + 0.5, 20, colors[k % 3]!);
    if (k % 2 === 0)
      gold(c, g, (ctx) => {
        ctx.beginPath();
        ctx.arc(x - side * 20, y + 10, 5.5, 0, Math.PI * 2);
      }, 0.8);
  }
  // Sprays along the head and foot.
  for (const yy of [top, foot]) {
    for (let x = bx + 60; x < RIGHT; x += 120, k++) {
      leaf(c, x, yy + (yy === top ? -2 : 2), yy === top ? -0.9 : 0.9, 16, colors[k % 3]!);
      gold(c, g, (ctx) => {
        ctx.beginPath();
        ctx.arc(x + 40, yy, 4.5, 0, Math.PI * 2);
      }, 0.8);
    }
  }
}

/** The historiated initial: a gold frame, the scene painted in it, and the letter over
 * the scene in rose, edged in white, so that the scene shows round it and through it. */
function paintInitial(c: CanvasRenderingContext2D, g: CanvasRenderingContext2D, letter: string, scene: InitialScene): void {
  const { x, y, s } = INI;
  gold(c, g, (ctx) => {
    ctx.beginPath();
    ctx.rect(x - 10, y - 10, s + 20, s + 20);
  }, 0.35);
  // Only the frame shines; the painting inside is lit by the candle like the rest.
  g.fillStyle = '#000';
  g.fillRect(x, y, s, s);
  c.save();
  c.beginPath();
  c.rect(x, y, s, s);
  c.clip();
  paintScene(c, g, scene, x, y, s);
  c.restore();
  // White filigree on the frame.
  c.strokeStyle = 'rgba(255, 250, 230, 0.8)';
  c.lineWidth = 1.5;
  c.strokeRect(x - 4, y - 4, s + 8, s + 8);
  // The letter.
  c.save();
  c.font = `700 ${Math.round(s * 0.92)}px ${SERIF}`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.lineJoin = 'round';
  c.lineWidth = 10;
  c.strokeStyle = 'rgba(40, 20, 10, 0.55)';
  c.strokeText(letter, x + s / 2 + 3, y + s / 2 + 12);
  c.lineWidth = 5;
  c.strokeStyle = '#FFF6E0';
  c.strokeText(letter, x + s / 2, y + s / 2 + 9);
  const body = c.createLinearGradient(0, y, 0, y + s);
  body.addColorStop(0, '#E07A8E');
  body.addColorStop(1, ROSE);
  c.fillStyle = body;
  c.fillText(letter, x + s / 2, y + s / 2 + 9);
  c.restore();
}

/** The little paintings inside the initials, one for each interlude. */
function paintScene(c: CanvasRenderingContext2D, g: CanvasRenderingContext2D, scene: InitialScene, x: number, y: number, s: number): void {
  const sky = (top: string, bottom: string) => {
    const gr = c.createLinearGradient(0, y, 0, y + s);
    gr.addColorStop(0, top);
    gr.addColorStop(1, bottom);
    c.fillStyle = gr;
    c.fillRect(x, y, s, s);
  };
  const stars = (n: number) => {
    for (let i = 0; i < n; i++) {
      c.fillStyle = 'rgba(255, 250, 220, 0.8)';
      c.fillRect(x + ((i * 53) % s), y + ((i * 37) % (s * 0.45)), 2.5, 2.5);
    }
  };
  const figure = (fx: number, fy: number, robe: string, head: string, h = 26) => {
    c.fillStyle = robe;
    c.beginPath();
    c.moveTo(fx - 6, fy);
    c.lineTo(fx + 6, fy);
    c.lineTo(fx + 3, fy - h);
    c.lineTo(fx - 3, fy - h);
    c.closePath();
    c.fill();
    c.fillStyle = head;
    c.beginPath();
    c.arc(fx, fy - h - 4, 5, 0, Math.PI * 2);
    c.fill();
  };
  if (scene === 'causeway') {
    sky('#0E1A44', LAPIS);
    stars(14);
    gold(c, g, (ctx) => {
      ctx.beginPath();
      ctx.arc(x + s * 0.76, y + s * 0.22, 18, 0.6, Math.PI * 1.9);
      ctx.arc(x + s * 0.79, y + s * 0.2, 14, Math.PI * 1.9, 0.6, true);
    }, 0.9);
    // The sea, in rows of waves, and the causeway across it.
    c.fillStyle = '#1A3A6A';
    c.fillRect(x, y + s * 0.55, s, s * 0.45);
    c.strokeStyle = 'rgba(220, 235, 255, 0.55)';
    c.lineWidth = 2;
    for (let r = 0; r < 5; r++)
      for (let i = 0; i < 6; i++) {
        const wx = x + i * 44 + (r % 2) * 22;
        const wy = y + s * 0.62 + r * 18;
        c.beginPath();
        c.arc(wx, wy, 9, Math.PI * 1.1, Math.PI * 1.9);
        c.stroke();
      }
    c.fillStyle = '#C8B080';
    c.beginPath();
    c.moveTo(x, y + s * 0.8);
    c.lineTo(x + s, y + s * 0.66);
    c.lineTo(x + s, y + s * 0.72);
    c.lineTo(x, y + s * 0.88);
    c.fill();
    figure(x + s * 0.3, y + s * 0.8, '#3A5AA8', '#E8C8A8');
    figure(x + s * 0.44, y + s * 0.775, '#8A8478', '#E8D8C8');
    figure(x + s * 0.6, y + s * 0.75, '#F4F2EC', '#F4F2EC', 30);
  } else if (scene === 'bell') {
    sky('#22305A', '#5A6A9A');
    // The village under snow, the tower with its bell, roses on the lych-gate.
    c.fillStyle = '#ECF0F6';
    c.fillRect(x, y + s * 0.74, s, s * 0.26);
    c.fillStyle = '#5A4A3E';
    c.fillRect(x + s * 0.58, y + s * 0.22, 40, s * 0.54);
    c.fillStyle = '#ECF0F6';
    c.beginPath();
    c.moveTo(x + s * 0.58 - 6, y + s * 0.24);
    c.lineTo(x + s * 0.58 + 20, y + s * 0.08);
    c.lineTo(x + s * 0.58 + 46, y + s * 0.24);
    c.fill();
    gold(c, g, (ctx) => {
      ctx.beginPath();
      const bx = x + s * 0.58 + 20;
      const by = y + s * 0.3;
      ctx.moveTo(bx - 4, by);
      ctx.quadraticCurveTo(bx - 6, by + 16, bx - 13, by + 22);
      ctx.lineTo(bx + 13, by + 22);
      ctx.quadraticCurveTo(bx + 6, by + 16, bx + 4, by);
      ctx.closePath();
    }, 0.9);
    for (const [hx, hw] of [
      [0.04, 50],
      [0.3, 44],
    ] as const) {
      c.fillStyle = '#6A4A36';
      c.fillRect(x + s * hx, y + s * 0.56, hw, s * 0.2);
      c.fillStyle = '#ECF0F6';
      c.beginPath();
      c.moveTo(x + s * hx - 6, y + s * 0.58);
      c.lineTo(x + s * hx + hw / 2, y + s * 0.44);
      c.lineTo(x + s * hx + hw + 6, y + s * 0.58);
      c.fill();
      c.fillStyle = '#FFD27A';
      c.fillRect(x + s * hx + hw / 2 - 4, y + s * 0.63, 8, 10);
    }
    for (let i = 0; i < 8; i++) {
      c.fillStyle = VERMILION;
      c.beginPath();
      c.arc(x + s * 0.06 + i * 9, y + s * 0.78 + (i % 2) * 5, 4, 0, Math.PI * 2);
      c.fill();
    }
    for (let i = 0; i < 40; i++) {
      c.fillStyle = 'rgba(255, 255, 255, 0.85)';
      c.fillRect(x + ((i * 61) % s), y + ((i * 43) % s), 2.5, 2.5);
    }
  } else if (scene === 'wood') {
    sky('#D8D2C4', '#EFEAE0');
    // A wood drawn only in outline, and at its foot an open book with the last word.
    c.strokeStyle = 'rgba(70, 60, 50, 0.7)';
    c.lineWidth = 2;
    for (let i = 0; i < 5; i++) {
      const tx = x + 20 + i * 46;
      c.beginPath();
      c.moveTo(tx, y + s * 0.66);
      c.lineTo(tx, y + s * 0.34);
      c.stroke();
      c.beginPath();
      c.arc(tx, y + s * 0.28, 18 + (i % 2) * 5, 0, Math.PI * 2);
      c.stroke();
    }
    c.fillStyle = '#F6F0E2';
    c.strokeStyle = '#6A5A44';
    c.beginPath();
    c.moveTo(x + s * 0.14, y + s * 0.74);
    c.quadraticCurveTo(x + s * 0.32, y + s * 0.68, x + s * 0.5, y + s * 0.76);
    c.quadraticCurveTo(x + s * 0.68, y + s * 0.68, x + s * 0.86, y + s * 0.74);
    c.lineTo(x + s * 0.86, y + s * 0.95);
    c.quadraticCurveTo(x + s * 0.68, y + s * 0.89, x + s * 0.5, y + s * 0.97);
    c.quadraticCurveTo(x + s * 0.32, y + s * 0.89, x + s * 0.14, y + s * 0.95);
    c.closePath();
    c.fill();
    c.stroke();
    c.font = `600 22px ${SERIF}`;
    c.textAlign = 'center';
    g.font = c.font;
    g.textAlign = 'center';
    c.fillStyle = '#B8862A';
    c.fillText('FINIS', x + s * 0.68, y + s * 0.88);
    g.fillStyle = 'rgba(255, 210, 122, 0.9)';
    g.fillText('FINIS', x + s * 0.68, y + s * 0.88);
    figure(x + s * 0.3, y + s * 0.72, '#F4F2EC', '#F4F2EC', 30);
  } else {
    // Dawn over the margin: a gold bar, the Abbey's bell against the light, the inkhorn
    // with its bright word.
    sky('#E8A86A', '#F4D8A8');
    gold(c, g, (ctx) => {
      ctx.beginPath();
      ctx.rect(x, y + s * 0.84, s, 14);
    }, 0.6);
    c.fillStyle = 'rgba(60, 40, 40, 0.75)';
    c.beginPath();
    const bx = x + s * 0.7;
    c.moveTo(bx - 10, y + s * 0.12);
    c.quadraticCurveTo(bx - 14, y + s * 0.34, bx - 34, y + s * 0.44);
    c.lineTo(bx + 34, y + s * 0.44);
    c.quadraticCurveTo(bx + 14, y + s * 0.34, bx + 10, y + s * 0.12);
    c.closePath();
    c.fill();
    c.fillStyle = '#6A4426';
    c.beginPath();
    c.moveTo(x + s * 0.18, y + s * 0.82);
    c.quadraticCurveTo(x + s * 0.14, y + s * 0.6, x + s * 0.3, y + s * 0.48);
    c.lineTo(x + s * 0.4, y + s * 0.54);
    c.quadraticCurveTo(x + s * 0.3, y + s * 0.66, x + s * 0.34, y + s * 0.82);
    c.closePath();
    c.fill();
    gold(c, g, (ctx) => {
      ctx.beginPath();
      ctx.ellipse(x + s * 0.35, y + s * 0.5, 16, 7, -0.6, 0, Math.PI * 2);
    }, 0.6);
    g.fillStyle = 'rgba(255, 240, 190, 0.18)';
    g.beginPath();
    g.arc(x + s * 0.35, y + s * 0.44, 30, 0, Math.PI * 2);
    g.fill();
  }
}
