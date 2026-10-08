/**
 * Chapter III, scene 2: Ninefold Blank and the Faded Path (DESIGN.md §3.6, §7.3). The wood
 * opens on a field of blank vellum where a city of nine thousand stood. The road has
 * faded with it; only the raking light shows the ghost of the old path, and the streets
 * and doorways around it, and the words left on them, which tell the story of the
 * Scouring. A wrong step folds the page back to where the path last held. Off a side
 * street, a hermit's ruin keeps two Lost Names.
 */

import { BlanchwoodAmbience } from '../../audio/blanchwood';
import { fizzleSound } from '../../audio/battleSfx';
import { hash2 } from '../../engine/noise';
import { session } from '../../engine/session';
import { textImage } from '../../pixel/font';
import { ashlar, newArt } from '../../pixel/buildings';
import { hex } from '../../pixel/pixel';
import { blanch, ghostFacade, ghostStreet, pathStone, SEPIA } from '../../world3d/blanchwood';
import { tiles } from '../../world3d/stage';
import type { MapContext, MapDef, Underwriting } from '../types';
import { blanchedTree, setDepth, WOOD_GROUND, WOOD_SKY, woodLight } from './common';

const W = 40;
const H = 16;
const GROUND = Array.from({ length: H }, (_, y) => Array.from({ length: W }, (_, x) => (x < 2 && hash2(x, y, 4) > 0.3 ? '.' : 'v')).join(''));

/** The old road across the city, and the side street to the hermit's ruin (tiles). */
const ROADS: [number, number][][] = [
  [
    [2, 8],
    [8, 8],
    [10.5, 4.5],
    [16, 4.5],
    [18.5, 11],
    [24, 11],
    [26.5, 6.5],
    [32, 6.5],
    [34.5, 8.5],
    [38.6, 8.5],
  ],
  [
    [16, 4.5],
    [17.5, 2],
    [21, 2],
  ],
].map((road) => road.map(([x, y]) => [tiles(x), tiles(y)] as [number, number]));

function distToRoads(x: number, y: number): number {
  let best = Infinity;
  for (const road of ROADS)
    for (let i = 0; i < road.length - 1; i++) {
      const [ax, ay] = road[i]!;
      const [bx, by] = road[i + 1]!;
      const t = Math.max(0, Math.min(1, ((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / ((bx - ax) ** 2 + (by - ay) ** 2)));
      best = Math.min(best, Math.hypot(x - (ax + (bx - ax) * t), y - (ay + (by - ay) * t)));
    }
  return best;
}

const GHOST = SEPIA;

const STONES: Underwriting[] = [];
ROADS.forEach((road, r) => {
  for (let i = 0; i < road.length - 1; i++) {
    const [ax, ay] = road[i]!;
    const [bx, by] = road[i + 1]!;
    const n = Math.max(1, Math.round(Math.hypot(bx - ax, by - ay) / 16));
    for (let k = 0; k < n; k++) {
      const t = (k + 0.5) / n;
      STONES.push({ id: `road-${r}-${i}-${k}`, x: ax + (bx - ax) * t, y: ay + (by - ay) * t, h: 0.5, flat: true, art: pathStone(i + k + r) });
    }
  }
});

/** The city around the road: house fronts in a row along each street, their doors and windows. */
const CITY: Underwriting[] = [];
for (let i = 0; i < 8; i++) CITY.push({ id: `house-n${i}`, x: tiles(3 + i * 4.6 + (i > 2 ? 2.4 : 0)), y: tiles(1.4), h: 0, art: ghostFacade(36 + (i % 3) * 6, 40 + (i % 2) * 8, i + 1, true) });
for (let i = 0; i < 7; i++) CITY.push({ id: `house-s${i}`, x: tiles(4 + i * 5.2), y: tiles(14.6), h: 0, art: ghostFacade(34 + (i % 2) * 8, 38, i + 20, true) });
for (const [i, x, y] of [
  [0, 5, 8],
  [1, 13, 4.5],
  [2, 21, 11],
  [3, 29, 6.5],
] as const)
  CITY.push({ id: `street-${i}`, x: tiles(x), y: tiles(y), h: 0.3, flat: true, art: ghostStreet(56, 18, i + 3, true), when: (c) => !!c.flag('seen.road-0-0-0') });

/** The words left on the walls, which tell the Scouring. */
const WORDS: Underwriting[] = [
  {
    id: 'word-gates',
    x: tiles(6),
    y: tiles(6.6),
    h: 14,
    art: textImage(['NINEFOLD', 'OF THE NINE GATES'], GHOST),
    revealed: async (c) => {
      await c.say('isot', { en: '“Ninefold, of the nine gates.” There was a city here. A whole city, and the wood grew over the page where it was written.', fr: '« Ninefold, aux neuf portes. » Il y avait une ville ici. Toute une ville, et le bois a poussé sur la page où elle était écrite.' }, 'alarmed');
    },
  },
  {
    id: 'word-bakers',
    x: tiles(13),
    y: tiles(3.2),
    h: 14,
    art: textImage(['BAKERS ROW'], GHOST),
    revealed: async (c) => {
      await c.say('whit', { en: 'Bakers’ Row. I think I can smell bread. No. I think I remember smelling bread.', fr: 'La rue des Boulangers. Je crois sentir le pain. Non. Je crois me souvenir d’avoir senti le pain.' });
    },
  },
  {
    id: 'word-dawn',
    x: tiles(21),
    y: tiles(9.8),
    h: 14,
    art: textImage(['THEY CAME WITH', 'THE PUMICE AT DAWN'], GHOST),
    revealed: async (c) => {
      await c.say('hild', { en: 'The Pumice Order. It was founded to undo forgeries in the Book. It ended the war by scouring the rebel city. Ebba’s Pumice, from end to end.', fr: 'L’ordre de la Ponce. Il fut fondé pour défaire les faux dans le Livre. Il a fini la guerre en récurant la ville rebelle. La Ponce d’Ebba, d’un bout à l’autre.' }, 'grave');
    },
  },
  {
    id: 'word-thousand',
    x: tiles(29),
    y: tiles(5.2),
    h: 14,
    art: textImage(['NINE THOUSAND', 'AND NOT ONE NAME LEFT'], GHOST),
    revealed: async (c) => {
      await c.say('isot', { en: 'Nine thousand. Wystan used to say a page can’t be blank, only scraped.', fr: 'Neuf mille. Wystan disait qu’une page ne peut pas être blanche, seulement grattée.' }, 'sad');
    },
  },
  {
    id: 'word-reader',
    x: tiles(36),
    y: tiles(7.2),
    h: 14,
    art: textImage(['READER', 'REMEMBER US'], hex('#B8302A', 235)),
    revealed: async (c) => {
      await c.say('isot', { en: 'In red chalk. A Glossator’s hand. “Reader, remember us.”', fr: 'À la craie rouge. Une main de Glossateur. « Lecteur, souviens-toi de nous. »' });
      await c.say('hild', { en: 'There’s a chapel past the gate. The Reader’s house. No Keeper ever dared scrape it.', fr: 'Il y a une chapelle passé la porte. La maison du Lecteur. Aucun Gardien n’a jamais osé la gratter.' }, 'grave');
    },
  },
];

/** The hermit's ruin: two walls and a hearth, and the cache of a Glossator. */
const HERMIT: [number, number] = [tiles(21.6), tiles(1.6)];
const NAMES: Underwriting[] = [
  { id: 'name-maud', x: HERMIT[0] - 10, y: HERMIT[1] + 4, h: 10, art: textImage(['MAUD OF THE MILL'], GHOST), lostName: 'maud' },
  { id: 'name-gervase', x: HERMIT[0] + 14, y: HERMIT[1] + 4, h: 18, art: textImage(['GERVASE', 'A PEDLAR OF RIBBONS'], GHOST), lostName: 'gervase' },
];

let lastHeld: [number, number] = ROADS[0]![0]!;
const ALL_POINTS = ROADS.flat();

export const NINEFOLD: MapDef = {
  id: 'ninefold',
  card: { title: { en: 'Ninefold Blank', fr: 'Ninefold la Blanche' }, line: { en: 'The Faded Path', fr: 'Le chemin effacé' } },
  walkable: '.v',
  ground: GROUND,
  bounds: { minX: tiles(13.4), maxX: tiles(W - 13.4), minY: tiles(6.6), maxY: tiles(9.4) },
  camera: { h: 4 },
  ambience: () => new BlanchwoodAmbience({ depth: () => 0.72 }),
  checkpoint: true,
  candle: true,
  spawns: { west: { x: tiles(2.4), y: tiles(8), dir: 'right' }, gate: { x: tiles(W - 1.4), y: tiles(8.5), dir: 'left' } },
  build(r, st) {
    woodLight(r, 0.72);
    st.ground({ ground: GROUND, heights: GROUND.map((row) => '0'.repeat(row.length)), seed: 37, palette: WOOD_GROUND });
    st.addSky({ ...WOOD_SKY, top: '#C8C8C0', horizon: '#F0EADC' }, 200);
    // The last trees, nearly gone, at the edge of the blank.
    for (const [i, y] of [tiles(1.6), tiles(4.4), tiles(12), tiles(15)].entries()) st.addImage(blanchedTree(i + 61, 0.7 + i * 0.05), tiles(-1.1 + (i % 2) * 0.4), y);
    // The city shows a little even without the candle: the faintest pentimento of its fronts.
    for (const u of CITY) {
      if (u.flat) continue;
      const b = st.addImage(u.art, u.x, u.y, { shadow: false, solid: false });
      b.opacity = 0.24;
    }
    // The hermit's ruin: two broken walls, half blanched.
    const wall = newArt(30, 18);
    ashlar(wall, 0, 0, 30, 18, { stone: '#B8B0A0', seed: 5 });
    for (let x = 0; x < 30; x++) for (let y = 0; y < Math.round(6 + Math.sin(x * 0.7) * 4 + hash2(x, 0, 2) * 4); y++) wall.a.set(x, y, [0, 0, 0, 0]);
    st.addImage(blanch(wall.a, 0.5, 3), HERMIT[0] - 14, HERMIT[1]);
    st.addImage(blanch(wall.a, 0.6, 4), HERMIT[0] + 16, HERMIT[1] + 2, { flip: true });
    st.addEmitter({ kind: 'mote', area: [0, 0, tiles(W), tiles(H)], heights: [2, 50], count: 30, color: '#F8F4EC', size: 1.4, intensity: 0.35 }, 23);
    return { blocked: [] };
  },
  underwriting: [...STONES, ...CITY, ...WORDS, ...NAMES],
  things: [
    {
      id: 'hearth',
      x: HERMIT[0],
      y: HERMIT[1] + 6,
      h: 8,
      reach: 26,
      run: async (c) => {
        await c.say('isot', { en: 'A hermit’s hearth. Someone lived here after the Scouring, alone in the blank, and wrote down whatever names they could still hear.', fr: 'Le foyer d’un ermite. Quelqu’un a vécu ici après le Récurage, seul dans le blanc, et a noté tous les noms qu’il entendait encore.' });
        if (session.game.lostNames.filter((n) => n === 'maud' || n === 'gervase').length < 2) await c.say('hild', { en: 'Tilt the candle. Glossators always leave more than one.', fr: 'Incline ta bougie. Les Glossateurs en laissent toujours plus d’un.' }, 'wry');
      },
    },
  ],
  exits: [{ rect: [tiles(W - 0.6), tiles(6), tiles(0.6), tiles(5)], to: 'gate', spawn: 'west' }],
  watch: (c) => (strayed(c) ? foldBack : null),
  async enter(c, from) {
    setDepth(c.r, 0.72);
    lastHeld = ROADS[0]![0]!;
    if (from === 'west' && !c.flag('blankSeen')) {
      c.set('blankSeen');
      c.letterbox(true);
      await c.wait(1.2);
      await c.say('isot', { en: 'There’s no road. There’s nothing. It’s just… page.', fr: 'Il n’y a pas de route. Il n’y a rien. C’est juste… de la page.' }, 'alarmed');
      await c.say('hild', { en: 'Then read it. Tilt the candle, child. Roads are only ink that people walked on.', fr: 'Alors lis-la. Incline ta bougie, petite. Les routes ne sont que de l’encre où les gens ont marché.' }, 'stern');
      c.letterbox(false);
    }
  },
};

/** Off the old road, the blank folds over her like a page turning. */
export function strayed(c: MapContext): boolean {
  const p = c.player;
  if (p.x < tiles(2.6) || p.x > tiles(W - 1.8)) return false;
  if (distToRoads(p.x, p.y) < 13) {
    for (const pt of ALL_POINTS) if (Math.hypot(pt[0] - p.x, pt[1] - p.y) < 14) lastHeld = pt;
    return false;
  }
  return true;
}

async function foldBack(c: MapContext): Promise<void> {
  c.flash(0.7);
  fizzleSound(c.audio);
  c.player.x = lastHeld[0];
  c.player.y = lastHeld[1];
  for (const a of c.party) {
    a.x = lastHeld[0] - 8;
    a.y = lastHeld[1];
  }
  if (!c.flag('foldedOnce')) {
    c.set('foldedOnce');
    await c.narrate({ en: 'The blank folds over her like a page turning, and she is back where the road last held.', fr: 'Le blanc se replie sur elle comme une page qu’on tourne, et la voilà revenue là où la route tenait encore.' });
  }
}
