/**
 * Chapter III, scene 3: Ninefold Gate (DESIGN.md §3.6). The gatehouse stands at the edge
 * of the blank, half of it already forgotten. Prior Gaudry and Sister Ermeline are waiting
 * with two Pumice Brothers: the Abbot wants his sister home, and the knight put back
 * where he was. Hild looks, for the first time in ten years, and learns Squint (F6).
 * Afterwards Gaudry falls back, and Ermeline climbs the ridge with her pumice blade.
 */

import { BlanchwoodAmbience } from '../../audio/blanchwood';
import { CHARACTERS } from '../../pixel/characters';
import { ninefoldGate } from '../../world3d/blanchwood';
import { relief } from '../../world3d/relief';
import { tiles } from '../../world3d/stage';
import type { MapContext, MapDef } from '../types';
import { blanchedTree, setDepth, WOOD_GROUND, WOOD_SKY, woodLight } from './common';

const W = 30;
const H = 13;
const GROUND = Array.from({ length: H }, (_, y) => Array.from({ length: W }, (_, x) => (y >= 6 && y <= 8 && x > 3 ? 'd' : 'v')).join(''));
const GATE: [number, number] = [tiles(22), tiles(4.4)];
const ROAD_Y = tiles(7.4);

const waiting = (c: MapContext) => !c.cleared('f6');

// The faded wood banks up behind the road; the gate stands at the road's level, the bank
// rising behind it.
const HEIGHTS = relief(W, H, [
  { at: [0, 0, 18, 4], h: 2, ragged: 's' },
  { at: [26, 0, 4, 4], h: 2, ragged: 's' },
  { at: [18, 0, 8, 2], h: 2 },
  { at: [0, 0, W, 2], h: 3, ragged: 's' },
], 41);

export const GATEHOUSE: MapDef = {
  id: 'gate',
  card: { title: { en: 'Ninefold Gate', fr: 'La porte de Ninefold' }, line: { en: 'Half of it already forgotten', fr: 'À moitié oubliée déjà' } },
  walkable: 'vd',
  ground: GROUND,
  heights: HEIGHTS,
  bounds: { minX: tiles(13.4), maxX: tiles(W - 13.4), minY: tiles(6.4), maxY: tiles(6.4) },
  camera: { h: 4 },
  ambience: () => new BlanchwoodAmbience({ depth: () => 0.62 }),
  checkpoint: true,
  candle: false,
  spawns: { west: { x: tiles(1.6), y: ROAD_Y, dir: 'right' } },
  build(r, st) {
    woodLight(r, 0.62);
    st.ground({ ground: GROUND, heights: HEIGHTS, seed: 41, palette: WOOD_GROUND });
    st.addSky({ ...WOOD_SKY }, 200);
    st.addArt(ninefoldGate(), GATE[0], GATE[1], { solid: false });
    for (let i = 0; i < 6; i++) st.addImage(blanchedTree(i + 71, 0.35 + i * 0.07), tiles(2 + i * 2.6), tiles(2.6) + (i % 2) * 10);
    for (let i = 0; i < 4; i++) st.addImage(blanchedTree(i + 81, 0.5 + i * 0.08), tiles(4 + i * 6), tiles(11.8));
    st.addEmitter({ kind: 'mote', area: [0, 0, tiles(W), tiles(H)], heights: [2, 50], count: 26, color: '#F8F4EC', size: 1.4, intensity: 0.35 }, 29);
    return { blocked: [[GATE[0] - 60, GATE[1] - 6, 26, 8] as [number, number, number, number], [GATE[0] + 34, GATE[1] - 6, 26, 8] as [number, number, number, number]] };
  },
  npcs: [
    { id: 'gaudry', speaker: 'gaudry', spec: CHARACTERS.gaudry!, x: tiles(19.6), y: ROAD_Y, dir: 'left', when: (c) => !c.flag('blanchingBegun') },
    { id: 'ermeline', speaker: 'ermeline', spec: CHARACTERS.ermeline!, x: tiles(22.4), y: ROAD_Y - 14, dir: 'left', when: (c) => !c.flag('blanchingBegun') },
    { id: 'brotherA', speaker: 'brother', spec: CHARACTERS.brother!, x: tiles(20.8), y: ROAD_Y + 12, dir: 'left', when: waiting },
    { id: 'brotherB', speaker: 'brother', spec: CHARACTERS.brother!, x: tiles(21.4), y: ROAD_Y - 6, dir: 'left', when: waiting },
  ],
  zones: [
    {
      id: 'meeting',
      rect: [tiles(12), 0, tiles(2), tiles(H)],
      when: waiting,
      run: (c) => theMeeting(c),
    },
  ],
  async enter(c, from) {
    setDepth(c.r, 0.62);
    if (from === 'battle:f6' && !c.flag('blanchingBegun')) await afterTheGate(c);
    // Loaded from a save after the Blanching began: the wave is still coming.
    else if (c.flag('blanchingBegun')) c.goto(c.flag('escaped') ? 'chapel' : 'flight', c.flag('escaped') ? 'door' : 'start');
  },
};

async function theMeeting(c: MapContext): Promise<void> {
  c.letterbox(true);
  await c.pan(tiles(17), ROAD_Y, 1.2);
  await c.say('gaudry', { en: 'Sister Hild. You’ve grown thin on the road.', fr: 'Sœur Hild. Tu as maigri sur la route.' });
  await c.say('gaudry', { en: 'The Abbot bids his sister come home. And bids the knight be put back where he was.', fr: 'L’abbé prie sa sœur de rentrer. Et prie qu’on remette le chevalier là où il était.' });
  await c.say('isot', { en: 'His… sister?', fr: 'Sa… sœur ?' }, 'alarmed');
  await c.say('ermeline', { en: '…Agnes, Cole, Wenna, Osgar… I’m sorry. I’m sorry. Hold still and it won’t take long.', fr: '…Agnès, Cole, Wenna, Osgar… Pardon. Pardon. Ne bouge pas et ce ne sera pas long.' });
  const hild = c.party.find((a) => a.id === 'hild');
  if (hild) hild.emote('silence', 2.4);
  await c.say('hild', { en: 'I’ve spent ten years not looking at things. Let me look.', fr: 'J’ai passé dix ans à ne pas regarder les choses. Laissez-moi regarder.' }, 'grave');
  await c.narrate({ en: 'Hild narrows her eyes the way an anchoress looks through the squint in her wall, at the altar, at what is hidden.', fr: 'Hild plisse les yeux comme une recluse regarde par l’hagioscope de son mur, vers l’autel, vers ce qui est caché.' });
  c.release();
  c.letterbox(false);
  await c.learn('hild', 'squint');
  await c.say('hild', { en: 'His edicts come sealed. I can read them now. All of them, and the next ones too.', fr: 'Ses édits arrivent scellés. Je peux les lire, maintenant. Tous, et les suivants aussi.' }, 'stern');
  c.battle('f6');
}

async function afterTheGate(c: MapContext): Promise<void> {
  c.letterbox(true);
  await c.wait(0.6);
  await c.say('isot', { en: 'Your brother. The Abbot is your brother.', fr: 'Ton frère. L’abbé est ton frère.' }, 'stern');
  await c.say('hild', { en: 'I raised him on bread and psalms. He was a kind boy. Kindness is a dangerous thing in a powerful man.', fr: 'Je l’ai élevé au pain et aux psaumes. C’était un garçon gentil. La gentillesse est une chose dangereuse chez un homme puissant.' }, 'grave');
  await c.say('isot', { en: 'Anything else you’d like to mention?', fr: 'Autre chose que tu voudrais mentionner ?' }, 'wry');
  await c.say('hild', { en: 'Not yet.', fr: 'Pas encore.' }, 'sad');
  c.shake(2, 0.6);
  const g = c.npc('gaudry');
  await c.say('gaudry', { en: 'Go on, then. Run to the Reader’s house. Ninefold was a rehearsal.', fr: 'Allez-y, alors. Courez à la maison du Lecteur. Ninefold n’était qu’une répétition.' });
  void c.walk(g, [[g.x + 60, g.y + 4]]);
  const e = c.npc('ermeline');
  await c.walk(e, [[e.x + 30, e.y - 34]]);
  c.face(e, 'left');
  await c.say('ermeline', { en: '…Agnes, Cole, Wenna… I’m sorry. Hold still.', fr: '…Agnès, Cole, Wenna… Pardon. Ne bougez pas.' });
  c.set('blanchingBegun');
  c.flash(0.9);
  c.shake(5, 1.2);
  await c.narrate({ en: 'She lifts the pumice blade and scrapes the air, and a strip of the wood behind the gate is gone, the way a line is gone.', fr: 'Elle lève la lame de ponce et gratte l’air, et une bande du bois derrière la porte disparaît, comme disparaît une ligne.' });
  await c.say('whit', { en: 'Run.', fr: 'Courez.' });
  c.goto('flight', 'start');
}
