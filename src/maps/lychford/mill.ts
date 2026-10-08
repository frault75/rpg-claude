/**
 * Chapter II, off the lane: the Fen Mill (DESIGN.md §3.14). Lychford's watermill out on the
 * frozen fen, whose wheel has turned under the ice for ten years. Corpse-candles burn on the
 * millpond: people who should have died, and now light the fen (S1). Ralf is on the roof,
 * mending a thatch he can't remember learning to mend, afraid of his own ladder; Edda's
 * name, read on the thatcher's house in the village, can be given back to him.
 */

import { WinterAmbience } from '../../audio/winter';
import { session } from '../../engine/session';
import { CHARACTERS, drawCharacter, FRAMES } from '../../pixel/characters';
import { enemyStill } from '../../pixel/enemies';
import { reeds } from '../../pixel/nature';
import { isReturned, returnName } from '../../story/returns';
import type { Billboard } from '../../world3d/billboard';
import { ladder, millWheel } from '../../world3d/fenmill';
import { bareTree, cottage3D } from '../../world3d/lychford';
import { relief } from '../../world3d/relief';
import { tiles } from '../../world3d/stage';
import type { MapContext, MapDef, Rect } from '../types';
import { SNOW_GROUND, WINTER_NIGHT_SKY, winterNight } from './winter';

const W = 36;
const H = 14;
/** The millpond: frozen, an oval of ice west of the mill. */
const POND = { x: 11, y: 8.2, rx: 7.5, ry: 2.6 };
const inPond = (x: number, y: number) => ((x + 0.5 - POND.x) / POND.rx) ** 2 + ((y + 0.5 - POND.y) / POND.ry) ** 2 < 1;
const GROUND = Array.from({ length: H }, (_, y) => Array.from({ length: W }, (_, x) => (inPond(x, y) ? 'i' : (x >= 26 && x <= 27 && y >= 5) || (y >= 12 && x <= 6) ? 'd' : 'n')).join(''));
const HEIGHTS = relief(W, H, [
  { at: [0, 0, W, 3], h: 1, ragged: 's' },
  { at: [0, 0, W, 1], h: 2 },
], 63);

const MILL = { x: tiles(21), y: tiles(2.2), w: 92, d: 40 };
const LADDER: [number, number] = [tiles(27.6), tiles(4.9)];
// On the south slope of the thatch, in sight from the yard.
const ROOF: [number, number] = [tiles(24.6), tiles(4.25)];

let ralfOnRoof: Billboard | null = null;
let candles: Billboard[] = [];

export const MILL_MAP: MapDef = {
  id: 'mill',
  card: { title: { en: 'Lychford', fr: 'Lychford' }, line: { en: 'The Fen Mill', fr: 'Le moulin du marais' } },
  walkable: 'ndi',
  ground: GROUND,
  heights: HEIGHTS,
  bounds: { minX: tiles(13.4), maxX: tiles(W - 13.4), minY: tiles(6.6), maxY: tiles(7.6) },
  camera: { h: 4 },
  ambience: () => new WinterAmbience({ music: false }),
  checkpoint: true,
  candle: true,
  spawns: { lane: { x: tiles(3.2), y: tiles(12.4), dir: 'up' } },
  caches: [
    {
      id: 'mill',
      x: tiles(32.4),
      y: tiles(6.2),
      pennies: 10,
      satchel: { poultice: 1 },
      note: { en: '“The miller went in the Grey Year. We could not save his name, only his flour: there is a sack of it in the loft, ten years old and still good.”', fr: '« Le meunier est parti l’Année grise. Nous n’avons pas pu sauver son nom, seulement sa farine : il y en a un sac au grenier, vieux de dix ans et encore bon. »' },
    },
  ],
  build(r, st) {
    winterNight(r);
    st.ground({ ground: GROUND, heights: HEIGHTS, seed: 63, palette: { ...SNOW_GROUND, snow: '#C8D0DC' } });
    st.addSky({ ...WINTER_NIGHT_SKY, moon: [260, 100] }, 200);
    const blocked: Rect[] = [];
    // The mill, dark, its wheel in the frozen race on the west wall.
    st.addBuilding(cottage3D(MILL.x, MILL.y, MILL.w, MILL.d, { seed: 81, lit: false }), st.heightAt(MILL.x + MILL.w / 2, MILL.y + MILL.d / 2));
    blocked.push([MILL.x, MILL.y, MILL.w, MILL.d]);
    st.addImage(millWheel(2), MILL.x - 6, MILL.y + MILL.d + 4, { solid: 30 });
    st.addImage(ladder(36), LADDER[0], LADDER[1] - 2, { solid: false });
    // Ralf on the roof, laying new reed over old, until his wife's name brings him down.
    ralfOnRoof = st.addImage(drawCharacter(CHARACTERS.ralf!, 'down', FRAMES[0]!), ROOF[0], ROOF[1], { h: 31, shadow: false, solid: false });
    ralfOnRoof.visible = !isReturned(session.game, 'edda');
    // Reeds round the pond, bare willows on the bank.
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      st.addImage(reeds(i + 70, '#8A7A5A'), tiles(POND.x + Math.cos(a) * (POND.rx + 0.6)), tiles(POND.y + Math.sin(a) * (POND.ry + 0.5)), { solid: false });
    }
    for (let i = 0; i < 7; i++) st.addImage(bareTree(i + 50, 0.8 + (i % 3) * 0.12), tiles(1.5 + i * 5.1), tiles(1.8) + (i % 2) * 6);
    // The corpse-candles on the ice, until they are put out.
    candles = [];
    const still = enemyStill('corpseCandle');
    if (still && !session.game.cleared.includes('s1'))
      for (const [x, y] of [
        [POND.x - 4.4, POND.y - 0.4],
        [POND.x - 1.2, POND.y + 0.9],
        [POND.x + 1.8, POND.y - 0.7],
        [POND.x + 4.6, POND.y + 0.4],
      ] as const) {
        candles.push(st.addImage(still, tiles(x), tiles(y), { glow: null, solid: false }));
        st.addLight(tiles(x), tiles(y) + 6, 30, 70, '#7AA8FF', 0.22, 'candle');
      }
    st.addEmitter({ kind: 'mote', area: [tiles(3), tiles(5), tiles(16), tiles(6)], heights: [3, 30], count: 20, color: '#A8C8FF', size: 1.3, intensity: 0.8 }, 23);
    st.addLight(LADDER[0], LADDER[1], 30, 100, '#FFE0B0', 0.3);
    return { blocked };
  },
  npcs: [{ id: 'ralf', speaker: 'ralf', spec: CHARACTERS.ralf!, x: LADDER[0] + 10, y: LADDER[1] + 8, dir: 'left', when: (c) => isReturned(session.game, 'edda') && !c.flag('millLeft') }],
  zones: [
    {
      id: 'candles',
      rect: [tiles(POND.x - POND.rx), tiles(POND.y - POND.ry), tiles(POND.rx * 2), tiles(POND.ry * 2)],
      when: (c) => !c.cleared('s1'),
      run: async (c) => {
        c.letterbox(true);
        await c.narrate({ en: 'Over the ice, lights. Not lanterns: people, pale as tallow, each with a cold blue flame where the head should be.', fr: 'Sur la glace, des lumières. Pas des lanternes : des gens, pâles comme du suif, chacun avec une flamme bleue et froide à la place de la tête.' });
        await c.say('hild', { en: 'Corpse-candles. In my mother’s day you’d see one walk the road to a house the night before a death. These are the ones who should have gone.', fr: 'Des chandelles des morts. Du temps de ma mère, on en voyait une remonter la route jusqu’à une maison la veille d’un décès. Celles-là, ce sont les morts qui auraient dû partir.' }, 'grave');
        await c.say('whit', { en: 'They are waiting for someone.', fr: 'Elles attendent quelqu’un.' });
        await c.say('isot', { en: 'They’re coming this way. They want warmth; they’ll take it from us if they can.', fr: 'Elles viennent par ici. Elles veulent de la chaleur ; elles nous la prendront si elles peuvent.' }, 'alarmed');
        c.letterbox(false);
        c.battle('s1');
      },
    },
  ],
  things: [
    {
      id: 'ralf',
      x: LADDER[0],
      y: LADDER[1] + 4,
      h: 30,
      reach: 26,
      run: (c) => ralf(c),
    },
    {
      id: 'wheel',
      x: MILL.x - 6,
      y: MILL.y + MILL.d + 8,
      h: 24,
      run: async (c) => {
        await c.say('isot', { en: 'The wheel’s still going round under the ice. Ten years of grinding nothing.', fr: 'La roue tourne encore sous la glace. Dix ans à moudre du vide.' });
        await c.say('whit', { en: 'It does not know how to stop.', fr: 'Elle ne sait pas s’arrêter.' });
        await c.say('hild', { en: 'Then it’s the only thing in Lychford still working.', fr: 'Alors c’est bien la seule chose qui travaille encore à Lychford.' }, 'grave');
      },
    },
  ],
  exits: [{ rect: [tiles(0.6), tiles(H - 0.6), tiles(5.4), tiles(0.6)], to: 'lane', spawn: 'gateway' }],
  async enter(c, from) {
    if (from === 'battle:s1') {
      for (const b of candles) b.visible = false;
      c.letterbox(true);
      await c.narrate({ en: 'The lights go out one by one, like candles at the end of a vigil. Something like a sigh goes over the ice.', fr: 'Les lumières s’éteignent une à une, comme des cierges à la fin d’une veillée. Quelque chose comme un soupir passe sur la glace.' });
      await c.say('whit', { en: 'They looked at me. All of them. As if I were late.', fr: 'Elles m’ont regardé. Toutes. Comme si j’étais en retard.' }, 'sad');
      await c.say('hild', { en: '…', fr: '…' }, 'grave');
      c.letterbox(false);
    } else if (from === 'lane' && !c.flag('millSeen')) {
      c.set('millSeen');
      await c.say('isot', { en: 'The mill. Its wheel is still turning, down under the ice.', fr: 'Le moulin. Sa roue tourne encore, là-dessous, sous la glace.' });
      await c.say('hild', { en: 'And someone’s up on the roof. At this hour, in this cold.', fr: 'Et il y a quelqu’un sur le toit. À cette heure, par ce froid.' });
    }
  },
};

/** Ralf, on his roof; and Edda, if her name was read in the village. */
async function ralf(c: MapContext): Promise<void> {
  const g = session.game;
  if (isReturned(g, 'edda')) {
    await c.say('ralf', { en: 'I’ll finish the roof tomorrow, from the ladder. She’d laugh at me, taking so long about it.', fr: 'Je finirai le toit demain, depuis l’échelle. Elle se moquerait de moi, de prendre tant de temps.' }, 'warm');
    return;
  }
  if (!c.flag('ralfMet')) {
    c.set('ralfMet');
    await c.narrate({ en: 'A man is up on the mill roof, laying new reed over old. He works like someone who has done it all his life.', fr: 'Un homme est sur le toit du moulin, il pose du roseau neuf sur l’ancien. Il travaille comme quelqu’un qui a fait ça toute sa vie.' });
    await c.say('ralf', { en: 'Mind the ladder! Don’t touch it. I can’t abide the thing. Never could.', fr: 'Attention à l’échelle ! N’y touchez pas. Je ne supporte pas ce machin. Jamais pu.' });
    await c.say('isot', { en: 'Then how do you get down?', fr: 'Alors comment vous redescendez ?' });
    await c.say('ralf', { en: 'I don’t, much. I go up at first light, and it’s dark before I can make myself come down. My hands know thatching. I don’t know who taught them.', fr: 'Pas souvent. Je monte au point du jour, et la nuit tombe avant que je me décide à redescendre. Mes mains savent couvrir un toit. Je ne sais pas qui le leur a appris.' });
    await c.say('hild', { en: 'Somebody did.', fr: 'Quelqu’un, pourtant.' }, 'grave');
  } else if (!g.lostNames.includes('edda')) {
    await c.say('ralf', { en: 'Still here. The roof’s nearly sound. It’s always nearly sound.', fr: 'Toujours là. Le toit est presque étanche. Il est toujours presque étanche.' });
  }
  if (!g.lostNames.includes('edda')) return;
  const pick = await c.choose([
    { en: 'Read him the thatcher’s name.', fr: 'Lui lire le nom de la couvreuse.' },
    { en: 'Not now.', fr: 'Pas maintenant.' },
  ]);
  if (pick !== 0) return;
  await c.say('isot', { en: 'Ralf. In the village, on the thatcher’s house, under the plaster, there’s a name. “Edda Thatcher, who mended every roof in Lychford and was afraid of ladders.”', fr: 'Ralf. Au village, sur la maison de la couvreuse, sous l’enduit, il y a un nom. « Edda Couvreuse, qui répara tous les toits de Lychford et avait peur des échelles. »' }, 'sad');
  await c.narrate({ en: 'He stops, a fistful of reed in each hand.', fr: 'Il s’arrête, une poignée de roseau dans chaque main.' });
  await c.say('ralf', { en: 'Edda.', fr: 'Edda.' });
  await c.say('ralf', { en: 'She went up first. Always first, white as milk, cursing the ladder the whole way up. I held it. Thirty years I held it, and I was never afraid of anything.', fr: 'Elle montait la première. Toujours la première, blanche comme du lait, à maudire l’échelle tout du long. Moi je la tenais. Trente ans je l’ai tenue, et je n’ai jamais eu peur de rien.' });
  await c.say('ralf', { en: 'All these years I’ve been afraid of it for her.', fr: 'Toutes ces années, j’en ai eu peur à sa place.' });
  c.flash(0.3);
  if (ralfOnRoof) ralfOnRoof.visible = false;
  await c.narrate({ en: 'He comes down the ladder without looking at it, sits on the bottom rung, and weeps the way a roof lets go after a thaw: all at once, and then quiet.', fr: 'Il descend l’échelle sans la regarder, s’assoit sur le dernier barreau, et pleure comme un toit qui cède au dégel : d’un coup, et puis plus rien.' });
  await c.say('ralf', { en: 'Here. Her straw. She twisted a knot of it into every roof she did, for luck, so she’d know her own work.', fr: 'Tenez. Sa paille. Elle en nouait une torsade dans chaque toit qu’elle faisait, pour porter chance, et pour reconnaître son ouvrage.' }, 'warm');
  await returnName(c, 'edda');
}
