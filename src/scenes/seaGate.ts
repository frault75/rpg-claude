/**
 * The Sea Gate of Saint Ebb's by night, as a diorama. The abbey church stands on its
 * island under the moon; stairs drop down the cliff to the shore and the sea gate; the
 * causeway runs south into the mist, where a knight in white stands in the shallows.
 */

import type { AudioEngine } from '../audio/engine';
import { EbbNightAmbience } from '../audio/ambient';
import { footstep } from '../audio/sfx';
import type { DebugInfo } from '../debug/overlay';
import type { GameLight, WorldRenderer } from '../engine/diorama/renderer';
import type { Input } from '../engine/input';
import type { Scene } from '../engine/scene';
import { CHARACTERS } from '../pixel/characters';
import { bush, oakTree, pineTree, reeds, rock, yewTree } from '../pixel/nature';
import { barrel, boat, crate, gravestone, lanternPost, mooringPost, sconce, stoneCross } from '../pixel/props';
import { GROUND_DEFAULT, TILE } from '../pixel/terrain';
import { LocationCard, Letterbox } from '../ui/card';
import { Dialogue } from '../ui/dialogue';
import { UiLayer } from '../ui/ui';
import { Director } from '../world/director';
import { Actor } from '../world3d/actor';
import { abbeyChurch3D, Builder, seaGate3D, stoneHouse3D } from '../world3d/building';
import { NIGHT_SKY } from '../world3d/sky';
import { Stage, tiles } from '../world3d/stage';

const GROUND = [
  '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
  '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
  '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
  '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
  '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
  '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
  '~~~~~~rr...................rrr~~~~',
  '~~~~r.......................,..r~~',
  '~~~r.........................,,r~~',
  '~~~r,..........................r~~',
  '~~r,,...........................r~',
  '~~r,..cccccccccccccccc..........r~',
  '~~r..cccccccccccccccccccccccc,,.r~',
  '~~r.ccccccccccccccccccccccccccc.r~',
  '~~rr,..........................r~',
  '~~~ssssssssssssssssss===sssssss~~~',
  '~~~ssssssssssssssssss===sssssss~~~',
  '~~~~sssssssssssssssss===sssss~~~~~',
  '~~~~~ssssssssssssssssssssssss~~~~~',
  '~~~~~~~~sss~~ccc~~sss~~~~~~~~~~~~~',
  '~~~~~~~~~~~~~ccc~~~~~~~~~~~~~~~~~~',
  '~~~~~~~~~~~~~ccc~~~~~~~~~~~~~~~~~~',
  '~~~~~~~~~~~~~ccc~~~~~~~~~~~~~~~~~~',
  '~~~~~~~~~~~~~ccc~~~~~~~~~~~~~~~~~~',
  '~~~~~~~~~~~~~ccc~~~~~~~~~~~~~~~~~~',
  '~~~~~~~~~~~~~ccc~~~~~~~~~~~~~~~~~~',
  '~~~~~~~~~~~~~ccc~~~~~~~~~~~~~~~~~~',
  '~~~~~~~~~~~~~ccc~~~~~~~~~~~~~~~~~~',
  '~~~~~~~~~~~~~ccc~~~~~~~~~~~~~~~~~~',
  '~~~~~~~~~~~~~ccc~~~~~~~~~~~~~~~~~~',
];
const HEIGHTS = [
  '0000000000000000000000000000000000',
  '0000000000000000000000000000000000',
  '0000000000000000000000000000000000',
  '0000000000000000000000000000000000',
  '0000000000000000000000000000000000',
  '0000000000000000000000000000000000',
  '0000006666666666666666666666660000',
  '0000666666666666666666666666666600',
  '0006666666666666666666666666666600',
  '0006666666666666666666666666666600',
  '0066666666666666666666666666666660',
  '0066666666666666666666666666666660',
  '0066666666666666666666666666666660',
  '0066666666666666666666666666666660',
  '0066666666666666666666666666666660',
  '0000000000000000000000000000000000',
  '0000000000000000000000000000000000',
  '0000000000000000000000000000000000',
  '0000000000000000000000000000000000',
  '0000000000000000000000000000000000',
  '0000000000000000000000000000000000',
  '0000000000000000000000000000000000',
  '0000000000000000000000000000000000',
  '0000000000000000000000000000000000',
  '0000000000000000000000000000000000',
  '0000000000000000000000000000000000',
  '0000000000000000000000000000000000',
  '0000000000000000000000000000000000',
  '0000000000000000000000000000000000',
  '0000000000000000000000000000000000',
];

const WALKABLE = new Set(['.', ',', 'c', 's', '=', 'd', 'f']);
const MAP_W = tiles(GROUND[0]!.length);
const MAP_H = tiles(GROUND.length);
const PLATEAU = 48;

export class SeaGateScene implements Scene {
  readonly name = 'sea-gate';
  private readonly stage: Stage;
  private readonly player: Actor;
  private readonly party: Actor[] = [];
  private readonly trail: [number, number][] = [];
  private readonly whit: Actor;
  private readonly ambience = new EbbNightAmbience();
  private readonly blocked: [number, number, number, number][] = [];
  private time = 0;
  private readonly candle: GameLight;
  private readonly ui: UiLayer;
  private readonly dialogue: Dialogue;
  private readonly card: LocationCard;
  private readonly letterbox: Letterbox;
  private readonly director: Director;
  private readonly unsubs: (() => void)[] = [];
  private cutscene = false;
  private met = false;
  private camH = PLATEAU;

  constructor(
    private readonly r: WorldRenderer,
    private readonly input: Input,
    private readonly audio: AudioEngine,
  ) {
    const st = (this.stage = new Stage(r));
    r.atmosphere = {
      sky: [0.34, 0.4, 0.66],
      ground: [0.1, 0.1, 0.16],
      ambient: 0.5,
      key: [0.62, 0.72, 1],
      keyLevel: 0.55,
      keyDir: [0.45, -0.85, -0.28],
      fogColor: [0.13, 0.17, 0.3],
      fogDist: [140, 700],
      fogMax: 0.55,
      mist: [12, 0.6, 0.007],
      mistDrift: [0.04, 0.012],
      background: [0.02, 0.03, 0.08],
    };
    r.grade = {
      exposure: 1.12,
      contrast: 1.06,
      saturation: 1.05,
      lift: [0.01, 0.015, 0.045],
      gain: [0.97, 1, 1.05],
      vignette: 1,
      grain: 0.02,
      bloom: 0.9,
      bloomThreshold: 0.74,
      dof: 1,
      focusBand: 110,
      focusRange: 320,
    };

    // ---- ground, water, sky ----
    st.ground({ ground: GROUND, heights: HEIGHTS, seed: 7, palette: { ...GROUND_DEFAULT, grass: '#4E7E48', rock: '#6E6A70', stone: '#8E8C8A' } });
    st.addSky({ ...NIGHT_SKY, moon: [70, 128] });
    st.water!.moon(70, 7, 1);

    // ---- the island ----
    const church = st.addBuilding(abbeyChurch3D(tiles(4), tiles(6.6), PLATEAU, true));
    const house = st.addBuilding(stoneHouse3D(tiles(21), tiles(8), PLATEAU, 72, 40, true));
    st.addEmitter({ kind: 'mote', area: [tiles(21) + 56, tiles(8) + 10, 8, 4], heights: [PLATEAU + 56, PLATEAU + 80], count: 10, color: '#9AA6C8', size: 3, intensity: 0.35 }, 3);
    for (const b of [church, house]) this.blocked.push(...b.footprints);
    // A low parapet along the cliff edge, open where the stairs come up.
    const wall = new Builder('#9A948A');
    wall.box(tiles(3), tiles(15) - 5, tiles(18), 5, PLATEAU, 7);
    wall.box(tiles(24), tiles(15) - 5, tiles(7), 5, PLATEAU, 7);
    // Cheek walls either side of the stairs down the cliff.
    for (let k = 0; k < 12; k++) {
      const y0 = tiles(15) + k * 4;
      const h = PLATEAU - (PLATEAU * (k + 1)) / 12 + 6;
      for (const x of [tiles(21) - 4, tiles(24)]) wall.box(x, y0, 4, 4, 0, h);
    }
    wall.finish();
    st.addBuilding(wall);
    this.blocked.push([tiles(3), tiles(15) - 5, tiles(18), 5], [tiles(24), tiles(15) - 5, tiles(7), 5]);

    st.addImage(yewTree(3), tiles(29.5), tiles(9.6));
    for (const [x, y, s] of [
      [28.2, 10.6, 1],
      [29.6, 11.2, 2],
      [30.8, 10.4, 3],
    ] as const)
      st.addArt(gravestone(s), tiles(x), tiles(y));
    st.addImage(pineTree(2), tiles(3.6), tiles(9.8));
    st.addImage(pineTree(5), tiles(31.2), tiles(8.6));
    st.addImage(pineTree(8), tiles(5.4), tiles(6.8));
    st.addImage(oakTree(14, '#3E6E44'), tiles(27.4), tiles(7.4));
    st.addImage(bush(4, 'holly'), tiles(4.2), tiles(12.6));
    st.addImage(bush(9, 'holly'), tiles(20), tiles(11.6));
    st.addImage(bush(11, 'green'), tiles(25.4), tiles(7.2));
    st.addImage(rock(15, 0.8), tiles(22.2), tiles(6.6));
    for (const x of [7.5, 17.5, 27.5]) {
      st.addArt(lanternPost(), tiles(x), tiles(14.4));
      st.addShaft([tiles(x), tiles(14.4) + 0.5, 26], [tiles(x), tiles(14.4) + 3, 0], 5, 30, '#FFC27A', 0.22);
    }
    // Light falling from the aisle windows and the tower's rose.
    const front = tiles(6.6) + 40;
    for (let i = 1; i < 4; i++) {
      const wx = tiles(4) + 48 + 24 + i * 48;
      st.addShaft([wx, front + 0.5, PLATEAU + 22], [wx + 6, front + 26, PLATEAU], 9, 24, '#FFB860', 0.3);
    }
    st.addShaft([tiles(4) + 24, front + 0.5, PLATEAU + 38], [tiles(4) + 30, front + 34, PLATEAU], 12, 26, '#FFC880', 0.18);
    // Grass and flowers underfoot.
    st.scatter('tuft', '.,', 3, 2, this.blocked);
    st.scatter('flowers', ',', 2, 5, this.blocked);
    st.scatter('reedlet', 's', 0.12, 8, this.blocked);

    // ---- the shore and the gate ----
    const gx = tiles(12);
    const gy = tiles(17);
    const gate = st.addBuilding(seaGate3D(gx, gy, 0));
    this.blocked.push(...gate.footprints);
    const sc = sconce();
    for (const px of [gx + 26, gx + 54]) {
      st.addArt(sc, px, gy + 23, { h: 34 });
      st.addFlame(px, gy + 23.5, 42, { light: 70 });
    }
    st.addArt(boat(1), tiles(7), tiles(18.4));
    st.addArt(crate(2), tiles(18.8), tiles(17.4));
    st.addArt(barrel(3), tiles(19.6), tiles(17.8));
    st.addArt(stoneCross(4), tiles(10), tiles(16.4));
    for (const [x, y, s] of [
      [3.6, 15.9, 1],
      [29.4, 16.2, 2],
      [26.4, 18.6, 3],
    ] as const)
      st.addImage(reeds(s), tiles(x), tiles(y));
    for (const [x, y, s, k] of [
      [4.2, 21.2, 1, 1.2],
      [25.5, 20.6, 2, 1],
      [29, 24.4, 3, 1.4],
      [8.2, 25.4, 4, 0.9],
      [21.5, 27.2, 5, 1.1],
    ] as const)
      st.addImage(rock(s, k, true), tiles(x), tiles(y), { h: -8 });
    // Big rocks close to the camera, soft with depth of field.
    for (const [x, y, s, k] of [
      [9.6, 26.5, 21, 2.6],
      [21, 25.2, 22, 2.2],
      [26.5, 28.5, 23, 3],
    ] as const)
      st.addImage(rock(s, k, true), tiles(x), tiles(y), { h: -10 });
    for (let y = 20.5; y < 30; y += 2.5) {
      st.addArt(mooringPost(Math.floor(y)), tiles(12.85), tiles(y));
      st.addArt(mooringPost(Math.floor(y) + 9), tiles(16.15), tiles(y + 1.2));
    }

    // ---- particles ----
    st.addEmitter({ kind: 'glint', area: [40, tiles(1), 60, tiles(5)], heights: [-3, -3], count: 3, color: '#FFF0C8', size: 1.6, intensity: 1.2 }, 5);
    st.addEmitter({ kind: 'glint', area: [40, tiles(19), 80, tiles(10)], heights: [-3, -3], count: 4, color: '#FFF0C8', size: 1.6, intensity: 1 }, 6);
    st.addEmitter({ kind: 'mote', area: [0, tiles(15), MAP_W, tiles(15)], heights: [2, 40], count: 40, color: '#B8C8F0', size: 1.6, intensity: 0.3 }, 7);

    // ---- people ----
    this.player = new Actor('isot', CHARACTERS.isot!, r.scene);
    this.player.x = gx + 40;
    this.player.y = tiles(19.2);
    this.player.dir = 'down';
    const hild = new Actor('hild', CHARACTERS.hild!, r.scene);
    this.party.push(hild);
    hild.x = this.player.x;
    hild.y = this.player.y - 4;
    hild.dir = 'down';
    for (let i = 0; i < 80; i++) this.trail.push([this.player.x, this.player.y - Math.min(i, 4)]);
    this.whit = new Actor('whit', CHARACTERS.whit!, r.scene);
    this.whit.x = tiles(19.6);
    this.whit.y = tiles(23.2);
    this.whit.h = -13;
    this.whit.dir = 'up';
    this.candle = st.addLight(this.player.x, this.player.y, 12, 60, '#FFC37A', 0.22, 'candle');

    // ---- UI and cinematics ----
    this.ui = new UiLayer(r);
    this.dialogue = new Dialogue(this.ui, audio);
    this.card = new LocationCard(this.ui);
    this.letterbox = new Letterbox(this.ui);
    this.director = new Director(r, { minX: 213, maxX: MAP_W - 213, minY: 20, maxY: MAP_H - 120 });
    // Open on the church front, looking up at the tower against the sky.
    this.director.take(this.player.x - 40, tiles(9.5), 230);
    this.unsubs.push(
      input.onAction((a) => {
        this.dialogue.handle(a);
      }),
      input.onPointer((px, py) => {
        const p = r.windowToScreen(px, py);
        if (p) this.dialogue.click(p.x, p.y);
      }),
    );
    this.input.onGesture(() => this.ambience.start(this.audio));
    void this.opening();
  }

  private heightAt(x: number, y: number): number {
    return this.stage.heightAt(x, y);
  }

  /** Can a figure stand at (x, y), coming from height h? */
  private canStand(x: number, y: number, h: number): boolean {
    for (const [dx, dy] of [
      [0, 0],
      [-4, 0],
      [4, 0],
      [0, -2],
      [0, 2],
    ] as const) {
      const px = x + dx;
      const py = y + dy;
      const tx = Math.floor(px / TILE);
      const ty = Math.floor(py / TILE);
      if (!WALKABLE.has(GROUND[ty]?.[tx] ?? '~')) return false;
      if (Math.abs(this.heightAt(px, py) - h) > 7) return false;
      for (const [bx, by, bw, bd] of this.blocked) if (px >= bx && px < bx + bw && py >= by && py < by + bd) return false;
    }
    return true;
  }

  private async opening(): Promise<void> {
    const d = this.director;
    this.cutscene = true;
    this.letterbox.target = 1;
    await d.wait(1.2);
    await d.panTo(...d.clamp(this.player.x, this.player.y - 10), 6, this.player.h);
    this.letterbox.target = 0;
    this.card.show('Saint Ebb’s', 'The Sea Gate, by night');
    await d.wait(1.6);
    await this.dialogue.say('hild', 'Ten years I have not walked further than my cell. My feet have forgotten what stairs are for.', 'tired');
    await this.dialogue.say('isot', 'Then no more stairs. Down the causeway, before the tide closes it.', 'wry');
    this.dialogue.close();
    d.release();
    this.cutscene = false;
  }

  private async knight(): Promise<void> {
    const d = this.director;
    const p = this.player;
    const hild = this.party[0]!;
    this.cutscene = true;
    this.met = true;
    p.dir = 'right';
    this.letterbox.target = 1;
    d.take(this.r.view.x, this.r.view.y, this.r.view.h);
    p.emote('alarm');
    await d.wait(0.6);
    await d.panTo(...d.clamp((p.x + this.whit.x) / 2, this.whit.y - 20), 1.6, 0);
    await this.dialogue.say('isot', 'There is someone standing in the sea.', 'alarmed');
    hild.dir = 'right';
    await this.dialogue.say('hild', 'He has been there since… always, I think. The fishermen row around him.', 'grave');
    await d.wait(0.3);
    this.whit.dir = 'left';
    await d.wait(0.8);
    await this.dialogue.say('knight', 'Forgive me. I was waiting for something.');
    await this.dialogue.say('knight', 'Is it you?');
    this.dialogue.close();
    d.shake(6, 0.25);
    hild.emote('silence', 2.2);
    await d.wait(0.5);
    await this.dialogue.narrate('Hild drops her psalter. She says nothing.');
    p.dir = 'up';
    p.emote('question');
    await this.dialogue.say('isot', 'Hild?');
    await this.dialogue.say('hild', '…It is nothing. The tide will not wait for us.', 'sad');
    await this.dialogue.say('knight', 'May I walk with you? I have been standing a long time.');
    p.dir = 'right';
    await this.dialogue.say('isot', 'Come on, then. Mind the deep water.', 'warm');
    this.dialogue.close();
    const w = this.whit;
    await w.walk([
      [tiles(16.7), w.y],
      [tiles(15.4), w.y],
    ]);
    this.party.push(w);
    this.letterbox.target = 0;
    await d.panTo(...d.clamp(p.x, p.y - 10), 1.2, p.h);
    d.release();
    this.cutscene = false;
  }

  skipOpening(): void {
    this.director.release();
    this.letterbox.target = 0;
    this.cutscene = false;
    this.dialogue.close();
  }

  update(dt: number): void {
    this.time += dt;
    const free = !this.cutscene && !this.dialogue.open;
    let mx = 0;
    let my = 0;
    if (free) {
      if (this.input.isHeld('left')) mx -= 1;
      if (this.input.isHeld('right')) mx += 1;
      if (this.input.isHeld('up')) my -= 1;
      if (this.input.isHeld('down')) my += 1;
    }
    const p = this.player;
    if (mx || my) {
      const len = Math.hypot(mx, my);
      const sp = p.speed * dt;
      let dx = (mx / len) * sp;
      let dy = (my / len) * sp;
      if (!this.canStand(p.x + dx, p.y, p.h)) dx = 0;
      if (!this.canStand(p.x + dx, p.y + dy, p.h)) dy = 0;
      if (dx || dy) p.step(dx, dy, dt);
      else {
        p.face(mx, my);
        p.step(0, 0, dt);
      }
    } else p.step(0, 0, dt);
    p.h = this.heightAt(p.x, p.y);
    if (p.stepped) footstep(this.audio, 'stone');

    const last = this.trail[0]!;
    if (Math.hypot(p.x - last[0], p.y - last[1]) > 1) {
      this.trail.unshift([p.x, p.y]);
      if (this.trail.length > 120) this.trail.pop();
    }
    this.party.forEach((a, i) => {
      if (a.walking) a.update(dt);
      else {
        const target = this.trail[Math.min(this.trail.length - 1, (i + 1) * 16)]!;
        const dx = target[0] - a.x;
        const dy = target[1] - a.y;
        const dd = Math.hypot(dx, dy);
        if (dd > 0.4) {
          const k = Math.min(1, (p.speed * 1.1 * dt) / dd);
          a.step(dx * k, dy * k, dt);
        } else a.step(0, 0, dt);
      }
      a.h = this.heightAt(a.x, a.y);
    });
    if (!this.party.includes(this.whit)) {
      this.whit.update(dt);
      // Wading out of the shallows onto the causeway.
      this.whit.h = this.whit.x > tiles(16.2) ? -13 : this.heightAt(this.whit.x, this.whit.y);
    }
    this.candle.x = p.x + (p.dir === 'left' ? -5 : p.dir === 'right' ? 5 : 0);
    this.candle.y = p.y + 6;
    this.candle.h = p.h + 12;

    if (free && !this.met && p.y > tiles(22.2)) void this.knight();

    this.director.update(dt);
    const [cx, cy] = this.director.active ? this.director.cam : this.director.clamp(p.x, p.y - 10);
    if (this.director.active) this.camH = this.director.cam[2];
    else this.camH += (p.h - this.camH) * Math.min(1, dt * 3);
    this.r.view.x = Math.round(cx);
    this.r.view.y = Math.round(cy);
    this.r.view.h = Math.round(this.camH);
    this.r.screen.fade = Math.max(0, 1 - this.time / 2.2);
    this.dialogue.update(dt);
    this.card.update(dt);
    this.letterbox.update(dt);
    this.stage.update(dt, this.time);
  }

  sync(): void {
    this.player.sync();
    for (const a of this.party) a.sync();
    if (!this.party.includes(this.whit)) this.whit.sync();
    this.ui.sync();
  }

  debugInfo(): DebugInfo {
    const p = this.player;
    return {
      scene: this.name,
      location: 'Saint Ebb’s, the Sea Gate (night)',
      lines: [
        ['player', `${(p.x / TILE).toFixed(1)}, ${(p.y / TILE).toFixed(1)} h${p.h.toFixed(0)} ${p.dir}`],
        ['camera', `${this.r.view.x}, ${this.r.view.y}`],
        ['quality', this.r.quality.tier],
        ['lights', String(this.stage.lights.length)],
        ['cutscene', String(this.cutscene)],
      ],
    };
  }

  debugButtons(): { label: string; run: () => void }[] {
    return [
      { label: 'skip opening', run: () => this.skipOpening() },
      {
        label: 'to the courtyard',
        run: () => {
          this.skipOpening();
          this.player.x = tiles(12);
          this.player.y = tiles(13);
        },
      },
    ];
  }

  dispose(): void {
    for (const u of this.unsubs) u();
    this.dialogue.dispose();
    this.card.dispose();
    this.letterbox.dispose();
    this.ui.dispose();
    this.ambience.stop();
    this.stage.dispose();
    this.player.dispose();
    for (const a of this.party) a.dispose();
    if (!this.party.includes(this.whit)) this.whit.dispose();
  }
}
