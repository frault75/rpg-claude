/**
 * The Sea Gate of Saint Ebb's by night, as a diorama. The abbey church stands on its
 * island under the moon; stairs drop down the cliff to the shore and the sea gate; the
 * causeway runs south into the mist, where a knight in white stands in the shallows.
 */

import type { AudioEngine } from '../audio/engine';
import { EbbNightAmbience } from '../audio/ambient';
import { footstep, uiTick } from '../audio/sfx';
import type { DebugInfo } from '../debug/overlay';
import type { GameLight, WorldRenderer } from '../engine/diorama/renderer';
import type { Input } from '../engine/input';
import type { Scene } from '../engine/scene';
import { session } from '../engine/session';
import { type LocalText, t, tr } from '../i18n/i18n';
import { ITEMS } from '../data/equipment';
import { waveSound } from '../audio/battleSfx';
import { CHARACTERS } from '../pixel/characters';
import { TILE } from '../pixel/terrain';
import { dressSeaGate, GROUND, MAP_H, MAP_W, PLATEAU, WALKABLE } from '../maps/seaGateSet';
import { LocationCard, Letterbox } from '../ui/card';
import { Dialogue } from '../ui/dialogue';
import { UiLayer } from '../ui/ui';
import { Director } from '../world/director';
import { greatSnailArt } from '../pixel/enemies';
import { Actor } from '../world3d/actor';
import { Billboard, pixelTexture } from '../world3d/billboard';
import { Stage, tiles } from '../world3d/stage';

/** What the Sea Gate asks of the game around it. */
export interface SeaGateHooks {
  /** Start a fight; the game comes back here when it is over. */
  battle?: (id: string) => void;
  /** The chapter is over (for now, the end of what is built). */
  end?: () => void;
}

/** Where on the causeway the Great Snail heaves itself out of the sea. */
const SNAIL_Y = tiles(25.4);

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

  private snail: Billboard | null = null;
  private snailRise = -1;
  /** People brought on for a cutscene. */
  private readonly extras: Actor[] = [];
  /** Fade to black for an interlude (0 = none). */
  private fadeTo = 0;
  private fadeT = 0;

  constructor(
    private readonly r: WorldRenderer,
    private readonly input: Input,
    private readonly audio: AudioEngine,
    private readonly hooks: SeaGateHooks = {},
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
    const g = session.game;
    if (g.party.includes('whit')) void this.resume(g.cleared.includes('b1'));
    else void this.opening();
  }

  /** Back on the causeway after the knight has joined: before the snail, or after it. */
  private async resume(won: boolean): Promise<void> {
    const p = this.player;
    const hild = this.party[0]!;
    const w = this.whit;
    this.met = true;
    this.party.push(w);
    p.x = tiles(14.5);
    p.y = won ? SNAIL_Y + 6 : tiles(23.6);
    p.dir = 'down';
    this.trail.length = 0;
    for (let i = 0; i < 80; i++) this.trail.push([p.x, p.y - Math.min(i, 40) * 0.5]);
    hild.x = w.x = p.x;
    hild.y = p.y - 8;
    w.y = p.y - 16;
    w.h = 0;
    this.director.take(p.x, p.y - 10, 0);
    if (!won || session.game.flags.named) {
      this.director.release();
      return;
    }
    this.cutscene = true;
    await this.director.wait(1.2);
    await this.dialogue.say('knight', { en: 'It has gone back into the border. They always do.', fr: 'Il est retourné dans la bordure. Ils y retournent toujours.' });
    p.dir = 'up';
    await this.dialogue.say('isot', { en: 'Into the border? Like a drawing?', fr: 'Dans la bordure ? Comme un dessin ?' }, 'wry');
    await this.dialogue.say('hild', { en: 'Nothing in Hollin dies any more, child. Not even the jokes. Come: Lychford is a day’s walk, and the tide is turning.', fr: 'Plus rien ne meurt en Hollin, petite. Pas même les plaisanteries. Viens : Lychford est à une journée de marche, et la marée tourne.' }, 'grave');
    this.dialogue.close();
    await this.found('ebbShell', { en: 'Where the snail went under, Isot picks a shell up off the causeway, still wet.', fr: 'Là où l’escargot a disparu, Isot ramasse sur la chaussée une coquille encore mouillée.' });
    session.saves.save('auto', session.game);
    await this.hook();
  }

  /** An item found on the causeway (DESIGN.md §6): how, then its card. Once only. */
  private async found(item: string, how: LocalText): Promise<void> {
    const inv = session.game.inventory;
    const def = ITEMS[item];
    if (!def || inv.includes(item)) return;
    await this.dialogue.narrate(how);
    this.dialogue.close();
    inv.push(item);
    uiTick(this.audio, true);
    this.card.show(tr(def.name), `${t('item.found')} · ${tr(def.text)}`);
    await this.director.wait(2.6);
  }

  /** The hook (DESIGN.md §3.4.9): the Abbot at the gate, the tide between, a name. */
  private async hook(): Promise<void> {
    const d = this.director;
    const p = this.player;
    const w = this.whit;
    const hild = this.party[0]!;
    // Torches at the gate.
    const gx = tiles(14.5);
    const gy = tiles(18.2);
    const aumery = new Actor('aumery', CHARACTERS.aumery!, this.r.scene);
    const brothers = [-14, 14].map((dx) => {
      const b = new Actor('brother', CHARACTERS.brother!, this.r.scene);
      b.x = gx + dx;
      b.y = gy - 6;
      b.dir = 'down';
      return b;
    });
    aumery.x = gx;
    aumery.y = gy;
    aumery.dir = 'down';
    this.extras.push(aumery, ...brothers);
    for (const b of brothers) this.stage.addFlame(b.x + 6, b.y + 1, 30, { light: 70, embers: true });
    this.letterbox.target = 1;
    d.take(this.r.view.x, this.r.view.y, this.r.view.h);
    d.shake(2, 0.4);
    p.emote('alarm');
    for (const a of [p, hild, w]) a.dir = 'up';
    await d.panTo(...d.clamp(gx, gy + 20), 1.8, 0);
    await this.dialogue.say('aumery', { en: 'Isot! Come back across, child. The tide will have you otherwise.', fr: 'Isot ! Reviens, mon enfant. Sinon la marée te prendra.' });
    aumery.emote('alarm', 2);
    await d.wait(0.6);
    await this.dialogue.say('aumery', { en: 'Not him.', fr: 'Pas lui.' });
    await this.dialogue.say('aumery', { en: 'Not him.', fr: 'Pas lui.' });
    await this.dialogue.say('brother', { en: 'Father Abbot?', fr: 'Père abbé ?' }, 'neutral', { en: 'Prior Gaudry', fr: 'Le prieur Gaudry' });
    await this.dialogue.say('aumery', { en: 'Gaudry. Fetch me Lychford’s bell. It is the last.', fr: 'Gaudry. Rapporte-moi la cloche de Lychford. C’est la dernière.' });
    waveSound(this.audio);
    d.shake(3, 1.2);
    await this.dialogue.narrate({ en: 'The tide comes in over the causeway between them, as it does every night, as if it had been waiting for this.', fr: 'La marée monte sur la chaussée entre eux, comme chaque nuit, comme si elle n’avait attendu que ça.' });
    this.dialogue.close();
    await d.panTo(...d.clamp(p.x, p.y - 10), 1.6, 0);
    p.dir = 'up';
    w.dir = 'down';
    await this.dialogue.say('isot', { en: 'You need a name. Something they can’t scrape out.', fr: 'Il vous faut un nom. Quelque chose qu’ils ne pourront pas gratter.' }, 'grave');
    await this.dialogue.say('knight', { en: 'I had one, I think. I put it down somewhere and forgot where.', fr: 'J’en avais un, je crois. Je l’ai posé quelque part et j’ai oublié où.' });
    await this.dialogue.say('isot', { en: 'Then I’ll lend you one. Whit. For the white of you.', fr: 'Alors je vous en prête un. Whit. Pour votre blancheur.' }, 'warm');
    await this.dialogue.narrate({ en: 'She writes it on his wrist in ink, small and steady, so that he won’t fade.', fr: 'Elle l’écrit sur son poignet à l’encre, petit et net, pour qu’il ne s’efface pas.' });
    await this.dialogue.say('whit', { en: 'Whit.', fr: 'Whit.' });
    await this.dialogue.say('whit', { en: 'Thank you.', fr: 'Merci.' });
    hild.emote('silence', 2);
    session.game.flags.named = true;
    this.dialogue.close();
    // Interlude I follows, then Chapter II.
    session.game.chapter = 2;
    this.hooks.end?.();
  }

  /** The causeway heaves: the Great Snail of the Causeway, the oldest joke in the margin. */
  private async snailRises(): Promise<void> {
    const d = this.director;
    const p = this.player;
    this.cutscene = true;
    this.goal = null;
    const art = greatSnailArt();
    const b = new Billboard(pixelTexture(art.a), art.w, art.h, { cols: art.a.w / art.w, rows: 1, anchor: art.anchor, emissive: pixelTexture(art.e) });
    b.flip = true;
    b.x = tiles(14.5);
    b.y = SNAIL_Y + 66;
    b.h = -70;
    this.r.scene.add(b.mesh);
    this.snail = b;
    this.letterbox.target = 1;
    d.take(this.r.view.x, this.r.view.y, this.r.view.h);
    d.shake(5, 1.6);
    p.emote('alarm');
    for (const a of this.party) a.dir = 'down';
    await d.panTo(...d.clamp(p.x, SNAIL_Y + 26), 1.4, 0);
    this.snailRise = 0;
    await d.wait(1.8);
    await this.dialogue.narrate({ en: 'The causeway heaves. Something the size of a cart hauls itself out of the shallows, streaming, its horns up like lances.', fr: 'La chaussée se soulève. Une chose grande comme une charrette se hisse hors des hauts-fonds, ruisselante, les cornes dressées comme des lances.' });
    await this.dialogue.say('isot', { en: 'That is a snail.', fr: 'C’est un escargot.' }, 'alarmed');
    await this.dialogue.say('knight', { en: 'In the margins, knights fight snails. It is the oldest joke there is.', fr: 'Dans les marges, les chevaliers combattent des escargots. C’est la plus vieille plaisanterie qui soit.' });
    await this.dialogue.say('hild', { en: 'And who wins, in the joke?', fr: 'Et qui gagne, dans la plaisanterie ?' }, 'stern');
    await this.dialogue.say('knight', { en: 'The snail.', fr: 'L’escargot.' });
    this.dialogue.close();
    this.hooks.battle?.('b1');
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
    // His pennon comes with him: white, with nothing on it.
    await this.found('blankPennon', { en: 'From his lance hangs a pennon with no device on it at all.', fr: 'À sa lance pend un fanion qui ne porte aucune devise.' });
    const eq = session.game.equipment.whit;
    if (eq && !eq.relic) eq.relic = 'blankPennon';
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
    if (free && !this.snail && this.met && this.party.includes(this.whit) && !session.game.cleared.includes('b1') && p.y > SNAIL_Y && this.hooks.battle) void this.snailRises();
    if (this.snail) {
      if (this.snailRise >= 0) this.snailRise = Math.min(1, this.snailRise + dt / 1.6);
      const k = 1 - Math.pow(1 - Math.max(0, this.snailRise), 3);
      this.snail.h = -70 + 66 * k;
      this.snail.setFrame(Math.floor(this.time / 0.32) % 4, 0);
      this.snail.sync();
    }

    this.director.update(dt);
    const [cx, cy] = this.director.active ? this.director.cam : this.director.clamp(p.x, p.y - 10);
    if (this.director.active) this.camH = this.director.cam[2];
    else this.camH += (p.h - this.camH) * Math.min(1, dt * 3);
    this.r.view.x = Math.round(cx);
    this.r.view.y = Math.round(cy);
    this.r.view.h = Math.round(this.camH);
    this.r.screen.fade = Math.max(this.fadeT, Math.max(0, 1 - this.time / 2.2));
    this.fadeT += (this.fadeTo - this.fadeT) * Math.min(1, dt * 1.5);
    for (const a of this.extras) a.update(dt);
    this.dialogue.update(dt);
    this.card.update(dt);
    this.letterbox.update(dt);
    this.stage.update(dt, this.time);
  }

  sync(): void {
    this.player.sync();
    for (const a of this.party) a.sync();
    if (!this.party.includes(this.whit)) this.whit.sync();
    for (const a of this.extras) {
      a.h = this.heightAt(a.x, a.y);
      a.sync();
    }
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
    this.snail?.dispose();
    for (const a of this.extras) a.dispose();
    this.player.dispose();
    for (const a of this.party) a.dispose();
    if (!this.party.includes(this.whit)) this.whit.dispose();
  }
}
