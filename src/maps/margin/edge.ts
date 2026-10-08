/**
 * Chapter IV, scene 1: the Edge (DESIGN.md §3.7; C9). The party walks out of the scraped wood
 * until the world runs out at the edge of the page. The camera pulls back, and the Margin
 * opens below: giant acanthus and ivy, bars of burnished gold, the page of Hollin hanging
 * over it like a sky. They step off the page, tiny among the leaves.
 */

import { MarginAmbience } from '../../audio/margin';
import { hash2 } from '../../engine/noise';
import { blanch, woodTree } from '../../world3d/blanchwood';
import { goldBar, ivy } from '../../world3d/margin';
import { tiles } from '../../world3d/stage';
import type { MapContext, MapDef } from '../types';
import { acanthusRow, MARGIN_GROUND, MARGIN_SKY, marginLight, pageAbove } from './common';

const W = 40;
const H = 14;
const EDGE = 21;
const GROUND = Array.from({ length: H }, () => Array.from({ length: W }, (_, x) => (x <= EDGE ? 'v' : 'o')).join(''));
const HEIGHTS = Array.from({ length: H }, () => Array.from({ length: W }, (_, x) => (x <= EDGE ? '6' : '0')).join(''));

let stepped = false;

export const EDGE_MAP: MapDef = {
  id: 'edge',
  caches: [
    {
      id: 'edge',
      x: tiles(30.5),
      y: tiles(12.4),
      pennies: 8,
      satchel: { gallInk: 1 },
      note: { en: '“Past here the page runs out. Mind your feet: the margin is deeper than it looks.”', fr: '« Passé ce point, la page s’arrête. Gare à tes pieds : la marge est plus profonde qu’elle n’en a l’air. »' },
    },
  ],
  card: { title: { en: 'The Margin', fr: 'La Marge' }, line: { en: 'Off the page', fr: 'Hors de la page' } },
  walkable: 'vo',
  ground: GROUND,
  heights: HEIGHTS,
  bounds: { minX: tiles(13.4), maxX: tiles(W - 13.4), minY: tiles(6.6), maxY: tiles(6.6) },
  camera: { h: 4 },
  ambience: () => new MarginAmbience({ until: () => stepped }),
  checkpoint: true,
  candle: false,
  spawns: { start: { x: tiles(3), y: tiles(7), dir: 'right' }, below: { x: tiles(EDGE + 3), y: tiles(7), dir: 'right' } },
  build(r, st) {
    marginLight(r);
    st.ground({ ground: GROUND, heights: HEIGHTS, seed: 71, palette: { ...MARGIN_GROUND, rock: '#D8CCB0', cliffTop: '#D8CEB6' } });
    st.addSky({ ...MARGIN_SKY }, 220);
    pageAbove(st, tiles(W));
    // The last of the scraped wood: ink outlines on blank vellum.
    for (let i = 0; i < 8; i++) st.addImage(blanch(woodTree(i + 171), 0.9 + (i % 3) * 0.03, i), tiles(1.5 + i * 2.6), tiles(2.4 + (i % 2) * 8.6) + hash2(i, 1, 4) * 10, { h: 48 });
    // Below the edge: the Margin.
    acanthusRow(st, tiles(EDGE + 2), tiles(W), tiles(3.4), 3, 74, 1.1);
    acanthusRow(st, tiles(EDGE + 4), tiles(W), tiles(13.6), 8, 96, 0.9);
    for (let x = tiles(EDGE + 1); x < tiles(W); x += 90) st.addImage(goldBar(86, 14, x), x + 43, tiles(5.2));
    for (let x = tiles(EDGE + 1); x < tiles(W); x += 84) st.addImage(ivy(80, x), x + 40, tiles(10.4), { solid: false });
    st.addEmitter({ kind: 'glint', area: [tiles(EDGE), tiles(1), tiles(W - EDGE), tiles(12)], heights: [2, 60], count: 22, color: '#FFF4C8', size: 1.6, intensity: 1.2 }, 31);
    return { blocked: [] };
  },
  zones: [
    {
      id: 'edge',
      rect: [tiles(EDGE - 2), 0, tiles(2), tiles(H)],
      when: (c) => !c.flag('steppedOff'),
      run: (c) => offThePage(c),
    },
  ],
  exits: [{ rect: [tiles(W - 0.6), tiles(4), tiles(0.6), tiles(6)], to: 'ivy', spawn: 'west' }],
  async enter(c, from) {
    stepped = c.flag('steppedOff');
    if (from === 'start' && !c.flag('edgeSeen')) {
      c.set('edgeSeen');
      c.letterbox(true);
      await c.wait(1.2);
      await c.narrate({ en: 'Beyond the chapel, the scraped wood thins to a few lines of ink, and then to nothing at all.', fr: 'Au-delà de la chapelle, le bois gratté s’amincit en quelques traits d’encre, puis en rien du tout.' });
      c.letterbox(false);
    }
  },
};

/** C9: off the page. */
async function offThePage(c: MapContext): Promise<void> {
  c.set('steppedOff');
  c.letterbox(true);
  await c.say('isot', { en: 'The page ends. There’s an edge. The world has an edge.', fr: 'La page s’arrête. Il y a un bord. Le monde a un bord.' }, 'alarmed');
  stepped = true;
  await c.pan(tiles(31), tiles(7), 3, 30);
  await c.narrate({ en: 'Below the last ruled line lies the Margin: acanthus taller than towers, ivy in scrolls, bars of burnished gold, and drolleries everywhere, all of it bright as the first morning of a book.', fr: 'Sous la dernière ligne réglée s’étend la Marge : des acanthes plus hautes que des tours, du lierre en volutes, des barres d’or bruni, et des drôleries partout, tout cela éclatant comme le premier matin d’un livre.' });
  await c.say('whit', { en: 'It’s very large.', fr: 'C’est très grand.' });
  await c.say('hild', { en: 'Larger than my cell.', fr: 'Plus grand que ma cellule.' }, 'grave');
  await c.narrate({ en: 'Isot steps off first. Hild takes Whit’s hand.', fr: 'Isot descend la première. Hild prend la main de Whit.' });
  c.flash(0.8);
  c.player.x = tiles(EDGE + 3);
  c.player.y = tiles(7);
  c.party.forEach((a, i) => {
    a.x = tiles(EDGE + 2 - i * 0.7);
    a.y = tiles(7);
  });
  c.release();
  await c.wait(0.8);
  c.letterbox(false);
}
