/**
 * Chapter IV, behind the Drollery Fair: the back lanes (DESIGN.md §3.14). Where the Fair
 * keeps what it isn't showing: the ape-scribes' copying stall, whose copyists copy the last
 * thing done to them (S3), and a straw skep on a bench whose bees have had no one to talk
 * to for a hundred and fifty years. In Hollin you tell the bees when someone dies.
 */

import { MarginAmbience } from '../../audio/margin';
import { session } from '../../engine/session';
import { CHARACTERS, drawCharacter, FRAMES } from '../../pixel/characters';
import { writingDesk } from '../../pixel/furniture';
import { isReturned, returnName } from '../../story/returns';
import type { Billboard } from '../../world3d/billboard';
import { goldBar, ivy, skep } from '../../world3d/margin';
import { relief } from '../../world3d/relief';
import { tiles } from '../../world3d/stage';
import type { MapContext, MapDef, Rect } from '../types';
import { acanthusRow, MARGIN_GROUND, MARGIN_SKY, marginLight, pageAbove } from './common';

const W = 34;
const H = 13;
const GROUND = Array.from({ length: H }, () => 'o'.repeat(W));
const HEIGHTS = relief(W, H, [
  { at: [0, 0, W, 3], h: 2, ragged: 's' },
  { at: [0, 0, W, 1], h: 3 },
], 79);
const STALL: [number, number] = [tiles(14), tiles(4.2)];
const SKEP: [number, number] = [tiles(28.4), tiles(5.4)];

let copyists: Billboard[] = [];

export const LANES: MapDef = {
  id: 'lanes',
  card: { title: { en: 'The Margin', fr: 'La Marge' }, line: { en: 'Behind the Fair', fr: 'Derrière la foire' } },
  walkable: 'o',
  ground: GROUND,
  heights: HEIGHTS,
  bounds: { minX: tiles(13.4), maxX: tiles(W - 13.4), minY: tiles(6.4), maxY: tiles(7.2) },
  camera: { h: 4 },
  ambience: () => new MarginAmbience(),
  checkpoint: true,
  candle: false,
  spawns: { fair: { x: tiles(4), y: tiles(1.2) + tiles(3), dir: 'down' } },
  caches: [
    {
      id: 'lanes',
      x: tiles(31.4),
      y: tiles(11),
      hidden: true,
      pennies: 12,
      satchel: { waxSeal: 1, salVolatile: 1 },
      note: { en: '“The apes copy everything. We let them copy our names once, to see. They came out backwards, and kind.”', fr: '« Les singes copient tout. Nous leur avons laissé copier nos noms une fois, pour voir. Ils sont sortis à l’envers, et gentils. »' },
    },
  ],
  build(r, st) {
    marginLight(r, 0.15);
    st.ground({ ground: GROUND, heights: HEIGHTS, seed: 79, palette: MARGIN_GROUND });
    st.addSky({ ...MARGIN_SKY }, 220);
    pageAbove(st, tiles(W));
    acanthusRow(st, 0, tiles(W), tiles(2.2), 83, 84);
    acanthusRow(st, tiles(1), tiles(W), tiles(13.4), 89, 120, 0.9);
    const blocked: Rect[] = [];
    // The backs of the Fair's stalls along the top, gold bars and ivy.
    for (let x = 0; x < tiles(W); x += 90) st.addImage(goldBar(86, 14, x + 3), x + 43, tiles(3.2));
    for (let x = tiles(2); x < tiles(W); x += 140) st.addImage(ivy(90, x + 5), x, tiles(12.2), { solid: false });
    // The copying stall: four desks under the awning.
    for (let i = 0; i < 4; i++) st.addArt(writingDesk(i + 40, { book: i % 2 === 1 }), STALL[0] - 30 + i * 22, STALL[1]);
    blocked.push([STALL[0] - 42, STALL[1] - 6, 92, 10]);
    // The copyists at their desks, until they are quieted.
    copyists = [];
    if (!session.game.cleared.includes('s3'))
      for (let i = 0; i < 3; i++) {
        const b = st.addImage(drawCharacter(CHARACTERS.apeScribe!, 'down', FRAMES[0]!), STALL[0] - 22 + i * 22, STALL[1] + 14, { solid: false });
        b.scale = CHARACTERS.apeScribe!.scale ?? 1;
        b.sync();
        copyists.push(b);
      }
    st.addImage(skep(3), SKEP[0], SKEP[1], { solid: 18 });
    st.addEmitter({ kind: 'firefly', area: [SKEP[0] - 20, SKEP[1] - 26, 40, 30], heights: [6, 30], count: 10, color: '#F4C840', size: 1.2, intensity: 1 }, 41);
    st.addEmitter({ kind: 'glint', area: [0, tiles(3), tiles(W), tiles(9)], heights: [2, 50], count: 20, color: '#FFF4C8', size: 1.5, intensity: 1 }, 43);
    return { blocked };
  },
  zones: [
    {
      id: 'copyists',
      rect: [STALL[0] - tiles(4), STALL[1], tiles(8), tiles(3.6)],
      when: (c) => !c.cleared('s3'),
      run: async (c) => {
        c.letterbox(true);
        await c.narrate({ en: 'At the copying stall three ape-scribes look up at once, quills raised, and copy the way Isot stops: the same foot, the same breath.', fr: 'À l’étal des copistes, trois singes scribes lèvent la tête en même temps, plume en l’air, et recopient la façon dont Isot s’arrête : le même pied, le même souffle.' });
        await c.say('isot', { en: 'They copy whatever is done to them. If we hit them, they’ll hit back just as hard, at whoever did it.', fr: 'Ils recopient tout ce qu’on leur fait. Si on les frappe, ils rendront le coup aussi fort, à celui qui l’a donné.' }, 'alarmed');
        await c.say('hild', { en: 'Then do them gently, or do them all at once.', fr: 'Alors vas-y doucement, ou fais-le d’un seul coup.' }, 'wry');
        c.letterbox(false);
        c.battle('s3');
      },
    },
  ],
  things: [{ id: 'skep', x: SKEP[0], y: SKEP[1] + 4, h: 20, reach: 28, run: (c) => bees(c) }],
  exits: [{ rect: [tiles(2.4), tiles(2.6), tiles(3.2), tiles(0.8)], to: 'fair', spawn: 'lanes' }],
  async enter(c, from) {
    if (from === 'battle:s3') {
      for (const b of copyists) b.visible = false;
      await c.say('isot', { en: 'They’ve gone back into the border. One of them copied my name onto its sleeve on the way. Backwards.', fr: 'Ils sont retournés dans la bordure. L’un d’eux a recopié mon nom sur sa manche en partant. À l’envers.' }, 'wry');
    } else if (from === 'fair' && !c.flag('lanesSeen')) {
      c.set('lanesSeen');
      await c.say('hild', { en: 'Every fair has a back. Mind your purse.', fr: 'Toute foire a son envers. Tiens bien ta bourse.' });
    }
  },
};

/** The skep: and Old Cutha, if his name was read in the Fair's alcove. */
async function bees(c: MapContext): Promise<void> {
  const g = session.game;
  if (isReturned(g, 'cutha')) {
    await c.narrate({ en: 'The bees go in and out of the skep in the gold light, busy, as if there were a summer to get ready for.', fr: 'Les abeilles entrent et sortent de la ruche dans la lumière dorée, affairées, comme s’il y avait un été à préparer.' });
    return;
  }
  await c.narrate({ en: 'A straw skep on a bench. The bees inside hum low, all on one note, and none of them comes out.', fr: 'Une ruche de paille sur un banc. Les abeilles, dedans, bourdonnent bas, toutes sur la même note, et aucune ne sort.' });
  await c.say('hild', { en: 'You tell the bees when someone dies. If you don’t, they pine, or they leave. Nobody has told these anything in a long time.', fr: 'On annonce les morts aux abeilles. Sinon elles dépérissent, ou elles s’en vont. Personne ne leur a rien dit depuis longtemps.' }, 'grave');
  if (!g.lostNames.includes('cutha')) return;
  const pick = await c.choose([
    { en: 'Tell the bees.', fr: 'Le dire aux abeilles.' },
    { en: 'Leave them be.', fr: 'Les laisser tranquilles.' },
  ]);
  if (pick !== 0) return;
  await c.narrate({ en: 'Isot kneels by the bench and puts her mouth to the little door.', fr: 'Isot s’agenouille près du banc, la bouche contre la petite porte.' });
  await c.say('isot', { en: 'Bees. Old Cutha, who kept you and told you everything, is gone. He was scraped, and nobody came to tell you. I’m telling you now.', fr: 'Abeilles. Le vieux Cutha, qui vous gardait et vous racontait tout, est parti. On l’a gratté, et personne n’est venu vous le dire. Je vous le dis maintenant.' }, 'sad');
  await c.wait(0.8);
  await c.narrate({ en: 'The hum changes. Then the bees come out into the gold, not angry, slowly, the way people come out of a church.', fr: 'Le bourdonnement change. Puis les abeilles sortent dans l’or, sans colère, lentement, comme les gens sortent d’une église.' });
  await c.say('whit', { en: 'Bees. I did not know one could tell them things.', fr: 'Des abeilles. Je ne savais pas qu’on pouvait leur dire des choses.' });
  await c.say('hild', { en: 'They’ll want telling about me next.', fr: 'La prochaine fois, il faudra leur parler de moi.' }, 'wry');
  await c.narrate({ en: 'On the bench, where nothing was, there is a comb of honey, still warm.', fr: 'Sur le banc, là où il n’y avait rien, il y a un rayon de miel, encore tiède.' });
  await returnName(c, 'cutha');
}
