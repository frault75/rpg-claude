/**
 * The Sea Gate of Saint Ebb's by night: the first HD-2D map. The abbey church stands on
 * its island under the moon, stairs drop down the cliff to the sea gate, and the causeway
 * runs south into the fog, where a knight in white stands in the shallows.
 */

import type { AudioEngine } from '../audio/engine';
import { EbbNightAmbience } from '../audio/ambient';
import { footstep } from '../audio/sfx';
import type { DebugInfo } from '../debug/overlay';
import type { Light } from '../engine/hd2d/light';
import type { WorldRenderer } from '../engine/hd2d/renderer';
import { VIEW_H, VIEW_W } from '../engine/hd2d/renderer';
import type { Input } from '../engine/input';
import { type Scene, smoothstep } from '../engine/scene';
import { abbeyChurch, parapet, seaGate, stoneHouse } from '../pixel/buildings';
import { CHARACTERS } from '../pixel/characters';
import { bush, oakTree, pineTree, reeds, rock, yewTree } from '../pixel/nature';
import { barrel, boat, crate, gravestone, lanternPost, mooringPost, sconce, stoneCross } from '../pixel/props';
import { PixelImage } from '../pixel/pixel';
import { PX } from '../pixel/sprite';
import { Actor } from '../world/actor';
import { Grid } from '../world/grid';
import { GROUND_DEFAULT } from '../pixel/terrain';
import { Stage, tiles } from '../world/stage';

const LAYOUT = [
  '                                  ',
  '                                  ',
  '                                  ',
  '                                  ',
  '                                  ',
  '                                  ',
  '                                  ',
  '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
  '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
  '~~~~~~rr.................rrr~~~~~~',
  '~~~~r.......................r~~~~~',
  '~~~r..........................r~~~',
  '~~~r...........................r~~',
  '~~r,...........................,r~',
  '~~r,,ccccccccccccccccccccccccc,,,r~',
  '~~r.,ccccccccccccccccccccccccc.,.r~',
  '~~r||||||||||||||||||||===|||||||r~',
  '~~~||||||||||||||||||||===|||||||~~',
  '~~~||||||||||||||||||||===||||||~~~',
  '~~~sssssssssssssssssss=====ssss~~~~',
  '~~~~sssssssssccccssssssssssssss~~~~',
  '~~~~~~~ssss~cccccsss~~~~~~~~~~~~~~~',
  '~~~~~~~~~~~~~ccc~~~~~~~~~~~~~~~~~~~',
  '~~~~~~~~~~~~~ccc~~~~~~~~~~~~~~~~~~~',
  '~~~~~~~~~~~~~ccc~~~~~~~~~~~~~~~~~~~',
  '~~~~~~~~~~~~~ccc~~~~~~~~~~~~~~~~~~~',
  '~~~~~~~~~~~~~ccc~~~~~~~~~~~~~~~~~~~',
  '~~~~~~~~~~~~~ccc~~~~~~~~~~~~~~~~~~~',
  '~~~~~~~~~~~~~ccc~~~~~~~~~~~~~~~~~~~',
  '~~~~~~~~~~~~~ccc~~~~~~~~~~~~~~~~~~~',
];

const WALKABLE = '.,cs=df';
/** Rows of open sky above the island. Map rows below are given from the horizon down. */
const SKY = 4;
const ty = (row: number): number => tiles(row + SKY);
const MAP_W = tiles(LAYOUT[0]!.length);
const MAP_H = tiles(LAYOUT.length);

export class SeaGateScene implements Scene {
  readonly name = 'sea-gate';
  private readonly stage: Stage;
  private readonly grid: Grid;
  private readonly player: Actor;
  private readonly party: Actor[] = [];
  private readonly trail: [number, number][] = [];
  private readonly whit: Actor;
  private readonly ambience = new EbbNightAmbience();
  private time = 0;
  /** Opening camera move: from the spire down to the causeway. */
  private intro = 0;
  private readonly introLength = 7;
  private camY = 0;
  private readonly candle: Light;

  constructor(
    private readonly r: WorldRenderer,
    private readonly input: Input,
    private readonly audio: AudioEngine,
  ) {
    const st = (this.stage = new Stage(r));
    r.atmosphere = {
      ambient: [0.24, 0.28, 0.56],
      void: [0.02, 0.03, 0.08],
      fog: 0.5,
      fogColor: [0.3, 0.36, 0.52],
      fogScale: 0.0024,
      fogDrift: [0.018, 0.004],
      fogBand: [ty(13), ty(24), 0.18],
      emissiveGain: 1.15,
    };
    r.grade = {
      exposure: 1.12,
      contrast: 1.06,
      saturation: 1,
      lift: [0.015, 0.02, 0.06],
      gain: [0.96, 1, 1.06],
      vignette: 1,
      grain: 0.02,
      bloom: 0.8,
      bloomThreshold: 0.78,
      tilt: 0.9,
      focusY: 0.5,
      focusBand: 0.2,
    };

    // ---- ground, water, sky ----
    const ground = st.paint(LAYOUT, 7, { ...GROUND_DEFAULT, grass: '#4E7E48', rock: '#6E6A70', stone: '#8E8C8A' });
    st.addSky(0, 0, MAP_W, ty(3) + 6);
    const moon: [number, number] = [44, 30];
    st.sky!.mesh.material.uniforms.uMoon!.value.set(moon[0], moon[1]);
    st.water!.moon(moon[0], 7, ty(3) / PX);
    void ground;

    // ---- the island ----
    const church = abbeyChurch(11, true);
    st.addArt(church, tiles(12), ty(10));
    const house = stoneHouse(76, 41, true);
    st.addArt(house, tiles(24.6), ty(10));
    st.addEmitter({ kind: 'mote', rect: [tiles(24.6) + (house.chimney[0] - house.anchor[0]) * PX - 8, ty(10) + (house.chimney[1] - house.anchor[1]) * PX - 60, 16, 50], count: 10, color: '#9AA6C8', size: 7, intensity: 0.35 }, 3);
    st.addArt(img(yewTree(3)), tiles(30.4), ty(9.8));
    for (const [x, y, s] of [
      [29.2, 10.6, 1],
      [30.6, 11.1, 2],
      [31.6, 10.5, 3],
    ] as const)
      st.addArt(gravestone(s), tiles(x), ty(y));
    st.addArt(img(pineTree(2)), tiles(3.6), ty(9.6));
    st.addArt(img(pineTree(5)), tiles(32.2), ty(8.8));
    st.addArt(img(pineTree(8)), tiles(5.2), ty(6.9));
    st.addArt(img(bush(4, 'holly')), tiles(4.4), ty(11.5));
    st.addArt(img(bush(9, 'holly')), tiles(20.6), ty(10.7));
    for (const x of [7.5, 17.5, 27.5]) st.addArt(lanternPost(), tiles(x), ty(11.85));
    // The lawn behind the guest house runs down to the far shore.
    for (const [x, y, s] of [
      [21.5, 7.2, 11],
      [27.6, 6.4, 12],
      [24, 6.1, 13],
    ] as const)
      st.addArt(img(bush(s, s % 2 ? 'green' : 'holly')), tiles(x), ty(y));
    st.addArt(img(oakTree(14, '#3E6E44')), tiles(29.5), ty(7.6));
    st.addArt(img(rock(15, 0.8)), tiles(22.4), ty(5.9));
    st.addArt(img(rock(16, 0.6)), tiles(9.5), ty(5.7));
    // Parapet along the cliff top, open where the stairs come up.
    for (let x = 3; x < 23; x += 4) st.addArt(parapet(Math.min(4, 23 - x) * 16, x), tiles(x + Math.min(4, 23 - x) / 2), ty(12.1));
    for (let x = 26; x < 33; x += 4) st.addArt(parapet(Math.min(4, 33 - x) * 16, x), tiles(x + Math.min(4, 33 - x) / 2), ty(12.1));

    // ---- the shore and the gate ----
    const gate = seaGate(21);
    const gx = tiles(14.5);
    const gy = ty(17);
    st.addArt(gate, gx, gy);
    const sc = sconce();
    for (const px of [27, 65]) {
      const x = gx + (px - gate.anchor[0]) * PX;
      const y = gy + (42 - gate.anchor[1]) * PX;
      st.addArt(sc, x, y, { depth: gy + 2 });
      st.addFlame(x, y - 24, { depth: gy + 3, light: 230 });
    }
    st.addArt(boat(1), tiles(7.2), ty(16.7));
    st.addArt(crate(2), tiles(18.6), ty(16.4));
    st.addArt(barrel(3), tiles(19.4), ty(16.7));
    st.addArt(stoneCross(4), tiles(10.2), ty(16.2));
    for (const [x, y, s] of [
      [3.6, 15.9, 1],
      [29.8, 15.6, 2],
      [26.4, 16.8, 3],
    ] as const)
      st.addArt(img(reeds(s)), tiles(x), ty(y));
    for (const [x, y, s, k] of [
      [4.2, 19.2, 1, 1.2],
      [25.5, 18.6, 2, 1],
      [29, 22.4, 3, 1.4],
      [8.2, 23.4, 4, 0.9],
      [21.5, 25.2, 5, 1.1],
    ] as const)
      st.addArt(img(rock(s, k, true)), tiles(x), ty(y));
    for (let y = 18.5; y < 26; y += 2.5) {
      st.addArt(mooringPost(Math.floor(y)), tiles(12.85), ty(y));
      st.addArt(mooringPost(Math.floor(y) + 9), tiles(16.15), ty(y + 1.2));
    }

    // ---- particles ----
    st.addEmitter({ kind: 'glint', rect: [tiles(0.5), ty(3.2), tiles(5), tiles(1.6)], count: 3, color: '#FFF0C8', size: 5, intensity: 1.2 }, 5);
    st.addEmitter({ kind: 'glint', rect: [tiles(1), ty(17), tiles(5), tiles(9)], count: 4, color: '#FFF0C8', size: 5, intensity: 1 }, 6);
    st.addEmitter({ kind: 'mote', rect: [0, ty(13), MAP_W, tiles(13)], count: 40, color: '#B8C8F0', size: 5, intensity: 0.3 }, 7);

    // ---- walkable grid ----
    this.grid = Grid.fromRows(LAYOUT, tiles(1), WALKABLE);
    const block = (x0: number, y0: number, x1: number, y1: number) => {
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) this.grid.setSolid(x, y, true);
    };
    block(4, SKY + 5, 19, SKY + 9); // church
    block(22, SKY + 7, 27, SKY + 9); // guest house
    block(12, SKY + 16, 13, SKY + 16); // gate towers, leaving the arch
    block(15, SKY + 16, 16, SKY + 16);
    block(28, SKY + 9, 32, SKY + 11); // churchyard

    // ---- people ----
    this.player = new Actor('isot', CHARACTERS.isot!, r.world);
    this.player.x = tiles(14.5);
    this.player.y = ty(23);
    this.player.dir = 'up';
    const hild = new Actor('hild', CHARACTERS.hild!, r.world);
    this.party.push(hild);
    for (const a of this.party) {
      a.x = this.player.x;
      a.y = this.player.y + 40;
      a.dir = 'up';
    }
    this.whit = new Actor('whit', CHARACTERS.whit!, r.world);
    this.whit.x = tiles(19.6);
    this.whit.y = ty(21.2);
    this.whit.dir = 'left';
    this.whit.wade = 9;
    for (let i = 0; i < 80; i++) this.trail.push([this.player.x, this.player.y + i * 3]);
    this.party.forEach((a, i) => (a.y = this.player.y + (i + 1) * 54));

    // Isot carries a candle: a small warm pool that walks with the party.
    this.candle = st.addLight(this.player.x, this.player.y - 30, 170, '#FFC37A', 0.55, 'candle');
    this.camY = tiles(3);
    this.input.onGesture(() => this.ambience.start(this.audio));
  }

  /** Skip or replay the opening camera move. */
  setIntro(t: number): void {
    this.intro = t;
  }

  update(dt: number): void {
    this.time += dt;
    this.intro = Math.min(this.introLength, this.intro + dt);
    const introDone = this.intro >= this.introLength;
    // Player movement.
    let mx = 0;
    let my = 0;
    if (introDone) {
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
      if (!this.grid.canStand(p.x + dx, p.y)) dx = 0;
      if (!this.grid.canStand(p.x + dx, p.y + dy)) dy = 0;
      if (dx || dy) p.step(dx, dy, dt);
      else {
        p.face(mx, my);
        p.step(0, 0, dt);
      }
    } else p.step(0, 0, dt);
    if (p.stepped) footstep(this.audio, 'stone');

    // Followers walk the leader's trail.
    const last = this.trail[0]!;
    if (Math.hypot(p.x - last[0], p.y - last[1]) > 3) {
      this.trail.unshift([p.x, p.y]);
      if (this.trail.length > 120) this.trail.pop();
    }
    this.party.forEach((a, i) => {
      const target = this.trail[Math.min(this.trail.length - 1, (i + 1) * 18)]!;
      const dx = target[0] - a.x;
      const dy = target[1] - a.y;
      const d = Math.hypot(dx, dy);
      if (d > 1) {
        const k = Math.min(1, (p.speed * 1.1 * dt) / d);
        a.step(dx * k, dy * k, dt);
      } else a.step(0, 0, dt);
    });
    this.whit.update(dt);
    this.candle.x = p.x + (p.dir === 'left' ? -14 : p.dir === 'right' ? 14 : 0);
    this.candle.y = p.y - 20;

    // Camera: the opening move, then follow the player.
    const followY = Math.min(MAP_H - VIEW_H / 2, Math.max(VIEW_H / 2, p.y - 60));
    const followX = Math.min(MAP_W - VIEW_W / 2, Math.max(VIEW_W / 2, p.x));
    if (!introDone) {
      const t = smoothstep(1.2, this.introLength, this.intro);
      this.camY = VIEW_H / 2 + (followY - VIEW_H / 2) * t;
      this.r.screen.fade = 1 - smoothstep(0, 2.2, this.intro);
    } else {
      this.camY = followY;
      this.r.screen.fade = 0;
    }
    this.r.view.x = Math.round(followX / PX) * PX;
    this.r.view.y = introDone ? Math.round(this.camY / PX) * PX : this.camY;
    this.stage.update(dt, this.time);
  }

  sync(): void {
    this.player.sync();
    for (const a of this.party) a.sync();
    this.whit.sync();
  }

  debugInfo(): DebugInfo {
    const p = this.player;
    return {
      scene: this.name,
      location: 'Saint Ebb’s, the Sea Gate (night)',
      lines: [
        ['player', `${(p.x / tiles(1)).toFixed(1)}, ${(p.y / tiles(1) - SKY).toFixed(1)} ${p.dir}`],
        ['camera', `${this.r.view.x.toFixed(0)}, ${this.r.view.y.toFixed(0)}`],
        ['lights', String(this.stage.lights.length)],
      ],
    };
  }

  debugButtons(): { label: string; run: () => void }[] {
    return [
      { label: 'replay intro', run: () => this.setIntro(0) },
      { label: 'skip intro', run: () => this.setIntro(this.introLength) },
      {
        label: 'to the courtyard',
        run: () => {
          this.setIntro(this.introLength);
          this.player.x = tiles(12);
          this.player.y = ty(11.2);
        },
      },
    ];
  }

  dispose(): void {
    this.ambience.stop();
    this.stage.dispose();
    this.player.dispose();
    for (const a of this.party) a.dispose();
    this.whit.dispose();
  }
}

/** Wrap a plain image as art with no glow, anchored at its bottom centre. */
function img(i: PixelImage): { a: PixelImage; e: PixelImage; lights: []; anchor: [number, number] } {
  return { a: i, e: new PixelImage(i.w, i.h), lights: [], anchor: [i.w / 2, i.h - 1] };
}
