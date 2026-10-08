/**
 * Chapter II, scene 4: the ringing chamber of Lychford's tower (DESIGN.md §7.2; C5). Four
 * ropes hang from four bells whose names have rusted off their plaques; the raking
 * light reads them: Morning, Singer, Weeper, Tenor. The children's rhyme gives the
 * order. A wrong order only makes a clangour. The right one rings the passing bell, for
 * the first time in ten years.
 */

import { lang } from '../../i18n/i18n';
import { bell, midiToHz } from '../../audio/instruments';
import { textImage } from '../../pixel/font';
import { coffer } from '../../pixel/furniture';
import { ghostText } from '../../pixel/underwriting';
import { hex, PixelImage, ramp } from '../../pixel/pixel';
import { GROUND_DEFAULT } from '../../pixel/terrain';
import { tiles } from '../../world3d/stage';
import { backWall, FLOOR, nightInterior, sideWall } from '../interior';
import { CHARACTERS } from '../../pixel/characters';
import { session } from '../../engine/session';
import { isReturned, returnName } from '../../story/returns';
import type { MapContext, MapDef, Rect, Thing } from '../types';

const GROUND = ['              ', '              ', ' wwwwwwwwwwww ', ' wwwwwwwwwwww ', ' wwwwwwwwwwww ', ' wwwwwwwwwwww ', ' wwwwwwwwwwww ', '              '];
const WALL_Y = tiles(2);

/** The four bells, left to right as their ropes hang, and their notes. */
const BELLS = [
  { id: 'morning', name: { en: 'MORNING', fr: 'MATIN' }, midi: 67 },
  { id: 'singer', name: { en: 'SINGER', fr: 'CHANTRE' }, midi: 64 },
  { id: 'weeper', name: { en: 'WEEPER', fr: 'LARME' }, midi: 62 },
  { id: 'tenor', name: { en: 'TENOR', fr: 'TENOR' }, midi: 55 },
] as const;
/** The rhyme's order: Weeper, Morning, Singer, and the Tenor last of all. */
export const RINGING_ORDER = ['weeper', 'morning', 'singer', 'tenor'] as const;
const ROPE_X = [tiles(3.6), tiles(5.9), tiles(8.2), tiles(10.5)];

/** A bell rope with its striped woollen sally. */
function rope(seed: number): PixelImage {
  const img = new PixelImage(6, 60);
  const hemp = ramp('#B89A6A', 4);
  for (let y = 0; y < 60; y++) {
    img.set(2, y, hemp[y % 3 === 0 ? 1 : 2]!);
    img.set(3, y, hemp[1]!);
  }
  const stripes = ['#C83A3A', '#2E4A8A', '#F4EEE0'];
  for (let y = 30; y < 44; y++) for (let x = 1; x < 5; x++) img.set(x, y, hex(stripes[Math.floor((y + seed) / 3) % 3]!));
  img.outline(null);
  return img;
}

let rung: string[] = [];

function ring(c: MapContext, i: number): void {
  const ctx = c.audio.ctx;
  if (!ctx) return;
  const b = BELLS[i]!;
  bell(ctx, c.audio.bus('sfx'), midiToHz(b.midi), ctx.currentTime, 0.35, 5);
  bell(ctx, c.audio.reverbIn, midiToHz(b.midi), ctx.currentTime, 0.25, 5);
}

const ropes: Thing[] = BELLS.map((b, i) => ({
  id: `rope-${b.id}`,
  x: ROPE_X[i]!,
  y: WALL_Y + 22,
  h: 46,
  reach: 18,
  when: (c) => !c.flag('bellRung'),
  run: async (c) => {
    ring(c, i);
    c.shake(1, 0.3);
    rung.push(b.id);
    const ok = RINGING_ORDER.slice(0, rung.length).every((id, k) => id === rung[k]);
    if (!ok) {
      rung = [];
      await c.wait(0.3);
      for (let k = 0; k < 4; k++) ring(c, k);
      c.shake(3, 0.8);
      await c.narrate({ en: 'A clangour of all four at once, out of order, and then the bells settle and are still.', fr: 'Un vacarme des quatre à la fois, dans le désordre, puis les cloches s’apaisent et se taisent.' });
      if (!c.flag('rhyme')) await c.say('isot', { en: 'There must be an order. Someone in the village will know it.', fr: 'Il doit y avoir un ordre. Quelqu’un au village le connaît.' }, 'tired');
      return;
    }
    if (rung.length === RINGING_ORDER.length) await passingBell(c);
  },
}));

export const BELLTOWER: MapDef = {
  id: 'belltower',
  caches: [
    {
      id: 'belltower',
      x: tiles(1.8),
      y: tiles(5.4),
      hidden: true,
      pennies: 10,
      satchel: { holyWater: 1 },
      note: { en: '“Thirty-nine bells came down the Abbey road in carts. We wrote down every one, and where it had hung.”', fr: '« Trente-neuf cloches sont descendues sur la route de l’abbaye, en charrettes. Nous les avons toutes notées, et l’endroit où elles pendaient. »' },
    },
  ],
  card: { title: { en: 'Lychford', fr: 'Lychford' }, line: { en: 'The Ringing Chamber', fr: 'La chambre des cloches' } },
  walkable: 'w',
  ground: GROUND,
  bounds: { minX: tiles(7), maxX: tiles(7), minY: tiles(3.9), maxY: tiles(3.9) },
  camera: { h: 4, zoom: 4 / 3 },
  candle: true,
  spawns: { door: { x: tiles(7), y: tiles(6.4), dir: 'up' } },
  // Dunstan climbs the stair at the sound of the bell.
  npcs: [{ id: 'dunstan', speaker: 'dunstan', spec: CHARACTERS.dunstan!, x: tiles(7), y: tiles(7.4), dir: 'up', when: (c) => c.flag('dunstanClimbed') }],
  build(r, st) {
    nightInterior(r, { ambient: 0.52, moon: 0.3 });
    st.ground({ ground: GROUND, heights: GROUND.map((row) => '0'.repeat(row.length)), seed: 95, palette: { ...GROUND_DEFAULT, wood: FLOOR.wood } });
    backWall(st, tiles(1), tiles(1), tiles(12), tiles(1), 72, { seed: 97, windows: [{ x: tiles(11.6) - tiles(1), w: 10, h: 22, top: 8 }] });
    sideWall(st, tiles(0.5), tiles(1), tiles(6), 72);
    sideWall(st, tiles(13), tiles(1), tiles(6), 72);
    st.addLight(tiles(7), tiles(4), 30, 110, '#FFE0B0', 0.45);
    const blocked: Rect[] = [];
    BELLS.forEach((b, i) => {
      st.addImage(rope(i), ROPE_X[i]!, WALL_Y + 10, { h: 2, solid: false });
      // Rusted plaques under each rope's hole, their names gone to the eye.
      const plaque = new PixelImage(28, 9);
      plaque.rect(0, 0, 28, 9, hex('#6A4A30'));
      for (let x = 1; x < 27; x++) for (let y = 1; y < 8; y++) plaque.set(x, y, hex((x * 7 + y * 3) % 5 ? '#8A5A3A' : '#5A3A28'));
      plaque.outline(null);
      st.addImage(plaque, ROPE_X[i]!, WALL_Y + 1, { h: 50, shadow: false });
      void b;
    });
    st.addArt(coffer(6), tiles(11.6), tiles(6.2));
    blocked.push([tiles(11.6) - 11, tiles(6.2) - 5, 22, 6]);
    return { blocked };
  },
  things: ropes,
  underwriting: [
    ...BELLS.map((b, i) => ({
      id: `plaque-${b.id}`,
      x: ROPE_X[i]!,
      y: WALL_Y + 2,
      h: 51,
      // In the player's language, so the skipping rhyme names what is on the wall.
      art: () => textImage([b.name[lang()]], hex('#F0D090', 240)),
    })),
    { id: 'name-hamo', x: tiles(2.2), y: WALL_Y + 2, h: 24, art: ghostText([{ en: 'HAMO', fr: 'HAMO' }, { en: 'THE BELLRINGER', fr: 'LE SONNEUR' }]), lostName: 'hamo' },
  ],
  exits: [{ rect: [tiles(5.5), tiles(6.8), tiles(3), tiles(0.4)], to: 'churchyard', spawn: 'tower', when: (c) => !c.flag('bellRung') }],
  async enter(c) {
    rung = [];
    if (!c.flag('towerSeen')) {
      c.set('towerSeen');
      await c.say('isot', { en: 'Four ropes. Four bells overhead. The names on the plaques have rusted away.', fr: 'Quatre cordes. Quatre cloches au-dessus. Les noms des plaques ont rouillé.' });
      await c.say('isot', { en: 'Rust is only scraping done slowly. The candle should read it.', fr: 'La rouille n’est qu’un grattage très lent. La bougie devrait la lire.' }, 'wry');
    }
  },
};

/** C5: the passing bell speaks for the first time in ten years. */
async function passingBell(c: MapContext): Promise<void> {
  c.set('bellRung');
  c.letterbox(true);
  const ctx = c.audio.ctx;
  for (let k = 0; k < 3; k++) {
    if (ctx) {
      bell(ctx, c.audio.bus('sfx'), midiToHz(43), ctx.currentTime, 0.6, 9);
      bell(ctx, c.audio.reverbIn, midiToHz(43), ctx.currentTime, 0.5, 9);
    }
    c.shake(4, 1.2);
    c.flash(0.25);
    await c.wait(2.2);
  }
  await c.narrate({ en: 'The passing bell. Its voice goes out over the snow, over the fen, for the first time in ten years.', fr: 'Le glas. Sa voix s’en va sur la neige, sur le marais, pour la première fois depuis dix ans.' });
  await c.say('whit', { en: 'I know that sound. Better than my own name. That isn’t hard.', fr: 'Je connais ce son. Mieux que mon propre nom. Ce n’est pas difficile.' });
  // The bell keeps its own clapper: it must ring again, at the end.
  await c.find('bellClapper', { en: 'On a hook in the ringing chamber hangs the bell’s old clapper, cracked and replaced long ago. Whit takes it down and weighs it in his hand.', fr: 'À un crochet de la chambre des cloches pend l’ancien battant de la cloche, fêlé, remplacé il y a longtemps. Whit le décroche et le soupèse.' });
  await dunstanClimbs(c);
  c.goto('village', 'church');
}

/** The sexton heard it from the village. If the bellringer's name was read on the plaques, it goes back to him. */
async function dunstanClimbs(c: MapContext): Promise<void> {
  c.set('dunstanClimbed');
  const d = c.npc('dunstan');
  await c.walk(d, [[tiles(7), tiles(6.2)]]);
  await c.say('dunstan', { en: 'Who rang it? I’ve had the key to this tower for ten years and not climbed it once.', fr: 'Qui l’a sonnée ? J’ai la clé de cette tour depuis dix ans et je n’y suis jamais monté.' });
  await c.say('dunstan', { en: 'There used to be someone who rang it. Big hands. He cried at weddings. I can’t…', fr: 'Il y avait quelqu’un qui la sonnait, avant. De grandes mains. Il pleurait aux mariages. Je ne…' });
  if (!session.game.lostNames.includes('hamo') || isReturned(session.game, 'hamo')) {
    await c.say('dunstan', { en: 'Never mind who. It’s rung.', fr: 'Peu importe qui. Elle a sonné.' });
    return;
  }
  const pick = await c.choose([
    { en: 'Give him the bellringer’s name.', fr: 'Lui rendre le nom du sonneur.' },
    { en: 'Say nothing.', fr: 'Ne rien dire.' },
  ]);
  if (pick !== 0) {
    await c.say('dunstan', { en: 'Never mind who. It’s rung.', fr: 'Peu importe qui. Elle a sonné.' });
    return;
  }
  await c.say('isot', { en: 'Hamo. It was written under the rust on the plaques. Hamo the bellringer, who rang the passing bell for the last time on the night of the Mercy.', fr: 'Hamo. C’était écrit sous la rouille des plaques. Hamo le sonneur, qui sonna le glas pour la dernière fois la nuit de la Miséricorde.' });
  await c.say('dunstan', { en: 'Hamo.', fr: 'Hamo.' });
  await c.say('dunstan', { en: 'He rang it for my father. I stood down there in the snow and hated him for it, for being so loud about it. Then he bought me a drink.', fr: 'Il l’a sonnée pour mon père. J’étais en bas dans la neige et je le détestais d’en faire tant de bruit. Et puis il m’a payé à boire.' });
  await c.narrate({ en: 'Dunstan takes out the Underbook, wets a stub of pencil, and writes, slowly, in the margin of the last page: HAMO, WHO RANG.', fr: 'Dunstan sort le Sous-Livre, mouille un bout de crayon et écrit, lentement, dans la marge de la dernière page : HAMO, QUI SONNAIT.' });
  await c.say('dunstan', { en: 'There. Now he’s somewhere. Here, scribe: a bit of his rope. He’d want it to go on being pulled.', fr: 'Voilà. Maintenant il est quelque part. Tiens, scribe : un bout de sa corde. Il voudrait qu’on continue de la tirer.' });
  await returnName(c, 'hamo');
}
