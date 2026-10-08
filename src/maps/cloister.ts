/**
 * Chapter I, scene 5: the cloister by moonlight (DESIGN.md §3.4). Two Pumice Brothers
 * bar the garth (F2). The alarm bell rings; the raking light finds the door painted over
 * in the year of the Mercy, the old stair down to the sea gate; the flight.
 */

import { EbbNightAmbience } from '../audio/ambient';
import { bell, midiToHz } from '../audio/instruments';
import { door as paintDoor, newArt } from '../pixel/buildings';
import { CHARACTERS } from '../pixel/characters';
import { wellHead } from '../pixel/furniture';
import { bush, yewTree } from '../pixel/nature';
import { hex, ramp } from '../pixel/pixel';
import { stoneCross } from '../pixel/props';
import { GROUND_DEFAULT } from '../pixel/terrain';
import { ghostDoor, ghostText } from '../pixel/underwriting';
import { NIGHT_SKY } from '../world3d/sky';
import { tiles } from '../world3d/stage';
import { backWall, dawnInterior, sideWall } from './interior';
import type { MapContext, MapDef, Rect } from './types';

const GROUND = [
  '                            ',
  '                            ',
  ' ffffffffffffffffffffffffff ',
  ' ff.........ff.........ffff ',
  ' ff.........ff.........ffff ',
  ' ff.........ff.........ffff ',
  ' ffffffffffffffffffffffffff ',
  ' ffffffffffffffffffffffffff ',
  ' ff.........ff.........ffff ',
  ' ff.........ff.........ffff ',
  ' ff.........ff.........ffff ',
  ' ffffffffffffffffffffffffff ',
  '                            ',
];

export const WALL_Y = tiles(2);
const WALL_H = 72;
const PAINTED_X = tiles(2.6);
export const CHURCH_X = tiles(25);
export const WELL: [number, number] = [tiles(13), tiles(7.6)];

/** The cloister arcade: round arches on short columns, the dark walk behind them. */
export function arcade(a: ReturnType<typeof newArt>, w: number, h: number): void {
  const st = ramp('#9A948A', 6);
  const dark = hex('#0C0E16');
  const span = 26;
  const top = 14;
  const foot = h - 7;
  for (let x0 = 14; x0 + span < w - 40; x0 += span + 6) {
    const r = span / 2;
    for (let y = top; y < foot; y++) {
      for (let x = x0; x < x0 + span; x++) {
        const inside = y >= top + r ? true : (x + 0.5 - (x0 + r)) ** 2 + (y + 0.5 - (top + r)) ** 2 <= r * r;
        if (!inside) continue;
        // The walk's back wall, faintly moonlit low down.
        const k = (y - top) / (foot - top);
        a.a.set(x, y, k > 0.75 ? [dark[0] + 10, dark[1] + 12, dark[2] + 20, 255] : dark);
      }
    }
    // Voussoirs and the capital of the column between this arch and the next.
    for (let x = x0 - 1; x <= x0 + span; x++) {
      const dy = Math.sqrt(Math.max(0, r * r - (x + 0.5 - (x0 + r)) ** 2));
      const y = Math.round(top + r - dy) - 1;
      a.a.set(x, y, st[5]!);
      a.a.set(x, y - 1, st[3]!);
    }
    const cx = x0 + span + 1;
    for (let y = top + r; y < foot; y++) for (let x = cx; x < cx + 4; x++) a.a.set(x, y, st[x === cx ? 5 : 2]!);
    for (let x = cx - 2; x < cx + 6; x++) {
      a.a.set(x, top + r - 1, st[4]!);
      a.a.set(x, top + r, st[1]!);
    }
  }
}

/** Build the garth as it is at dawn on Ebba's feast (chapter V). */
let dawn = false;
export function cloisterAtDawn(on: boolean): void {
  dawn = on;
}

export const CLOISTER: MapDef = {
  id: 'cloister',
  caches: [
    {
      id: 'cloister',
      x: tiles(26.3),
      y: tiles(10.8),
      hidden: true,
      pennies: 5,
      satchel: { waxSeal: 1 },
      note: { en: '“The Abbot counts the candles. He does not count the chalk.”', fr: '« L’abbé compte les chandelles. Il ne compte pas la craie. »' },
    },
  ],
  card: { title: { en: 'Saint Ebb’s', fr: 'Saint-Ebb' }, line: { en: 'The Cloister, by moonlight', fr: 'Le cloître, au clair de lune' } },
  walkable: 'f.',
  ground: GROUND,
  bounds: { minX: tiles(14), maxX: tiles(14), minY: tiles(5.6), maxY: tiles(5.6) },
  camera: { h: 4 },
  ambience: () => new EbbNightAmbience(),
  checkpoint: true,
  candle: true,
  spawns: {
    church: { x: CHURCH_X, y: WALL_Y + 18, dir: 'down' },
  },
  build(r, st) {
    r.atmosphere = {
      sky: [0.34, 0.4, 0.66],
      ground: [0.1, 0.1, 0.16],
      ambient: 0.5,
      key: [0.62, 0.72, 1],
      keyLevel: 0.62,
      keyDir: [0.42, -0.82, -0.3],
      fogColor: [0.12, 0.16, 0.28],
      fogDist: [160, 640],
      fogMax: 0.4,
      mist: [8, 0.45, 0.008],
      mistDrift: [0.03, 0.01],
      background: [0.02, 0.03, 0.08],
    };
    r.grade = { exposure: 1.14, contrast: 1.06, saturation: 1.05, lift: [0.01, 0.015, 0.045], gain: [0.97, 1, 1.05], vignette: 1, grain: 0.02, bloom: 0.9, bloomThreshold: 0.74, dof: 0.8, focusBand: 100, focusRange: 300 };
    st.ground({ ground: GROUND, heights: GROUND.map((row) => '0'.repeat(row.length)), seed: 33, palette: { ...GROUND_DEFAULT, grass: '#4E7E48', stone: '#8A8680' } });
    if (dawn) {
      dawnInterior(r, { outdoor: true });
      st.addSky({ top: '#7A6A9A', horizon: '#F4B8A0', moon: null, stars: 0, clouds: 0.6, cloudColor: '#F8D0C0' });
    } else st.addSky({ ...NIGHT_SKY, moon: [140, 150] });
    const w = tiles(26);
    backWall(st, tiles(1), tiles(1), w, tiles(1), WALL_H, {
      seed: 51,
      door: { x: CHURCH_X - tiles(1) - 11, w: 22, h: 40, open: true },
      paint: (a) => arcade(a, w, WALL_H),
    });
    sideWall(st, tiles(0.5), tiles(1), tiles(11), WALL_H);
    sideWall(st, tiles(27), tiles(1), tiles(11), WALL_H);
    const blocked: Rect[] = [];
    st.addArt(wellHead(), ...WELL);
    blocked.push([WELL[0] - 15, WELL[1] - 6, 30, 7]);
    st.addImage(yewTree(5), tiles(5.6), tiles(5.4));
    blocked.push([tiles(5.6) - 8, tiles(5.4) - 4, 16, 5]);
    st.addImage(yewTree(8), tiles(20.4), tiles(9.6));
    blocked.push([tiles(20.4) - 8, tiles(9.6) - 4, 16, 5]);
    st.addImage(bush(6, 'holly'), tiles(9.5), tiles(10.4));
    st.addArt(stoneCross(7), tiles(18), tiles(4.6));
    blocked.push([tiles(18) - 5, tiles(4.6) - 3, 10, 4]);
    st.scatter('tuft', '.', 3, 4, blocked);
    st.scatter('flowers', '.', 0.6, 9, blocked);
    st.addEmitter({ kind: 'mote', area: [tiles(1), tiles(3), tiles(26), tiles(8)], heights: [2, 40], count: 30, color: '#B8C8F0', size: 1.6, intensity: 0.3 }, 7);
    return { blocked };
  },
  npcs: [
    { id: 'brotherA', speaker: 'brother', spec: CHARACTERS.brother!, x: tiles(8), y: tiles(6.8), dir: 'right', when: (c) => !c.cleared('f2') },
    { id: 'brotherB', speaker: 'brother', spec: CHARACTERS.brother!, x: tiles(9), y: tiles(7.9), dir: 'right', when: (c) => !c.cleared('f2') },
  ],
  zones: [
    {
      id: 'brothers',
      rect: [tiles(1), tiles(2), tiles(16), tiles(10)],
      when: (c) => !c.cleared('f2'),
      run: async (c) => {
        c.letterbox(true);
        const a = c.npc('brotherA');
        c.emote(a, 'alarm');
        await c.pan(tiles(11), tiles(7), 0.8);
        await c.say('brother', { en: 'There! The scribe. And the anchoress, out of her wall!', fr: 'Là ! La scribe. Et la recluse, sortie de son mur !' });
        await c.say('brother', { en: 'Back to your cell, mother. You took a vow.', fr: 'Retournez dans votre cellule, ma mère. Vous avez fait un vœu.' });
        await c.say('hild', { en: 'I took it back.', fr: 'Je l’ai repris.' }, 'stern');
        await c.say('hild', { en: 'Behind me, child. Watch where their blows are aimed, and step out of the way.', fr: 'Derrière moi, petite. Regarde où visent leurs coups, et écarte-toi.' }, 'grave');
        c.battle('f2');
      },
    },
  ],
  things: [
    {
      id: 'well',
      x: WELL[0],
      y: WELL[1],
      h: 30,
      run: async (c) => {
        await c.say('isot', { en: 'The well. Brother Wystan used to say the sea gets into it at the spring tides, and that it does the ale no harm.', fr: 'Le puits. Frère Wystan disait que la mer s’y glisse aux grandes marées, et que ça ne fait pas de mal à la bière.' }, 'sad');
      },
    },
    {
      id: 'arcade',
      x: tiles(14),
      y: WALL_Y + 2,
      h: 40,
      run: async (c) => {
        await c.say('isot', { en: 'Torches, at the far end of the walk. Not yet.', fr: 'Des torches, au bout de la galerie. Pas encore.' }, 'alarmed');
      },
    },
  ],
  underwriting: [
    {
      id: 'paintedDoor',
      x: PAINTED_X,
      y: WALL_Y + 1,
      h: 0,
      art: ghostDoor(22, 38),
      when: (c) => c.cleared('f2'),
      revealed: (c) => theFlight(c),
    },
    { id: 'name-osric', x: CHURCH_X - tiles(3.4), y: WALL_Y + 1, h: 34, art: ghostText([{ en: 'BROTHER OSRIC', fr: 'FRERE OSRIC' }, { en: 'WHO SANG FLAT', fr: 'QUI CHANTAIT FAUX' }]), lostName: 'osric' },
  ],
  async enter(c, from) {
    if (from === 'church' && !c.cleared('f2')) {
      await c.say('hild', { en: 'The cloister. I’d forgotten how big the sky is.', fr: 'Le cloître. J’avais oublié comme le ciel est grand.' }, 'warm');
    }
    if (from === 'battle:f2') {
      c.letterbox(true);
      tollAlarm(c);
      await c.wait(1);
      await c.say('isot', { en: 'The alarm bell. Every brother in Saint Ebb’s will be awake.', fr: 'La cloche d’alarme. Tous les frères de Saint-Ebb vont se réveiller.' }, 'alarmed');
      await c.say('hild', { en: 'There was a stair down to the sea gate, when I was young. They painted the door over, the year of the Mercy. The west wall.', fr: 'Il y avait un escalier jusqu’à la Porte de la Mer, quand j’étais jeune. Ils ont peint par-dessus, l’année de la Miséricorde. Le mur ouest.' }, 'grave');
      await c.say('isot', { en: 'Painted over. Then the candle will find it.', fr: 'Sous la peinture ? Alors la bougie la trouvera.' }, 'stern');
      c.letterbox(false);
    }
    if (c.flag('seen.paintedDoor')) openDoor(c);
  },
};

function tollAlarm(c: MapContext): void {
  const ctx = c.audio.ctx;
  if (!ctx) return;
  for (let i = 0; i < 4; i++) {
    bell(ctx, c.audio.bus('sfx'), midiToHz(57), ctx.currentTime + i * 0.9, 0.3, 4);
    bell(ctx, c.audio.reverbIn, midiToHz(57), ctx.currentTime + i * 0.9, 0.2, 4);
  }
}

function openDoor(c: MapContext): void {
  const art = newArt(30, 46);
  paintDoor(art, 4, 4, 22, 38, { kind: 'round', open: true });
  c.stage.addArt({ ...art, anchor: [15, 44] }, PAINTED_X, WALL_Y + 1, { h: 0 });
}

/** The flight from Saint Ebb's, down the old stair and under the falling portcullis. */
async function theFlight(c: MapContext): Promise<void> {
  c.letterbox(true);
  await c.say('isot', { en: 'Here. A door under the whitewash, and a Glossator’s chalk on the keystone.', fr: 'Là. Une porte sous la chaux, et la craie d’un Glossateur sur la clé de voûte.' }, 'alarmed');
  c.shake(3, 0.5);
  openDoor(c);
  await c.wait(0.6);
  tollAlarm(c);
  await c.narrate({ en: 'Down the stair in the dark, the alarm ringing over their heads, torches in the cloister behind them.', fr: 'Dans l’escalier, dans le noir, l’alarme sonnant au-dessus d’eux, des torches dans le cloître derrière.' });
  c.shake(6, 1.2);
  await c.narrate({ en: 'At the foot of it, the sea gate. Its portcullis is coming down.', fr: 'En bas, la Porte de la Mer. Sa herse s’abaisse.' });
  c.flash(0.6);
  c.shake(10, 0.6);
  await c.narrate({ en: 'They roll under it as it drops.', fr: 'Ils roulent dessous au moment où elle tombe.' });
  c.save();
  c.goto('seaGate', 'start');
}
