/**
 * The battle screen, in the diorama: enemies on the left with their intents written on
 * banderoles above them, the party on the right, windows along the bottom in the manner
 * of the old console RPGs. The engine (src/battle/engine.ts) decides everything at once;
 * this screen plays its event log back as animation, and lets the player plan with
 * every intent in view.
 */

import type { AudioEngine } from '../audio/engine';
import { EbbNightAmbience } from '../audio/ambient';
import { BattleMusic } from '../audio/battleMusic';
import {
  fallSound,
  fizzleSound,
  glossSound,
  healSound,
  hitSound,
  knifeSound,
  omenSound,
  phrase,
  reckoningSound,
  shellSound,
  strikeSound,
  wardSound,
  waveSound,
  whoosh,
} from '../audio/battleSfx';
import { footstep, pageTurn, uiTick } from '../audio/sfx';
import { aimNames } from '../battle/aim';
import { ABILITIES, ENCOUNTERS, ENEMIES, PARTY_STATS } from '../battle/data';
import { bell, midiToHz } from '../audio/instruments';
import { Battle, type Refusal } from '../battle/engine';
import {
  BANDEROLE_H,
  type BanderoleLook,
  COMMAND_ROW,
  COMMAND_W,
  type CommandEntry,
  commandHeight,
  banderoleWidth,
  drawBanderole,
  drawBanner,
  drawCallout,
  drawCommands,
  drawHelp,
  drawNumber,
  drawParty,
  drawSpoils,
  drawTargetHand,
  drawTip,
  type NumberKind,
  PARTY_W,
  type PartyRow,
  partyHeight,
  RED_INK,
  SPOILS_W,
  type SpoilsLook,
  spoilsHeight,
  TIP_W,
  tipHeight,
} from '../battle/hud';
import { SATCHEL, SATCHEL_IDS, type SatchelId } from '../battle/satchel';
import { abilityText, claim, type Difficulty, hpAt, LEVEL_XP, levelFor, MAX_LEVEL, progress, type Spoils } from '../battle/growth';
import { type AbilityId, type BattleEvent, type Intent, PLACE_NAMES, type Unit } from '../battle/types';
import type { DebugInfo } from '../debug/overlay';
import type { WorldRenderer } from '../engine/diorama/renderer';
import { type Action, Input } from '../engine/input';
import { prefs } from '../engine/prefs';
import type { Scene } from '../engine/scene';
import { session } from '../engine/session';
import { textZoom, VIEW_H, VIEW_W } from '../engine/view';
import { t, tr } from '../i18n/i18n';
import { type BattleSet, dressBattle } from '../maps/battleSets';
import { CHARACTERS, FRAME_H } from '../pixel/characters';
import { type EnemyArt, enemyArt } from '../pixel/enemies';
import type { CharId } from '../story/state';
import { withControls } from '../ui/prompts';
import { drawManicule, INK, SERIF, type UiLayer as UiLayerT, type UiPanel, UiLayer } from '../ui/ui';
import { Actor } from '../world3d/actor';
import { Billboard, pixelTexture } from '../world3d/billboard';
import { PhaseStaging } from './battlePhases';
import { Emitter } from '../world3d/particles';
import { Stage } from '../world3d/stage';

export type BattleEnd = 'victory' | 'leave';

// ---------------------------------------------------------------------------------------
// Figures: the people and marginalia standing on the field.

class Figure {
  actor: Actor | null = null;
  bb: Billboard | null = null;
  art: EnemyArt | null = null;
  run = 'idle';
  /** Home on the field (map art pixels), and where the figure is now. */
  hx = 0;
  hy = 0;
  x = 0;
  y = 0;
  /** Lunge offset along x, and the hit shake. */
  ox = 0;
  shake = 0;
  flash = 0;
  /** A steady glow under the hit flash (the gilding of the Clean Page). */
  gild = 0;
  alpha = 1;
  alphaTarget = 1;
  private shownAlpha = 1;
  private clock = Math.random() * 3;
  readonly height: number;

  constructor(
    readonly id: string,
    readonly side: 'party' | 'enemy',
    kind: string,
    scene: THREE_Scene,
  ) {
    const art = side === 'enemy' ? enemyArt(kind) : null;
    if (art) {
      this.art = art;
      const frames = art.a.w / art.w;
      this.bb = new Billboard(pixelTexture(art.a), art.w, art.h, { cols: frames, rows: 1, anchor: art.anchor, emissive: pixelTexture(art.e) });
      scene.add(this.bb.mesh);
      this.height = art.h - 6;
    } else {
      const spec = CHARACTERS[kind] ?? CHARACTERS.brother!;
      this.actor = new Actor(id, spec, scene);
      this.actor.dir = side === 'party' ? 'left' : 'right';
      this.height = FRAME_H;
    }
  }

  get sprite(): Billboard {
    return this.actor ? this.actor.sprite : this.bb!;
  }

  /** Is it still sliding to its home? */
  get moving(): boolean {
    return Math.abs(this.x - this.hx) > 0.4 || Math.abs(this.y - this.hy) > 0.4;
  }

  update(dt: number): void {
    const k = Math.min(1, dt * 9);
    this.x += (this.hx - this.x) * k;
    this.y += (this.hy - this.y) * k;
    this.clock += dt;
    this.flash = Math.max(0, this.flash - dt * 3.2);
    this.shake = Math.max(0, this.shake - dt * 2.4);
    this.alpha += (this.alphaTarget - this.alpha) * Math.min(1, dt * 3);
    this.actor?.update(dt);
  }

  sync(): void {
    const jitter = this.shake > 0 ? Math.round(Math.sin(this.clock * 70) * 3 * this.shake) : 0;
    const s = this.sprite;
    if (this.actor) {
      this.actor.x = this.x + this.ox + jitter;
      this.actor.y = this.y;
      this.actor.h = 0;
      this.actor.sync();
    } else {
      const frames = this.art!.runs[this.run] ?? this.art!.runs.idle!;
      s.setFrame(frames[Math.floor(this.clock / 0.32) % frames.length]!, 0);
      s.x = this.x + this.ox + jitter;
      s.y = this.y;
      s.h = 0;
      s.sync();
    }
    s.flash = Math.max(this.flash, this.gild);
    if (Math.abs(this.alpha - this.shownAlpha) > 0.02 || (this.alpha > 0.99 && this.shownAlpha < 1)) {
      this.shownAlpha = this.alpha > 0.99 ? 1 : this.alpha;
      s.opacity = this.shownAlpha;
    }
    s.visible = this.alpha > 0.02;
  }

  dispose(): void {
    this.actor?.dispose();
    this.bb?.dispose();
  }
}

type THREE_Scene = WorldRenderer['scene'];

// ---------------------------------------------------------------------------------------
// The screen's state.

interface Job {
  dur: number;
  t: number;
  start?: () => void;
  tick?: (k: number) => void;
  end?: () => void;
}

interface Opt {
  label: string;
  right?: string;
  disabled?: boolean;
  done?: boolean;
  help: string;
  warn?: boolean;
  /** For target menus: the unit or intent the cursor points at. */
  unit?: string;
  intent?: string;
  run: () => void;
}

type MenuKind = 'root' | 'abilities' | 'satchel' | 'target' | 'step' | 'result';

interface MenuState {
  kind: MenuKind;
  title: string;
  cursor: number;
  options: () => Opt[];
}

interface Popup {
  panel: UiPanel;
  x: number;
  y: number;
  t: number;
  life: number;
}

interface BanderoleState {
  panel: UiPanel;
  appear: number;
  struck: number;
  active: boolean;
  spent: boolean;
  wiggle: number;
  x: number;
  y: number;
  /** Width in logical units, fitted to what it says. */
  w: number;
  look: string;
}

const ENV_ID = 'env';
/** Where a tip points: a spot on screen, and the side its hand comes from. */
type TipAt = { x: number; y: number; from: 'left' | 'right' | 'above' };
/** The number keys that pick a row are shown at the keyboard only. */
const keyHints = () => (Input.current?.prompts ?? 'keys') === 'keys';
/** The enemy's name plate, between its head and its banderoles. */
const PLATE_H = 30;


/** A deed's order in a red roundel with a gold rim, as on its banderole. */
function roundel(c: CanvasRenderingContext2D, x: number, y: number, n: number): void {
  c.beginPath();
  c.arc(x, y, 10, 0, Math.PI * 2);
  c.fillStyle = RED_INK;
  c.fill();
  c.strokeStyle = INK.gold;
  c.lineWidth = 1.5;
  c.stroke();
  c.fillStyle = '#FFF4D8';
  c.font = `700 13px ${SERIF}`;
  c.textAlign = 'center';
  c.fillText(String(n), x, y + 1);
}

export class BattleScene implements Scene {
  readonly name = 'battle';
  private readonly stage: Stage;
  private readonly set: BattleSet;
  private readonly phaseStaging: PhaseStaging;
  private battle!: Battle;
  private readonly figures = new Map<string, Figure>();
  private readonly ui: UiLayerT;
  private readonly partyWin: UiPanel;
  private readonly cmdWin: UiPanel;
  private readonly helpWin: UiPanel;
  private readonly roundTag: UiPanel;
  /** FINIS as Isot writes it (the final battle only). */
  private readonly finisTag: UiPanel;
  private shownLetters = 0;
  private readonly callout: UiPanel;
  private readonly banner: UiPanel;
  private readonly overlay: UiPanel;
  private readonly hand: UiPanel;
  private readonly pointer: UiPanel;
  private readonly pointerLeft: UiPanel;
  /** The first-time tip on screen, if any: the battle waits until it has been read. */
  private tip: { id: string; panel: UiPanel; at: TipAt | null } | null = null;
  private readonly tipHand: UiPanel;
  private readonly tipHandLeft: UiPanel;
  private readonly tipHandDown: UiPanel;
  private readonly banderoles = new Map<string, BanderoleState>();
  private readonly popups: Popup[] = [];
  private readonly bursts: { e: Emitter; t: number }[] = [];
  private readonly ambience = new EbbNightAmbience({ music: false });
  private music = new BattleMusic();
  private readonly unsubs: (() => void)[] = [];
  private time = 0;
  private mode: 'intro' | 'command' | 'playing' | 'result' = 'intro';
  private readonly jobs: Job[] = [];
  private job: Job | null = null;
  private cursor = 0;
  private menus: MenuState[] = [];
  /** What the screen shows, which lags the engine while its events play back. */
  private shown = { hp: new Map<string, number>(), place: new Map<string, number>(), fallen: new Map<string, boolean>(), ink: 0, round: 0, intents: [] as Intent[] };
  private activeIntent: string | null = null;
  private hoverIntent: string | null = null;
  private overlayDirty = true;
  /** Small text shown larger on small screens: banderoles, plates, numbers (z); the windows (zw). */
  private z = 1;
  private zw = 1;
  private cmdDirty = true;
  private partyDirty = true;
  private calloutT = 0;
  private bannerT = -1;
  private shakeT = 0;
  private shakeAmp = 0;
  private hold = false;
  private lastPointer = { x: -1, y: -1 };
  private defeats = 0;
  private difficulty: Difficulty = prefs.difficulty;
  /** What this fight gave the first time it was won, for the victory scroll. */
  private spoils: Spoils | null = null;
  private spoilsWin: UiPanel | null = null;
  private spoilsT = -1;
  private chimed = false;
  private readonly partyIds: CharId[];

  constructor(
    private readonly r: WorldRenderer,
    private readonly input: Input,
    private readonly audio: AudioEngine,
    private readonly encounter: string,
    private readonly onEnd: (end: BattleEnd) => void,
  ) {
    const def = ENCOUNTERS[encounter];
    if (!def) throw new Error(`unknown encounter ${encounter}`);
    this.stage = new Stage(r);
    this.set = dressBattle(def.stage, r, this.stage);
    this.phaseStaging = new PhaseStaging(r, this.stage, this.set, encounter);
    const g = session.game;
    const order = [...g.formation, ...def.party].filter((c, i, a) => a.indexOf(c) === i);
    this.partyIds = order.filter((c) => def.party.includes(c)).slice(0, 3);

    this.ui = new UiLayer(r);
    this.overlay = this.ui.panel(VIEW_W, VIEW_H, 1);
    this.partyWin = this.ui.panel(PARTY_W, partyHeight(3), 4);
    this.cmdWin = this.ui.panel(COMMAND_W, commandHeight(8), 4);
    this.helpWin = this.ui.panel(820, 58, 4);
    this.roundTag = this.ui.panel(170, 46, 4);
    this.finisTag = this.ui.panel(200, 46, 4);
    this.callout = this.ui.panel(420, 54, 6);
    this.banner = this.ui.panel(1000, 220, 8);
    this.hand = this.ui.panel(56, 56, 7);
    this.pointer = this.ui.panel(56, 40, 7);
    this.pointer.visible = false;
    this.pointer.draw((c, _w, h) => drawManicule(c, 34, h / 2, 1.3));
    this.pointerLeft = this.ui.panel(56, 40, 7);
    this.pointerLeft.visible = false;
    this.pointerLeft.draw((c, w, h) => {
      c.translate(w, 0);
      c.scale(-1, 1);
      drawManicule(c, 34, h / 2, 1.3);
    });
    this.helpWin.x = (VIEW_W - 820) / 2;
    this.helpWin.y = 14;
    this.roundTag.x = 18;
    this.roundTag.y = 18;
    this.finisTag.x = VIEW_W - 218;
    this.finisTag.y = 18;
    this.finisTag.visible = false;
    this.callout.x = (VIEW_W - 420) / 2;
    this.callout.y = 86;
    this.callout.visible = false;
    this.banner.x = (VIEW_W - 1000) / 2;
    this.banner.y = 200;
    this.banner.visible = false;
    this.hand.visible = false;
    this.hand.draw((c, w, h) => drawTargetHand(c, w, h));
    this.tipHand = this.ui.panel(56, 40, 10);
    this.tipHand.visible = false;
    this.tipHand.draw((c, _w, h) => drawManicule(c, 34, h / 2, 1.3));
    this.tipHandDown = this.ui.panel(56, 56, 10);
    this.tipHandDown.visible = false;
    this.tipHandDown.draw((c, w, h) => drawTargetHand(c, w, h));
    this.tipHandLeft = this.ui.panel(56, 40, 10);
    this.tipHandLeft.visible = false;
    this.tipHandLeft.draw((c, w, h) => {
      c.translate(w, 0);
      c.scale(-1, 1);
      drawManicule(c, 34, h / 2, 1.3);
    });

    this.unsubs.push(
      input.onDevice(() => (this.cmdDirty = true)),
      input.onAction((a) => this.onAction(a)),
      input.onPointer((px, py) => {
        const p = r.windowToScreen(px, py);
        if (p) this.onClick(p.x, p.y);
      }),
    );
    this.begin(true);
    // After begin(): with sound already allowed, this runs at once.
    input.onGesture(() => {
      this.ambience.start(audio);
      if (this.battle.result === 'ongoing') this.music.start(audio);
    });
  }

  // ---- setting up a fight ----

  private begin(first: boolean): void {
    this.phaseStaging.reset();
    for (const f of this.figures.values()) f.dispose();
    this.figures.clear();
    for (const b of this.banderoles.values()) this.ui.remove(b.panel);
    this.banderoles.clear();
    const g = session.game;
    this.battle = new Battle({
      encounter: this.encounter,
      party: this.partyIds,
      abilities: Object.fromEntries(this.partyIds.map((c) => [c, (g.abilities[c] ?? []).filter((a): a is AbilityId => a in ABILITIES)])) as Record<CharId, AbilityId[]>,
      equipment: g.equipment,
      level: levelFor(g.xp),
      difficulty: this.difficulty,
      satchel: g.satchel,
      emendAnywhere: !!g.flags.emendUpgraded,
      seed: 7,
    });
    for (const u of this.battle.units) this.ensureFigure(u);
    this.cursor = 0;
    this.jobs.length = 0;
    this.job = null;
    this.menus = [];
    this.activeIntent = null;
    this.bannerT = -1;
    this.banner.visible = false;
    this.r.screen.desaturate = 0;
    if (!first && this.audio.ctx) {
      this.music.stop();
      this.music = new BattleMusic();
      this.music.start(this.audio);
    }
    this.resync();
    this.shown.intents = [];
    this.mode = 'intro';
    // The camera settles on the field while the enemies ink themselves in.
    const cam = this.set.camera;
    const from = { x: cam.x - (first ? 80 : 20), h: cam.h + (first ? 40 : 10) };
    this.queue({
      dur: first ? 2.2 : 0.9,
      start: () => {
        if (first) this.showCallout(tr(this.battle.def.name), 2.4);
      },
      tick: (k) => {
        const e = 1 - Math.pow(1 - k, 3);
        this.r.view.x = Math.round(from.x + (cam.x - from.x) * e);
        this.r.view.h = Math.round(from.h + (cam.h - from.h) * e);
        this.r.view.y = cam.y;
        this.battle.enemies.forEach((u, i) => {
          const f = this.figures.get(u.id)!;
          f.alphaTarget = k > 0.3 + i * 0.12 ? 1 : 0;
        });
      },
    });
    this.queue({
      dur: 0.01,
      start: () => {
        this.battle.start();
        this.pump();
      },
    });
  }

  /** Where a unit stands for a place. */
  private home(u: Unit, place: number): [number, number] {
    if (u.side === 'party') return this.set.party[Math.min(2, place)]!;
    if (u.size > 1) {
      const a = this.set.enemies[place]!;
      const b = this.set.enemies[Math.min(3, place + 1)]!;
      return [(a[0] + b[0]) / 2 - 6, (a[1] + b[1]) / 2 + 6];
    }
    return this.set.enemies[Math.min(3, place)]!;
  }

  /** A figure for a unit, made the first time it is needed (Blotlets rise mid-battle). */
  private ensureFigure(u: Unit): Figure {
    let f = this.figures.get(u.id);
    if (f) return f;
    f = new Figure(u.id, u.side, u.kind, this.r.scene);
    const [x, y] = this.home(u, u.place);
    f.hx = f.x = x;
    f.hy = f.y = y;
    f.alpha = u.side === 'enemy' ? 0 : 1;
    f.alphaTarget = f.alpha;
    this.figures.set(u.id, f);
    return f;
  }

  /** Make the screen show the engine's state as it is now. */
  private resync(): void {
    const b = this.battle;
    for (const u of b.units) {
      this.ensureFigure(u);
      this.shown.hp.set(u.id, u.hp);
      this.shown.place.set(u.id, u.place);
      this.shown.fallen.set(u.id, u.fallen);
      this.placeFigure(u.id);
      const f = this.figures.get(u.id)!;
      if (this.mode !== 'intro') f.alphaTarget = u.fallen ? (u.side === 'party' ? 0.45 : 0) : 1;
      if (f.art) f.run = u.status.shelled && f.art.runs.shell ? 'shell' : 'idle';
    }
    this.shown.ink = b.ink;
    this.shown.round = b.round;
    this.shownLetters = b.letters;
    this.drawFinis();
    this.shown.intents = structuredClone(b.intents);
    this.cursor = b.events.length;
    this.dirty();
  }

  private placeFigure(id: string): void {
    const u = this.battle.unit(id);
    const f = this.figures.get(id);
    if (!u || !f) return;
    const [x, y] = this.home(u, this.shown.place.get(id) ?? u.place);
    f.hx = x;
    f.hy = y;
  }

  private dirty(): void {
    this.overlayDirty = true;
    this.cmdDirty = true;
    this.partyDirty = true;
  }

  // ---- playing the engine's events back ----

  private queue(j: Omit<Job, 't'>): void {
    this.jobs.push({ ...j, t: 0 });
  }

  /** Turn the engine's new events into animation. */
  private pump(): void {
    const ev = this.battle.events;
    while (this.cursor < ev.length) this.enqueue(ev[this.cursor++]!);
  }

  private fig(id: string): Figure | undefined {
    return this.figures.get(id);
  }

  private nameOf(id: string): string {
    const u = this.battle.unit(id);
    return u ? tr(u.name) : '';
  }

  private enqueue(e: BattleEvent): void {
    const a = this.audio;
    switch (e.type) {
      case 'round':
        this.queue({
          dur: e.round > 1 ? 0.5 : 0.1,
          start: () => {
            this.shown.round = e.round;
            this.drawRoundTag();
            for (const b of this.banderoles.values()) b.spent = false;
          },
        });
        break;
      case 'omen':
        this.queue({
          dur: 0.5 + e.intents.length * 0.18,
          start: () => {
            this.shown.intents = structuredClone(this.battle.intents);
            this.activeIntent = null;
            this.syncBanderoles();
            for (const b of this.banderoles.values()) {
              b.appear = 0;
              b.spent = false;
              b.active = false;
            }
            omenSound(a);
            this.overlayDirty = true;
          },
          tick: (k) => {
            const total = 0.5 + e.intents.length * 0.18;
            this.shown.intents.forEach((it, i) => {
              const b = this.banderoles.get(it.id);
              if (b) b.appear = Math.min(1, Math.max(0, (k * total - i * 0.18) / 0.32));
            });
          },
        });
        break;
      case 'act': {
        const def = ABILITIES[e.ability];
        const f = this.fig(e.unit);
        const target = e.target ? this.fig(e.target) : undefined;
        const lunge = def.target === 'enemy' || e.ability === 'shove' ? -16 : -5;
        this.queue({
          dur: 0.42,
          start: () => {
            this.showCallout(tr(def.name), 1.1);
            if (e.ability === 'penknife') knifeSound(a);
            else if (e.ability === 'gloss') glossSound(a);
            else if (e.ability === 'strike') strikeSound(a);
            else if (e.ability === 'shrive' || e.ability === 'benison') healSound(a);
            else if (e.ability === 'immure' || e.ability === 'vigil') wardSound(a);
            else whoosh(a, e.ability === 'lance');
            if (target && e.ability === 'gloss') this.burst(target, '#F4E2A8', 30);
          },
          tick: (k) => {
            if (f) f.ox = lunge * Math.sin(Math.min(1, k * 1.4) * Math.PI);
          },
          end: () => {
            if (f) f.ox = 0;
          },
        });
        break;
      }
      case 'item': {
        const f = this.fig(e.unit);
        const def = SATCHEL[e.item as SatchelId];
        this.queue({
          dur: 0.42,
          start: () => {
            if (def) this.showCallout(tr(def.name), 1.1);
            if (e.item === 'holyWater') glossSound(a);
            else if (e.item === 'waxSeal') wardSound(a);
            else healSound(a);
            const target = e.target ? this.fig(e.target) : f;
            if (target && def) this.burst(target, def.color, 18);
          },
          tick: (k) => {
            if (f) f.ox = -5 * Math.sin(Math.min(1, k * 1.4) * Math.PI);
          },
          end: () => {
            if (f) f.ox = 0;
          },
        });
        break;
      }
      case 'damage':
        this.queue({
          dur: e.source === 'penance' ? 0.3 : 0.36,
          start: () => {
            const f = this.fig(e.unit);
            this.shown.hp.set(e.unit, (this.shown.hp.get(e.unit) ?? 0) - e.amount);
            if (e.source === 'penance') {
              this.popup(e.unit, `−${e.amount} ${t('battle.hp')}`, 'penance');
            } else {
              if (f) {
                f.flash = 1;
                f.shake = e.amount > 0 ? 1 : 0.3;
              }
              if (e.amount > 0) this.popup(e.unit, String(e.amount), e.amount >= 7 ? 'big' : 'damage');
              if (e.absorbed > 0) this.popup(e.unit, `${t('status.ward', { n: '' }).trim()} −${e.absorbed}`, 'ward');
              hitSound(a, e.amount >= 5 ? 1.5 : e.amount === 0 ? 0.5 : 1);
              if (e.amount >= 5) this.screenShake(4, 0.3);
              if (f && e.amount > 0) this.burst(f, f.side === 'enemy' ? '#FFE8B0' : '#FFB0A0', 16);
            }
            this.partyDirty = true;
            this.overlayDirty = true;
          },
        });
        break;
      case 'heal':
        this.queue({
          dur: 0.3,
          start: () => {
            this.shown.hp.set(e.unit, (this.shown.hp.get(e.unit) ?? 0) + e.amount);
            if (e.amount > 0) this.popup(e.unit, `+${e.amount}`, 'heal');
            const f = this.fig(e.unit);
            if (f) this.burst(f, '#B8FFA0', 24);
            this.partyDirty = true;
            this.overlayDirty = true;
          },
        });
        break;
      case 'ward':
        this.queue({
          dur: 0.26,
          start: () => {
            this.popup(e.unit, `+${t('status.ward', { n: e.amount })}`, 'ward');
            const f = this.fig(e.unit);
            if (f) this.burst(f, '#A8C8FF', 20);
            wardSound(a);
            this.partyDirty = true;
          },
        });
        break;
      case 'status':
        this.queue({
          dur: e.status === 'ward' ? 0.05 : 0.3,
          start: () => {
            const f = this.fig(e.unit);
            const u = this.battle.unit(e.unit);
            if (e.status === 'shelled' && f?.art?.runs.shell) {
              f.run = e.on ? 'shell' : 'idle';
              shellSound(a);
            }
            if (e.on && e.status !== 'ward' && e.status !== 'revealed') {
              const word =
                e.status === 'tally'
                  ? t('status.tally', { n: u?.status.tally ?? 3 })
                  : e.status === 'named'
                    ? u?.side === 'party'
                      ? t('battle.answers')
                      : t('status.named', { n: u?.status.named ?? 1, m: ENEMIES[u?.kind ?? '']?.named ?? 3 })
                    : t(`status.${e.status}`);
              this.popup(e.unit, word, 'word');
            }
            this.partyDirty = true;
            this.overlayDirty = true;
          },
        });
        break;
      case 'cancel':
        this.queue({
          dur: 0.45,
          tick: (k) => {
            const b = this.banderoles.get(e.intent);
            if (b) b.struck = k;
          },
          end: () => {
            const it = this.shown.intents.find((i) => i.id === e.intent);
            if (it) it.cancelled = true;
            this.overlayDirty = true;
          },
        });
        break;
      case 'retarget':
        this.queue({
          dur: 0.3,
          start: () => {
            const it = this.battle.intents.find((i) => i.id === e.intent);
            const s = this.shown.intents.find((i) => i.id === e.intent);
            if (it && s) s.target = structuredClone(it.target);
            const b = this.banderoles.get(e.intent);
            if (b) b.wiggle = 1;
            this.overlayDirty = true;
          },
        });
        break;
      case 'move':
        this.queue({
          dur: 0.16,
          start: () => {
            this.shown.place.set(e.unit, e.to);
            this.placeFigure(e.unit);
            footstep(a, 'stone');
            this.overlayDirty = true;
            this.partyDirty = true;
          },
        });
        break;
      case 'reckoning':
        this.queue({
          dur: 0.7,
          start: () => {
            const f = this.fig(e.unit);
            this.popup(e.unit, t('battle.reckoning'), 'word');
            reckoningSound(a);
            this.r.screen.flash = 0.6;
            this.screenShake(6, 0.5);
            if (f) {
              f.flash = 1.4;
              this.burst(f, '#FFD870', 60);
            }
          },
        });
        break;
      case 'vigil':
        this.queue({
          dur: 0.45,
          start: () => {
            this.popup(e.by, t('battle.vigil'), 'word');
            whoosh(a, true);
          },
          tick: (k) => {
            const f = this.fig(e.by);
            if (f) f.ox = -22 * Math.sin(Math.min(1, k * 1.3) * Math.PI);
          },
        });
        break;
      case 'fall':
        this.queue({
          dur: 0.7,
          start: () => {
            const f = this.fig(e.unit);
            const u = this.battle.unit(e.unit);
            this.shown.fallen.set(e.unit, true);
            if (f) {
              f.alphaTarget = u?.side === 'party' ? 0.45 : 0;
              if (u?.side === 'enemy') this.burst(f, '#EADCB8', 80);
            }
            fallSound(a, u?.side === 'enemy');
            this.overlayDirty = true;
            this.partyDirty = true;
            this.syncBanderoles();
          },
        });
        break;
      case 'leave':
        // He remembers his name: no scatter of ink, he simply goes.
        this.queue({
          dur: 0.9,
          start: () => {
            const f = this.fig(e.unit);
            this.shown.fallen.set(e.unit, true);
            if (f) {
              f.alphaTarget = 0;
              this.burst(f, '#F4E2A8', 24);
            }
            this.popup(e.unit, t('battle.remembers'), 'word');
            const ctx = a.ctx;
            if (ctx) bell(ctx, a.reverbIn, midiToHz(64), ctx.currentTime, 0.25, 5);
            this.overlayDirty = true;
            this.syncBanderoles();
          },
        });
        break;
      case 'rise':
        this.queue({
          dur: 0.4,
          start: () => {
            this.shown.fallen.set(e.unit, false);
            const f = this.fig(e.unit);
            if (f) f.alphaTarget = 1;
            this.popup(e.unit, t('battle.rises'), 'word');
            this.partyDirty = true;
          },
        });
        break;
      case 'intent':
        this.queue({
          dur: e.actor === ENV_ID ? 0.6 : 0.5,
          start: () => {
            if (this.activeIntent) {
              const prev = this.banderoles.get(this.activeIntent);
              if (prev) {
                prev.active = false;
                prev.spent = true;
              }
            }
            this.activeIntent = e.intent;
            const b = this.banderoles.get(e.intent);
            if (b) b.active = true;
            const it = this.shown.intents.find((i) => i.id === e.intent);
            if (e.actor === ENV_ID) {
              waveSound(a);
              this.screenShake(3, 0.6);
              const front = this.battle.party.find((p) => this.shown.place.get(p.id) === 0);
              const f = front ? this.fig(front.id) : undefined;
              if (f) this.burst(f, '#D8ECFF', 90, 1.4);
            } else if (it && it.damage > 0) whoosh(a);
            this.overlayDirty = true;
          },
          tick: (k) => {
            const f = this.fig(e.actor);
            const it = this.shown.intents.find((i) => i.id === e.intent);
            if (f && it && !('self' in it.target)) {
              f.ox = 18 * Math.sin(Math.min(1, k * 1.5) * Math.PI);
              if (f.art?.runs.lunge) f.run = k < 0.66 ? 'lunge' : 'idle';
            }
          },
          end: () => {
            const f = this.fig(e.actor);
            if (f) f.ox = 0;
            if (f?.art && f.run === 'lunge') f.run = 'idle';
          },
        });
        break;
      case 'windup':
        this.queue({
          dur: 0.6,
          start: () => {
            this.activeIntent = e.intent;
            const b = this.banderoles.get(e.intent);
            if (b) b.active = true;
            this.popup(e.actor, t('battle.gathers'), 'word');
          },
          end: () => {
            const b = this.banderoles.get(e.intent);
            if (b) {
              b.active = false;
              b.spent = true;
            }
          },
        });
        break;
      case 'spared':
        this.queue({
          dur: 0.6,
          start: () => {
            this.popup(e.unit, t('battle.spared'), 'word');
            wardSound(a);
            const f = this.fig(e.unit);
            if (f) this.burst(f, '#C89AB0', 30);
          },
        });
        break;
      case 'pass':
        this.queue({
          dur: 0.45,
          start: () => {
            this.popup(e.unit, t('battle.passes'), 'word');
            fizzleSound(a);
            const f = this.fig(e.unit);
            if (f) this.burst(f, '#D8D0C0', 30);
          },
        });
        break;
      case 'fizzle':
        this.queue({
          dur: 0.55,
          start: () => {
            const it = this.shown.intents.find((i) => i.id === e.intent);
            const who = it?.actor ?? '';
            this.popup(who, e.reason === 'reach' ? t('battle.cannotReach') : e.reason === 'immured' ? t('battle.walledIn') : t('battle.noOne'), 'word');
            fizzleSound(a);
            const b = this.banderoles.get(e.intent);
            if (b) {
              b.wiggle = 1;
              b.active = false;
              b.spent = true;
            }
          },
        });
        break;
      case 'ink':
        this.queue({
          dur: e.amount > 0 ? 0.15 : 0.01,
          start: () => {
            this.shown.ink += e.amount;
            this.partyDirty = true;
          },
        });
        break;
      case 'victory':
        this.queue({
          dur: 1.6,
          start: () => {
            this.mode = 'result';
            this.defeats = 0;
            this.spoils = claim(session.game, this.encounter);
            // Who went by remembering their name, not by a blow (the map tells it after).
            for (const u of this.battle.enemies) if (u.left) session.game.flags[`left.${u.kind}`] = true;
            // What was used from the satchel is gone only once the fight is won.
            const sat = session.game.satchel;
            for (const [id, n] of Object.entries(this.battle.spent())) sat[id] = Math.max(0, (sat[id] ?? 0) - (n ?? 0));
            this.music.stop();
            phrase(a, 'victory');
            this.showBanner(t('battle.victory'), t('battle.victoryLine'), false);
          },
          end: () => this.openResult(true),
        });
        break;
      case 'defeat':
        this.queue({
          dur: 1.8,
          start: () => {
            this.mode = 'result';
            this.defeats++;
            this.music.stop();
            phrase(a, 'defeat');
            this.showBanner(t('battle.defeat'), t('battle.defeatLine'), true);
          },
          tick: (k) => (this.r.screen.desaturate = 0.75 * k),
          end: () => this.openResult(false),
        });
        break;
      case 'phase':
        this.queue({
          dur: 2.4,
          start: () => {
            this.showBanner(tr(e.title), tr(e.line), false);
            reckoningSound(a);
            if (e.id === 'cleanPage') {
              this.r.screen.flash = 0.9;
              pageTurn(a);
            }
            this.phaseStaging.trigger(e.id, (kind) => this.battle.enemies.find((u) => u.kind === kind)?.id);
          },
          end: () => {
            this.banner.visible = false;
            this.bannerT = -1;
          },
        });
        break;
      case 'letter':
        this.queue({
          dur: e.lost ? 0.6 : 0.8,
          start: () => {
            this.shownLetters = e.count;
            this.drawFinis();
            // The Heap's word: letters come and go on the Heap itself, not at Isot's lectern.
            const heap = this.battle.def.objective === 'word' ? this.battle.enemies.find((u) => ENEMIES[u.kind]?.loosens) : undefined;
            if (e.lost) {
              this.popup(heap?.id ?? 'isot', t(heap ? 'battle.loosened' : 'battle.smudged'), 'word');
              fizzleSound(a);
            } else {
              const ctx = a.ctx;
              if (ctx) {
                bell(ctx, a.bus('sfx'), midiToHz([55, 57, 59, 62, 67][e.count - 1] ?? 55), ctx.currentTime, 0.4, 7);
                bell(ctx, a.reverbIn, midiToHz([55, 57, 59, 62, 67][e.count - 1] ?? 55), ctx.currentTime, 0.3, 7);
              }
              this.r.screen.flash = 0.35;
              const f = this.fig(heap?.id ?? 'isot');
              if (f) this.burst(f, '#F4D070', 50);
            }
          },
        });
        break;
      case 'falter':
        this.queue({
          dur: 0.5,
          start: () => {
            this.popup(e.unit, t('battle.falters'), 'word');
            this.screenShake(4, 0.4);
          },
        });
        break;
      case 'spawn':
        this.queue({
          dur: 0.5,
          start: () => {
            const u = this.battle.unit(e.unit);
            if (!u) return;
            this.shown.hp.set(u.id, u.maxHp);
            this.shown.place.set(u.id, u.place);
            this.shown.fallen.set(u.id, false);
            const f = this.ensureFigure(u);
            f.alphaTarget = 1;
            this.burst(f, '#3A3450', 40);
            this.popup(u.id, t('battle.rises'), 'word');
            whoosh(a);
            this.overlayDirty = true;
          },
        });
        break;
    }
  }

  // ---- first-time tips ----

  /**
   * What a newcomer needs to read the field, each said once in a playthrough, in the order it
   * is needed and only when it is on screen: the banderoles, the marks over the heads, the turn,
   * Ink, hidden intents, wind-ups, places, and the difference between striking out and emending.
   */
  private tips(): { id: string; when: () => boolean; vars: () => Record<string, string | number>; at: () => TipAt | null }[] {
    const b = this.battle;
    const live = b.intents.filter((i) => !i.cancelled).sort((x, y) => x.order - y.order);
    const shown = live.filter((i) => b.shows(i));
    const knows = (who: CharId, a: AbilityId) => b.party.some((u) => u.id === who) && b.abilitiesOf(who).includes(a);
    const names = { strike: tr(ABILITIES.strike.name), emend: tr(ABILITIES.emend.name), gloss: tr(ABILITIES.gloss.name) };
    const blow = () => shown.find((i) => i.damage > 0) ?? shown[0];
    const none = () => ({});
    return [
      // The topmost banderole: nothing above it for the hand to cover.
      { id: 'omen', when: () => shown.length > 0, vars: none, at: () => this.banderoleAt([...shown].sort((x, y) => (this.banderoles.get(x.id)?.y ?? 0) - (this.banderoles.get(y.id)?.y ?? 0))[0]) },
      { id: 'marks', when: () => live.some((i) => b.aims(i).length > 0), vars: none, at: () => this.marksAt() },
      { id: 'turn', when: () => true, vars: () => ({ endTurn: t('battle.endTurn'), undo: t('battle.undo') }), at: () => this.cmdAt() },
      { id: 'hidden', when: () => live.some((i) => !b.shows(i)) && (knows('isot', 'gloss') || knows('hild', 'squint')), vars: () => names, at: () => this.banderoleAt(live.find((i) => !b.shows(i))) },
      { id: 'windup', when: () => shown.some((i) => i.countdown > 0), vars: none, at: () => this.banderoleAt(shown.find((i) => i.countdown > 0)) },
      {
        id: 'ink',
        when: () => b.round >= 2 && knows('isot', 'strike'),
        vars: () => ({ ...names, cost: ABILITIES.strike.ink ?? 2, max: b.maxInk, back: t(this.difficulty === 'story' ? 'tip.two' : 'tip.one') }),
        at: () => this.inkAt(),
      },
      { id: 'places', when: () => b.party.filter((u) => !u.fallen).length >= 2, vars: none, at: () => this.partyAt() },
      {
        id: 'emend',
        when: () => knows('isot', 'emend') && knows('isot', 'strike') && !!blow(),
        vars: () => ({ ...names, sc: ABILITIES.strike.ink ?? 2, ec: ABILITIES.emend.ink ?? 1 }),
        at: () => this.banderoleAt(blow()),
      },
    ];
  }

  /** Show the first tip not yet read whose moment has come. */
  private nextTip(): void {
    if (this.tip || this.mode !== 'command' || this.battle.result !== 'ongoing') return;
    const flags = session.game.flags;
    const tip = this.tips().find((x) => !flags[`tip.${x.id}`] && x.when());
    if (!tip) return;
    const vars = tip.vars();
    const title = t(`tip.${tip.id}.title`, vars);
    const body = t(`tip.${tip.id}`, vars);
    const h = tipHeight(body);
    const panel = this.ui.panel(TIP_W, h, 9);
    panel.zoom = this.zw;
    const next = tr(withControls({ en: '{confirm} to go on', fr: '{confirm} pour continuer' }));
    panel.draw((c, w, hh) => drawTip(c, w, hh, title, body, next));
    this.layoutBanderoles();
    const at = tip.at();
    panel.x = (VIEW_W - TIP_W * this.zw) / 2;
    // Out of the way of what it points at: under the banderoles, or over the windows.
    panel.y = at && at.y < VIEW_H * 0.5 ? VIEW_H - 18 - h * this.zw : 14;
    this.tip = { id: tip.id, panel, at };
    this.helpWin.visible = false;
    this.cmdDirty = this.partyDirty = true;
    pageTurn(this.audio);
  }

  private closeTip(): void {
    if (!this.tip) return;
    session.game.flags[`tip.${this.tip.id}`] = true;
    this.ui.remove(this.tip.panel);
    this.tip = null;
    this.tipHand.visible = this.tipHandLeft.visible = this.tipHandDown.visible = false;
    uiTick(this.audio, true);
    this.cmdDirty = true;
    this.nextTip();
  }

  /** The hand beside what the tip is about, bobbing. */
  private placeTip(): void {
    // One hand at a time: while a tip is read, only its own.
    if (this.tip) this.helpWin.visible = this.hand.visible = this.pointer.visible = this.pointerLeft.visible = false;
    const at = this.tip?.at;
    this.tipHand.visible = !!at && at.from === 'left';
    this.tipHandLeft.visible = !!at && at.from === 'right';
    this.tipHandDown.visible = !!at && at.from === 'above';
    if (!at) return;
    const z = this.z;
    const bob = Math.sin(this.time * 6) * 4 * z;
    if (at.from === 'above') {
      this.tipHandDown.zoom = z;
      this.tipHandDown.x = at.x - 28 * z;
      this.tipHandDown.y = at.y - 50 * z + bob;
      return;
    }
    const p = at.from === 'left' ? this.tipHand : this.tipHandLeft;
    p.zoom = z;
    p.x = at.from === 'left' ? at.x - 56 * z + bob : at.x - bob;
    p.y = at.y - 20 * z;
  }

  private banderoleAt(it: Intent | undefined): TipAt | null {
    const ban = it && this.banderoles.get(it.id);
    if (!ban) return null;
    const z = this.z;
    const mid = ban.x + (ban.w * z) / 2;
    // As when a banderole is aimed at: the hand over its middle, pointing down, unless another
    // banderole sits there; then from its side.
    const hidesOther = [...this.banderoles.values()].some((o) => o !== ban && mid + 28 * z > o.x && mid - 28 * z < o.x + o.w * z && ban.y - 56 * z < o.y + BANDEROLE_H * z && ban.y > o.y);
    if (!hidesOther) return { x: mid, y: ban.y - 6, from: 'above' };
    const y = ban.y + (BANDEROLE_H * z) / 2;
    return ban.x > 70 * z ? { x: ban.x + 8 * z, y, from: 'left' } : { x: ban.x + ban.w * z - 8 * z, y, from: 'right' };
  }

  /** The marks over the first ally about to be struck. */
  private marksAt(): TipAt | null {
    const b = this.battle;
    const hit = new Map<string, number>();
    for (const it of b.intents) if (!it.cancelled && !it.waiting && it.countdown <= 0) for (const u of b.aims(it)) hit.set(u.id, (hit.get(u.id) ?? 0) + 1);
    const [id, n] = [...hit][0] ?? [];
    const f = id ? this.fig(id) : undefined;
    if (!f || !n) return null;
    const p = this.r.mapToScreen(f.hx, f.hy, f.height + 6);
    return { x: p.x - ((n * 24 + 44) / 2 + 8) * this.z, y: p.y - 14 * this.z, from: 'left' };
  }

  /** The foot of the command window, where the turn is ended. */
  private cmdAt(): TipAt {
    const r = this.cmdRect();
    return { x: r.x + r.w - 6, y: r.y + r.h - COMMAND_ROW * this.zw, from: 'right' };
  }

  /** The places, down the party window's left side. */
  private partyAt(): TipAt {
    return { x: this.partyWin.x + 8, y: this.partyWin.y + 40 * this.zw, from: 'left' };
  }

  /** Isot's inkpots, in her row of the party window. */
  private inkAt(): TipAt {
    const rows = [...this.battle.party].sort((x, y) => (this.shown.place.get(x.id) ?? x.place) - (this.shown.place.get(y.id) ?? y.place));
    const k = Math.max(0, rows.findIndex((u) => u.id === 'isot'));
    // The pots start right of the HP bar (drawParty): 178 + 170 + 16, a row's middle at 31.
    return { x: this.partyWin.x + 362 * this.zw, y: this.partyWin.y + (14 + 50 * k + 29) * this.zw, from: 'left' };
  }

  // ---- commands ----

  private get speed(): number {
    return (prefs.battleFast ? 1.8 : 1) * (this.hold ? 2.5 : 1);
  }

  /** Back to planning: the root menu, the cursor on the next ally who can act. */
  private toCommand(): void {
    this.mode = 'command';
    this.resync();
    const root = this.rootMenu();
    const ready = this.battle.ready();
    const opts = root.options();
    const next = ready.length ? opts.findIndex((o) => o.unit === ready.sort((a, b) => a.place - b.place)[0]!.id) : opts.length - 1;
    root.cursor = Math.max(0, next);
    this.menus = [root];
    this.cmdDirty = true;
    this.nextTip();
  }

  private rootMenu(): MenuState {
    return {
      kind: 'root',
      title: t('battle.party'),
      cursor: 0,
      options: () => {
        const b = this.battle;
        const out: Opt[] = [];
        for (const u of [...b.party].sort((x, y) => x.place - y.place)) {
          const ready = !u.fallen && !u.acted && !u.status.immured;
          out.push({
            label: tr(u.name),
            right: tr(PLACE_NAMES[u.place]!),
            disabled: !ready,
            done: u.acted && !u.fallen && !b.kneeling(u.id),
            unit: u.id,
            help: ready ? this.statusHelp(u) : u.fallen ? t('refuse.fallen') : b.kneeling(u.id) ? `${tr(u.name)} ${t('battle.kneels')}.` : u.status.immured ? t('refuse.immured') : t('refuse.acted'),
            warn: !ready,
            run: () => this.openAbilities(u.id),
          });
        }
        const pairs = this.stepPairs();
        out.push({
          label: t('battle.step'),
          disabled: !pairs.length,
          help: b.stepUsed ? t('battle.stepUsed') : t('battle.stepHelp'),
          warn: b.stepUsed,
          run: () => this.openStep(),
        });
        out.push({
          label: t('battle.undo'),
          disabled: !b.canUndo,
          help: b.canUndo ? t('battle.undoHelp') : t('battle.nothingToUndo'),
          run: () => this.doUndo(),
        });
        out.push({
          label: t('battle.endTurn'),
          help: b.ready().length ? t('battle.endTurnHelp') : t('battle.allActed'),
          run: () => this.doEndTurn(),
        });
        return out;
      },
    };
  }

  /** What its statuses mean, in a line each ("Ward 3: absorbs the next 3 damage"); empty if it has none. */
  private statusHelp(u: Unit): string {
    return this.chips(u)
      .map((c) => c.help)
      .join('  ·  ');
  }

  private refusalText(r: Refusal, user: Unit): string {
    return t(`refuse.${r}`, { n: this.battle.readThreshold(user) });
  }

  private costLabel(user: Unit, a: AbilityId): string {
    const ink = this.battle.inkCost(user, a);
    if (ink) return `${ink} ${t('battle.ink')}`;
    const hp = this.battle.hpCost(a, user);
    if (hp) return `${hp} ${t('battle.hp')}`;
    return '';
  }

  /** The targets an ability may be aimed at, valid or not (to explain why not). */
  private targetsFor(user: Unit, a: AbilityId): { unit?: string; intent?: string; refusal: Refusal | null }[] {
    const b = this.battle;
    const def = ABILITIES[a];
    const enemies = b.standingEnemies();
    const allies = [...b.party].sort((x, y) => x.place - y.place);
    switch (def.target) {
      case 'enemy':
        return enemies.map((e) => ({ unit: e.id, refusal: b.check(user.id, a, { unit: e.id }) }));
      case 'ally':
        return allies.filter((x) => !x.fallen).map((x) => ({ unit: x.id, refusal: b.check(user.id, a, { unit: x.id }) }));
      case 'fallenOrAlly':
        return allies.map((x) => ({ unit: x.id, refusal: b.check(user.id, a, { unit: x.id }) }));
      case 'anyUnit':
        return [...enemies, ...allies.filter((x) => !x.fallen)].map((x) => ({ unit: x.id, refusal: b.check(user.id, a, { unit: x.id }) }));
      case 'intent':
        return b.intents
          .filter((i) => !i.cancelled)
          .map((i) => {
            let refusal = b.check(user.id, a, { intent: i.id, to: user.id === 'isot' ? (allies.find((x) => x.id !== 'isot' && !x.fallen)?.id ?? 'isot') : user.id });
            if (a === 'emend' && refusal === 'target') refusal = null;
            return { intent: i.id, refusal };
          });
      case 'none':
        return [{ refusal: b.check(user.id, a) }];
    }
  }

  private openAbilities(id: string): void {
    const b = this.battle;
    const u = b.unit(id)!;
    uiTick(this.audio, true);
    this.menus.push({
      kind: 'abilities',
      title: tr(u.name),
      cursor: 0,
      options: () => [
        ...b.abilitiesOf(u.id).map((a) => {
          const def = ABILITIES[a];
          const ts = this.targetsFor(u, a);
          const base = b.check(u.id, a, ts[0] ?? {});
          const anyValid = ts.some((x) => !x.refusal);
          const blocking: Refusal | null = ['ink', 'hp', 'from-front', 'used', 'acted', 'immured', 'fallen'].includes(base ?? '') ? base : anyValid ? null : (ts[0]?.refusal ?? 'target');
          return {
            label: tr(def.name),
            right: this.costLabel(u, a),
            disabled: !!blocking,
            help: blocking ? `${tr(abilityText(a, b.level))} — ${this.refusalText(blocking, u)}` : tr(abilityText(a, b.level)),
            warn: !!blocking,
            run: () => {
              if (blocking) return this.buzz(this.refusalText(blocking, u));
              if (def.target === 'none') return this.doAct(u.id, a, {});
              this.openTargets(u, a);
            },
          };
        }),
        ...this.satchelEntry(u),
      ],
    });
    this.cmdDirty = true;
  }

  /** The satchel, last in every ally's list once anything was carried into the fight. */
  private satchelEntry(u: Unit): Opt[] {
    const b = this.battle;
    const carried = SATCHEL_IDS.filter((id) => (session.game.satchel[id] ?? 0) > 0);
    if (!carried.length) return [];
    const left = carried.reduce((n, id) => n + (b.satchel[id] ?? 0), 0);
    const base = b.checkItem(u.id, carried.find((id) => b.satchel[id]) ?? carried[0]!, {});
    const blocking = !left ? 'empty' : base === 'acted' || base === 'immured' || base === 'fallen' ? base : null;
    return [
      {
        label: t('battle.satchel'),
        right: `${left}`,
        disabled: !!blocking,
        help: blocking ? `${t('battle.satchelHelp')} — ${this.refusalText(blocking, u)}` : t('battle.satchelHelp'),
        warn: !!blocking,
        run: () => (blocking ? this.buzz(this.refusalText(blocking, u)) : this.openSatchel(u, carried)),
      },
    ];
  }

  private openSatchel(u: Unit, carried: SatchelId[]): void {
    const b = this.battle;
    uiTick(this.audio, true);
    this.menus.push({
      kind: 'satchel',
      title: t('battle.satchel'),
      cursor: 0,
      options: () =>
        carried.map((id) => {
          const def = SATCHEL[id];
          const ts = this.itemTargets(u, id);
          const refusal = ts.some((x) => !x.refusal) ? null : (ts[0]?.refusal ?? 'target');
          return {
            label: tr(def.name),
            right: `×${b.satchel[id] ?? 0}`,
            disabled: !!refusal,
            help: refusal ? `${tr(def.text)} — ${this.refusalText(refusal, u)}` : tr(def.text),
            warn: !!refusal,
            run: () => {
              if (refusal) return this.buzz(this.refusalText(refusal, u));
              if (def.target === 'none') return this.doUse(u.id, id, {});
              this.openItemTargets(u, id);
            },
          };
        }),
    });
    this.cmdDirty = true;
  }

  private itemTargets(user: Unit, id: SatchelId): { unit?: string; refusal: Refusal | null }[] {
    const b = this.battle;
    const allies = [...b.party].sort((x, y) => x.place - y.place);
    switch (SATCHEL[id].target) {
      case 'enemy':
        return b.standingEnemies().map((e) => ({ unit: e.id, refusal: b.checkItem(user.id, id, { unit: e.id }) }));
      case 'ally':
        return allies.filter((x) => !x.fallen).map((x) => ({ unit: x.id, refusal: b.checkItem(user.id, id, { unit: x.id }) }));
      case 'fallen':
        return allies.map((x) => ({ unit: x.id, refusal: b.checkItem(user.id, id, { unit: x.id }) }));
      case 'none':
        return [{ refusal: b.checkItem(user.id, id) }];
    }
  }

  private openItemTargets(u: Unit, id: SatchelId): void {
    const def = SATCHEL[id];
    uiTick(this.audio, true);
    this.menus.push({
      kind: 'target',
      title: tr(def.name),
      cursor: 0,
      options: () =>
        this.itemTargets(u, id).map((x) => {
          const tu = this.battle.unit(x.unit!)!;
          return {
            label: this.nameOf(tu.id),
            unit: tu.id,
            help: x.refusal ? this.refusalText(x.refusal, u) : this.statusHelp(tu) || tr(def.text),
            warn: !!x.refusal,
            disabled: !!x.refusal,
            run: () => (x.refusal ? this.buzz(this.refusalText(x.refusal, u)) : this.doUse(u.id, id, { unit: tu.id })),
          };
        }),
    });
    const m = this.menus[this.menus.length - 1]!;
    m.cursor = Math.max(0, m.options().findIndex((o) => !o.disabled));
    this.cmdDirty = true;
    this.overlayDirty = true;
  }

  private doUse(user: string, id: SatchelId, target: { unit?: string }): void {
    if (!this.battle.useItem(user, id, target)) return this.buzz(t('refuse.target'));
    uiTick(this.audio, true);
    this.played();
  }

  private openTargets(u: Unit, a: AbilityId): void {
    const def = ABILITIES[a];
    uiTick(this.audio, true);
    this.menus.push({
      kind: 'target',
      title: tr(def.name),
      cursor: 0,
      options: () =>
        this.targetsFor(u, a).map((x) => {
          const label = x.unit ? this.nameOf(x.unit) : x.intent ? this.intentText(this.battle.intents.find((i) => i.id === x.intent)!) : '';
          const tu = x.unit ? this.battle.unit(x.unit) : undefined;
          // A unit: what its statuses mean, or what the ability will do to it; an intent: the intent in words.
          const detail = tu ? this.statusHelp(tu) || tr(abilityText(a, this.battle.level)) : label;
          return {
            label,
            unit: x.unit,
            intent: x.intent,
            help: x.refusal ? this.refusalText(x.refusal, u) : detail,
            warn: !!x.refusal,
            disabled: !!x.refusal,
            run: () => {
              if (x.refusal) return this.buzz(this.refusalText(x.refusal, u));
              if (a === 'emend' && x.intent) return this.openEmendTo(u, x.intent);
              this.doAct(u.id, a, { unit: x.unit, intent: x.intent });
            },
          };
        }),
    });
    // Start on the first valid target.
    const m = this.menus[this.menus.length - 1]!;
    m.cursor = Math.max(0, m.options().findIndex((o) => !o.disabled));
    this.cmdDirty = true;
    this.overlayDirty = true;
  }

  private openEmendTo(u: Unit, intent: string): void {
    uiTick(this.audio, true);
    this.menus.push({
      kind: 'target',
      title: tr(ABILITIES.emend.name),
      cursor: 0,
      options: () =>
        [
          ...[...this.battle.party].sort((x, y) => x.place - y.place),
          // After Knell Chapel, a correction can point anywhere: at another enemy too.
          ...(this.battle.emendAnywhere ? this.battle.standingEnemies() : []),
        ]
          .filter((x) => !x.fallen)
          .map((x) => {
            const refusal = this.battle.check(u.id, 'emend', { intent, to: x.id });
            const choose = x.side === 'enemy' ? t('battle.chooseEnemyEmend') : t('battle.chooseAlly');
            return {
              label: tr(x.name),
              unit: x.id,
              help: refusal ? this.refusalText(refusal, u) : [choose, this.statusHelp(x)].filter(Boolean).join('  '),
              warn: !!refusal,
              disabled: !!refusal,
              run: () => (refusal ? this.buzz(this.refusalText(refusal, u)) : this.doAct(u.id, 'emend', { intent, to: x.id })),
            };
          }),
    });
    this.cmdDirty = true;
  }

  private stepPairs(): [number, number][] {
    return (
      [
        [0, 1],
        [1, 2],
      ] as [number, number][]
    ).filter(([a, b]) => this.battle.canStep(a, b));
  }

  private openStep(): void {
    uiTick(this.audio, true);
    this.menus.push({
      kind: 'step',
      title: t('battle.step'),
      cursor: 0,
      options: () =>
        this.stepPairs().map(([a, b]) => {
          const ua = this.battle.allyAt(a)!;
          const ub = this.battle.allyAt(b)!;
          return {
            label: `${tr(ua.name)} ⇄ ${tr(ub.name)}`,
            right: `${tr(PLACE_NAMES[a]!)} ⇄ ${tr(PLACE_NAMES[b]!)}`,
            unit: ua.id,
            help: t('battle.stepHelp'),
            run: () => {
              if (this.battle.step(a, b)) this.played();
            },
          };
        }),
    });
    this.cmdDirty = true;
  }

  private doAct(user: string, a: AbilityId, target: { unit?: string; intent?: string; to?: string }): void {
    if (!this.battle.act(user, a, target)) return this.buzz(t('refuse.target'));
    uiTick(this.audio, true);
    this.played();
  }

  private doUndo(): void {
    if (!this.battle.undo()) return this.buzz(t('battle.nothingToUndo'));
    pageTurn(this.audio);
    this.jobs.length = 0;
    this.job = null;
    this.toCommand();
    for (const [id, b] of this.banderoles) b.struck = this.battle.intents.find((i) => i.id === id)?.cancelled ? 1 : 0;
  }

  private doEndTurn(): void {
    uiTick(this.audio, true);
    this.menus = [];
    this.cmdDirty = true;
    this.battle.endTurn();
    this.played();
  }

  /** An action was taken: play its events, then come back to planning. */
  private played(): void {
    this.mode = 'playing';
    this.menus = [];
    this.hand.visible = false;
    this.pointer.visible = false;
    this.pointerLeft.visible = false;
    this.cmdDirty = true;
    this.pump();
  }

  private buzz(why: string): void {
    const ctx = this.audio.ctx;
    if (ctx) fizzleSound(this.audio);
    this.drawHelpText(why, true);
  }

  private openResult(won: boolean): void {
    // After two defeats, the fight can be tried a step easier.
    const easier: Difficulty | null = this.difficulty === 'illuminated' ? 'normal' : this.difficulty === 'normal' ? 'story' : null;
    if (won && this.spoils && (this.spoils.xp || this.spoils.pennies)) this.openSpoils(this.spoils);
    const entries: Opt[] = won
      ? [{ label: t('battle.continue'), help: '', run: () => this.onEnd('victory') }]
      : [
          {
            label: t('battle.retry'),
            help: t('battle.defeatLine'),
            run: () => {
              this.banner.visible = false;
              this.begin(false);
            },
          },
          ...(this.defeats >= 2 && easier
            ? [
                {
                  label: `${t('battle.retry')} · ${t(`difficulty.${easier}`)}`,
                  help: t(`difficulty.${easier}.text`),
                  run: () => {
                    this.difficulty = easier;
                    session.settings.update((s) => (s.gameplay.difficulty = easier));
                    this.banner.visible = false;
                    this.begin(false);
                  },
                },
              ]
            : []),
          { label: t('battle.leave'), help: '', run: () => this.onEnd('leave') },
        ];
    this.menus = [{ kind: 'result', title: won ? t('battle.victory') : t('battle.defeat'), cursor: 0, options: () => entries }];
    this.cmdDirty = true;
  }

  /** The victory scroll: experience and pennies, then the level they brought. */
  private openSpoils(sp: Spoils): void {
    const story = this.difficulty === 'story' ? 1.5 : 1;
    const levelUp =
      sp.to > sp.from
        ? {
            title: t('battle.levelUp', { n: sp.to }),
            line: t(sp.to >= MAX_LEVEL ? 'battle.maxLevel' : 'battle.levelLine'),
            hp: `${t('party.hp')} · ${this.partyIds.map((c) => `${tr(PARTY_STATS[c].name)} ${Math.round(hpAt(c, sp.to) * story)}`).join(' · ')}`,
            ranks: sp.ranks.map((r) => ({ name: tr(r.name), rule: tr(r.text) })),
          }
        : undefined;
    const h = spoilsHeight({ levelUp });
    const p = this.ui.panel(SPOILS_W, h, 8);
    p.zoom = this.zw;
    p.anchor = [0.5, 0];
    p.x = (VIEW_W - SPOILS_W) / 2;
    // Above the party window, high enough to clear it at any text size.
    const bottom = VIEW_H - 18 - partyHeight(this.partyIds.length) * this.zw - 14;
    p.y = Math.max(76, Math.min(150, bottom - h * this.zw));
    p.opacity = 0;
    this.spoilsWin = p;
    this.spoilsT = 0;
    this.chimed = false;
    const purse = session.game.pennies;
    this.drawSpoilsAt = (time) => {
      // The bar fills from the old experience to the new, passing through every level gained.
      const k = Math.max(0, Math.min(1, (time - 0.5) / 0.9));
      const xp = sp.before + sp.xp * (k * (2 - k));
      const lv = progress(Math.floor(xp + 1e-6));
      const look: SpoilsLook = {
        title: t('battle.spoils'),
        xp: { label: t('battle.xp'), amount: sp.xp },
        pennies: { label: t('battle.pennies'), amount: sp.pennies, purse: t('battle.purse', { n: purse }) },
        bar: { label: t('battle.level', { n: lv.level }), fill: lv.need ? (xp - LEVEL_XP[lv.level]!) / lv.need : 1 },
        levelUp,
        rise: (time - 1.5) * 2.5,
      };
      p.draw((c, w, hh) => drawSpoils(c, w, hh, look));
    };
    this.drawSpoilsAt(0);
  }

  private drawSpoilsAt: ((time: number) => void) | null = null;

  // ---- input ----

  private get menu(): MenuState | undefined {
    return this.menus[this.menus.length - 1];
  }

  private onAction(a: Action): void {
    if (this.tip) {
      if (a === 'confirm' || a === 'cancel') this.closeTip();
      return;
    }
    if (a === 'confirm') this.hold = true;
    if (this.mode === 'playing' || this.mode === 'intro') return;
    const m = this.menu;
    if (!m) return;
    const opts = m.options();
    if (!opts.length) {
      if (a === 'cancel') this.back();
      return;
    }
    const n = opts.length;
    const move = (d: number) => {
      m.cursor = (m.cursor + d + n) % n;
      uiTick(this.audio);
      this.cmdDirty = true;
      this.overlayDirty = true;
    };
    // 1–5 pick a row of the window directly: an ally, an ability, a target.
    const digit = /^n([1-5])$/.exec(a);
    if (digit) {
      const i = Number(digit[1]) - 1;
      if (i >= n) return;
      m.cursor = i;
      this.cmdDirty = true;
      this.overlayDirty = true;
      opts[i]!.run();
      return;
    }
    if (a === 'up') move(-1);
    else if (a === 'down') move(1);
    else if ((a === 'left' || a === 'right') && m.kind === 'target') move(a === 'left' ? -1 : 1);
    else if (a === 'confirm') opts[m.cursor]?.run();
    else if (a === 'cancel') this.back();
  }

  private back(): void {
    if (this.menus.length > 1 && this.menu?.kind !== 'result') {
      this.menus.pop();
      uiTick(this.audio);
      this.cmdDirty = true;
      this.overlayDirty = true;
    }
  }

  /** The command window as shown (zoomed); `inner` is its height as drawn. */
  private cmdRect(): { x: number; y: number; w: number; h: number; n: number; inner: number } {
    const m = this.listMenu();
    const n = m ? m.options().length : 0;
    const inner = commandHeight(n);
    const z = this.zw;
    return { x: 18, y: VIEW_H - 18 - inner * z, w: COMMAND_W * z, h: inner * z, n, inner };
  }

  /** The menu whose list is drawn (target menus keep their parent's list on screen). */
  private listMenu(): MenuState | undefined {
    for (let i = this.menus.length - 1; i >= 0; i--) if (this.menus[i]!.kind !== 'target') return this.menus[i];
    return undefined;
  }

  private rowAt(x: number, y: number): number {
    const r = this.cmdRect();
    const z = this.zw;
    if (x < r.x || x > r.x + r.w || y < r.y + 48 * z || y > r.y + r.h) return -1;
    const i = Math.floor((y - r.y - 48 * z) / (COMMAND_ROW * z));
    return i >= 0 && i < r.n ? i : -1;
  }

  private onClick(x: number, y: number): void {
    if (this.tip) return this.closeTip();
    if (this.mode === 'playing' || this.mode === 'intro') {
      this.hold = true;
      return;
    }
    const m = this.menu;
    if (!m) return;
    // A row of the command window.
    const row = this.rowAt(x, y);
    if (row >= 0) {
      while (this.menu && this.menu.kind === 'target') this.menus.pop();
      const lm = this.menu!;
      lm.cursor = row;
      lm.options()[row]?.run();
      this.cmdDirty = true;
      return;
    }
    // A banderole or a figure on the field.
    const hitIntent = this.intentAt(x, y);
    const hitUnit = hitIntent ? null : this.unitAt(x, y);
    if (m.kind === 'target') {
      const opts = m.options();
      const i = opts.findIndex((o) => (hitIntent && o.intent === hitIntent) || (hitUnit && o.unit === hitUnit && !o.intent));
      if (i >= 0) {
        m.cursor = i;
        opts[i]!.run();
      }
      return;
    }
    if (m.kind === 'root' && hitUnit) {
      const opts = m.options();
      const i = opts.findIndex((o) => o.unit === hitUnit);
      if (i >= 0) {
        m.cursor = i;
        opts[i]!.run();
      }
    }
  }

  private unitAt(x: number, y: number): string | null {
    let best: string | null = null;
    let bestD = Infinity;
    for (const [id, f] of this.figures) {
      if (this.shown.fallen.get(id) && this.battle.unit(id)?.side === 'enemy') continue;
      const feet = this.r.mapToScreen(f.hx, f.hy, 0);
      const head = this.r.mapToScreen(f.hx, f.hy, f.height);
      const half = (f.art ? f.art.w * 0.35 : 14) * 3;
      if (x < feet.x - half || x > feet.x + half || y < head.y || y > feet.y + 6) continue;
      const d = Math.abs(x - feet.x);
      if (d < bestD) {
        bestD = d;
        best = id;
      }
    }
    return best;
  }

  private intentAt(x: number, y: number): string | null {
    for (const [id, b] of this.banderoles) {
      if (b.appear < 0.5) continue;
      if (x >= b.x && x <= b.x + b.w * this.z && y >= b.y && y <= b.y + BANDEROLE_H * this.z) return id;
    }
    return null;
  }

  // ---- drawing ----

  private intentText(it: Intent): string {
    if (!this.battle.shows(it)) return t('battle.hidden');
    const aim = aimNames(this.battle, it);
    const at = [aim ? tr(aim) : '', it.damage > 0 ? `${it.damage} ${t(it.damage === 1 ? 'battle.damage1' : 'battle.damage')}` : ''].filter(Boolean).join(', ');
    const far = this.battle.tooFarBack(it) ? t('battle.tooFarBack') : '';
    return [tr(it.label), at, far, it.rule ? tr(it.rule) : ''].filter(Boolean).join(' — ');
  }

  private chips(u: Unit): { text: string; color: string; help: string }[] {
    const s = u.status;
    const out: { text: string; color: string; help: string }[] = [];
    const add = (key: string, color: string, vars: Record<string, string | number> = {}) =>
      out.push({ text: t(`status.${key}`, vars), color, help: t(`statusHelp.${key}`, vars) });
    if (s.ward > 0) add('ward', '#A8C4FF', { n: s.ward });
    if (s.tally !== null) add('tally', '#F0D070', { n: s.tally });
    if (s.glossed) add('glossed', '#F4E2A8');
    if (s.shelled) add('shelled', '#D8B888');
    if (s.immured) add('immured', '#C8C0B0');
    if (s.smudged) add('smudged', '#9A9AB8');
    if (s.rubricated) add('rubricated', '#F08070');
    if (s.doomed) add('doomed', '#E07070');
    if (s.guarded) add('guarded', '#E8D8A0');
    if (s.readOnly) add('readOnly', '#C8A8E8');
    if (s.forgotten > 0) add('forgotten', '#E8E4DA');
    const named = u.side === 'enemy' ? ENEMIES[u.kind]?.named : undefined;
    if (named && s.named > 0) add('named', '#F4E2A8', { n: s.named, m: named });
    // The dance keeps its secret until it is Glossed or Squinted.
    if (s.revealed && s.hollow) add('hollow', '#D8D0C0');
    if (s.revealed && u.side === 'enemy' && ENEMIES[u.kind]?.leads) add('leads', '#F0C060');
    return out;
  }

  private drawFinis(): void {
    const n = this.shownLetters;
    const def = this.battle.def;
    this.finisTag.visible = def.objective === 'finis' || def.objective === 'word';
    if (!this.finisTag.visible) return;
    // FINIS shows its letters to come, faintly; the Heap's word is not known until it is said.
    const word = def.objective === 'word' ? (def.word?.text ?? '') : 'FINIS';
    const blind = def.objective === 'word';
    this.finisTag.draw((c, w, h) => {
      c.fillStyle = 'rgba(4, 8, 24, 0.6)';
      c.beginPath();
      c.roundRect(0, 0, w, h, 10);
      c.fill();
      c.strokeStyle = 'rgba(232,199,106,0.8)';
      c.lineWidth = 1.2;
      c.stroke();
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.font = `700 26px ${SERIF}`;
      [...word].forEach((ch, i) => {
        c.fillStyle = i < n ? INK.gold : 'rgba(232,220,192,0.22)';
        c.fillText(i < n || !blind ? ch : '·', 30 + i * 35, h / 2 + 1);
      });
    });
  }

  private drawRoundTag(): void {
    const n = this.shown.round;
    this.roundTag.draw((c, w, h) => {
      c.fillStyle = 'rgba(4, 8, 24, 0.55)';
      c.beginPath();
      c.roundRect(0, 0, w, h, 10);
      c.fill();
      c.strokeStyle = 'rgba(232,199,106,0.7)';
      c.lineWidth = 1.2;
      c.stroke();
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.font = `600 21px ${SERIF}`;
      c.fillStyle = INK.gold;
      c.fillText(t('battle.round', { n }).toUpperCase(), w / 2, h / 2 + 1);
    });
    this.roundTag.visible = n > 0;
  }

  private drawHelpText(text: string, warn: boolean): void {
    this.helpWin.visible = !!text;
    if (text) this.helpWin.draw((c, w, h) => drawHelp(c, w, h, text, warn));
  }

  private showCallout(text: string, seconds: number): void {
    this.calloutT = seconds;
    this.callout.visible = true;
    this.callout.draw((c, w, h) => drawCallout(c, w, h, text));
  }

  private showBanner(title: string, line: string, dark: boolean): void {
    this.bannerT = 0;
    this.banner.visible = true;
    this.banner.draw((c, w, h) => drawBanner(c, w, h, title, line, dark));
  }

  private popup(unit: string, text: string, kind: NumberKind): void {
    const f = this.fig(unit);
    if (!f) return;
    const p = this.r.mapToScreen(f.hx, f.hy, f.height * 0.8);
    const stack = this.popups.filter((q) => Math.abs(q.x - p.x) < 40 && q.t < 0.5).length;
    const panel = this.ui.panel(260, 64, 9);
    panel.zoom = this.z;
    panel.anchor = [0.5, 0.5];
    panel.draw((c, w, h) => drawNumber(c, w, h, text, kind));
    this.popups.push({ panel, x: p.x, y: p.y - stack * 30 * this.z, t: 0, life: kind === 'word' ? 1.3 : 1 });
  }

  private burst(f: Figure, color: string, count: number, size = 1.6): void {
    const e = new Emitter({ kind: 'spark', area: [f.hx - 6, f.hy - 1, 12, 2], heights: [f.height * 0.3, f.height * 0.7], count: count * 6, color, size, intensity: 1.5 }, Math.floor(this.time * 1000), this.r.quality.particles);
    this.r.scene.add(e.points);
    this.bursts.push({ e, t: 0 });
  }

  private screenShake(amp: number, seconds: number): void {
    this.shakeAmp = amp * prefs.shake;
    this.shakeT = seconds;
  }

  /** Make sure every shown intent has its banderole, and drop the rest. */
  private syncBanderoles(): void {
    const ids = new Set(this.shown.intents.map((i) => i.id));
    for (const [id, b] of this.banderoles) {
      if (!ids.has(id)) {
        this.ui.remove(b.panel);
        this.banderoles.delete(id);
      }
    }
    for (const it of this.shown.intents) {
      if (!this.banderoles.has(it.id)) {
        const b: BanderoleState = { panel: null as unknown as UiPanel, appear: 1, struck: it.cancelled ? 1 : 0, active: false, spent: false, wiggle: 0, x: 0, y: 0, w: 0, look: it.id };
        b.w = banderoleWidth(this.lookOf(it, b));
        b.panel = this.ui.panel(b.w, BANDEROLE_H, 3);
        b.panel.zoom = this.z;
        this.banderoles.set(it.id, b);
      }
    }
    this.layoutBanderoles();
  }

  /** Where the command window may stand, at its tallest so what avoids it doesn't hop between menus. */
  private commandZone(): { x: number; y: number; w: number; h: number } {
    const top = VIEW_H - 18 - commandHeight(7) * this.zw;
    return { x: 18, y: top, w: COMMAND_W * this.zw, h: VIEW_H - top };
  }

  /** The enemies a shown intent tends to (a heal, a guard, a raising), with those intents' orders. */
  private tended(): Map<string, number[]> {
    const b = this.battle;
    const out = new Map<string, number[]>();
    if (this.mode !== 'command') return out;
    for (const it of b.intents) {
      if (it.cancelled || it.waiting || it.countdown > 0 || !b.shows(it) || !('unit' in it.target)) continue;
      const kin = b.unit(it.target.unit);
      if (kin?.side === 'enemy' && kin.id !== it.actor) out.set(kin.id, [...(out.get(kin.id) ?? []), it.order]);
    }
    return out;
  }

  /** The enemy name plates: where each one sits on screen. */
  private plates(): { id: string; x: number; y: number; w: number }[] {
    const out: { id: string; x: number; y: number; w: number }[] = [];
    const c = this.overlay.ctx;
    c.save();
    const z = this.z;
    const ph = PLATE_H * z;
    c.font = `600 ${12 * z}px ${SERIF}`;
    const tended = this.tended();
    for (const e of this.battle.enemies) {
      if (this.shown.fallen.get(e.id)) continue;
      const f = this.fig(e.id);
      if (!f) continue;
      const p = this.r.mapToScreen(f.hx, f.hy, f.height + 4);
      const w = Math.max(110 * z, c.measureText(tr(e.name)).width + 52 * z) + (tended.get(e.id)?.length ?? 0) * 22 * z;
      out.push({ id: e.id, x: p.x - w / 2, y: p.y - ph + 2, w });
    }
    c.restore();
    // Keep clear of the command window: on a phone it is large enough to cover the front rank's plates.
    const win = this.commandZone();
    for (const p of out) if (p.x < win.x + win.w && p.x + p.w > win.x && p.y + ph > win.y) p.y = win.y - ph - 2;
    // Close ranks put plates on top of each other: lift the one further back until clear.
    out.sort((a, b) => b.y - a.y);
    for (let i = 1; i < out.length; i++) {
      const p = out[i]!;
      for (let tries = 0; tries < 6; tries++) {
        const clash = out.slice(0, i).some((q) => p.x < q.x + q.w + 4 && p.x + p.w + 4 > q.x && p.y < q.y + ph && p.y + ph > q.y);
        if (!clash) break;
        p.y -= ph + 2;
      }
    }
    return out;
  }

  /** Stack each enemy's banderoles over its head and plate, nudged so nothing overlaps. */
  private layoutBanderoles(): void {
    const z = this.z;
    const BH = BANDEROLE_H * z;
    const PH = PLATE_H * z;
    const placed: { x: number; y: number; w: number; h: number }[] = this.plates().map((p) => ({ x: p.x - 6 * z, y: p.y - 4 * z, w: p.w + 12 * z, h: 26 * z }));
    placed.push(this.commandZone());
    // Nor over the marks above whoever is about to be struck.
    const hits = new Map<string, number>();
    for (const it of this.battle.intents) {
      if (it.cancelled || it.waiting || it.countdown > 0) continue;
      for (const u of this.battle.aims(it)) hits.set(u.id, (hits.get(u.id) ?? 0) + 1);
    }
    for (const [id, n] of hits) {
      const f = this.fig(id);
      if (!f) continue;
      const p = this.r.mapToScreen(f.hx, f.hy, f.height + 6);
      const w = (n * 24 + 56) * z;
      placed.push({ x: p.x - w / 2, y: p.y - 30 * z, w, h: 32 * z });
    }
    /** How much a banderole at (x, y) would cover what is already placed. */
    const overlap = (x: number, y: number, BW: number) =>
      placed.reduce((sum, p) => sum + Math.max(0, Math.min(x + BW, p.x + p.w) - Math.max(x, p.x)) * Math.max(0, Math.min(y + BH - 6, p.y + p.h) - Math.max(y, p.y)), 0);
    let env = 0;
    const byActor = new Map<string, number>();
    // The nearest enemy first, so its banderoles sit lowest.
    const order = [...this.shown.intents].sort((a, b) => (this.shown.place.get(a.actor) ?? -1) - (this.shown.place.get(b.actor) ?? -1));
    for (const it of order) {
      const b = this.banderoles.get(it.id);
      if (!b) continue;
      const BW = b.w * z;
      if (it.actor === ENV_ID) {
        b.x = 20;
        b.y = 78 + env++ * (BH + 6);
        placed.push({ x: b.x, y: b.y, w: BW, h: BH });
        continue;
      }
      const f = this.fig(it.actor);
      if (!f) continue;
      const k = byActor.get(it.actor) ?? 0;
      byActor.set(it.actor, k + 1);
      const head = this.r.mapToScreen(f.hx, f.hy, f.height + 4);
      const clampX = (x: number) => Math.max(8, Math.min(VIEW_W - BW - 8, x));
      const base = head.y - PH - BH * (k + 1);
      // Straight above the head if there is room; failing that, step aside, left then right,
      // further out on a small screen where they are larger; at worst, where they cover least.
      let spot: { x: number; y: number } | null = null;
      let least = { x: clampX(head.x - BW / 2), y: Math.max(76, base), o: Infinity };
      for (const dx of [0, -0.6, 0.6, -1.15, 1.15, -1.7, 1.7, -2.3, 2.3]) {
        const x = clampX(head.x - BW / 2 + dx * BW);
        for (let y = Math.max(76, base); y >= 76; y -= 8) {
          const o = overlap(x, y, BW);
          if (o === 0) {
            spot = { x, y };
            break;
          }
          if (o < least.o) least = { x, y, o };
        }
        if (spot) break;
      }
      spot ??= least;
      b.x = spot.x;
      b.y = spot.y;
      placed.push({ x: b.x, y: b.y, w: BW, h: BH });
    }
  }

  /** What a banderole shows for an intent. */
  private lookOf(it: Intent, b: BanderoleState): BanderoleLook {
    const timing = it.waiting ? t('battle.waits') : it.countdown > 0 ? t('battle.in', { n: it.countdown }) : '';
    const rule = it.rule && this.battle.shows(it) ? tr(it.rule) : '';
    const far = this.battle.shows(it) && this.battle.tooFarBack(it) ? t('battle.tooFarBack') : '';
    return {
      order: it.order,
      text: this.battle.shows(it) ? tr(it.label) : t('battle.hidden'),
      damage: it.damage,
      note: [far, rule, timing].filter(Boolean).join(' · '),
      hidden: !this.battle.shows(it),
      struck: b.struck,
      active: b.active || this.selectedIntent() === it.id || this.hoverIntent === it.id,
      spent: b.spent && !b.active,
      env: it.actor === ENV_ID,
    };
  }

  private drawBanderoles(): void {
    let resized = false;
    for (const it of this.shown.intents) {
      const b = this.banderoles.get(it.id);
      if (!b) continue;
      const look = this.lookOf(it, b);
      // What it says changed its length (an Emend, the language): a scroll of the new size.
      const w = banderoleWidth(look);
      if (w !== b.w) {
        this.ui.remove(b.panel);
        b.panel = this.ui.panel(w, BANDEROLE_H, 3);
        b.panel.zoom = this.z;
        b.w = w;
        b.look = '';
        resized = true;
      }
      const key = JSON.stringify(look);
      if (key !== b.look) {
        b.look = key;
        b.panel.draw((c, pw, ph) => drawBanderole(c, pw, ph, look));
      }
      const fallen = it.actor !== ENV_ID && this.shown.fallen.get(it.actor);
      b.panel.opacity = b.appear * (fallen ? 0 : 1);
      b.panel.x = b.x + (b.wiggle > 0 ? Math.sin(this.time * 50) * 5 * b.wiggle : 0);
      b.panel.y = b.y - (1 - b.appear) * 14;
    }
    if (resized) this.layoutBanderoles();
  }

  private selectedIntent(): string | null {
    const m = this.menu;
    if (m?.kind !== 'target') return null;
    return m.options()[m.cursor]?.intent ?? null;
  }

  private selectedUnit(): string | null {
    const m = this.menu;
    if (!m || this.mode !== 'command') return null;
    if (m.kind === 'target' || m.kind === 'root' || m.kind === 'step') return m.options()[m.cursor]?.unit ?? null;
    if (m.kind === 'abilities') return this.menus[this.menus.length - 2]?.options()[this.menus[this.menus.length - 2]!.cursor]?.unit ?? null;
    return null;
  }

  /** The overlay: enemies' HP and statuses, aim lines from the chosen banderole, incoming blows. */
  private drawOverlay(): void {
    const b = this.battle;
    const sel = this.selectedIntent() ?? this.hoverIntent;
    const lines: { from: [number, number]; to: [number, number] }[] = [];
    const incoming = new Map<string, { order: number; dmg: number }[]>();
    const tended = this.tended();
    if (this.mode === 'command') {
      for (const it of b.intents) {
        if (it.cancelled || it.waiting || it.countdown > 0) continue;
        const kin = 'unit' in it.target ? b.unit(it.target.unit) : undefined;
        const ban = this.banderoles.get(it.id);
        const kf = kin && tended.has(kin.id) ? this.fig(kin.id) : undefined;
        if (sel === it.id && ban && kf) {
          const p = this.r.mapToScreen(kf.hx, kf.hy, kf.height * 0.6);
          lines.push({ from: [ban.x + (ban.w * this.z) / 2, ban.y + (BANDEROLE_H - 8) * this.z], to: [p.x, p.y] });
        }
        for (const u of b.aims(it)) {
          const list = incoming.get(u.id) ?? [];
          list.push({ order: it.order, dmg: it.damage });
          incoming.set(u.id, list);
          if (sel === it.id) {
            const ban = this.banderoles.get(it.id);
            const f = this.fig(u.id);
            if (ban && f) {
              const p = this.r.mapToScreen(f.hx, f.hy, f.height * 0.6);
              lines.push({ from: [ban.x + (ban.w * this.z) / 2, ban.y + (BANDEROLE_H - 8) * this.z], to: [p.x, p.y] });
            }
          }
        }
      }
    }
    const enemyInfo = this.plates().map((pl) => {
      const e = b.unit(pl.id)!;
      return { pl, hp: this.shown.hp.get(e.id) ?? e.hp, max: e.maxHp, chips: this.chips(e), name: tr(e.name), tended: tended.get(e.id) ?? [] };
    });
    // One that has fallen has no plate: its marks go where it lies.
    const plated = new Set(enemyInfo.map((e) => e.pl.id));
    const lying = [...tended]
      .filter(([id]) => !plated.has(id) && this.fig(id))
      .map(([id, list]) => {
        const f = this.fig(id)!;
        return { p: this.r.mapToScreen(f.hx, f.hy, 10), list };
      });
    const allyTags = [...incoming].map(([id, list]) => {
      const f = this.fig(id)!;
      return { p: this.r.mapToScreen(f.hx, f.hy, f.height + 6), list };
    });
    this.overlay.draw((c) => {
      // Aim lines, dotted red.
      c.save();
      c.setLineDash([6, 6]);
      c.lineWidth = 2.5;
      c.strokeStyle = 'rgba(230, 70, 50, 0.9)';
      for (const l of lines) {
        c.beginPath();
        c.moveTo(...l.from);
        c.quadraticCurveTo((l.from[0] + l.to[0]) / 2, Math.min(l.from[1], l.to[1]) - 40, ...l.to);
        c.stroke();
      }
      c.restore();
      // Enemy HP and statuses under their feet.
      c.textBaseline = 'middle';
      const z = this.z;
      for (const e of enemyInfo) {
        c.save();
        c.translate(e.pl.x, e.pl.y);
        c.scale(z, z);
        c.font = `600 12px ${SERIF}`;
        const x = 0;
        const y = 0;
        const w = e.pl.w / z;
        c.fillStyle = 'rgba(4, 8, 24, 0.6)';
        c.beginPath();
        c.roundRect(x - 6, y - 4, w + 12, 26, 7);
        c.fill();
        const bx = x + e.tended.length * 22;
        c.fillStyle = 'rgba(0,0,0,0.5)';
        c.fillRect(bx, y + 12, w - (bx - x), 5);
        c.fillStyle = '#E86A50';
        c.fillRect(bx, y + 12, (w - (bx - x)) * Math.max(0, e.hp / e.max), 5);
        // The orders of the deeds that tend to it, before its name.
        e.tended.forEach((n, k) => roundel(c, x + 6 + k * 22, y + 8, n));
        const nx = x + e.tended.length * 22;
        c.font = `600 12px ${SERIF}`;
        c.textAlign = 'left';
        c.fillStyle = INK.text;
        c.fillText(e.name, nx, y + 4);
        c.textAlign = 'right';
        c.fillText(`${Math.max(0, e.hp)}/${e.max}`, x + w, y + 4);
        // Statuses ride on the plate's right edge.
        let cx = x + w + 10;
        c.textAlign = 'left';
        for (const chip of e.chips) {
          const tw = c.measureText(chip.text).width + 10;
          c.fillStyle = chip.color;
          c.beginPath();
          c.roundRect(cx, y + 1, tw, 18, 9);
          c.fill();
          c.fillStyle = '#10142A';
          c.fillText(chip.text, cx + 5, y + 10.5);
          cx += tw + 4;
        }
        c.restore();
      }
      // Incoming blows over the allies: the order of each, and the sum.
      for (const a of allyTags) {
        c.save();
        c.translate(a.p.x, a.p.y);
        c.scale(z, z);
        const total = a.list.reduce((s, x) => s + x.dmg, 0);
        const n = a.list.length;
        const w = n * 24 + (total ? 44 : 0);
        let x = -w / 2;
        const y = -14;
        c.fillStyle = 'rgba(30, 4, 6, 0.6)';
        c.beginPath();
        c.roundRect(x - 6, y - 14, w + 12, 28, 14);
        c.fill();
        for (const it of a.list) {
          roundel(c, x + 11, y, it.order);
          x += 24;
        }
        if (total) {
          c.font = `700 17px ${SERIF}`;
          c.textAlign = 'left';
          c.fillStyle = '#FFB8A0';
          c.fillText(`−${total}`, x + 4, y + 1);
        }
        c.restore();
      }
      for (const l of lying) {
        c.save();
        c.translate(l.p.x, l.p.y);
        c.scale(z, z);
        l.list.forEach((n, k) => roundel(c, (k - (l.list.length - 1) / 2) * 22, 0, n));
        c.restore();
      }
    });
  }

  private drawPartyWin(): void {
    const b = this.battle;
    const selected = this.selectedUnit();
    const rows: PartyRow[] = [...b.party]
      .sort((x, y) => (this.shown.place.get(x.id) ?? x.place) - (this.shown.place.get(y.id) ?? y.place))
      .map((u) => ({
        name: tr(u.name),
        place: tr(PLACE_NAMES[this.shown.place.get(u.id) ?? u.place]!),
        hp: this.shown.hp.get(u.id) ?? u.hp,
        maxHp: u.maxHp,
        chips: this.chips(u),
        acted: this.mode === 'command' && u.acted,
        fallen: !!this.shown.fallen.get(u.id),
        selected: !this.tip && selected === u.id,
        ink: u.id === 'isot' ? { n: this.shown.ink, max: b.maxInk, label: t('battle.ink') } : undefined,
      }));
    const h = partyHeight(rows.length);
    this.partyWin.x = VIEW_W - PARTY_W * this.zw - 18;
    this.partyWin.y = VIEW_H - h * this.zw - 18;
    this.partyWin.draw((c, w) => drawParty(c, w, h, rows, t('battle.hp'), this.time));
  }

  private drawCmdWin(): void {
    const m = this.listMenu();
    this.cmdWin.visible = !!m && (this.mode === 'command' || this.mode === 'result');
    if (!m || !this.cmdWin.visible) return;
    const opts = m.options();
    const entries: CommandEntry[] = opts.map((o) => ({ label: o.label, right: o.right, disabled: o.disabled, done: o.done }));
    const r = this.cmdRect();
    this.cmdWin.x = r.x;
    this.cmdWin.y = r.y;
    const inTarget = this.menu?.kind === 'target';
    this.cmdWin.draw((c, w) => drawCommands(c, w, r.inner, m.title, entries, inTarget || this.tip ? -1 : m.cursor, this.time, keyHints()));
    // The help bar follows the cursor.
    const cur = this.menu!.options()[this.menu!.cursor];
    this.drawHelpText(cur?.help ?? '', !!cur?.warn);
  }

  /** Where the pointing hand goes: over a chosen banderole, or beside a chosen figure. */
  private placeHand(): void {
    const m = this.menu;
    let over: { x: number; y: number } | null = null;
    let beside: { x: number; y: number } | null = null;
    let enemy = false;
    if (this.mode === 'command' && m) {
      const o = m.options()[m.cursor];
      if (o?.intent) {
        const b = this.banderoles.get(o.intent);
        if (b) over = { x: b.x + (b.w * this.z) / 2, y: b.y - 6 };
      } else if (o?.unit && (m.kind === 'target' || m.kind === 'root' || m.kind === 'step')) {
        const f = this.fig(o.unit);
        if (f) {
          enemy = f.side === 'enemy';
          // From the side facing the other line: the right of an enemy, the left of an ally.
          const reach = f.art ? (enemy ? f.art.w - f.art.anchor[0] - 6 : f.art.anchor[0] - 4) : 11;
          beside = this.r.mapToScreen(f.x + (enemy ? reach : -reach), f.y, f.height * 0.55);
        }
      }
    }
    const bob = Math.sin(this.time * 6) * 4;
    this.hand.visible = !!over;
    if (over) {
      this.hand.x = over.x - 28;
      this.hand.y = over.y - 50 + bob;
    }
    this.pointer.visible = !!beside && !enemy;
    this.pointerLeft.visible = !!beside && enemy;
    if (beside) {
      const p = enemy ? this.pointerLeft : this.pointer;
      p.x = enemy ? beside.x - bob : beside.x - 56 + bob;
      p.y = beside.y - 20;
    }
  }

  // ---- the frame ----

  /** Follow the size of the game on screen: small screens get larger battle text. */
  private refreshZoom(): void {
    const z = textZoom(this.r.viewport.h, prefs.largeText);
    if (Math.abs(z - this.z) < 0.01) return;
    this.z = z;
    this.zw = 1 + (z - 1) * 0.45;
    this.partyWin.zoom = this.cmdWin.zoom = this.zw;
    for (const b of this.banderoles.values()) b.panel.zoom = z;
    this.overlayDirty = this.cmdDirty = this.partyDirty = true;
  }

  update(dt: number): void {
    this.time += dt;
    this.refreshZoom();
    // Flashes (a Reckoning, a letter of FINIS, the Clean Page) fade out.
    this.r.screen.flash = Math.max(0, this.r.screen.flash - dt * 2.2);
    if (!this.input.isHeld('confirm')) this.hold = false;
    // Play the queue.
    let budget = dt * this.speed;
    while (budget > 0) {
      if (!this.job) {
        const next = this.jobs.shift();
        if (!next) break;
        this.job = next;
        next.start?.();
      }
      const j = this.job;
      const step = Math.min(budget, j.dur - j.t);
      j.t += step;
      budget -= step;
      j.tick?.(Math.min(1, j.t / Math.max(1e-3, j.dur)));
      if (j.t >= j.dur - 1e-6) {
        j.end?.();
        this.job = null;
      } else break;
    }
    if (!this.job && !this.jobs.length && (this.mode === 'playing' || this.mode === 'intro')) {
      if (this.battle.result === 'ongoing') this.toCommand();
    }
    // Hover with a mouse.
    const pp = this.input.pointer;
    if (pp.x !== this.lastPointer.x || pp.y !== this.lastPointer.y) {
      this.lastPointer = { ...pp };
      const p = this.r.windowToScreen(pp.x, pp.y);
      const hover = p && this.mode === 'command' ? this.intentAt(p.x, p.y) : null;
      if (hover !== this.hoverIntent) {
        this.hoverIntent = hover;
        this.overlayDirty = true;
        if (hover) {
          const it = this.battle.intents.find((i) => i.id === hover);
          if (it) this.drawHelpText(this.intentText(it), false);
        }
      }
      if (p && this.mode === 'command' && this.menu && this.menu.kind !== 'target') {
        const row = this.rowAt(p.x, p.y);
        if (row >= 0 && row !== this.menu.cursor) {
          this.menu.cursor = row;
          this.cmdDirty = true;
          this.overlayDirty = true;
        }
      }
    }
    for (const f of this.figures.values()) {
      f.update(dt);
      if (f.moving) this.overlayDirty = true;
    }
    for (const b of this.banderoles.values()) {
      b.wiggle = Math.max(0, b.wiggle - dt * 2.5);
      if (this.mode === 'result') b.appear = Math.max(0, b.appear - dt * 2);
    }
    // Camera shake.
    if (this.shakeT > 0) {
      this.shakeT -= dt;
      const k = Math.max(0, this.shakeT) * this.shakeAmp;
      this.r.view.shakeX = Math.round((Math.random() - 0.5) * 2 * k);
      this.r.view.shakeY = Math.round((Math.random() - 0.5) * 2 * k);
    } else {
      this.r.view.shakeX = 0;
      this.r.view.shakeY = 0;
    }
    if (this.mode !== 'intro') {
      this.r.view.x = this.set.camera.x;
      this.r.view.y = this.set.camera.y;
      this.r.view.h = this.set.camera.h;
    }
    this.r.screen.fade = Math.max(0, 1 - this.time / 0.8);
    // Popups rise and fade.
    for (let i = this.popups.length - 1; i >= 0; i--) {
      const p = this.popups[i]!;
      p.t += dt;
      const k = p.t / p.life;
      p.panel.x = p.x - 130;
      p.panel.y = p.y - 32 - 40 * (1 - Math.pow(1 - Math.min(1, k * 2), 2)) - (k > 0.5 ? (k - 0.5) * 20 : 0);
      p.panel.opacity = k < 0.7 ? 1 : Math.max(0, 1 - (k - 0.7) / 0.3);
      if (k >= 1) {
        this.ui.remove(p.panel);
        this.popups.splice(i, 1);
      }
    }
    for (let i = this.bursts.length - 1; i >= 0; i--) {
      const b = this.bursts[i]!;
      b.t += dt;
      if (b.t > 0.12) b.e.rate = 0;
      b.e.update(dt, this.time);
      if (b.t > 1.4) {
        b.e.dispose();
        this.bursts.splice(i, 1);
      }
    }
    if (this.calloutT > 0) {
      this.calloutT -= dt;
      this.callout.opacity = Math.min(1, this.calloutT * 4);
      if (this.calloutT <= 0) this.callout.visible = false;
    }
    if (this.bannerT >= 0) {
      this.bannerT += dt;
      this.banner.opacity = Math.min(1, this.bannerT * 2);
    }
    // The victory scroll takes the banner's place, fills its bar, and rings in a new level.
    if (this.spoilsWin && this.spoilsT >= 0) {
      const was = this.spoilsT;
      this.spoilsT += dt;
      this.spoilsWin.opacity = Math.min(1, this.spoilsT * 3);
      this.banner.opacity = Math.max(0, 1 - this.spoilsT * 3);
      if (this.banner.opacity <= 0) this.banner.visible = false;
      if (was < 2.2) this.drawSpoilsAt?.(this.spoilsT);
      const sp = this.spoils;
      if (!this.chimed && sp && sp.to > sp.from && this.spoilsT >= 1.5) {
        this.chimed = true;
        const ctx = this.audio.ctx;
        if (ctx)
          [67, 71, 74, 79].forEach((m, i) => {
            bell(ctx, this.audio.bus('sfx'), midiToHz(m), ctx.currentTime + i * 0.11, 0.22, 5);
            bell(ctx, this.audio.reverbIn, midiToHz(m), ctx.currentTime + i * 0.11, 0.14, 5);
          });
      }
    }
    // Windows.
    if (this.overlayDirty) {
      this.overlayDirty = false;
      this.layoutBanderoles();
      this.drawOverlay();
    }
    if (this.cmdDirty) {
      this.cmdDirty = false;
      this.drawCmdWin();
      if (this.mode !== 'command' && this.mode !== 'result') this.helpWin.visible = false;
      this.partyDirty = true;
    }
    if (this.partyDirty || this.mode === 'command') {
      // Redrawn every frame while planning, for the cursor's bob; cheap enough.
      if (this.partyDirty || Math.floor(this.time * 15) !== Math.floor((this.time - dt) * 15)) this.drawPartyWin();
      this.partyDirty = false;
    }
    this.drawBanderoles();
    this.placeHand();
    this.placeTip();
    this.phaseStaging.update(dt, (id) => this.figures.get(id));
    this.stage.update(dt, this.time);
  }

  sync(): void {
    for (const f of this.figures.values()) f.sync();
    this.ui.sync();
  }

  debugInfo(): DebugInfo {
    const b = this.battle;
    return {
      scene: this.name,
      location: tr(b.def.name),
      lines: [
        ['round', String(b.round)],
        ['mode', this.mode],
        ['result', b.result],
        ['ink', `${b.ink}/${b.maxInk}`],
        ['units', b.units.map((u) => `${u.id}:${u.hp}@${u.place}${u.fallen ? '†' : ''}`).join(' ')],
        ['events', String(b.events.length)],
      ],
    };
  }

  debugButtons(): { label: string; run: () => void }[] {
    return [
      {
        label: 'win',
        run: () => {
          for (const e of this.battle.enemies) {
            e.hp = 0;
            e.fallen = true;
          }
          this.battle.result = 'victory';
          this.battle.events.push({ type: 'victory' });
          this.played();
        },
      },
      { label: 'retry', run: () => this.begin(false) },
    ];
  }

  dispose(): void {
    for (const u of this.unsubs) u();
    this.ambience.stop();
    this.music.stop();
    for (const f of this.figures.values()) f.dispose();
    for (const b of this.bursts) b.e.dispose();
    this.phaseStaging.dispose();
    this.ui.dispose();
    this.stage.dispose();
    this.r.view.shakeX = 0;
    this.r.view.shakeY = 0;
    this.r.screen.desaturate = 0;
  }
}
