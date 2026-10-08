/**
 * Chapter III, scene 1: into the Blanchwood (DESIGN.md §3.6). The wood forgets itself as
 * the party walks east: the trees drain to grisaille, then to an ink outline on bare
 * vellum, the birds are drawn only in outline, and the music loses its notes. A
 * wodewose, a wild man of the woods frayed white, waits with a gryllus at its heel (F5).
 */

import { BlanchwoodAmbience } from '../../audio/blanchwood';
import { hash2 } from '../../engine/noise';
import { CHARACTERS } from '../../pixel/characters';
import { rock } from '../../pixel/nature';
import { blanch, outlineBird } from '../../world3d/blanchwood';
import { relief } from '../../world3d/relief';
import { tiles } from '../../world3d/stage';
import { pedlar } from '../gervase';
import type { MapDef, Rect } from '../types';
import { blanchedTree, blanchingGround, setDepth, WOOD_GROUND, WOOD_SKY, woodDepth, woodLight } from './common';

const W = 48;
const H = 13;
/** How blanched the wood is at x (art pixels). */
const depthAt = (x: number) => Math.max(0, Math.min(1, (x / tiles(W) - 0.12) / 0.82)) * 0.62;
const GROUND = blanchingGround(W, H, (tx) => Math.max(0, (tx - 22) / 30), (_x, y) => y >= 6 && y <= 7, 31);
const PATH_Y = tiles(7);
// Gervase, at the edge, where the colour still holds.
const GERVASE = pedlar('woodsEdge', tiles(9.6), tiles(8.5), 'down');

// The wood climbs away from the path in two banks, the trees standing on them.
const HEIGHTS = relief(W, H, [
  { at: [0, 0, W, 5], h: 2, ragged: 's' },
  { at: [0, 0, W, 2], h: 3, ragged: 's' },
], 33);

export const WOOD: MapDef = {
  id: 'wood',
  caches: [
    {
      id: 'wood',
      x: tiles(20.6),
      y: tiles(10.6),
      pennies: 6,
      satchel: { salVolatile: 1 },
      note: { en: '“The wood forgets. Write on the bark, and it remembers a little longer.”', fr: '« Le bois oublie. Écris sur l’écorce, et il se souvient un peu plus longtemps. »' },
    },
  ],
  card: { title: { en: 'The Blanchwood', fr: 'La Blanchewood' }, line: { en: 'Where the colour goes first', fr: 'Là où la couleur s’en va d’abord' } },
  walkable: '.dv',
  ground: GROUND,
  heights: HEIGHTS,
  bounds: { minX: tiles(13.4), maxX: tiles(W - 13.4), minY: tiles(6.4), maxY: tiles(6.4) },
  camera: { h: 4 },
  ambience: () => new BlanchwoodAmbience({ depth: () => woodDepth() * 0.9 }),
  checkpoint: true,
  candle: false,
  spawns: {
    start: { x: tiles(2), y: PATH_Y, dir: 'right' },
    ninefold: { x: tiles(W - 2), y: PATH_Y, dir: 'left' },
  },
  build(r, st) {
    woodLight(r, 0);
    st.ground({ ground: GROUND, heights: HEIGHTS, seed: 33, palette: WOOD_GROUND });
    st.addSky({ ...WOOD_SKY }, 200);
    const posts: [number, number, number][] = [];
    const blocked: Rect[] = [];
    // The wood behind the path, thick, then the near trees, sparser and soft with depth.
    for (let i = 0; i < 20; i++) {
      const x = tiles(1) + i * tiles(2.45) + hash2(i, 1, 7) * 16;
      const y = tiles(3.1) + hash2(i, 2, 7) * 26;
      st.addImage(blanchedTree(i + 11, depthAt(x) * 1.25), x, y);
      posts.push([x, y, 5]);
      // Birds on the boughs, outlines only.
      if (i % 4 === 1) st.addImage(blanch(outlineBird(i), depthAt(x) * 0.8, i), x + 10, y - 2, { h: st.heightAt(x, y) + 36 + (i % 3) * 4, shadow: false });
    }
    for (let i = 0; i < 9; i++) {
      const x = tiles(3) + i * tiles(5.4) + hash2(i, 5, 7) * 20;
      const y = tiles(11.2) + hash2(i, 6, 7) * 14;
      st.addImage(blanchedTree(i + 41, depthAt(x) * 1.25), x, y);
    }
    for (const [x, y, s] of [
      [tiles(8), tiles(9.4), 2],
      [tiles(30), tiles(4.8), 3],
      [tiles(40), tiles(9.8), 4],
    ] as const)
      st.addImage(blanch(rock(s, 0.8), depthAt(x), s), x, y);
    st.addEmitter({ kind: 'mote', area: [0, tiles(1), tiles(W), tiles(11)], heights: [4, 60], count: 40, color: '#F4F0E6', size: 1.6, intensity: 0.4 }, 21);
    return { blocked, posts };
  },
  npcs: [{ id: 'wodewose', speaker: 'villager', spec: CHARACTERS.wodewose!, x: tiles(28.5), y: PATH_Y - 2, dir: 'left', fray: 0.25, when: (c) => !c.cleared('f5') }, GERVASE.npc],
  zones: [
    {
      id: 'wodewose',
      rect: [tiles(24), 0, tiles(3), tiles(H)],
      when: (c) => !c.cleared('f5'),
      run: async (c) => {
        c.letterbox(true);
        const w = c.npc('wodewose');
        c.shake(2, 0.5);
        c.emote(w, 'alarm');
        await c.narrate({ en: 'Out of the white between the trees steps a wodewose, a wild man of the woods, its hair gone the colour of the vellum. A gryllus scuttles at its heel.', fr: 'Du blanc entre les arbres sort un homme sauvage des bois, les poils devenus de la couleur du vélin. Un grylle trottine sur ses talons.' });
        await c.say('hild', { en: 'The wood’s own people. It’s frightened, child. It’s forgetting what it is.', fr: 'Le peuple même du bois. Il a peur, petite. Il oublie ce qu’il est.' }, 'grave');
        await c.say('whit', { en: 'It’s gathering itself, like the tide did. One round to swing, then it falls on the Front.', fr: 'Il se ramasse, comme la marée. Un tour pour prendre son élan, puis il s’abat sur l’Avant.' });
        c.battle('f5');
      },
    },
  ],
  things: [
    GERVASE.thing,
    {
      id: 'wren',
      x: tiles(15.2),
      y: tiles(4.6),
      h: 36,
      run: async (c) => {
        await c.say('isot', { en: 'A wren on the bough. Drawn in outline only. It doesn’t sing; it hasn’t the colour to.', fr: 'Un roitelet sur la branche. Dessiné au trait seulement. Il ne chante pas ; il n’a plus la couleur pour ça.' }, 'sad');
      },
    },
    {
      id: 'blank',
      x: tiles(38),
      y: tiles(8.6),
      h: 10,
      run: async (c) => {
        await c.say('isot', { en: 'The grass just stops, here. Not cut. Scraped. Like the end of a line nobody finished copying.', fr: 'L’herbe s’arrête net, ici. Pas coupée. Grattée. Comme la fin d’une ligne que personne n’a fini de copier.' });
        await c.say('whit', { en: 'It smells of nothing.', fr: 'Ça ne sent rien.' });
      },
    },
  ],
  exits: [{ rect: [tiles(W - 1), tiles(5), tiles(1), tiles(4)], to: 'ninefold', spawn: 'west' }],
  watch: (c) => {
    setDepth(c.r, depthAt(c.player.x));
    return null;
  },
  async enter(c, from) {
    setDepth(c.r, depthAt(c.player.x));
    if (from === 'start' && !c.flag('woodEntered')) {
      c.set('woodEntered');
      c.letterbox(true);
      await c.wait(1.6);
      await c.say('whit', { en: 'The leaves are the wrong colour. No. They’re no colour.', fr: 'Les feuilles n’ont pas la bonne couleur. Non. Elles n’ont pas de couleur.' });
      await c.say('hild', { en: 'The Blanchwood. It grew over Ninefold after the Scouring. It’s been forgetting itself ever since.', fr: 'La Blanchewood. Elle a poussé sur Ninefold après le Récurage. Elle s’oublie elle-même depuis.' }, 'grave');
      await c.say('isot', { en: 'It isn’t winter. It’s being scraped. Slowly, from the inside.', fr: 'Ce n’est pas l’hiver. On la gratte. Lentement, de l’intérieur.' }, 'alarmed');
      c.letterbox(false);
    }
    if (from === 'battle:f5' && !c.flag('wodewoseGone')) {
      c.set('wodewoseGone');
      c.letterbox(true);
      await c.narrate({ en: 'The wodewose sits down in the white. Its outline breaks, and then there is only the shape of where it was.', fr: 'L’homme sauvage s’assied dans le blanc. Son contour se rompt, puis il ne reste que la forme de l’endroit où il était.' });
      await c.say('isot', { en: 'It wasn’t angry. It was afraid of being forgotten.', fr: 'Il n’était pas en colère. Il avait peur d’être oublié.' }, 'sad');
      await c.say('whit', { en: 'So am I.', fr: 'Moi aussi.' });
      c.letterbox(false);
    }
  },
};
