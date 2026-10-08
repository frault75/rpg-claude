/**
 * Chapter IV, scenes 2 and 3: the Ivy Road (DESIGN.md §3.7, §7.4). At the Ivy Gate a caladrius
 * and two hares wait (F7, which teaches Read Aloud). Beyond it the Margin is made of the
 * borders of thousands of pages, and every way through is an arch of acanthus with a
 * scribe's catchword at its foot: the word that tells the binder which page comes next.
 * The right ones spell the Abbey motto, WHAT · IS · WRITTEN · IS · HELD. A wrong arch
 * turns the page back to the start of that stretch.
 */

import { fizzleSound } from '../../audio/battleSfx';
import { MarginAmbience } from '../../audio/margin';
import { uiTick } from '../../audio/sfx';
import { session } from '../../engine/session';
import { type LocalText, tr } from '../../i18n/i18n';
import { enemyStill } from '../../pixel/enemies';
import type { Billboard } from '../../world3d/billboard';
import { catchwordArch, goldBar, ivy } from '../../world3d/margin';
import { tiles } from '../../world3d/stage';
import type { MapContext, MapDef, Rect, Zone } from '../types';
import { acanthusRow, MARGIN_GROUND, MARGIN_SKY, marginLight, pageAbove } from './common';

const W = 64;
const H = 13;
const GROUND = Array.from({ length: H }, () => 'o'.repeat(W));
const ROAD_Y = tiles(6.5);
const GATE_X = tiles(12);

/**
 * The catchwords at each wall, in the player's language: the motto's word and two that are
 * not it. In French the motto is « Ce qui est écrit est retenu », so its first wall says CE QUI.
 */
const OPTIONS: LocalText[][] = [
  [{ en: 'WHO', fr: 'QUI' }, { en: 'WHAT', fr: 'CE QUI' }, { en: 'WHEN', fr: 'QUE' }],
  [{ en: 'WAS', fr: 'ETAIT' }, { en: 'SHALL', fr: 'SERA' }, { en: 'IS', fr: 'EST' }],
  [{ en: 'WRITTEN', fr: 'ECRIT' }, { en: 'SCRAPED', fr: 'GRATTE' }, { en: 'LOST', fr: 'PERDU' }],
  [{ en: 'NOT', fr: 'NE' }, { en: 'IS', fr: 'EST' }, { en: 'WAS', fr: 'ETAIT' }],
  [{ en: 'GONE', fr: 'PARTI' }, { en: 'READ', fr: 'LU' }, { en: 'HELD', fr: 'RETENU' }],
];
/** Which opening in each wall is the motto's. */
const RIGHT = [1, 2, 0, 1, 2];
/** The motto, as the arches spell it. */
export const MOTTO = OPTIONS.map((o, j) => o[RIGHT[j]!]!.en);
const JUNCTION_X = [20, 28, 36, 44, 52].map((x) => tiles(x));
/** The three openings in each wall of acanthus (tile rows of their middles). */
const OPENING_Y = [2.6, 6.5, 10.4];

function archZones(): Zone[] {
  const zones: Zone[] = [];
  JUNCTION_X.forEach((jx, j) => {
    OPTIONS[j]!.forEach((_, k) => {
      zones.push({
        id: `arch-${j}-${k}`,
        rect: [jx - 6, tiles(OPENING_Y[k]! - 0.7), 12, tiles(1.4)],
        when: (c) => c.flag('f7Done') && !c.flag(`cw${j}`) && (j === 0 || c.flag(`cw${j - 1}`)),
        run: (c) => throughArch(c, j, k),
      });
    });
  });
  return zones;
}

async function throughArch(c: MapContext, j: number, k: number): Promise<void> {
  const jx = JUNCTION_X[j]!;
  const word = tr(OPTIONS[j]![k]!);
  if (k === RIGHT[j]) {
    c.set(`cw${j}`);
    uiTick(c.audio, true);
    c.player.x = jx + 18;
    for (const a of c.party) a.x = jx + 8;
    if (j === MOTTO.length - 1) {
      c.letterbox(true);
      await c.say('isot', { en: 'What is written is held. They carved it over the scriptorium door. I used to read it every morning without looking.', fr: 'Ce qui est écrit est retenu. C’est gravé au-dessus de la porte du scriptorium. Je le lisais chaque matin sans le regarder.' }, 'wry');
      c.letterbox(false);
    }
    return;
  }
  c.flash(0.6);
  fizzleSound(c.audio);
  c.player.x = jx - tiles(3);
  c.player.y = ROAD_Y;
  for (const a of c.party) {
    a.x = jx - tiles(3.6);
    a.y = ROAD_Y;
  }
  await c.narrate({ en: `“${word}.” The page turns back on itself, and the arch is behind them again.`, fr: `« ${word} ». La page se retourne sur elle-même, et l’arche est de nouveau derrière eux.` });
}

export const IVY: MapDef = {
  id: 'ivy',
  caches: [
    {
      id: 'ivy',
      x: tiles(58.6),
      y: tiles(11.6),
      hidden: true,
      pennies: 8,
      satchel: { poultice: 2 },
      note: { en: '“What is written is held. What is held can be let go. Both are a kind of mercy, and only one of them is his.”', fr: '« Ce qui est écrit est retenu. Ce qui est retenu peut être relâché. Ce sont deux sortes de miséricorde, et une seule est la sienne. »' },
    },
  ],
  card: { title: { en: 'The Margin', fr: 'La Marge' }, line: { en: 'The Ivy Road', fr: 'Le chemin du Lierre' } },
  walkable: 'o',
  ground: GROUND,
  bounds: { minX: tiles(13.4), maxX: tiles(W - 13.4), minY: tiles(6.6), maxY: tiles(6.6) },
  camera: { h: 4 },
  ambience: () => new MarginAmbience(),
  checkpoint: true,
  candle: false,
  spawns: { west: { x: tiles(1.6), y: ROAD_Y, dir: 'right' }, fair: { x: tiles(W - 2), y: ROAD_Y, dir: 'left' } },
  build(r, st) {
    marginLight(r);
    st.ground({ ground: GROUND, heights: GROUND.map((row) => '0'.repeat(row.length)), seed: 73, palette: MARGIN_GROUND });
    st.addSky({ ...MARGIN_SKY }, 220);
    pageAbove(st, tiles(W));
    acanthusRow(st, 0, tiles(18), tiles(2.6), 11, 70);
    acanthusRow(st, tiles(2), tiles(W), tiles(13.8), 17, 110, 0.9);
    for (let x = 0; x < tiles(W); x += 90) st.addImage(goldBar(86, 14, x), x + 43, tiles(1.4));
    st.addImage(ivy(90, 3), GATE_X, tiles(4.2), { h: 24 });
    st.addImage(ivy(90, 5), GATE_X, tiles(9.6), { h: 24 });
    // The guardians of the Ivy Gate, until they are beaten.
    const still = (kind: string, x: number, y: number) => {
      const img = enemyStill(kind);
      if (img) gateGuards.push(st.addImage(img, x, y, { flip: true }));
    };
    gateGuards = [];
    if (!session.game.flags.f7Done) {
      still('caladrius', GATE_X + 18, ROAD_Y);
      still('hare', GATE_X + 26, ROAD_Y - 18);
      still('hare', GATE_X + 28, ROAD_Y + 16);
    }
    // The walls of acanthus with their catchword arches.
    const blocked: Rect[] = [];
    JUNCTION_X.forEach((jx, j) => {
      OPTIONS[j]!.forEach((word, k) => st.addImage(catchwordArch(tr(word), j * 3 + k), jx, tiles(OPENING_Y[k]! + 0.9), { solid: false }));
      const solid: [number, number][] = [
        [0, 1.9],
        [3.3, 5.8],
        [7.2, 9.7],
        [11.1, 13],
      ];
      for (const [a, b] of solid) blocked.push([jx - 6, tiles(a), 12, tiles(b - a)]);
    });
    st.addEmitter({ kind: 'glint', area: [0, tiles(1), tiles(W), tiles(12)], heights: [2, 60], count: 30, color: '#FFF4C8', size: 1.6, intensity: 1.2 }, 33);
    return { blocked };
  },
  zones: [
    {
      id: 'gate',
      rect: [GATE_X - tiles(1), 0, tiles(1.4), tiles(H)],
      when: (c) => !c.cleared('f7'),
      run: async (c) => {
        c.letterbox(true);
        await c.narrate({ en: 'At the Ivy Gate a white bird stands between two hares with bows. It looks at each of them in turn, and then, slowly, away from one of us.', fr: 'À la porte du Lierre, un oiseau blanc se tient entre deux lièvres armés d’arcs. Il regarde chacun d’eux tour à tour, puis, lentement, se détourne de l’un de nous.' });
        await c.say('hild', { en: 'A caladrius. In the bestiaries it looks away from those who are going to die.', fr: 'Un caladrius. Dans les bestiaires, il se détourne de ceux qui vont mourir.' }, 'grave');
        await c.say('whit', { en: 'It’s small. Small enough to read.', fr: 'Il est petit. Assez petit pour être lu.' });
        c.battle('f7');
      },
    },
    {
      id: 'catchwords',
      rect: [tiles(16), 0, tiles(1), tiles(H)],
      when: (c) => c.cleared('f7') && !c.flag('catchwordsSeen'),
      run: async (c) => {
        c.set('catchwordsSeen');
        c.letterbox(true);
        await c.say('isot', { en: 'Arches, each with a word at its foot. Catchwords: the word at the bottom of a page that tells the binder which page comes next.', fr: 'Des arches, chacune avec un mot au pied. Des réclames : le mot en bas d’une page qui dit au relieur quelle page vient ensuite.' });
        await c.say('isot', { en: 'Every border here was the margin of some page of the Abbey’s. What would the Abbey bind first?', fr: 'Chaque bordure ici était la marge d’une page de l’Abbaye. Qu’est-ce que l’Abbaye relierait en premier ?' }, 'wry');
        c.letterbox(false);
      },
    },
    ...archZones(),
  ],
  exits: [{ rect: [tiles(W - 0.6), tiles(4), tiles(0.6), tiles(6)], to: 'fair', spawn: 'west', when: (c) => c.flag('cw4') }],
  async enter(c, from) {
    if (from === 'battle:f7') {
      c.set('f7Done');
      for (const g of gateGuards) g.visible = false;
      c.letterbox(true);
      await c.say('whit', { en: 'It didn’t look away from me. Not once.', fr: 'Il ne s’est pas détourné de moi. Pas une fois.' });
      c.letterbox(false);
    }
  },
};

let gateGuards: Billboard[] = [];
