/**
 * Chapter I, scene 3: the penitent's cell (DESIGN.md §3.4, §3.12; C3). Isot is locked in
 * until the dawn bell. Through the squint, the anchoress Hild speaks. The raking light
 * shows the cell wall was once a doorway into the anchorhold; Hild breaks it down and
 * steps out of her cell for the first time in ten years.
 */

import { EbbNightAmbience } from '../audio/ambient';
import { hitSound } from '../audio/battleSfx';
import { windowArch } from '../pixel/buildings';
import { CHARACTERS } from '../pixel/characters';
import { bench, bucket, candle, pallet } from '../pixel/furniture';
import { GROUND_DEFAULT } from '../pixel/terrain';
import { breach, ghostDoorway, ghostText, rubble } from '../pixel/underwriting';
import { tiles } from '../world3d/stage';
import { backWall, FLOOR, moonThrough, nightInterior, sideWall } from './interior';
import type { MapContext, MapDef, Rect } from './types';

const GROUND = [
  '              ',
  '              ',
  ' ffffffffffff ',
  ' ffffffffffff ',
  ' ffffffffffff ',
  ' ffffffffffff ',
  ' ffffffffffff ',
  ' ffffffffffff ',
  '              ',
];

const WALL_Y = tiles(2);
const DOORWAY_X = tiles(4.6);
const SQUINT_X = tiles(8.6);
const WALL_H = 64;

export const CELL: MapDef = {
  id: 'cell',
  card: { title: { en: 'Saint Ebb’s', fr: 'Saint-Ebb' }, line: { en: 'The Penitent’s Cell', fr: 'La cellule du pénitent' } },
  walkable: 'f',
  ground: GROUND,
  bounds: { minX: tiles(7), maxX: tiles(7), minY: tiles(3.7), maxY: tiles(3.7) },
  camera: { h: 4, zoom: 4 / 3 },
  ambience: () => new EbbNightAmbience(),
  checkpoint: true,
  spawns: {
    start: { x: tiles(6.5), y: tiles(5.6), dir: 'up' },
  },
  build(r, st) {
    nightInterior(r, { ambient: 0.4, moon: 0.2 });
    st.ground({ ground: GROUND, heights: GROUND.map((row) => '0'.repeat(row.length)), seed: 22, palette: { ...GROUND_DEFAULT, stone: FLOOR.stone } });
    backWall(st, tiles(1), tiles(1), tiles(12), tiles(1), WALL_H, {
      seed: 41,
      windows: [{ x: tiles(10.6) - tiles(1), w: 8, h: 14, top: 6 }],
      door: { x: tiles(2) - tiles(1) - 10, w: 20, h: 34 },
      // The squint: a slit at eye height, warm with Hild's candle beyond.
      paint: (a) => windowArch(a, SQUINT_X - tiles(1) - 2, WALL_H - 38, 4, 8, { lit: 'warm', plain: true }, 'round'),
    });
    moonThrough(st, tiles(10.6) + 4, WALL_Y, WALL_H - 10, 30, 30);
    st.addLight(SQUINT_X, WALL_Y + 3, 34, 30, '#FFB060', 0.5, 'candle');
    sideWall(st, tiles(0.5), tiles(1), tiles(7), WALL_H);
    sideWall(st, tiles(13), tiles(1), tiles(7), WALL_H);
    const blocked: Rect[] = [];
    st.addArt(pallet(), tiles(10.5), tiles(6.4));
    blocked.push([tiles(10.5) - 17, tiles(6.4) - 4, 34, 5]);
    st.addArt(bucket(), tiles(2.4), tiles(6.8));
    blocked.push([tiles(2.4) - 5, tiles(6.8) - 3, 10, 4]);
    st.addArt(bench(22, 3), tiles(8.6), tiles(3.2));
    st.addArt(candle(), tiles(9.2), tiles(3.2) - 2, { h: 6 });
    st.addCandle(tiles(9.2), tiles(3.2) - 2, 13, 0.45, 44);
    blocked.push([tiles(8.6) - 11, tiles(3.2) - 4, 22, 5]);
    return { blocked };
  },
  npcs: [
    {
      id: 'hild',
      speaker: 'hild',
      spec: CHARACTERS.hild!,
      x: DOORWAY_X,
      y: WALL_Y - 6,
      dir: 'down',
      when: (c) => c.flag('wallDown') && !c.flag('hildJoined'),
    },
  ],
  things: [
    {
      id: 'squint',
      x: SQUINT_X,
      y: WALL_Y + 2,
      h: 36,
      reach: 30,
      run: async (c) => {
        if (c.flag('hildAsked')) {
          await c.say('hild', { en: 'Read the wall, child. Tilt the candle. You know how.', fr: 'Lis le mur, petite. Incline la bougie. Tu sais faire.' }, 'stern');
          return;
        }
        await c.say('hild', { en: 'You’re late. And you didn’t bring bread.', fr: 'Tu es en retard. Et tu n’as pas apporté de pain.' }, 'stern');
        await c.say('isot', { en: 'I’ve been sentenced to be scraped at dawn.', fr: 'J’ai été condamnée à être grattée à l’aube.' }, 'tired');
        await c.say('hild', { en: 'That’s no excuse for no bread.', fr: 'Ce n’est pas une raison pour ne pas apporter de pain.' }, 'wry');
        await c.say('hild', { en: 'Did you do it?', fr: 'C’est toi qui l’as fait ?' }, 'grave');
        if (c.flag('silent')) await c.say('isot', { en: '…I don’t know.', fr: '…Je ne sais pas.' }, 'sad');
        else await c.say('isot', { en: 'No.', fr: 'Non.' });
        await c.say('hild', { en: 'Hm. The hand that scrapes remembers, they say. Who do you remember, Isot?', fr: 'Hm. La main qui gratte se souvient, dit-on. De qui te souviens-tu, Isot ?' }, 'grave');
        await c.say('isot', { en: '…Brother Wystan. The librarian. Seventy years at that desk.', fr: '…Frère Wystan. Le bibliothécaire. Soixante-dix ans à ce pupitre.' }, 'sad');
        await c.say('hild', { en: 'Never heard of him.', fr: 'Jamais entendu parler.' });
        await c.say('isot', { en: 'No one has. That’s the point.', fr: 'Personne. C’est bien ça le problème.' }, 'wry');
        await c.say('hild', { en: 'You read scraped pages by tilting the candle. Read the wall.', fr: 'Tu lis les pages grattées en inclinant la bougie. Lis le mur.' }, 'stern');
        c.set('hildAsked');
        c.close();
        c.hint({ en: 'Near the wall, hold {rake} to tilt the candle.', fr: 'Près du mur, maintenez {rake} pour incliner la bougie.' }, { seconds: 14, until: 'rake' });
      },
    },
    {
      id: 'door',
      x: tiles(2),
      y: WALL_Y + 2,
      h: 36,
      when: (c) => !c.flag('wallDown'),
      run: async (c) => {
        await c.say('isot', { en: 'Barred from outside. They’ll come for me with the dawn bell.', fr: 'Barrée de l’extérieur. Ils viendront me chercher à la cloche de l’aube.' }, 'tired');
      },
    },
    {
      id: 'pallet',
      x: tiles(10.5),
      y: tiles(6.2),
      h: 10,
      run: async (c) => {
        await c.say('isot', { en: 'Straw, and someone else’s prayers in it.', fr: 'De la paille, et les prières de quelqu’un d’autre dedans.' }, 'sad');
      },
    },
  ],
  underwriting: [
    {
      id: 'doorway',
      x: DOORWAY_X,
      y: WALL_Y + 1,
      h: 0,
      art: ghostDoorway(26, 44),
      when: (c) => c.flag('hildAsked') && !c.flag('wallDown'),
      revealed: (c) => wallComesDown(c),
    },
    // A Glossator's cache, scratched small by the window.
    { id: 'name-joan', x: tiles(11), y: WALL_Y + 1, h: 30, art: ghostText([{ en: 'LITTLE JOAN', fr: 'PETITE JEANNE' }, { en: 'WHO NAMED THE HENS', fr: 'QUI NOMMAIT LES POULES' }]), lostName: 'joan' },
  ],
  exits: [
    {
      rect: [DOORWAY_X - 12, WALL_Y, 24, 6],
      to: 'cloister',
      spawn: 'church',
      when: (c) => c.flag('hildJoined'),
    },
  ],
  async enter(c, from) {
    if (from === 'start' && !c.flag('hildAsked')) {
      c.letterbox(true);
      await c.wait(1.6);
      await c.narrate({ en: 'The penitent’s cell. A pallet, a bucket, four walls. The brothers took her penknife.', fr: 'La cellule du pénitent. Une paillasse, un seau, quatre murs. Les frères lui ont pris son canif.' });
      await c.say('isot', { en: 'Not the one on the cord. That one was Wystan’s idea.', fr: 'Pas celui au bout du cordon. Celui-là, c’était une idée de Wystan.' }, 'wry');
      await c.say('isot', { en: 'Dawn is four hours off. And someone is breathing on the other side of this wall.', fr: 'L’aube est dans quatre heures. Et quelqu’un respire de l’autre côté de ce mur.' }, 'alarmed');
      c.letterbox(false);
    }
    if (c.flag('wallDown') && !c.flag('hildJoined')) showBreach(c);
  },
};

/** The breach and its rubble, once the wall is down. */
function showBreach(c: MapContext): void {
  const b = breach(30, 46);
  c.stage.addImage(b.a, DOORWAY_X, WALL_Y + 1, { h: 0, glow: b.e, shadow: false });
  c.stage.addImage(rubble(3), DOORWAY_X + 2, WALL_Y + 8);
  c.stage.addLight(DOORWAY_X, WALL_Y + 2, 20, 50, '#FFB060', 0.55, 'candle');
}

/** C3: the wall comes down. */
async function wallComesDown(c: MapContext): Promise<void> {
  c.letterbox(true);
  await c.say('isot', { en: 'A doorway. Bricked up, and plastered, and whitewashed over. It was a door, once.', fr: 'Une porte. Murée, plâtrée, blanchie à la chaux. C’était une porte, autrefois.' }, 'alarmed');
  await c.say('hild', { en: 'Stand back.', fr: 'Recule.' }, 'stern');
  await c.walk(c.player, [[c.player.x, Math.max(c.player.y, tiles(5.4))]]);
  c.face(c.player, 'up');
  await c.say('hild', { en: 'Ten years I’ve looked at the world through a hole the size of my hand.', fr: 'Dix ans que je regarde le monde par un trou de la taille de ma main.' }, 'grave');
  for (let i = 0; i < 3; i++) {
    c.shake(4 + i * 2, 0.35);
    hitSound(c.audio, 1.4);
    await c.wait(0.55);
  }
  c.flash(0.9);
  c.shake(10, 0.8);
  c.set('wallDown');
  showBreach(c);
  await c.wait(1.2);
  const hild = c.npc('hild');
  hild.visible = true;
  await c.walk(hild, [
    [DOORWAY_X, WALL_Y + 6],
    [DOORWAY_X + 4, WALL_Y + 22],
  ]);
  await c.say('hild', { en: 'It looked smaller then.', fr: 'Il paraissait plus petit, à l’époque.' }, 'wry');
  await c.say('hild', { en: 'It was.', fr: 'Il l’était.' }, 'warm');
  await c.say('isot', { en: 'You’ve broken your own wall.', fr: 'Vous avez cassé votre propre mur.' }, 'alarmed');
  await c.say('hild', { en: 'An anchoress keeps a vow to stay. I kept it ten years, for a reason I’ve stopped believing. Through the church, child. The cloister, then the sea gate.', fr: 'Une recluse fait vœu de rester. Je l’ai tenu dix ans, pour une raison à laquelle je ne crois plus. Par l’église, petite. Le cloître, puis la porte de la mer.' }, 'grave');
  c.join('hild', hild);
  c.set('hildJoined');
  await c.find('anchorStone', { en: 'A chip of the wall she broke down lies at Isot’s feet. She pockets it.', fr: 'Un éclat du mur qu’elle a abattu gît aux pieds d’Isot. Elle le met dans sa poche.' });
  c.letterbox(false);
}
