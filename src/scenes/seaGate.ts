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
import { session } from '../engine/session';
import { tr } from '../i18n/i18n';
import { CHARACTERS } from '../pixel/characters';
import { TILE } from '../pixel/terrain';
import { dressSeaGate, GROUND, MAP_H, MAP_W, PLATEAU, WALKABLE } from '../maps/seaGateSet';
import { LocationCard, Letterbox } from '../ui/card';
import { Dialogue } from '../ui/dialogue';
import { UiLayer } from '../ui/ui';
import { Director } from '../world/director';
import { Actor } from '../world3d/actor';
import { Stage, tiles } from '../world3d/stage';

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
  /** Where a click or tap asked the player to walk. */
  private goal: [number, number] | null = null;

  constructor(
    private readonly r: WorldRenderer,
    private readonly input: Input,
    private readonly audio: AudioEngine,
  ) {
    const st = (this.stage = new Stage(r));
    const set = dressSeaGate(r, st);
    this.blocked.push(...set.blocked);
    const gx = set.gx;
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
        if (!p) return;
        if (this.dialogue.open) this.dialogue.click(p.x, p.y);
        else if (!this.cutscene) {
          // Click or tap to walk there.
          const m = r.screenToMap(p.x, p.y, this.player.h);
          this.goal = [m.x, m.y];
        }
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
    this.card.show(tr({ en: 'Saint Ebb’s', fr: 'Saint-Ebb' }), tr({ en: 'The Sea Gate, by night', fr: 'La Porte de la Mer, de nuit' }));
    await d.wait(1.6);
    await this.dialogue.say('hild', { en: 'Ten years I have not walked further than my cell. My feet have forgotten what stairs are for.', fr: 'Dix ans que je ne suis pas allée plus loin que ma cellule. Mes pieds ont oublié à quoi servent les marches.' }, 'tired');
    await this.dialogue.say('isot', { en: 'Then no more stairs. Down the causeway, before the tide closes it.', fr: 'Alors fini les marches. Par la chaussée, avant que la marée ne la referme.' }, 'wry');
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
    await this.dialogue.say('isot', { en: 'There is someone standing in the sea.', fr: 'Il y a quelqu’un debout dans la mer.' }, 'alarmed');
    hild.dir = 'right';
    await this.dialogue.say('hild', { en: 'He has been there since… always, I think. The fishermen row around him.', fr: 'Il est là depuis… toujours, je crois. Les pêcheurs le contournent à la rame.' }, 'grave');
    await d.wait(0.3);
    this.whit.dir = 'left';
    await d.wait(0.8);
    await this.dialogue.say('knight', { en: 'Forgive me. I was waiting for something.', fr: 'Pardonnez-moi. J’attendais quelque chose.' });
    await this.dialogue.say('knight', { en: 'Is it you?', fr: 'Est-ce vous ?' });
    this.dialogue.close();
    d.shake(6, 0.25);
    hild.emote('silence', 2.2);
    await d.wait(0.5);
    await this.dialogue.narrate({ en: 'Hild drops her psalter. She says nothing.', fr: 'Hild laisse tomber son psautier. Elle ne dit rien.' });
    p.dir = 'up';
    p.emote('question');
    await this.dialogue.say('isot', { en: 'Hild?', fr: 'Hild ?' });
    await this.dialogue.say('hild', { en: '…It is nothing. The tide will not wait for us.', fr: '…Ce n’est rien. La marée ne nous attendra pas.' }, 'sad');
    await this.dialogue.say('knight', { en: 'May I walk with you? I have been standing a long time.', fr: 'Puis-je marcher avec vous ? Je suis resté debout bien longtemps.' });
    p.dir = 'right';
    await this.dialogue.say('isot', { en: 'Come on, then. Mind the deep water.', fr: 'Venez, alors. Attention à l’eau profonde.' }, 'warm');
    this.dialogue.close();
    const w = this.whit;
    await w.walk([
      [tiles(16.7), w.y],
      [tiles(15.4), w.y],
    ]);
    this.party.push(w);
    if (!session.game.party.includes('whit')) session.game.party.push('whit');
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
    let { x: mx, y: my } = free ? this.input.move() : { x: 0, y: 0 };
    const p = this.player;
    if (mx || my) this.goal = null;
    else if (free && this.goal) {
      const gx = this.goal[0] - p.x;
      const gy = this.goal[1] - p.y;
      const gd = Math.hypot(gx, gy);
      if (gd < 1.5) this.goal = null;
      else {
        mx = gx / gd;
        my = gy / gd;
      }
    }
    if (mx || my) {
      const len = Math.max(1, Math.hypot(mx, my));
      const sp = p.speed * dt * Math.min(1, Math.hypot(mx, my) * 1.2);
      let dx = (mx / len) * sp;
      let dy = (my / len) * sp;
      if (!this.canStand(p.x + dx, p.y, p.h)) dx = 0;
      if (!this.canStand(p.x + dx, p.y + dy, p.h)) dy = 0;
      if (dx || dy) p.step(dx, dy, dt);
      else {
        p.face(mx, my);
        p.step(0, 0, dt);
        this.goal = null;
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
