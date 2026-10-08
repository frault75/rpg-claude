/**
 * Chapter III, off the path: the Charcoal Hollow (DESIGN.md §3.14). A clearing in the
 * Blanchwood where the burners' kilns still smoulder, a hundred and fifty years after the
 * burners were scraped; near the fires the wood keeps its colour. A wodewose mother keeps
 * the kiln sparks as her young (S2). The hermit of Ninefold rakes the kilns; he has kept
 * them lit all this time for someone who will want to find her way back in the dark.
 */

import { BlanchwoodAmbience } from '../../audio/blanchwood';
import { hash2 } from '../../engine/noise';
import { session } from '../../engine/session';
import { CHARACTERS, drawCharacter, FRAMES } from '../../pixel/characters';
import { enemyStill } from '../../pixel/enemies';
import { isReturned, returnName } from '../../story/returns';
import type { Billboard } from '../../world3d/billboard';
import { kiln, leanTo } from '../../world3d/hollow';
import { relief } from '../../world3d/relief';
import { tiles } from '../../world3d/stage';
import type { MapContext, MapDef, Rect } from '../types';
import { blanchedTree, WOOD_GROUND, WOOD_SKY, woodLight } from './common';

const W = 34;
const H = 14;
const KILNS: [number, number, number][] = [
  [12.5, 5.6, 48],
  [18.5, 4.6, 52],
  [16, 9.6, 44],
];
const HERMIT: [number, number] = [tiles(24.2), tiles(6.8)];
const HUT: [number, number] = [tiles(26.6), tiles(4.2)];
/** How far from the fires: the wood blanches with it. */
const cold = (x: number, y: number) => Math.min(...KILNS.map(([kx, ky]) => Math.hypot(x + 0.5 - kx, (y + 0.5 - ky) * 1.3))) / 14;
const GROUND = Array.from({ length: H }, (_, y) =>
  Array.from({ length: W }, (_, x) => {
    if (hash2(x, y, 41) < Math.max(0, cold(x, y) - 0.25) * 1.6) return 'v';
    return (y >= 6 && y <= 7 && x < 10) || cold(x, y) < 0.16 ? 'd' : '.';
  }).join(''),
);
const HEIGHTS = relief(W, H, [
  { at: [0, 0, W, 3], h: 2, ragged: 's' },
  { at: [0, 0, W, 1], h: 3 },
  { at: [0, 12, W, 2], h: 1, ragged: 'n' },
], 47);

let wild: Billboard[] = [];

export const HOLLOW: MapDef = {
  id: 'hollow',
  card: { title: { en: 'The Blanchwood', fr: 'Le Bois-Blanc' }, line: { en: 'The Charcoal Hollow', fr: 'La combe aux charbonniers' } },
  walkable: '.dv',
  ground: GROUND,
  heights: HEIGHTS,
  bounds: { minX: tiles(13.4), maxX: tiles(W - 13.4), minY: tiles(6.4), maxY: tiles(7.6) },
  camera: { h: 4 },
  ambience: () => new BlanchwoodAmbience({ depth: () => 0.25 }),
  checkpoint: true,
  candle: false,
  spawns: { wood: { x: tiles(1.6), y: tiles(6.8), dir: 'right' } },
  caches: [
    {
      id: 'hollow',
      x: tiles(30.6),
      y: tiles(10.8),
      hidden: true,
      pennies: 10,
      satchel: { gallInk: 1, poultice: 1 },
      note: { en: '“The burners were the last of Ninefold to be scraped, because nobody remembered to go out to the wood. Somebody always forgets the charcoal-burners.”', fr: '« Les charbonniers furent les derniers de Ninefold à être grattés, parce que personne ne pensa à venir jusqu’au bois. On oublie toujours les charbonniers. »' },
    },
  ],
  build(r, st) {
    woodLight(r, 0.2);
    r.grade = { ...r.grade, saturation: 0.92 };
    st.ground({ ground: GROUND, heights: HEIGHTS, seed: 47, palette: { ...WOOD_GROUND, dirt: '#4A3A2E' } });
    st.addSky({ ...WOOD_SKY }, 200);
    const blocked: Rect[] = [];
    // The kilns, breathing; the hermit's lean-to against the last coloured oak.
    for (const [i, [kx, ky, w]] of KILNS.entries()) {
      const k = kiln(i + 1, w);
      st.addImage(k.a, tiles(kx), tiles(ky), { glow: k.e, solid: w - 8 });
      st.addLight(tiles(kx), tiles(ky) + 10, 26, 90, '#FF8A3A', 0.22, 'flame');
      st.addEmitter({ kind: 'mote', area: [tiles(kx) - 8, tiles(ky) - 4, 16, 6], heights: [14, 110], count: 12, color: '#9A948A', size: 2.6, intensity: 0.5 }, i * 7 + 3);
    }
    st.addImage(leanTo(3), HUT[0], HUT[1], { solid: 34 });
    st.addEmitter({ kind: 'ember', area: [tiles(10), tiles(3), tiles(11), tiles(8)], heights: [6, 80], count: 24, color: '#FFA040', size: 1.4, intensity: 1.4 }, 31);
    // The wood all round, whiter the further it stands from the fires.
    for (let i = 0; i < 16; i++) {
      const x = tiles(1) + i * tiles(2.1) + hash2(i, 3, 9) * 12;
      const y = tiles(2.2) + hash2(i, 4, 9) * 14;
      st.addImage(blanchedTree(i + 181, Math.min(0.85, cold(x / 16, y / 16) * 1.4)), x, y);
    }
    for (let i = 0; i < 7; i++) {
      const x = tiles(2.5) + i * tiles(4.6) + hash2(i, 5, 9) * 14;
      st.addImage(blanchedTree(i + 199, Math.min(0.85, cold(x / 16, 12.4) * 1.4)), x, tiles(12.6));
    }
    // The wodewose mother and her embers, until they are quieted.
    wild = [];
    if (!session.game.cleared.includes('s2')) {
      const mother = st.addImage(drawCharacter(CHARACTERS.wodewoseMother!, 'left', FRAMES[0]!), tiles(16.4), tiles(7.2), { solid: false });
      mother.scale = CHARACTERS.wodewoseMother!.scale ?? 1;
      mother.sync();
      wild.push(mother);
      const ember = enemyStill('emberGryllus');
      if (ember)
        for (const [x, y] of [
          [14.6, 7.8],
          [18.2, 7.6],
        ] as const)
          wild.push(st.addImage(ember, tiles(x), tiles(y), { solid: false }));
    }
    return { blocked };
  },
  npcs: [
    { id: 'hermit', speaker: 'hermit', spec: CHARACTERS.hermit!, x: HERMIT[0], y: HERMIT[1], dir: 'left', get fray() {
      return isReturned(session.game, 'maud') ? 0.15 : 0.55;
    } },
    // Afterwards she sits by the kiln with her young curled at her feet.
    { id: 'mother', speaker: 'villager', spec: CHARACTERS.wodewoseMother!, x: tiles(17.6), y: tiles(7.2), dir: 'down', fray: 0.3, when: (c) => c.cleared('s2') },
  ],
  zones: [
    {
      id: 'mother',
      rect: [tiles(9.5), tiles(3), tiles(12.5), tiles(9)],
      when: (c) => !c.cleared('s2'),
      run: async (c) => {
        c.letterbox(true);
        c.shake(2, 0.5);
        await c.narrate({ en: 'Between the kilns a wodewose rises up, a mother, her hair gone white as the wood. Sparks scuttle round her feet like chicks: grylli of ember, from the vents.', fr: 'Entre les meules se dresse une femme sauvage, une mère, le poil devenu blanc comme le bois. Des étincelles trottent autour de ses pieds comme des poussins : des grylles de braise, sortis des évents.' });
        await c.say('hild', { en: 'She thinks we’ve come to put them out.', fr: 'Elle croit qu’on est venus les éteindre.' }, 'grave');
        await c.say('isot', { en: 'If we put one out, it bursts. And she can blow it back to life.', fr: 'Si on en éteint un, il éclate. Et elle peut le ranimer en soufflant.' }, 'alarmed');
        c.letterbox(false);
        c.battle('s2');
      },
    },
  ],
  things: [
    { id: 'hermit', x: HERMIT[0], y: HERMIT[1], h: 30, reach: 28, run: (c) => hermit(c) },
    {
      id: 'mother',
      x: tiles(17.6),
      y: tiles(7.2),
      h: 30,
      when: (c) => c.cleared('s2'),
      run: async (c) => {
        await c.narrate({ en: 'The wodewose mother sits with her back to the kiln. The embers have curled up against her fur, and she lets them.', fr: 'La mère sauvage s’est assise le dos contre la meule. Les braises se sont blotties contre sa fourrure, et elle les laisse faire.' });
        await c.say('isot', { en: 'She only wanted them warm.', fr: 'Elle voulait seulement qu’ils aient chaud.' }, 'sad');
      },
    },
  ],
  exits: [{ rect: [0, tiles(5.6), tiles(0.6), tiles(3)], to: 'wood', spawn: 'hollow' }],
  async enter(c, from) {
    if (from === 'battle:s2') {
      for (const b of wild) b.visible = false;
      c.letterbox(true);
      await c.narrate({ en: 'An old man comes round the kilns with a rake, in a coat of patched sacking, as faint as the smoke.', fr: 'Un vieil homme contourne les meules, un râteau à la main, dans un manteau de toile rapiécée, aussi pâle que la fumée.' });
      await c.say('hermit', { en: 'You frightened her. She only keeps them warm. It’s cold out there in the white.', fr: 'Vous lui avez fait peur. Elle ne fait que leur tenir chaud. Il fait froid, là-dehors, dans le blanc.' });
      c.letterbox(false);
    } else if (from === 'wood' && !c.flag('hollowSeen')) {
      c.set('hollowSeen');
      await c.say('isot', { en: 'Colour. Real colour, round those mounds. Something is keeping the wood from forgetting here.', fr: 'De la couleur. De la vraie couleur, autour de ces buttes. Quelque chose empêche le bois d’oublier, ici.' }, 'alarmed');
      await c.say('hild', { en: 'Charcoal kilns. They take a fortnight to burn and somebody has to sit up with them every night.', fr: 'Des meules de charbonnier. Il leur faut quinze jours pour cuire, et quelqu’un doit les veiller chaque nuit.' });
    }
  },
};

/** The hermit at his kilns; and Maud, if her name was read at his old hearth in Ninefold. */
async function hermit(c: MapContext): Promise<void> {
  const g = session.game;
  if (isReturned(g, 'maud')) {
    await c.say('hermit', { en: 'Sit, if you like. The fire doesn’t need me now. It just likes the company.', fr: 'Asseyez-vous, si vous voulez. Le feu n’a plus besoin de moi. Il aime juste la compagnie.' }, 'warm');
    return;
  }
  if (!c.flag('hermitMet')) {
    c.set('hermitMet');
    await c.say('hermit', { en: 'Mind the vents. They breathe.', fr: 'Attention aux évents. Ils respirent.' });
    await c.say('isot', { en: 'You keep them burning? The burners have been gone a hundred and fifty years.', fr: 'C’est vous qui les tenez allumées ? Les charbonniers sont partis il y a cent cinquante ans.' });
    await c.say('hermit', { en: 'Somebody has to keep a fire. I can’t remember who for. Someone who’ll want to find her way back in the dark.', fr: 'Il faut bien que quelqu’un garde un feu. Je ne me rappelle plus pour qui. Pour quelqu’un qui voudra rentrer dans le noir. Elle aura froid.' });
    await c.say('hild', { en: 'Her?', fr: 'Elle ?' });
    await c.say('hermit', { en: 'Did I say her?', fr: 'J’ai dit « elle » ?' });
    if (c.party.some((a) => a.id === 'whit')) await c.say('whit', { en: 'He keeps looking at me. I do not mind it.', fr: 'Il ne cesse de me regarder. Cela ne me gêne pas.' });
  } else if (!g.lostNames.includes('maud')) {
    await c.say('hermit', { en: 'Still burning. I don’t let them go out.', fr: 'Toujours allumées. Je ne les laisse jamais s’éteindre.' });
  }
  if (!g.lostNames.includes('maud')) return;
  const pick = await c.choose([
    { en: 'Read him the miller’s name.', fr: 'Lui lire le nom de la meunière.' },
    { en: 'Not now.', fr: 'Pas maintenant.' },
  ]);
  if (pick !== 0) return;
  await c.say('isot', { en: 'At the hermit’s hearth in Ninefold, under the soot, there was a name. “Maud of the mill, whose laugh sounded like a door that wants oil.”', fr: 'Au foyer de l’ermite, à Ninefold, sous la suie, il y avait un nom. « Maud du moulin, dont le rire sonnait comme une porte qui réclame de l’huile. »' }, 'sad');
  await c.narrate({ en: 'The rake stops.', fr: 'Le râteau s’arrête.' });
  await c.say('hermit', { en: 'Maud.', fr: 'Maud.' });
  await c.say('hermit', { en: 'My sister. The mill door squealed every morning, and she’d squeal back at it, and then you couldn’t tell which was laughing at which.', fr: 'Ma sœur. La porte du moulin grinçait tous les matins, et elle lui grinçait en retour, et après on ne savait plus qui se moquait de qui.' }, 'warm');
  await c.say('hermit', { en: 'They scoured Ninefold while I was out here with the kilns. I kept the fire so she’d see it from the white and come.', fr: 'Ils ont récuré Ninefold pendant que j’étais ici, aux meules. J’ai gardé le feu pour qu’elle le voie depuis le blanc, et qu’elle vienne.' });
  await c.say('hermit', { en: 'She isn’t coming, is she.', fr: 'Elle ne viendra pas, c’est ça.' }, 'sad');
  await c.say('isot', { en: 'No. But her name has. Now you have it, and so do I.', fr: 'Non. Mais son nom, si. Maintenant vous l’avez, et moi aussi.' }, 'sad');
  await c.narrate({ en: 'He lets the kiln settle, and for the first time in a hundred and fifty years the old man sits down.', fr: 'Il laisse la meule retomber, et pour la première fois depuis cent cinquante ans, le vieil homme s’assoit.' });
  await c.say('hermit', { en: 'Here. Willow charcoal, the softest there is. Draw her a door that doesn’t want oil.', fr: 'Tenez. Du fusain de saule, le plus tendre qui soit. Dessinez-lui une porte qui ne réclame pas d’huile.' }, 'warm');
  c.npc('hermit').sprite.fray = 0.15;
  await returnName(c, 'maud');
}
