/**
 * Chapter III, scene 5: Knell Chapel and the Danse Macabre mural (DESIGN.md §3.6, §7.3).
 * Ninefold's chapel to the Reader, spared because no Keeper dared scrape it. Along its
 * wall six panels show each living figure led by a Death, and they have slid out of
 * order. The inscription gives it: from the highest to the least the dance goes down.
 * Restored, the dance opens the ossuary stair, and teaches Isot that a correction can
 * point anywhere. One painted Death has no face, only a blank shield.
 */

import { bell, midiToHz } from '../../audio/instruments';
import { BlanchwoodAmbience } from '../../audio/blanchwood';
import { uiTick } from '../../audio/sfx';
import { session } from '../../engine/session';
import { localTextImage } from '../../pixel/font';
import { bench, candleStand, coffer } from '../../pixel/furniture';
import { hex, PixelImage, ramp } from '../../pixel/pixel';
import { GROUND_DEFAULT } from '../../pixel/terrain';
import type { Billboard } from '../../world3d/billboard';
import { MURAL_INSCRIPTION, MURAL_ORDER, type MuralFigure, muralPanel } from '../../world3d/blanchwood';
import { tiles } from '../../world3d/stage';
import { backWall, FLOOR, nightInterior, sideWall } from '../interior';
import type { MapContext, MapDef, Rect, Thing } from '../types';

const W = 22;
const GROUND = ['                      ', '                      ', ...Array.from({ length: 7 }, () => ' ffffffffffffffffffff '), '                      '];
const WALL_Y = tiles(2);
const SLOT_X = Array.from({ length: 6 }, (_, i) => tiles(3.3) + i * 52);
const STAIR: [number, number] = [tiles(11), tiles(6.4)];
/** How the panels hang when the party first comes in. */
const START_ORDER: MuralFigure[] = ['knight', 'child', 'pope', 'ploughman', 'king', 'merchant'];

let order: MuralFigure[] = [...START_ORDER];
let panels: Partial<Record<MuralFigure, Billboard>> = {};
let selected: number | null = null;
let stair: Billboard | null = null;

/** The stair down to the ossuary, opened in the floor. */
function stairImage(): PixelImage {
  const img = new PixelImage(30, 20);
  const stone = ramp('#8A8478', 5);
  for (let y = 0; y < 20; y++)
    for (let x = 0; x < 30; x++) {
      const step = Math.floor(y / 4);
      img.set(x, y, y % 4 === 0 ? stone[3 - Math.min(3, step)]! : hex('#141010'));
    }
  for (let y = 0; y < 20; y++) {
    img.set(0, y, stone[2]!);
    img.set(29, y, stone[1]!);
  }
  return img;
}

const solved = () => order.every((f, i) => f === MURAL_ORDER[i]);

function panelThing(i: number): Thing {
  return {
    id: `panel-${i}`,
    x: SLOT_X[i]!,
    y: WALL_Y + 18,
    h: 46,
    reach: 22,
    when: (c) => !c.flag('muralRestored'),
    run: async (c) => {
      uiTick(c.audio, true);
      if (selected === null) {
        selected = i;
        highlight();
        if (!c.flag('muralTried')) {
          c.set('muralTried');
          await c.say('isot', { en: 'The plaster’s cracked round each panel. They’ll slide. Which one goes where?', fr: 'Le plâtre est fendu autour de chaque panneau. Ils glissent. Lequel va où ?' });
        }
        return;
      }
      if (selected === i) {
        selected = null;
        highlight();
        return;
      }
      const a = selected;
      selected = null;
      await swap(c, a, i);
      highlight();
      if (solved()) await restored(c);
    },
  };
}

function highlight(): void {
  order.forEach((f, i) => {
    const b = panels[f];
    if (b) b.flash = i === selected ? 0.45 : 0;
  });
}

async function swap(c: MapContext, a: number, b: number): Promise<void> {
  const pa = panels[order[a]!]!;
  const pb = panels[order[b]!]!;
  const xa = SLOT_X[a]!;
  const xb = SLOT_X[b]!;
  for (let k = 1; k <= 8; k++) {
    const t = k / 8;
    pa.x = xa + (xb - xa) * t;
    pb.x = xb + (xa - xb) * t;
    pa.h = 16 + Math.sin(t * Math.PI) * 6;
    pb.h = 16 + Math.sin(t * Math.PI) * 6;
    pa.sync();
    pb.sync();
    await c.wait(0.04);
  }
  [order[a], order[b]] = [order[b]!, order[a]!];
}

async function restored(c: MapContext): Promise<void> {
  c.set('muralRestored');
  c.letterbox(true);
  const ctx = c.audio.ctx;
  if (ctx) {
    bell(ctx, c.audio.bus('sfx'), midiToHz(52), ctx.currentTime, 0.4, 8);
    bell(ctx, c.audio.reverbIn, midiToHz(52), ctx.currentTime, 0.35, 8);
  }
  c.flash(0.4);
  c.shake(2, 0.8);
  await c.narrate({ en: 'The six Deaths take their partners’ hands, all in one line, from the highest to the least. In the floor before the altar, a stair opens into the dark.', fr: 'Les six Morts prennent la main de leurs partenaires, tous sur une seule ligne, du plus haut au plus petit. Dans le sol devant l’autel, un escalier s’ouvre sur le noir.' });
  if (stair) stair.visible = true;
  await c.say('isot', { en: 'Each Death leads the next one down. A correction can point anywhere. Not only away from us.', fr: 'Chaque Mort conduit la suivante vers le bas. Une correction peut pointer n’importe où. Pas seulement loin de nous.' });
  c.set('emendUpgraded');
  c.card({ en: 'Emend', fr: 'Corriger' }, { en: 'Isot · A blow can now be turned onto another enemy (2 Ink).', fr: 'Isot · Un coup peut maintenant être détourné sur un autre ennemi (2 Encre).' });
  await c.wait(2.4);
  await c.say('isot', { en: 'That one. The knight’s Death. It has no face, only a blank shield.', fr: 'Celle-là. La Mort du chevalier. Elle n’a pas de visage, seulement un bouclier blanc.' });
  const w = c.party.find((a) => a.id === 'whit');
  if (w) w.emote('silence', 2.2);
  await c.say('isot', { en: 'That one’s not finished.', fr: 'Celle-là n’est pas finie.' });
  await c.say('hild', { en: 'Let’s go down.', fr: 'Descendons.' }, 'grave');
  c.letterbox(false);
}

export const CHAPEL: MapDef = {
  id: 'chapel',
  caches: [
    {
      id: 'chapel',
      x: tiles(19.4),
      y: tiles(7.8),
      hidden: true,
      pennies: 6,
      satchel: { waxSeal: 2 },
      note: { en: '“The Reader came here once a year, they say, and nobody was afraid of him.”', fr: '« Le Lecteur venait ici une fois l’an, dit-on, et personne n’avait peur de lui. »' },
    },
  ],
  card: { title: { en: 'Knell Chapel', fr: 'La chapelle du Glas' }, line: { en: 'The Reader’s house', fr: 'La maison du Lecteur' } },
  walkable: 'f',
  ground: GROUND,
  bounds: { minX: tiles(W / 2), maxX: tiles(W / 2), minY: tiles(4.1), maxY: tiles(4.1) },
  camera: { h: 4, zoom: 1.05 },
  ambience: () => new BlanchwoodAmbience({ depth: () => 1 }),
  checkpoint: true,
  candle: true,
  spawns: { door: { x: tiles(W / 2), y: tiles(8.4), dir: 'up' }, stair: { x: STAIR[0], y: STAIR[1] + 18, dir: 'up' } },
  build(r, st) {
    nightInterior(r, { ambient: 0.62, moon: 0.4 });
    r.grade = { ...r.grade, saturation: 0.6, exposure: 1.1 };
    st.ground({ ground: GROUND, heights: GROUND.map((row) => '0'.repeat(row.length)), seed: 51, palette: { ...GROUND_DEFAULT, stone: FLOOR.stone } });
    const windows = [{ x: tiles(1.4), w: 10, h: 22, top: 4 }, { x: tiles(W - 4.4), w: 10, h: 22, top: 4 }];
    backWall(st, tiles(1), tiles(1), tiles(W - 2), tiles(1), 92, { stone: '#A8A094', seed: 53, windows });
    sideWall(st, tiles(0.5), tiles(1), tiles(8), 92);
    sideWall(st, tiles(W - 1), tiles(1), tiles(8), 92);
    order = session.game.flags.muralRestored ? [...MURAL_ORDER] : [...START_ORDER];
    panels = {};
    selected = null;
    order.forEach((f, i) => {
      panels[f] = st.addImage(muralPanel(f), SLOT_X[i]!, WALL_Y + 1, { h: 16, shadow: false });
    });
    // The inscription under the mural, in the chapel’s single vermilion.
    const words = localTextImage([{ en: 'FROM THE HIGHEST TO THE LEAST', fr: 'DU PLUS GRAND AU PLUS PETIT' }, { en: 'THE DANCE GOES DOWN', fr: 'LA DANSE DESCEND' }], hex('#D8483A'))();
    st.addImage(words, tiles(W / 2), WALL_Y + 1, { h: 1, shadow: false, glow: words });
    // Pews for a congregation of nine thousand that never came back.
    for (const [x, y] of [
      [tiles(4.5), tiles(5.4)],
      [tiles(4.5), tiles(7.2)],
      [tiles(W - 4.5), tiles(5.4)],
      [tiles(W - 4.5), tiles(7.2)],
    ] as const)
      st.addArt(bench(48, Math.floor(x + y)), x, y);
    // The altar, its candles, and the stair that opens before it.
    st.addArt(coffer(9), tiles(W / 2), tiles(4.2));
    for (const dx of [-74, 74]) {
      st.addArt(candleStand(), tiles(W / 2) + dx, tiles(3.6));
      st.addCandle(tiles(W / 2) + dx, tiles(3.6), 29, 0.55, 70);
    }
    stair = st.addImage(stairImage(), STAIR[0], STAIR[1], { h: 0.4, shadow: false, anchor: [15, 10] });
    stair.mesh.rotation.x = -Math.PI / 2;
    stair.visible = false;
    const blocked: Rect[] = [[tiles(W / 2) - 12, tiles(4.2) - 5, 24, 6], ...[5.4, 7.2].flatMap((y) => [[tiles(4.5) - 24, tiles(y) - 4, 48, 5] as Rect, [tiles(W - 4.5) - 24, tiles(y) - 4, 48, 5] as Rect])];
    return { blocked };
  },
  things: [
    ...SLOT_X.map((_, i) => panelThing(i)),
    {
      id: 'inscription',
      x: tiles(W / 2),
      y: WALL_Y + 14,
      h: 12,
      reach: 26,
      when: (c) => !c.flag('muralRestored'),
      run: async (c) => {
        await c.say('isot', MURAL_INSCRIPTION);
        await c.say('isot', { en: 'Highest to least. Pope, then king, then… the order of the world, the way the old painters saw it.', fr: 'Du plus haut au plus petit. Le pape, puis le roi, puis… l’ordre du monde, comme le voyaient les vieux peintres.' }, 'wry');
      },
    },
  ],
  exits: [{ rect: [STAIR[0] - 14, STAIR[1] - 8, 28, 16], to: 'ossuary', spawn: 'stair', when: (c) => c.flag('muralRestored') }],
  async enter(c, from) {
    if (stair) stair.visible = c.flag('muralRestored');
    if (from === 'door' && !c.flag('chapelSeen')) {
      c.set('chapelSeen');
      c.letterbox(true);
      await c.wait(1);
      await c.say('isot', { en: 'Ninefold’s chapel to the Reader. They scraped the whole city and didn’t dare touch this.', fr: 'La chapelle du Lecteur, à Ninefold. Ils ont gratté toute la ville et n’ont pas osé toucher à celle-ci.' });
      await c.say('whit', { en: 'It’s very quiet. I like it here. I don’t know why.', fr: 'C’est très calme. J’aime bien, ici. Je ne sais pas pourquoi.' });
      c.letterbox(false);
    }
  },
};
