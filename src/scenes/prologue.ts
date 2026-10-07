/**
 * Prologue, "The First Word" (cinematic C1). By candlelight, on the Great Page, a hand
 * of light writes FINIS at the foot, then the world above it, line by line. A small
 * white figure rises out of the word and walks up the page. Isot tells how the Mercy
 * came. Then, close: a penknife scrapes one line away.
 */

import * as THREE from 'three';
import type { AudioEngine } from '../audio/engine';
import { bell, drone, noiseBurst } from '../audio/instruments';
import { quill } from '../audio/sfx';
import type { DebugInfo } from '../debug/overlay';
import { SZ, world } from '../engine/diorama/space';
import type { GameLight, WorldRenderer } from '../engine/diorama/renderer';
import type { Input } from '../engine/input';
import type { Scene } from '../engine/scene';
import { VIEW_W } from '../engine/view';
import { type LocalText, t, tr } from '../i18n/i18n';
import type { CharSpec } from '../pixel/characters';
import { hex, PixelImage, ramp } from '../pixel/pixel';
import { LocationCard, Letterbox, Subtitles } from '../ui/card';
import { INK, SERIF, UiLayer, type UiPanel } from '../ui/ui';
import { Director } from '../world/director';
import { Actor } from '../world3d/actor';
import { Billboard } from '../world3d/billboard';
import { Stage, tiles } from '../world3d/stage';

const PAGE = { x: tiles(4), y: tiles(3), w: 220, h: 150 };
const RES = 5; // page texture pixels per art pixel
const LINES = 13;
/** The line the knife scrapes: Wystan's. */
const SCRAPED = 10;

const NAMES = [
  'Aelfgifu of Lychford · Hamo the reeve · Wenna · Cole the thatcher',
  'Agnes daughter of Agnes · Osric · Bertilde · the miller’s twins',
  'Dunstan, sexton · Mildred · Hob · Godric of the fen road · Ida',
  'Wystan, librarian · Eadgyth · Cenwalh, king · Ebba of the tide',
  'Amabel · Sige · Leofric · Wulfhild · Tola · Edmund of Holmcaster',
  'Hild of Saint Ebb’s · Aumery, abbot · Gaudry · Ermeline · Cuthwin',
  'the woman with grey on her face · the child at the ford · Isot',
];

const LINES_TEXT: LocalText[] = [
  { en: 'Before the first name, the last word.', fr: 'Avant le premier nom, le dernier mot.' },
  { en: 'In Hollin every soul is written, and the writing is kept at Saint Ebb’s, where the sea comes twice a day.', fr: 'À Hollin, chaque âme est écrite, et l’écrit est gardé à Saint-Ebb, où la mer monte deux fois par jour.' },
  { en: 'Ten winters ago the Grey Sweat came, and on the worst night of it, it stopped. No one in Hollin has died since. We call it the Mercy.', fr: 'Il y a dix hivers vint la Suette grise, et la pire nuit, elle cessa. Personne à Hollin n’est mort depuis. Nous appelons cela la Miséricorde.' },
  { en: 'I was nine. I gave thanks for it every morning of my life.', fr: 'J’avais neuf ans. J’en ai rendu grâce chaque matin de ma vie.' },
  { en: 'This is the true account of how the Mercy ended, set down in my hand over the old one.', fr: 'Voici le vrai récit de la fin de la Miséricorde, écrit de ma main par-dessus l’ancien.' },
];

/** The Reader: a small figure all in white, hooded. */
const READER: CharSpec = { id: 'reader', skin: '#F2EEE4', hair: '#E8E4DA', eyes: '#C8C4BA', headwear: 'hood', headwearColor: '#F4F2EC', veil: '#C8C2B6', robe: '#F4F2EC', held: 'none' };

export class PrologueScene implements Scene {
  readonly name = 'prologue';
  readonly pausable = false;
  private readonly stage: Stage;
  private readonly ui: UiLayer;
  private readonly subs: Subtitles;
  private readonly card: LocationCard;
  private readonly letterbox: Letterbox;
  private readonly director: Director;
  private readonly skipHint: UiPanel;
  private readonly page: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshLambertMaterial>;
  private readonly pageCanvas = document.createElement('canvas');
  private readonly glowCanvas = document.createElement('canvas');
  private readonly pageTex: THREE.CanvasTexture;
  private readonly glowTex: THREE.CanvasTexture;
  private readonly knife: Billboard;
  private readonly reader: Actor;
  private readonly pen: GameLight;
  private time = 0;
  private finis = 0;
  private lines = 0;
  private scrape = 0;
  private readerOn = 0;
  private dirty = true;
  private finished = false;
  private stopDrone: (() => void) | null = null;
  private readonly unsubs: (() => void)[] = [];

  constructor(
    private readonly r: WorldRenderer,
    input: Input,
    private readonly audio: AudioEngine,
    private readonly onDone: () => void,
  ) {
    const st = (this.stage = new Stage(r));
    r.atmosphere = {
      sky: [0.5, 0.4, 0.32],
      ground: [0.08, 0.06, 0.05],
      ambient: 0.28,
      key: [1, 0.85, 0.6],
      keyLevel: 0.04,
      keyDir: [0.4, -0.9, -0.2],
      fogColor: [0.02, 0.015, 0.01],
      fogDist: [200, 600],
      fogMax: 0.6,
      mist: [10, 0, 0.01],
      mistDrift: [0, 0],
      background: [0.01, 0.008, 0.006],
    };
    r.grade = { exposure: 1.15, contrast: 1.08, saturation: 1.05, lift: [0.01, 0.006, 0], gain: [1.05, 1, 0.92], vignette: 1.4, grain: 0.03, bloom: 1.2, bloomThreshold: 0.65, dof: 1.2, focusBand: 50, focusRange: 160 };
    // A dark desk.
    const rows = Array.from({ length: 14 }, () => 'w'.repeat(20));
    st.ground({ ground: rows, heights: rows.map((row) => '0'.repeat(row.length)), seed: 5, palette: { grass: '#4E7E48', dirt: '#5A3E2A', sand: '#C8B080', stone: '#6E6A66', wood: '#4A2E1E', snow: '#E6ECF4', rock: '#5A5650', flowers: ['#FFFFFF'] } });

    // The Great Page: a canvas texture that is written as the scene plays.
    this.pageCanvas.width = this.glowCanvas.width = PAGE.w * RES;
    this.pageCanvas.height = this.glowCanvas.height = PAGE.h * RES;
    this.pageTex = new THREE.CanvasTexture(this.pageCanvas);
    this.glowTex = new THREE.CanvasTexture(this.glowCanvas);
    for (const tx of [this.pageTex, this.glowTex]) {
      tx.colorSpace = THREE.NoColorSpace;
      tx.anisotropy = 4;
    }
    const geo = new THREE.PlaneGeometry(PAGE.w, PAGE.h * SZ);
    geo.rotateX(-Math.PI / 2);
    this.page = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ map: this.pageTex, emissiveMap: this.glowTex, emissive: new THREE.Color(1, 0.85, 0.5), emissiveIntensity: 1.6 }));
    const [px, py, pz] = world(PAGE.x + PAGE.w / 2, PAGE.y + PAGE.h / 2, 1);
    this.page.position.set(px, py, pz);
    this.page.receiveShadow = true;
    r.scene.add(this.page);

    // A candle at the page's head, a pen of light, dust in the air.
    st.addImage(candleImage(), PAGE.x + PAGE.w + 14, PAGE.y + 18);
    st.addFlame(PAGE.x + PAGE.w + 14, PAGE.y + 18.5, 17, { light: 1, embers: false });
    st.addLight(PAGE.x + PAGE.w + 6, PAGE.y + 34, 70, 420, '#FFB868', 0.42, 'candle');
    this.pen = st.addLight(PAGE.x + PAGE.w / 2, PAGE.y + PAGE.h - 20, 10, 50, '#FFD890', 0, 'none');
    st.addEmitter({ kind: 'mote', area: [PAGE.x, PAGE.y - 10, PAGE.w + 30, PAGE.h], heights: [4, 60], count: 40, color: '#FFD8A0', size: 1.2, intensity: 0.5 }, 3);

    this.knife = Billboard.fromImage(knifeImage(), { anchor: [3, 13], castShadow: true });
    this.knife.visible = false;
    r.scene.add(this.knife.mesh);
    this.reader = new Actor('reader', READER, r.scene);
    this.reader.visible = false;
    this.reader.dir = 'up';
    this.reader.speed = 9;

    this.ui = new UiLayer(r);
    this.subs = new Subtitles(this.ui);
    this.card = new LocationCard(this.ui);
    this.letterbox = new Letterbox(this.ui);
    this.letterbox.target = 1;
    this.skipHint = this.ui.panel(260, 30, 13);
    this.skipHint.x = VIEW_W - 280;
    this.skipHint.y = 14;
    this.skipHint.draw((c, w, h) => {
      c.font = `16px ${SERIF}`;
      c.textAlign = 'right';
      c.textBaseline = 'middle';
      c.fillStyle = INK.dim;
      c.fillText(t('prologue.skip'), w - 4, h / 2);
    });
    this.director = new Director(r, { minX: -1e4, maxX: 1e4, minY: -1e4, maxY: 1e4 });
    this.director.take(PAGE.x + PAGE.w / 2, PAGE.y + PAGE.h / 2 + 6, 1);
    this.unsubs.push(
      input.onAction((a) => {
        if (a === 'cancel' || a === 'menu') this.end();
      }),
    );
    void this.play();
  }

  private sound(fn: (ctx: AudioContext) => void): void {
    const ctx = this.audio.ctx;
    if (ctx) fn(ctx);
  }

  private async play(): Promise<void> {
    const d = this.director;
    this.r.screen.fade = 1;
    this.sound((ctx) => {
      const dr = drone(ctx, this.audio.bus('music'), [38, 45, 50], 0.045);
      this.stopDrone = () => dr.stop();
    });
    await this.subs.show(tr(LINES_TEXT[0]!), 4.2);
    if (this.finished) return;
    // FINIS, letter by letter, in gold.
    this.fadeIn = true;
    for (let i = 0; i < 5; i++) {
      this.sound((ctx) => bell(ctx, this.audio.bus('music'), [196, 220, 247, 262, 294][i]!, ctx.currentTime, 0.12, 6));
      await this.animate((k) => (this.finis = (i + k) / 5), 0.9);
      if (this.finished) return;
    }
    await d.wait(0.8);
    // The world, written above it.
    this.sound(() => quill(this.audio, 5));
    const linesDone = this.animate((k) => (this.lines = k * LINES), 5.5);
    void d.panTo(PAGE.x + PAGE.w / 2, PAGE.y + PAGE.h / 2 - 14, 9, 1);
    await d.wait(1);
    // The Reader rises out of the word and walks up the page.
    this.reader.x = PAGE.x + PAGE.w / 2;
    this.reader.y = PAGE.y + PAGE.h - 18;
    this.reader.h = 1;
    this.reader.visible = true;
    void this.animate((k) => (this.readerOn = k), 2);
    void this.reader.walk([[PAGE.x + PAGE.w / 2, PAGE.y + 26]]);
    await linesDone;
    for (const line of LINES_TEXT.slice(1)) {
      await this.subs.show(tr(line), Math.max(4.5, tr(line).length / 17));
      if (this.finished) return;
    }
    // Close on one line, and the knife.
    const ly = this.lineY(SCRAPED);
    await d.panTo(PAGE.x + PAGE.w * 0.45, PAGE.y + ly / RES + 4, 2.4, 1);
    this.r.view.zoom = 1;
    void this.animate((k) => (this.r.view.zoom = 1 + k * 0.9), 2.4);
    this.knife.visible = true;
    const scraping = this.animate((k) => {
      this.scrape = k;
      if (Math.random() < 0.3) this.sound((ctx) => noiseBurst(ctx, this.audio.bus('sfx'), ctx.currentTime, 0.12, 2400 + Math.random() * 1500, 1.4, 0.06));
    }, 4.5);
    await scraping;
    if (this.finished) return;
    await d.wait(0.8);
    this.fadeIn = false;
    this.r.screen.fade = 1;
    this.knife.visible = false;
    this.card.show(t('chapter.1'), t('chapter.1.name'));
    await d.wait(5.2);
    this.end();
  }

  private fadeIn = false;
  private anims: { t: number; dur: number; fn: (k: number) => void; done: () => void }[] = [];

  /** Run `fn` from 0 to 1 over `seconds` of game time. */
  private animate(fn: (k: number) => void, seconds: number): Promise<void> {
    return new Promise((done) => this.anims.push({ t: 0, dur: seconds, fn, done }));
  }

  private lineY(i: number): number {
    return 70 + i * 34;
  }

  private end(): void {
    if (this.finished) return;
    this.finished = true;
    this.stopDrone?.();
    this.onDone();
  }

  private paintPage(): void {
    const W = this.pageCanvas.width;
    const H = this.pageCanvas.height;
    const c = this.pageCanvas.getContext('2d')!;
    const g = this.glowCanvas.getContext('2d')!;
    // Vellum: warm, a little uneven, ruled in drypoint.
    const bg = c.createRadialGradient(W * 0.45, H * 0.4, 20, W / 2, H / 2, W * 0.75);
    bg.addColorStop(0, '#F2E8D0');
    bg.addColorStop(1, '#D8C8A4');
    c.fillStyle = bg;
    c.fillRect(0, 0, W, H);
    c.strokeStyle = 'rgba(150, 120, 90, 0.18)';
    c.lineWidth = 1;
    for (let i = 0; i < LINES; i++) {
      c.beginPath();
      c.moveTo(60, this.lineY(i) + 6);
      c.lineTo(W - 60, this.lineY(i) + 6);
      c.stroke();
    }
    c.strokeRect(50, 40, W - 100, H - 80);
    g.clearRect(0, 0, W, H);
    g.fillStyle = '#000';
    g.fillRect(0, 0, W, H);
    // Lines of names, written from the foot upwards.
    c.font = `italic 22px ${SERIF}`;
    c.textAlign = 'left';
    c.textBaseline = 'alphabetic';
    for (let i = 0; i < LINES; i++) {
      const row = LINES - 1 - i;
      const k = Math.min(1, Math.max(0, this.lines - i));
      if (k <= 0) continue;
      const y = this.lineY(row);
      const text = NAMES[row % NAMES.length]!;
      c.save();
      c.beginPath();
      c.rect(60, y - 26, (W - 120) * k, 34);
      c.clip();
      c.fillStyle = '#3A2414';
      c.fillText(text, 64, y);
      c.restore();
      if (row === SCRAPED && this.scrape > 0) {
        // The scraped line: bare vellum where the knife has passed, the ghost of the
        // writing still underneath.
        const sw = (W - 120) * this.scrape;
        c.save();
        c.beginPath();
        c.rect(58, y - 26, sw + 4, 36);
        c.clip();
        c.fillStyle = '#E9DCC0';
        c.fillRect(58, y - 26, sw + 4, 36);
        c.globalAlpha = 0.12;
        c.fillStyle = '#3A2414';
        c.fillText(text, 64, y);
        c.restore();
      }
    }
    // FINIS at the foot, in gold that glows.
    if (this.finis > 0) {
      const y = H - 48;
      c.font = `600 54px ${SERIF}`;
      g.font = c.font;
      c.textAlign = g.textAlign = 'center';
      const word = 'F I N I S';
      const full = c.measureText(word).width;
      const x0 = W / 2 - full / 2;
      for (const ctx of [c, g]) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(x0 - 10, y - 60, (full + 20) * this.finis, 80);
        ctx.clip();
        ctx.fillStyle = ctx === c ? '#B8862A' : '#FFD27A';
        ctx.fillText(word, W / 2, y);
        ctx.restore();
      }
    }
    this.pageTex.needsUpdate = true;
    this.glowTex.needsUpdate = true;
  }

  update(dt: number): void {
    this.time += dt;
    for (let i = this.anims.length - 1; i >= 0; i--) {
      const a = this.anims[i]!;
      a.t += dt;
      const k = Math.min(1, a.t / a.dur);
      a.fn(k);
      this.dirty = true;
      if (k >= 1) {
        this.anims.splice(i, 1);
        a.done();
      }
    }
    if (this.fadeIn && this.r.screen.fade > 0 && !this.finished) this.r.screen.fade = Math.max(0, this.r.screen.fade - dt / 2.2);
    if (this.dirty) {
      this.paintPage();
      this.dirty = false;
    }
    // The pen of light follows the writing.
    const W = PAGE.w;
    if (this.finis > 0 && this.finis < 1) {
      this.pen.intensity = 0.7;
      this.pen.x = PAGE.x + W * (0.33 + this.finis * 0.34);
      this.pen.y = PAGE.y + PAGE.h - 8;
    } else if (this.lines > 0 && this.lines < LINES) {
      this.pen.intensity = 0.45;
      this.pen.x = PAGE.x + 14 + ((this.lines % 1) * (W - 28));
      this.pen.y = PAGE.y + this.lineY(LINES - 1 - Math.floor(this.lines)) / RES;
    } else this.pen.intensity = 0;
    // The knife works back and forth along the line.
    if (this.knife.visible) {
      const ly = this.lineY(SCRAPED) / RES;
      this.knife.x = PAGE.x + 12 + this.scrape * (W - 24) + Math.sin(this.time * 26) * 2;
      this.knife.y = PAGE.y + ly + 2;
      this.knife.h = 3 + Math.abs(Math.sin(this.time * 13)) * 1.5;
      this.knife.sync();
    }
    this.reader.update(dt);
    this.reader.sprite.opacity = this.readerOn;
    // The Reader is light itself: it glows white.
    this.reader.sprite.flash = 0.75 * this.readerOn;
    this.director.update(dt);
    const [cx, cy, ch] = this.director.cam;
    const v = this.r.view;
    v.x = cx;
    v.y = cy;
    v.h = ch;
    v.pitch = 0.32;
    this.subs.update(dt);
    this.card.update(dt);
    this.letterbox.update(dt);
    this.skipHint.opacity = 0.7;
    this.stage.update(dt, this.time);
  }

  sync(): void {
    this.reader.sync();
    this.ui.sync();
  }

  debugInfo(): DebugInfo {
    return { scene: this.name, location: 'Prologue', lines: [['time', this.time.toFixed(1)]] };
  }

  debugButtons(): { label: string; run: () => void }[] {
    return [{ label: 'skip', run: () => this.end() }];
  }

  dispose(): void {
    for (const u of this.unsubs) u();
    this.stopDrone?.();
    this.subs.dispose();
    this.card.dispose();
    this.letterbox.dispose();
    this.ui.dispose();
    this.stage.dispose();
    this.page.removeFromParent();
    this.page.geometry.dispose();
    this.page.material.dispose();
    this.pageTex.dispose();
    this.glowTex.dispose();
    this.knife.dispose();
    this.reader.dispose();
    const v = this.r.view;
    v.pitch = 0;
    v.zoom = 1;
  }
}

/** A wax candle in a pewter holder. */
function candleImage(): PixelImage {
  const img = new PixelImage(12, 22);
  const wax = ramp('#EFE6D2', 4);
  const pewter = ramp('#8A8C94', 4);
  img.rect(4, 2, 4, 15, wax[2]!);
  img.vline(4, 2, 16, wax[3]!);
  img.vline(7, 2, 16, wax[1]!);
  img.set(5, 1, wax[3]!);
  img.set(6, 0, hex('#2A2018'));
  img.rect(1, 17, 10, 2, pewter[2]!);
  img.hline(1, 10, 17, pewter[3]!);
  img.rect(3, 19, 6, 3, pewter[1]!);
  img.outline(null);
  return img;
}

/** Isot's penknife: a short blade on a wooden haft. */
function knifeImage(): PixelImage {
  const img = new PixelImage(8, 16);
  const blade = ramp('#B9BDC6', 4);
  const wood = ramp('#7A4E2E', 4);
  for (let y = 0; y < 8; y++) {
    img.set(3, y, blade[3]!);
    img.set(4, y, blade[1]!);
  }
  img.set(4, 0, blade[3]!);
  img.rect(3, 8, 2, 7, wood[2]!);
  img.vline(3, 8, 14, wood[3]!);
  img.hline(2, 5, 8, hex('#5A5A62'));
  img.outline(null);
  return img;
}
