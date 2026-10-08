/**
 * Chapter V, under the scriptorium: the Undercroft (DESIGN.md §3.14). The Rasure Vault,
 * older than the room above it, where ten years of scrapings have been swept down a chute.
 * A Brother scraped of his own name sweeps it still, with the hounds of the inkhorns (S4);
 * two knights written over an older prayer keep the inner bays (S5); and at the far end
 * lies the Heap, every letter ever scraped in Saint Ebb's, trying to become a word (B6).
 */

import { EbbNightAmbience } from '../audio/ambient';
import { session } from '../engine/session';
import { CHARACTERS, drawCharacter, FRAMES } from '../pixel/characters';
import { enemyStill } from '../pixel/enemies';
import { candle } from '../pixel/furniture';
import { GROUND_DEFAULT } from '../pixel/terrain';
import { ghostWords } from '../pixel/underwriting';
import type { Billboard } from '../world3d/billboard';
import { tiles } from '../world3d/stage';
import { chute, herse, paintBays, pumiceTub, scrapings } from '../world3d/undercroft';
import { backWall, nightInterior, sideWall } from './interior';
import type { MapContext, MapDef, Rect } from './types';

const W = 34;
const GROUND = [' '.repeat(W), ' '.repeat(W), ...Array.from({ length: 9 }, () => ` ${'f'.repeat(W - 2)} `), ' '.repeat(W)];
const WALL_Y = tiles(2);
const WALL_H = 66;
const STAIR_X = tiles(3);
const CHUTE_X = tiles(8);
const SWEEPER: [number, number] = [tiles(10), tiles(6.2)];
const KNIGHTS: [number, number][] = [
  [tiles(22.6), tiles(4.6)],
  [tiles(22.6), tiles(8.4)],
];
const HEAP: [number, number] = [tiles(29), tiles(6.8)];

const cleared = (id: string) => session.game.cleared.includes(id);

/** What stands in the vault until it is dealt with. */
let sweepers: Billboard[] = [];
let knights: Billboard[] = [];
let heap: Billboard | null = null;

export const UNDERCROFT: MapDef = {
  id: 'undercroft',
  card: { title: { en: 'The Undercroft', fr: 'La Crypte' }, line: { en: 'The Rasure Vault', fr: 'La Crypte des raclures' } },
  walkable: 'f',
  ground: GROUND,
  bounds: { minX: tiles(12.5), maxX: tiles(W - 12.5), minY: tiles(5.8), maxY: tiles(5.8) },
  camera: { h: 5 },
  ambience: () => new EbbNightAmbience(),
  checkpoint: true,
  candle: true,
  spawns: { stair: { x: STAIR_X, y: WALL_Y + 14, dir: 'down' } },
  caches: [
    {
      id: 'undercroft',
      x: tiles(18.4),
      y: tiles(10.2),
      hidden: true,
      pennies: 14,
      satchel: { holyWater: 1, salVolatile: 1 },
      note: { en: '“Everything they scrape ends up down here. So do we, now and then, to read it. Nothing is ever quite gone. — the Glossators.”', fr: '« Tout ce qu’ils grattent finit ici. Nous aussi, de temps en temps, pour le lire. Rien n’est jamais tout à fait parti. — les Glossateurs. »' },
    },
  ],
  build(r, st) {
    nightInterior(r, { ambient: 0.4, moon: 0.08 });
    r.grade = { ...r.grade, exposure: 1.4, saturation: 0.92 };
    st.ground({ ground: GROUND, heights: GROUND.map((row) => '0'.repeat(row.length)), seed: 141, palette: { ...GROUND_DEFAULT, stone: '#625C58' } });
    const bays = [tiles(5.5), tiles(11.5), tiles(16.5), tiles(21.5), tiles(26.5)].map((x) => x - tiles(1));
    backWall(st, tiles(1), tiles(1), tiles(W - 2), tiles(1), WALL_H, {
      stone: '#7A746A',
      seed: 143,
      door: { x: STAIR_X - tiles(1) - 10, w: 20, h: 34, open: true },
      paint: (a) => paintBays(a, bays, 30, 14, WALL_H - 7),
    });
    sideWall(st, tiles(0.5), tiles(1), tiles(10), WALL_H, '#6A645A');
    sideWall(st, tiles(W - 1), tiles(1), tiles(10), WALL_H, '#6A645A');
    const blocked: Rect[] = [];
    // The chute out of the ceiling, and the drift it has made in ten years.
    st.addArt(chute(5), CHUTE_X, WALL_Y + 2, { h: 18 });
    st.addImage(scrapings(56, 1), CHUTE_X, tiles(4.2));
    blocked.push([CHUTE_X - 26, tiles(4.2) - 10, 52, 10]);
    st.addImage(scrapings(30, 2), tiles(4.6), tiles(10.4));
    blocked.push([tiles(4.6) - 14, tiles(10.4) - 6, 28, 6]);
    // Herses with skins laced in to be scraped again, and tubs of pumice.
    for (const [x, seed] of [
      [tiles(14.2), 3],
      [tiles(17.2), 4],
    ] as const) {
      st.addImage(herse(seed), x, WALL_Y + 8);
      blocked.push([x - 13, WALL_Y + 4, 26, 5]);
    }
    for (const [x, y] of [
      [tiles(15.6), tiles(9.6)],
      [tiles(19.6), tiles(4)],
    ] as const) {
      st.addImage(pumiceTub(Math.floor(x)), x, y);
      blocked.push([x - 10, y - 5, 20, 5]);
    }
    st.addImage(scrapings(36, 5), tiles(25.4), tiles(10.4));
    // Candles on the tubs and in the bays, the only light down here.
    for (const [x, y] of [
      [tiles(19.6), tiles(4)],
      [tiles(15.6), tiles(9.6)],
    ] as const) {
      st.addArt(candle(), x + 3, y - 2, { h: 13 });
      st.addCandle(x + 3, y - 2, 20, 0.6, 80);
    }
    for (const x of [bays[1]!, bays[3]!]) st.addCandle(tiles(1) + x + 15, WALL_Y + 1, 14, 0.5, 70);
    st.addCandle(STAIR_X + 14, WALL_Y + 3, 22, 0.5, 60);
    st.addLight(HEAP[0], HEAP[1] - 6, 24, 90, '#E8D8A8', 0.35);
    st.addEmitter({ kind: 'mote', area: [tiles(2), tiles(2.5), tiles(W - 4), tiles(8)], heights: [2, 50], count: 30, color: '#E8DCC0', size: 1.2, intensity: 0.3 }, 147);
    // Who is down here.
    sweepers = [];
    if (!cleared('s4')) {
      const b = st.addImage(drawCharacter(CHARACTERS.scrapedBrother!, 'down', FRAMES[0]!), SWEEPER[0], SWEEPER[1], { solid: false });
      sweepers.push(b);
      const hound = enemyStill('inkhornHound');
      if (hound)
        for (const [dx, dy, flip] of [
          [-20, 8, true],
          [18, 10, false],
          [-2, 22, false],
        ] as const)
          sweepers.push(st.addImage(hound, SWEEPER[0] + dx, SWEEPER[1] + dy, { solid: false, flip }));
    }
    knights = [];
    if (!cleared('s5'))
      for (const [x, y] of KNIGHTS) {
        const k = st.addImage(drawCharacter(CHARACTERS.palimpsestKnight!, 'left', FRAMES[0]!), x, y, { solid: false });
        k.scale = CHARACTERS.palimpsestKnight!.scale ?? 1;
        k.sync();
        knights.push(k);
      }
    heap = null;
    if (!cleared('b6')) {
      const h = enemyStill('heap');
      if (h) heap = st.addImage(h, HEAP[0], HEAP[1], { solid: false });
    } else st.addImage(scrapings(80, 9), HEAP[0], HEAP[1]);
    blocked.push([HEAP[0] - 44, HEAP[1] - 16, 88, 16]);
    return { blocked };
  },
  npcs: [
    // Given his name, Godric goes up to the light; he stops on the stair to say it.
    { id: 'godric', speaker: 'godric', spec: CHARACTERS.scrapedBrother!, x: STAIR_X + 18, y: WALL_Y + 16, dir: 'down', when: (c) => c.flag('left.scrapedBrother') && !c.flag('godricGone') },
  ],
  zones: [
    {
      id: 'sweepers',
      rect: [SWEEPER[0] - tiles(1.6), WALL_Y, tiles(1), tiles(9)],
      when: (c) => !c.cleared('s4'),
      run: async (c) => {
        c.letterbox(true);
        await c.narrate({ en: 'A Brother is sweeping. His robe has faded to the colour of vellum. He sweeps the shavings to one end of the vault, then back to the other. Three hounds lie at his feet. They are made of inkhorns.', fr: 'Un Frère balaie. Sa robe a pâli jusqu’à la couleur du vélin. Il pousse les raclures à un bout de la crypte, puis les ramène à l’autre. Trois chiens sont couchés à ses pieds. Ils sont faits de cornes à encre.' });
        if (c.flag('knowGodric')) await c.say('isot', { en: 'Brother Godric?', fr: 'Frère Godric ?' });
        await c.say('sweeper', { en: 'Mind the floor. I’ve just done it. I’ve always just done it.', fr: 'Attention au sol. Je viens de le faire. Je viens toujours de le faire.' });
        await c.say('whit', { en: 'The dogs have our scent. They’ll go for whoever moves last.', fr: 'Les chiens ont notre odeur. Ils iront sur celui qui bouge en dernier.' });
        await c.say('hild', { en: 'He’s scraped clean, Isot. Write him back a letter at a time, and keep him from sweeping it off again.', fr: 'Il est gratté net, Isot. Réécris-le une lettre à la fois, et empêche-le de tout balayer encore.' }, 'grave');
        c.letterbox(false);
        c.battle('s4');
      },
    },
    {
      id: 'knights',
      rect: [KNIGHTS[0]![0] - tiles(2.2), WALL_Y, tiles(1), tiles(9)],
      when: (c) => c.cleared('s4') && !c.cleared('s5'),
      run: async (c) => {
        c.letterbox(true);
        await c.narrate({ en: 'Two knights stand in the inner bays, mail and surcoat the colour of old skin. Through them, faintly, like writing through a page held to the light, lines of an older text.', fr: 'Deux chevaliers se tiennent dans les baies du fond, haubert et cotte couleur de vieille peau. À travers eux, faiblement, comme une écriture à travers une page tenue à la lumière, les lignes d’un texte plus ancien.' });
        await c.say('isot', { en: 'Palimpsests. Someone wrote knights over something else. Whatever we scrape off them, they’ll write back.', fr: 'Des palimpsestes. Quelqu’un a écrit des chevaliers par-dessus autre chose. Tout ce qu’on leur grattera, ils le réécriront.' }, 'alarmed');
        await c.say('whit', { en: 'Then we finish each one while it’s still writing itself back. Or we cross the new writing out.', fr: 'Alors on achève chacun pendant qu’il se réécrit. Ou on raye ce qu’il réécrit.' });
        c.letterbox(false);
        c.battle('s5');
      },
    },
    {
      id: 'heap',
      rect: [HEAP[0] - tiles(4.4), WALL_Y, tiles(1), tiles(9)],
      when: (c) => c.cleared('s5') && !c.cleared('b6'),
      run: (c) => approachHeap(c),
    },
  ],
  things: [
    {
      id: 'chute',
      x: CHUTE_X,
      y: tiles(4.2),
      h: 20,
      reach: 30,
      run: async (c) => {
        await c.say('isot', { en: 'The chute. Every page we scraped upstairs, we swept the shavings in at the top. I never wondered where they went.', fr: 'La goulotte. Chaque page qu’on grattait là-haut, on balayait les raclures par le haut. Je ne me suis jamais demandé où elles allaient.' }, 'sad');
        if (!c.flag('seen.godric')) await c.say('hild', { en: 'There’s writing scratched on the wall by it. Tilt your candle.', fr: 'Il y a quelque chose de gravé sur le mur, à côté. Incline ta bougie.' });
      },
    },
    {
      id: 'herse',
      x: tiles(14.2),
      y: WALL_Y + 8,
      h: 24,
      run: async (c) => {
        await c.say('isot', { en: 'A skin laced into a herse to be scraped again. You can still see where the lines were. Somebody’s psalm, or somebody’s will.', fr: 'Une peau lacée dans une herse, pour être grattée encore. On voit toujours où étaient les lignes. Le psaume de quelqu’un, ou son testament.' }, 'neutral');
      },
    },
  ],
  underwriting: [
    {
      id: 'godric',
      x: CHUTE_X - tiles(2.2),
      y: WALL_Y + 1,
      h: 30,
      art: ghostWords(['GODRIC RASOR', 'XL ANNOS']),
      revealed: async (c) => {
        c.set('knowGodric');
        await c.say('isot', { en: '“Godric, rasor, forty years.” The rasor is the Brother who keeps the pumice and scrapes the old skins clean, so they can be written on again.', fr: '« Godric, racleur, quarante ans. » Le racleur, c’est le Frère qui garde la ponce et gratte les vieilles peaux, pour qu’on puisse écrire dessus de nouveau.' });
        if (!c.cleared('s4')) await c.say('hild', { en: 'Then I know who’s sweeping.', fr: 'Alors je sais qui balaie.' }, 'grave');
      },
    },
    {
      id: 'prayer',
      x: KNIGHTS[0]![0],
      y: WALL_Y + 1,
      h: 32,
      art: ghostWords(['DOMINE', 'FAC ME UTILEM']),
      when: (c) => c.cleared('s5'),
      revealed: async (c) => {
        await c.say('isot', { en: '“Domine, fac me utilem.” Lord, make me useful. That’s what the knights were written over.', fr: '« Domine, fac me utilem. » Seigneur, rends-moi utile. Voilà ce que les chevaliers recouvraient.' }, 'sad');
        await c.say('whit', { en: 'A prayer to be of use. Someone wrote knights over it, and it got its wish.', fr: 'Une prière pour servir à quelque chose. Quelqu’un a écrit des chevaliers par-dessus, et elle a été exaucée.' });
      },
    },
  ],
  exits: [{ rect: [STAIR_X - 10, WALL_Y, 20, 6], to: 'dawnScriptorium', spawn: 'undercroft' }],
  async enter(c, from) {
    if (from === 'stair' && !c.flag('undercroftSeen')) {
      c.set('undercroftSeen');
      await c.narrate({ en: 'Down here MERCY is only a hum in the stone. The vault is older than the scriptorium above it, round-headed, low, and drifted from end to end with shavings, like a beach.', fr: 'Ici, MISÉRICORDE n’est plus qu’un bourdonnement dans la pierre. La crypte est plus vieille que le scriptorium au-dessus, en plein cintre, basse, et couverte d’un bout à l’autre de raclures, comme une plage.' });
      await c.say('isot', { en: 'This is everything we scraped. Ten years of it.', fr: 'C’est tout ce qu’on a gratté. Dix ans de raclures.' }, 'alarmed');
      await c.say('hild', { en: 'More than ten. Look at the bottom of the drifts. They were scraping here before Aumery was born.', fr: 'Plus de dix. Regarde le fond des tas. On grattait ici avant la naissance d’Aumery.' }, 'grave');
    }
    if (from === 'battle:s4') await afterSweepers(c);
    if (from === 'battle:s5') {
      for (const k of knights) k.visible = false;
      await c.narrate({ en: 'The knights come apart line by line, the newer text lifting off like a crust of ink. What is left on the wall behind them is faint, and very old.', fr: 'Les chevaliers se défont ligne à ligne, le texte récent se soulève comme une croûte d’encre. Ce qui reste sur le mur derrière eux est pâle, et très ancien.' });
    }
    if (from === 'battle:b6') await afterHeap(c);
  },
};

async function afterSweepers(c: MapContext): Promise<void> {
  for (const b of sweepers) b.visible = false;
  if (!c.flag('left.scrapedBrother')) {
    await c.narrate({ en: 'The Brother comes apart into shavings and is part of the drift. His broom stands a moment on its own, then falls. The hounds were only ink.', fr: 'Le Frère se défait en raclures et rejoint le tas. Son balai tient debout tout seul un instant, puis tombe. Les chiens n’étaient que de l’encre.' });
    await c.say('hild', { en: 'He kept on at the one thing he had left. I know the habit.', fr: 'Il s’est accroché à la seule chose qui lui restait. Je connais ça.' }, 'sad');
    return;
  }
  const g = c.npc('godric');
  c.face(c.player, 'left');
  await c.say('godric', { en: 'Godric. I’m Godric. I kept the pumice here for forty years. I scraped the skins for the scriptorium and swept down every letter they took off.', fr: 'Godric. Je suis Godric. J’ai gardé la ponce ici pendant quarante ans. Je grattais les peaux pour le scriptorium, et je balayais chaque lettre qu’ils enlevaient.' });
  await c.say('godric', { en: 'Then one morning they took me off, and I went on sweeping. Nobody told the broom.', fr: 'Puis un matin, c’est moi qu’ils ont enlevé, et j’ai continué à balayer. Personne n’avait prévenu le balai.' });
  await c.say('godric', { en: 'At the far end there’s the Heap. It’s been trying to say something since before my time. I never stopped sweeping long enough to listen. Perhaps you will.', fr: 'Au fond, il y a le Tas. Il essaie de dire quelque chose depuis avant moi. Je n’ai jamais arrêté de balayer assez longtemps pour écouter. Vous, peut-être.' });
  await c.say('isot', { en: 'Where will you go?', fr: 'Où irez-vous ?' });
  await c.say('godric', { en: 'Up. I’ve never seen the scriptorium by daylight. I only ever saw what it threw away.', fr: 'En haut. Je n’ai jamais vu le scriptorium au grand jour. Je n’ai jamais vu que ce qu’il jetait.' });
  await c.walk(g, [[STAIR_X, WALL_Y + 6]]);
  g.visible = false;
  c.set('godricGone');
}

async function approachHeap(c: MapContext): Promise<void> {
  c.letterbox(true);
  await c.narrate({ en: 'At the end of the vault the drifts rise into one heap, higher than a man. It moves. Not like a beast: like a page in a draught. Here and there in it a whole letter catches the light and goes out again.', fr: 'Au bout de la crypte, les tas montent en un seul, plus haut qu’un homme. Il bouge. Pas comme une bête : comme une page dans un courant d’air. Çà et là une lettre entière y prend la lumière, puis s’éteint.' });
  await c.say('isot', { en: 'It’s every letter. Everything anyone ever scraped in this abbey, trying to be a word again.', fr: 'C’est toutes les lettres. Tout ce qu’on a jamais gratté dans cette abbaye, qui essaie de redevenir un mot.' }, 'alarmed');
  await c.say('hild', { en: 'If we hit it, it’ll lose what it’s found. Let it find its word, child. Then read it.', fr: 'Si on le frappe, il perdra ce qu’il a trouvé. Laisse-le trouver son mot, petite. Ensuite, lis-le.' }, 'grave');
  const pick = await c.choose([
    { en: 'Listen to it.', fr: 'L’écouter.' },
    { en: 'Not yet.', fr: 'Pas encore.' },
  ]);
  c.letterbox(false);
  if (pick !== 0) {
    await c.walk(c.player, [[c.player.x - 24, c.player.y]]);
    return;
  }
  c.battle('b6');
}

async function afterHeap(c: MapContext): Promise<void> {
  if (heap) heap.visible = false;
  c.letterbox(true);
  await c.narrate({ en: 'ADSUM. Whit reads it aloud, and the vault holds on to the word a long while before it lets it go.', fr: 'ADSUM. Whit le lit à voix haute, et la crypte garde longtemps le mot avant de le laisser partir.' });
  await c.say('hild', { en: 'At the roll each morning, when the prior read your name, you answered “adsum.” Here. I’m here.', fr: 'À l’appel, chaque matin, quand le prieur lisait ton nom, tu répondais « adsum ». Présent. Je suis là.' }, 'sad');
  await c.say('isot', { en: 'They were all answering. All this time, down here, answering a roll nobody read.', fr: 'Ils répondaient tous. Tout ce temps, ici en bas, ils répondaient à un appel que personne ne lisait.' }, 'sad');
  await c.say('hild', { en: 'Then read it.', fr: 'Alors lis-le.' }, 'warm');
  await c.narrate({ en: 'Isot kneels in the shavings and reads what is on them, name after name, until her candle is half gone. At each one a curl of vellum lies down flat, the way a dog lies down when it is home.', fr: 'Isot s’agenouille dans les raclures et lit ce qu’il y a dessus, nom après nom, jusqu’à ce que sa bougie soit à moitié consumée. À chacun, une boucle de vélin se couche à plat, comme un chien se couche quand il est rentré.' });
  await c.say('whit', { en: 'I will remember that I heard them. All of them at once.', fr: 'Je me souviendrai de les avoir entendus. Tous à la fois.' });
  c.letterbox(false);
  await c.find('adsumSlip', { en: 'At the bottom of the Heap, a slip of vellum with one word on it, written in every hand at once.', fr: 'Au fond du Tas, un billet de vélin portant un seul mot, écrit de toutes les mains à la fois.' });
}
