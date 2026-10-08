/**
 * An explorable map (DESIGN.md §10): Isot leads and the others follow along her path;
 * people and things to look at carry a red chalk manicule; walking into a zone starts a
 * scene; holding the raking light tilts her candle and shows the underwriting nearby.
 * Everything particular to a place lives in its MapDef (src/maps/).
 */

import type { AudioEngine } from '../audio/engine';
import { footstep, uiTick } from '../audio/sfx';
import { ABILITIES } from '../battle/data';
import { SPEAKERS } from '../data/speakers';
import type { DebugInfo } from '../debug/overlay';
import type { GameLight, WorldRenderer } from '../engine/diorama/renderer';
import type { Action, Input } from '../engine/input';
import type { Scene } from '../engine/scene';
import { session } from '../engine/session';
import { t, tr } from '../i18n/i18n';
import type { MapContext, MapDef, PageDef, Rect } from '../maps/types';
import { CHARACTERS, type Dir } from '../pixel/characters';
import { hex, PixelImage } from '../pixel/pixel';
import { TILE } from '../pixel/terrain';
import type { CharId } from '../story/state';
import { LOST_NAMES } from '../story/lostNames';
import { LocationCard, Letterbox } from '../ui/card';
import { Dialogue } from '../ui/dialogue';
import { PageView } from '../ui/page';
import { UiLayer } from '../ui/ui';
import { Director } from '../world/director';
import { Actor } from '../world3d/actor';
import { Billboard, pixelTexture } from '../world3d/billboard';
import { Stage } from '../world3d/stage';

/** What a map asks of the game around it. */
export interface MapHooks {
  battle(id: string, back: { map: string; x: number; y: number; dir: Dir }): void;
  goto(map: string, spawn: string): void;
}

/** How a map is entered: at a named spawn, or at a point (after a fight). */
export type Arrival = { spawn: string } | { x: number; y: number; dir: Dir; from: string };

let chalkTex: THREE_Texture | null = null;
type THREE_Texture = ReturnType<typeof pixelTexture>;

/** The Glossators' red chalk: a small hand pointing down at what can be looked at. */
function chalk(): THREE_Texture {
  if (!chalkTex) {
    const img = new PixelImage(9, 11);
    const red = hex('#D8343A');
    const light = hex('#F06A5A');
    // Cuff, then the hand and its pointing finger.
    img.rect(2, 0, 5, 2, light);
    img.rect(1, 2, 7, 4, red);
    img.rect(2, 6, 2, 2, red);
    img.rect(5, 6, 2, 1, red);
    img.rect(3, 8, 2, 3, red);
    img.set(3, 10, light);
    img.outline(hex('#3A1418'));
    chalkTex = pixelTexture(img);
  }
  return chalkTex;
}

const CELL = 8;

export class MapScene implements Scene {
  readonly name: string;
  readonly stage: Stage;
  readonly player: Actor;
  readonly party: Actor[] = [];
  private readonly npcs = new Map<string, Actor>();
  private readonly blocked: Rect[] = [];
  private readonly posts: [number, number, number][] = [];
  private readonly trail: [number, number][] = [];
  private readonly ui: UiLayer;
  private readonly dialogue: Dialogue;
  private readonly cardUi: LocationCard;
  private readonly letterboxUi: Letterbox;
  readonly director: Director;
  private readonly unsubs: (() => void)[] = [];
  private readonly ambience: { start(e: AudioEngine): void; stop(): void } | null;
  private readonly marker: Billboard;
  private readonly ghosts: { u: NonNullable<MapDef['underwriting']>[number]; b: Billboard; k: number; seen: number }[] = [];
  private candle: GameLight | null = null;
  private time = 0;
  private busy = 0;
  private camH = 0;
  private goal: [number, number][] | null = null;
  private goalThing: string | null = null;
  private rake = 0;
  private near: string | null = null;
  private inZone = new Set<string>();
  private pageView: PageView | null = null;
  private pageDone: (() => void) | null = null;
  private leaving = false;
  readonly ctx: MapContext;

  constructor(
    private readonly r: WorldRenderer,
    private readonly input: Input,
    private readonly audio: AudioEngine,
    readonly def: MapDef,
    arrival: Arrival,
    private readonly hooks: MapHooks,
  ) {
    this.name = def.id;
    const st = (this.stage = new Stage(r));
    const set = def.build(r, st);
    this.blocked.push(...set.blocked);
    this.posts.push(...(set.posts ?? []));
    const g = session.game;
    g.map = def.id;

    // ---- people ----
    const spawn = 'spawn' in arrival ? (def.spawns[arrival.spawn] ?? Object.values(def.spawns)[0]!) : arrival;
    this.player = new Actor('isot', CHARACTERS.isot!, r.scene);
    this.player.x = spawn.x;
    this.player.y = spawn.y;
    this.player.dir = spawn.dir;
    this.camH = this.heightAt(spawn.x, spawn.y) + (def.camera?.h ?? 0);
    const back = { down: [0, -1], up: [0, 1], left: [1, 0], right: [-1, 0] }[spawn.dir];
    for (const id of g.party) {
      if (id === 'isot') continue;
      const a = new Actor(id, CHARACTERS[id]!, r.scene);
      const k = this.party.length + 1;
      a.x = spawn.x + back[0]! * 14 * k;
      a.y = spawn.y + back[1]! * 10 * k;
      a.dir = spawn.dir;
      this.party.push(a);
    }
    for (let i = 0; i < 120; i++) this.trail.push([spawn.x + back[0]! * Math.min(i, 60) * 0.5, spawn.y + back[1]! * Math.min(i, 60) * 0.4]);

    this.ui = new UiLayer(r);
    this.dialogue = new Dialogue(this.ui, audio);
    this.cardUi = new LocationCard(this.ui);
    this.letterboxUi = new Letterbox(this.ui);
    this.director = new Director(r, def.bounds);
    this.marker = new Billboard(chalk(), 9, 11, { anchor: [4, 10], unlit: true, castShadow: false });
    this.marker.visible = false;
    r.scene.add(this.marker.mesh);
    if (def.candle !== false) this.candle = st.addLight(spawn.x, spawn.y, 12, 60, '#FFC37A', 0.24, 'candle');
    this.ambience = def.ambience?.() ?? null;
    this.ctx = this.makeContext();

    for (const n of def.npcs ?? []) {
      const a = new Actor(n.id, n.spec, r.scene);
      a.x = n.x;
      a.y = n.y;
      a.dir = n.dir;
      if (n.fray) a.sprite.fray = n.fray;
      this.npcs.set(n.id, a);
    }
    for (const u of def.underwriting ?? []) {
      const b = Billboard.fromImage(u.art, { glow: u.art, unlit: true, castShadow: false, anchor: u.flat ? [u.art.w / 2, u.art.h / 2] : [u.art.w / 2, u.art.h - 1] });
      b.x = u.x;
      b.y = u.y;
      b.h = u.h;
      b.opacity = 0;
      b.visible = false;
      if (u.flat) b.mesh.rotation.x = -Math.PI / 2;
      r.scene.add(b.mesh);
      this.ghosts.push({ u, b, k: 0, seen: 0 });
    }

    this.unsubs.push(
      input.onAction((a) => this.onAction(a)),
      input.onPointer((px, py) => {
        const p = r.windowToScreen(px, py);
        if (p) this.onClick(p.x, p.y);
      }),
    );
    input.onGesture(() => this.ambience?.start(audio));
    this.director.take(...this.director.clamp(spawn.x, spawn.y - 10), this.camH);
    this.director.release();
    if (def.checkpoint && 'spawn' in arrival) session.saves.save('auto', g);
    const from = 'spawn' in arrival ? arrival.spawn : arrival.from;
    void this.script(async () => {
      if (def.card && 'spawn' in arrival && !session.game.flags[`card.${def.id}`]) {
        session.game.flags[`card.${def.id}`] = true;
        this.cardUi.show(tr(def.card.title), tr(def.card.line));
      }
      await def.enter?.(this.ctx, from);
    });
  }

  // ---- the world ----

  private heightAt(x: number, y: number): number {
    return this.stage.heightAt(x, y);
  }

  /** Can a figure stand at (x, y), coming from height h? */
  canStand(x: number, y: number, h = this.player.h, ignore?: Actor): boolean {
    const d = this.def;
    for (const [dx, dy] of [
      [0, 0],
      [-4, 0],
      [4, 0],
      [0, -2],
      [0, 2],
    ] as const) {
      const px = x + dx;
      const py = y + dy;
      const ch = d.ground[Math.floor(py / TILE)]?.[Math.floor(px / TILE)] ?? ' ';
      if (!d.walkable.includes(ch)) return false;
      if (Math.abs(this.heightAt(px, py) - h) > 7) return false;
      for (const [bx, by, bw, bd] of this.blocked) if (px >= bx && px < bx + bw && py >= by && py < by + bd) return false;
    }
    for (const [cx, cy, r] of this.posts) if (((x - cx) / r) ** 2 + ((y - cy) / (r * 0.6)) ** 2 < 1) return false;
    for (const [id, a] of this.npcs) {
      if (a === ignore || !this.npcHere(id)) continue;
      if (((x - a.x) / 9) ** 2 + ((y - a.y) / 5) ** 2 < 1) return false;
    }
    return true;
  }

  private npcHere(id: string): boolean {
    const n = this.def.npcs?.find((x) => x.id === id);
    return !n?.when || n.when(this.ctx);
  }

  /** A* over half-tile cells, for click and tap to walk. */
  private findPath(gx: number, gy: number): [number, number][] | null {
    const p = this.player;
    const cols = Math.ceil((this.def.ground[0]?.length ?? 0) * (TILE / CELL));
    const rows = Math.ceil(this.def.ground.length * (TILE / CELL));
    const key = (cx: number, cy: number) => cy * cols + cx;
    const center = (c: number) => c * CELL + CELL / 2;
    const sx = Math.floor(p.x / CELL);
    const sy = Math.floor(p.y / CELL);
    const tx = Math.floor(gx / CELL);
    const ty = Math.floor(gy / CELL);
    const open = (cx: number, cy: number) => cx >= 0 && cy >= 0 && cx < cols && cy < rows && this.canStand(center(cx), center(cy), this.heightAt(center(cx), center(cy)));
    if (!open(tx, ty)) return null;
    const came = new Map<number, number>();
    const cost = new Map<number, number>([[key(sx, sy), 0]]);
    const frontier: [number, number, number][] = [[sx, sy, 0]];
    let found = false;
    let n = 0;
    while (frontier.length && n++ < 5000) {
      frontier.sort((a, b) => a[2] - b[2]);
      const [cx, cy] = frontier.shift()!;
      if (cx === tx && cy === ty) {
        found = true;
        break;
      }
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
        [1, 1],
        [1, -1],
        [-1, 1],
        [-1, -1],
      ] as const) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (!open(nx, ny)) continue;
        if (dx && dy && (!open(cx + dx, cy) || !open(cx, cy + dy))) continue;
        const c = cost.get(key(cx, cy))! + (dx && dy ? 1.414 : 1);
        if (c < (cost.get(key(nx, ny)) ?? Infinity)) {
          cost.set(key(nx, ny), c);
          came.set(key(nx, ny), key(cx, cy));
          frontier.push([nx, ny, c + Math.hypot(tx - nx, ty - ny)]);
        }
      }
    }
    if (!found) return null;
    const path: [number, number][] = [];
    let k = key(tx, ty);
    while (k !== key(sx, sy)) {
      path.unshift([center(k % cols), center(Math.floor(k / cols))]);
      k = came.get(k)!;
    }
    if (path.length) path[path.length - 1] = [gx, gy];
    return path;
  }

  // ---- scripts ----

  /** Run a scene: the player's control is held for its length. */
  private async script(fn: () => Promise<void>): Promise<void> {
    this.busy++;
    this.goal = null;
    try {
      await fn();
    } finally {
      this.dialogue.close();
      this.busy--;
      if (!this.busy && !this.leaving) {
        this.director.release();
        this.letterboxUi.target = 0;
      }
    }
  }

  private makeContext(): MapContext {
    const g = () => session.game;
    const ctx: MapContext = {
      r: this.r,
      audio: this.audio,
      stage: this.stage,
      director: this.director,
      player: this.player,
      party: this.party,
      npc: (id) => {
        const a = this.npcs.get(id);
        if (!a) throw new Error(`no npc ${id} on ${this.def.id}`);
        return a;
      },
      say: (speaker, text, mood) => this.dialogue.say(speaker, text, mood),
      narrate: (text) => this.dialogue.narrate(text),
      choose: (options) => this.dialogue.choose(options),
      close: () => this.dialogue.close(),
      wait: (s) => this.director.wait(s),
      pan: (x, y, s, h = this.camH) => {
        if (!this.director.active) this.director.take(this.r.view.x, this.r.view.y, this.camH);
        return this.director.panTo(...this.director.clamp(x, y), s, h);
      },
      release: () => this.director.release(),
      shake: (a, s) => this.director.shake(a, s),
      flash: (v) => this.director.flash(v),
      letterbox: (on) => (this.letterboxUi.target = on ? 1 : 0),
      card: (title, line) => this.cardUi.show(tr(title), tr(line)),
      emote: (who, e, s) => who.emote(e, s),
      walk: (who, path) => who.walk(path),
      face: (who, dir) => (who.dir = dir),
      flag: (name) => !!g().flags[name],
      set: (name, value = true) => {
        g().flags[name] = value;
      },
      cleared: (id) => g().cleared.includes(id),
      join: (id: CharId, actor?: Actor) => {
        if (!g().party.includes(id)) g().party.push(id);
        let a = actor;
        if (a) {
          for (const [k, v] of this.npcs) if (v === a) this.npcs.delete(k);
        } else {
          a = new Actor(id, CHARACTERS[id]!, this.r.scene);
          a.x = this.player.x;
          a.y = this.player.y - 6;
        }
        this.party.push(a);
      },
      battle: (id) => {
        this.leaving = true;
        this.hooks.battle(id, { map: this.def.id, x: this.player.x, y: this.player.y, dir: this.player.dir });
      },
      goto: (map, spawn) => {
        this.leaving = true;
        this.hooks.goto(map, spawn);
      },
      save: () => session.saves.save('auto', g()),
      learn: async (who, ability) => {
        const list = (g().abilities[who] ??= []);
        if (list.includes(ability)) return;
        list.push(ability);
        const def = ABILITIES[ability];
        uiTick(this.audio, true);
        this.cardUi.show(tr(def.name), `${tr(SPEAKERS[who]?.name ?? { en: who, fr: who })} · ${tr(def.text)}`);
        await this.director.wait(2.6);
      },
      page: (def) => this.openPage(def),
    };
    return ctx;
  }

  private openPage(def: PageDef): Promise<void> {
    this.pageView?.dispose();
    this.pageView = new PageView(this.ui, tr(def.title), def.lines);
    uiTick(this.audio, true);
    return new Promise((resolve) => {
      let said = false;
      this.pageDone = () => {
        this.pageView?.dispose();
        this.pageView = null;
        this.pageDone = null;
        resolve();
      };
      this.pageRead = async () => {
        if (said || !def.read) return;
        said = true;
        await def.read(this.ctx);
      };
    });
  }

  private pageRead: (() => Promise<void>) | null = null;

  // ---- input ----

  private onAction(a: Action): void {
    if (this.pageView) {
      if ((a === 'confirm' || a === 'cancel') && !this.dialogue.open) this.pageDone?.();
      else this.dialogue.handle(a);
      return;
    }
    if (this.dialogue.handle(a)) return;
    if (a === 'confirm' && !this.busy && this.near) this.interact(this.near);
  }

  private onClick(x: number, y: number): void {
    if (this.pageView) {
      if (!this.dialogue.open) this.pageDone?.();
      else this.dialogue.click(x, y);
      return;
    }
    if (this.dialogue.open) {
      this.dialogue.click(x, y);
      return;
    }
    if (this.busy) return;
    // A thing under the pointer: walk to it, then look.
    for (const th of this.def.things ?? []) {
      if (th.when && !th.when(this.ctx)) continue;
      const s = this.r.mapToScreen(th.x, th.y, (th.h ?? 20) * 0.5);
      if (Math.abs(s.x - x) < 36 && Math.abs(s.y - y) < 60) {
        this.goalThing = th.id;
        this.goal = this.findPath(th.x, th.y + 10) ?? this.findPath(th.x, th.y + 18);
        if (!this.goal || Math.hypot(this.player.x - th.x, this.player.y - th.y) < (th.reach ?? 26)) {
          this.goal = null;
          this.goalThing = null;
          this.interact(th.id);
        }
        return;
      }
    }
    const m = this.r.screenToMap(x, y, this.player.h);
    this.goalThing = null;
    this.goal = this.findPath(m.x, m.y);
  }

  private interact(id: string): void {
    const th = this.def.things?.find((x) => x.id === id);
    if (!th) return;
    uiTick(this.audio);
    const p = this.player;
    p.face(th.x - p.x, th.y - p.y);
    void this.script(() => th.run(this.ctx));
  }

  // ---- the frame ----

  update(dt: number): void {
    this.time += dt;
    const free = !this.busy && !this.dialogue.open && !this.pageView && !this.leaving;
    const p = this.player;
    // Walking: stick or keys, else the clicked path.
    let { x: mx, y: my } = free ? this.input.move() : { x: 0, y: 0 };
    if (mx || my) {
      this.goal = null;
      this.goalThing = null;
    } else if (free && this.goal?.length) {
      const [gx, gy] = this.goal[0]!;
      const dx = gx - p.x;
      const dy = gy - p.y;
      const d = Math.hypot(dx, dy);
      if (d < 2) {
        this.goal.shift();
        if (!this.goal.length) {
          this.goal = null;
          if (this.goalThing) {
            const id = this.goalThing;
            this.goalThing = null;
            this.interact(id);
          }
        }
      } else {
        mx = dx / d;
        my = dy / d;
      }
    }
    if (mx || my) {
      const len = Math.max(1, Math.hypot(mx, my));
      const sp = p.speed * dt * Math.min(1, Math.hypot(mx, my) * 1.2);
      let dx = (mx / len) * sp;
      let dy = (my / len) * sp;
      if (!this.canStand(p.x + dx, p.y)) dx = 0;
      if (!this.canStand(p.x + dx, p.y + dy)) dy = 0;
      if (dx || dy) p.step(dx, dy, dt);
      else {
        p.face(mx, my);
        p.step(0, 0, dt);
        if (this.goal) {
          this.goal = null;
          this.goalThing = null;
        }
      }
    } else if (!p.walking) p.step(0, 0, dt);
    else p.update(dt);
    p.h = this.heightAt(p.x, p.y);
    if (p.stepped) footstep(this.audio, this.def.walkable.includes('.') && this.groundAt(p.x, p.y) === '.' ? 'grass' : 'stone');

    // Followers walk the leader's trail.
    const last = this.trail[0]!;
    if (Math.hypot(p.x - last[0], p.y - last[1]) > 1) {
      this.trail.unshift([p.x, p.y]);
      if (this.trail.length > 160) this.trail.pop();
    }
    this.party.forEach((a, i) => {
      if (a.walking) a.update(dt);
      else {
        const target = this.trail[Math.min(this.trail.length - 1, (i + 1) * 16)]!;
        const dx = target[0] - a.x;
        const dy = target[1] - a.y;
        const dd = Math.hypot(dx, dy);
        if (dd > 0.4 && free) {
          const k = Math.min(1, (p.speed * 1.1 * dt) / dd);
          a.step(dx * k, dy * k, dt);
        } else a.step(0, 0, dt);
      }
      a.h = this.heightAt(a.x, a.y);
    });
    for (const [id, a] of this.npcs) {
      a.visible = this.npcHere(id);
      a.update(dt);
      a.h = this.heightAt(a.x, a.y);
    }

    // What is near enough to look at.
    this.near = null;
    if (free) {
      let best = Infinity;
      for (const th of this.def.things ?? []) {
        if (th.when && !th.when(this.ctx)) continue;
        const d = Math.hypot(th.x - p.x, (th.y - p.y) * 1.4);
        if (d < (th.reach ?? 26) && d < best) {
          best = d;
          this.near = th.id;
        }
      }
    }
    const th = this.near ? this.def.things!.find((x) => x.id === this.near)! : null;
    this.marker.visible = !!th;
    if (th) {
      this.marker.x = th.x;
      this.marker.y = th.y + 1;
      this.marker.h = (th.h ?? 30) + 10 + Math.round(Math.sin(this.time * 5) * 1.5);
      this.marker.sync();
    }

    // The map's own watch (thin ice, and the like).
    if (free && this.def.watch) {
      const run = this.def.watch(this.ctx, dt);
      if (run) void this.script(() => run(this.ctx));
    }
    // Zones and exits.
    if (free) {
      for (const z of this.def.zones ?? []) {
        const inside = this.inside(z.rect, p.x, p.y);
        if (inside && !this.inZone.has(z.id) && (!z.when || z.when(this.ctx))) {
          this.inZone.add(z.id);
          void this.script(() => z.run(this.ctx));
          break;
        }
        if (!inside) this.inZone.delete(z.id);
      }
      for (const e of this.def.exits ?? []) {
        if (!this.inside(e.rect, p.x, p.y)) continue;
        if (e.when && !e.when(this.ctx)) {
          if (e.blocked && !this.inZone.has(`exit:${e.to}`)) {
            this.inZone.add(`exit:${e.to}`);
            void this.script(() => e.blocked!(this.ctx));
          }
          continue;
        }
        this.leaving = true;
        this.hooks.goto(e.to, e.spawn);
        break;
      }
      for (const e of this.def.exits ?? []) if (!this.inside(e.rect, p.x, p.y)) this.inZone.delete(`exit:${e.to}`);
    }

    // The raking light: hold to tilt the candle; the underwriting shows nearby.
    const raking = this.input.isHeld('rake') && (free || !!this.pageView);
    this.rake += ((raking ? 1 : 0) - this.rake) * Math.min(1, dt * 5);
    if (this.pageView) {
      this.pageView.update(dt, raking);
      if (this.pageView.read > 0.6 && this.pageRead) {
        const f = this.pageRead;
        this.pageRead = null;
        void f();
      }
    }
    for (const gh of this.ghosts) {
      const ok = !gh.u.when || gh.u.when(this.ctx);
      const d = Math.hypot(gh.u.x - p.x, (gh.u.y - p.y) * 1.3);
      const target = ok && !this.pageView ? Math.max(0, Math.min(1, (70 - d) / 30)) * this.rake : 0;
      gh.k += (target - gh.k) * Math.min(1, dt * 4);
      gh.b.visible = gh.k > 0.02;
      gh.b.opacity = gh.k;
      gh.b.glow = 0.4 + gh.k * 0.8;
      gh.b.sync();
      if (gh.k > 0.85 && !session.game.flags[`seen.${gh.u.id}`]) {
        gh.seen += dt;
        if (gh.seen > 0.5) {
          session.game.flags[`seen.${gh.u.id}`] = true;
          const name = gh.u.lostName;
          if (name && LOST_NAMES[name] && !session.game.lostNames.includes(name)) {
            session.game.lostNames.push(name);
            uiTick(this.audio, true);
            this.cardUi.show(t('lostName.title'), tr(LOST_NAMES[name]!));
          }
          if (gh.u.revealed) void this.script(() => gh.u.revealed!(this.ctx));
        }
      }
    }
    if (this.candle) {
      // Held up, the candle lights her; tilted low to the side, it rakes across the ground.
      const side = p.dir === 'left' ? -1 : p.dir === 'right' ? 1 : 0.6;
      this.candle.x = p.x + side * (5 + this.rake * 6);
      this.candle.y = p.y + 6 - this.rake * 2;
      this.candle.h = p.h + 12 - this.rake * 6;
      this.candle.intensity = 0.24 + this.rake * 0.12;
      this.candle.radius = 60 + this.rake * 30;
    }

    // Camera.
    this.director.update(dt);
    const look = this.def.camera?.lookAhead ?? 10;
    const [cx, cy] = this.director.active ? this.director.cam : this.director.clamp(p.x, p.y - look);
    if (this.director.active) this.camH = this.director.cam[2];
    else this.camH += (p.h + (this.def.camera?.h ?? 0) - this.camH) * Math.min(1, dt * 3);
    this.r.view.x = Math.round(cx);
    this.r.view.y = Math.round(cy);
    this.r.view.h = Math.round(this.camH);
    if (this.def.camera?.zoom) this.r.view.zoom = this.def.camera.zoom;
    if (!this.leaving) this.r.screen.fade = Math.max(0, 1 - this.time / 1.2);
    this.dialogue.update(dt);
    this.cardUi.update(dt);
    this.letterboxUi.update(dt);
    this.stage.update(dt, this.time);
  }

  private inside(r: Rect, x: number, y: number): boolean {
    return x >= r[0] && x < r[0] + r[2] && y >= r[1] && y < r[1] + r[3];
  }

  private groundAt(x: number, y: number): string {
    return this.def.ground[Math.floor(y / TILE)]?.[Math.floor(x / TILE)] ?? ' ';
  }

  sync(): void {
    this.player.sync();
    for (const a of this.party) a.sync();
    for (const a of this.npcs.values()) a.sync();
    this.ui.sync();
  }

  debugInfo(): DebugInfo {
    const p = this.player;
    return {
      scene: this.name,
      location: this.def.card ? tr(this.def.card.title) : this.def.id,
      lines: [
        ['player', `${(p.x / TILE).toFixed(1)}, ${(p.y / TILE).toFixed(1)} h${p.h.toFixed(0)} ${p.dir}`],
        ['near', this.near ?? '—'],
        ['busy', String(this.busy)],
        ['rake', this.rake.toFixed(2)],
        ['flags', Object.keys(session.game.flags).join(' ')],
      ],
    };
  }

  debugButtons(): { label: string; run: () => void }[] {
    return (this.def.exits ?? []).map((e) => ({ label: `exit → ${e.to}`, run: () => this.hooks.goto(e.to, e.spawn) }));
  }

  /** For screenshots and tests: what the help line would say. */
  get prompt(): string {
    return this.near ? t('map.look') : '';
  }

  dispose(): void {
    for (const u of this.unsubs) u();
    this.pageView?.dispose();
    this.dialogue.dispose();
    this.cardUi.dispose();
    this.letterboxUi.dispose();
    this.ui.dispose();
    this.ambience?.stop();
    this.stage.dispose();
    this.marker.dispose();
    for (const gh of this.ghosts) gh.b.dispose();
    this.player.dispose();
    for (const a of this.party) a.dispose();
    for (const a of this.npcs.values()) a.dispose();
    this.r.view.zoom = 1;
  }
}
