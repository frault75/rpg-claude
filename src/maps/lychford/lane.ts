/**
 * Chapter II, scene 1: Lychford Lane at Midwinter (DESIGN.md §3.5). Isot remembers
 * Wystan's lesson and learns Emend; three marginal hares shoot from the hedge (F3);
 * frayed pilgrims pass on the road to Varre.
 */

import { CHARACTERS } from '../../pixel/characters';
import { pineTree, reeds, rock } from '../../pixel/nature';
import { stoneCross } from '../../pixel/props';
import { relief } from '../../world3d/relief';
import { tiles } from '../../world3d/stage';
import { bareTree, snowHedge } from '../../world3d/lychford';
import { WinterAmbience } from '../../audio/winter';
import { pedlar } from '../gervase';
import type { MapContext, MapDef, Rect } from '../types';
import { SNOW_GROUND, snowfall, WINTER_SKY, winterDay } from './winter';

const W = 40;
const ROW = (s: string) => s.padEnd(W, s[s.length - 1]);
const GROUND = [
  ROW('nnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnn'),
  ROW('nnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnn'),
  ROW('nnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnn'),
  ROW('nnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnn'),
  ROW('nnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnn'),
  ROW('nnnnnnnnnnnnnnnnndddnnnnnnnnnnnnnnnnnnnn'),
  ROW('ddddddddddddddddddddddddddddddddddddddddd'),
  ROW('ddddddddddddddddddddddddddddddddddddddddd'),
  ROW('nnnddddnnnnnnnnnnnnnnnnnnnndddnnnnnnnnnnn'),
  ROW('nnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnn'),
  ROW('nnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnn'),
  ROW('nnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnn'),
  ROW('nnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnnn'),
];

const LANE_Y = tiles(7);
// Gervase, knotting this year's ribbon to the wayside cross.
const GERVASE = pedlar('lane', tiles(15.8), tiles(6.6), 'down');

// A sunken lane: a snowy bank behind the hedge and the fen rising beyond it, cut where a
// field track climbs out through the gateway.
const HEIGHTS = relief(W, GROUND.length, [
  { at: [0, 0, 17, 5], h: 2, ragged: 's' },
  { at: [20, 0, 20, 5], h: 2, ragged: 's' },
  { at: [17, 0, 3, 2], h: 2 },
  { at: [0, 0, 40, 2], h: 3, ragged: 's' },
], 71);

export const LANE: MapDef = {
  id: 'lane',
  card: { title: { en: 'Lychford', fr: 'Lychford' }, line: { en: 'The Lane, at Midwinter', fr: 'Le chemin, à la mi-hiver' } },
  walkable: 'dn',
  ground: GROUND,
  heights: HEIGHTS,
  bounds: { minX: tiles(13.4), maxX: tiles(W - 13.4), minY: tiles(6.4), maxY: tiles(6.4) },
  camera: { h: 4 },
  ambience: () => new WinterAmbience(),
  checkpoint: true,
  candle: false,
  spawns: {
    start: { x: tiles(2), y: LANE_Y, dir: 'right' },
    village: { x: tiles(W - 2), y: LANE_Y, dir: 'left' },
  },
  build(r, st) {
    winterDay(r);
    st.ground({ ground: GROUND, heights: HEIGHTS, seed: 71, palette: SNOW_GROUND });
    st.addSky({ ...WINTER_SKY }, 200);
    const blocked: Rect[] = [];
    // Hedges along the lane, broken by gateways; a hedge close to the camera, soft.
    for (let x = 0; x < tiles(W); x += 44) {
      if (Math.abs(x - tiles(18)) < 30) continue;
      st.addImage(snowHedge(44, x), x + 22, tiles(5.6));
      blocked.push([x, tiles(5.3), 44, 6]);
    }
    for (let x = 10; x < tiles(W); x += 60) st.addImage(snowHedge(50, x + 7), x + 25, tiles(11.6), { solid: 48 });
    // Bare trees of the fen behind, a few pines.
    for (let i = 0; i < 12; i++) {
      const x = tiles(1.5) + i * tiles(3.3) + ((i * 37) % 19);
      st.addImage(bareTree(i + 3, 0.8 + ((i * 13) % 5) / 10), x, tiles(3.2) + ((i * 29) % 13));
    }
    for (const x of [tiles(9), tiles(24), tiles(33)]) st.addImage(pineTree(Math.floor(x), true), x, tiles(2.4));
    st.addArt(stoneCross(5), tiles(14), tiles(5.4));
    blocked.push([tiles(14) - 5, tiles(5.4) - 3, 10, 4]);
    st.addImage(rock(6, 0.7), tiles(28), tiles(9.6));
    st.addImage(reeds(4, '#A89A6A'), tiles(5), tiles(9.4), { solid: false });
    st.addImage(reeds(8, '#A89A6A'), tiles(31), tiles(4.6), { solid: false });
    snowfall(st, tiles(W), tiles(13), 80);
    return { blocked };
  },
  npcs: [
    { id: 'pilgrimA', speaker: 'pilgrim', spec: CHARACTERS.villager!, x: tiles(W + 2), y: LANE_Y - 4, dir: 'left', fray: 0.45, when: (c) => c.cleared('f3') && !c.flag('pilgrimsPassed') },
    { id: 'pilgrimB', speaker: 'pilgrim', spec: CHARACTERS.goodwife!, x: tiles(W + 3), y: LANE_Y + 6, dir: 'left', fray: 0.55, when: (c) => c.cleared('f3') && !c.flag('pilgrimsPassed') },
    { id: 'pilgrimC', speaker: 'pilgrim', spec: CHARACTERS.amabel!, x: tiles(W + 4), y: LANE_Y, dir: 'left', fray: 0.65, when: (c) => c.cleared('f3') && !c.flag('pilgrimsPassed') },
    GERVASE.npc,
  ],
  zones: [
    {
      id: 'hares',
      rect: [tiles(16), 0, tiles(4), tiles(13)],
      when: (c) => !c.cleared('f3'),
      run: async (c) => {
        c.letterbox(true);
        c.shake(2, 0.3);
        c.emote(c.player, 'alarm');
        await c.say('whit', { en: 'Down! In the hedge: bows.', fr: 'À terre ! Dans la haie : des arcs.' });
        await c.narrate({ en: 'Three hares stand up out of the snow, longbows drawn, as in the margins where the hunted hunt the hunters.', fr: 'Trois lièvres se dressent dans la neige, arcs bandés, comme dans les marges où le gibier chasse les chasseurs.' });
        await c.say('hild', { en: 'They aim at the back of the line. At you, child.', fr: 'Ils visent l’arrière de la file. Toi, petite.' }, 'stern');
        await c.say('isot', { en: 'Then I’ll turn their arrows. A small mark above, the true word between.', fr: 'Alors je détournerai leurs flèches. Une petite marque au-dessus, le vrai mot entre.' }, 'stern');
        c.battle('f3');
      },
    },
  ],
  things: [
    {
      id: 'cross',
      x: tiles(14),
      y: tiles(5.6),
      h: 26,
      run: async (c) => {
        await c.say('isot', { en: 'A wayside cross. Someone has tied a ribbon to it for every year of the Mercy. Ten.', fr: 'Une croix de chemin. Quelqu’un y a noué un ruban pour chaque année de la Miséricorde. Dix.' }, 'sad');
      },
    },
    GERVASE.thing,
  ],
  exits: [{ rect: [tiles(W - 1), tiles(5), tiles(1), tiles(4)], to: 'village', spawn: 'lane' }],
  async enter(c, from) {
    if (from === 'start' && !c.flag('learnedEmend')) {
      c.letterbox(true);
      await c.wait(1.8);
      await c.say('hild', { en: 'Lychford. The first village I nursed through the Grey Sweat. I haven’t seen it in ten years.', fr: 'Lychford. Le premier village que j’ai soigné pendant la Suée grise. Je ne l’ai pas revu depuis dix ans.' }, 'grave');
      await c.say('isot', { en: 'Wystan used to say: never scrape, Isot. Emend.', fr: 'Wystan disait : ne gratte jamais, Isot. Amende.' }, 'sad');
      await c.say('isot', { en: '“A small mark above, the true word between. The mistake stays visible. That’s the honesty of it.”', fr: '« Une petite marque au-dessus, le vrai mot entre. L’erreur reste visible. C’est ça, l’honnêteté. »' }, 'sad');
      c.set('learnedEmend');
      c.letterbox(false);
      await c.learn('isot', 'emend');
    }
    if (from === 'battle:f3' && !c.flag('pilgrimsPassed')) await pilgrims(c);
  },
};

/** Frayed pilgrims on the road to Varre. */
async function pilgrims(c: MapContext): Promise<void> {
  c.letterbox(true);
  const p = c.player;
  const walkers = ['pilgrimA', 'pilgrimB', 'pilgrimC'].map((id) => c.npc(id));
  walkers.forEach((a, i) => {
    a.x = p.x + 90 + i * 16;
    a.y = LANE_Y - 4 + i * 5;
    a.speed = 26;
  });
  c.face(p, 'right');
  await Promise.all(walkers.map((a, i) => c.walk(a, [[p.x + 34 + i * 14, a.y]])));
  await c.say('isot', { en: 'Where are you going, in this cold?', fr: 'Où allez-vous, par ce froid ?' });
  await c.say('pilgrim', { en: 'Varre, sister. Over the border. They say in Varre you can still be… finished.', fr: 'À Varre, ma sœur. De l’autre côté de la frontière. On dit qu’à Varre on peut encore être… fini.' });
  await c.say('pilgrim', { en: 'We’re fraying, see. It doesn’t hurt. It’s like being a word on a page somebody keeps rubbing.', fr: 'On s’effiloche, vois-tu. Ça ne fait pas mal. C’est comme être un mot sur une page que quelqu’un frotte sans arrêt.' });
  c.emote(c.party[0] ?? p, 'silence', 2);
  await c.say('hild', { en: 'Go carefully. The Order keeps the weir.', fr: 'Allez prudemment. L’Ordre garde le barrage.' }, 'grave');
  // They go on west, slowly; the road is hers again before they are out of sight.
  for (const a of walkers) void c.walk(a, [[-60, a.y]]);
  await c.wait(2.4);
  c.set('pilgrimsPassed');
  c.letterbox(false);
}
