/**
 * Chapter IV, scene 4: the Drollery Fair (DESIGN.md §3.7). The forgotten act out the world
 * upside down: a hare hunts a hunter, a knight flees a snail, and the Abbot of Unreason,
 * a fox in a mitre, preaches to geese. Half the Court of Unreason is Ninefold, forgotten
 * for a hundred and fifty years; most of them are gentle and confused, and they ask Whit
 * if he is the Reader. If Isot scraped Amabel, she is here as a small hen. An optional
 * fight (F8) guards a Lost Name.
 */

import { MarginAmbience } from '../../audio/margin';
import { CHARACTERS } from '../../pixel/characters';
import { enemyStill } from '../../pixel/enemies';
import { ghostWords } from '../../pixel/underwriting';
import { session } from '../../engine/session';
import type { Billboard } from '../../world3d/billboard';
import { goldBar, goose, hen, ivy } from '../../world3d/margin';
import { relief } from '../../world3d/relief';
import { tiles } from '../../world3d/stage';
import { pedlar } from '../gervase';
import type { MapContext, MapDef, NpcDef } from '../types';
import { acanthusRow, MARGIN_GROUND, MARGIN_SKY, marginLight, pageAbove } from './common';

const W = 46;
const H = 16;
const GROUND = Array.from({ length: H }, () => 'o'.repeat(W));
const PULPIT: [number, number] = [tiles(14), tiles(5)];
const ALCOVE: [number, number] = [tiles(40), tiles(3.6)];
const HEN: [number, number] = [tiles(36), tiles(11)];

const ninefolder = (id: string, x: number, y: number, fray: number, spec = CHARACTERS.villager!): NpcDef => ({ id, speaker: 'villager', spec, x: tiles(x), y: tiles(y), dir: 'down', fray });

let guards: Billboard[] = [];
// Gervase, trading among the forgotten, who take him for one of their own.
const GERVASE = pedlar('fair', tiles(10.2), tiles(11.8), 'down');

// The gold stands up on its gesso behind the fair; the Court's alcove keeps the ground's level.
const HEIGHTS = relief(W, H, [
  { at: [0, 0, 36, 3], h: 2, ragged: 's' },
  { at: [36, 0, 10, 2], h: 2 },
  { at: [0, 0, W, 1], h: 3 },
], 77);

export const FAIR: MapDef = {
  id: 'fair',
  card: { title: { en: 'The Margin', fr: 'La Marge' }, line: { en: 'The Drollery Fair', fr: 'La foire aux drôleries' } },
  walkable: 'o',
  ground: GROUND,
  heights: HEIGHTS,
  bounds: { minX: tiles(13.4), maxX: tiles(W - 13.4), minY: tiles(6.4), maxY: tiles(9.6) },
  camera: { h: 4 },
  ambience: () => new MarginAmbience(),
  checkpoint: true,
  candle: false,
  spawns: { west: { x: tiles(1.6), y: tiles(8), dir: 'right' } },
  build(r, st) {
    marginLight(r);
    st.ground({ ground: GROUND, heights: HEIGHTS, seed: 77, palette: MARGIN_GROUND });
    st.addSky({ ...MARGIN_SKY }, 220);
    pageAbove(st, tiles(W));
    acanthusRow(st, 0, tiles(W), tiles(2.2), 21, 84);
    acanthusRow(st, tiles(1), tiles(W), tiles(16.4), 27, 120, 0.9);
    for (let x = 0; x < tiles(W); x += 120) st.addImage(goldBar(110, 14, x), x + 55, tiles(1.2));
    for (let x = tiles(4); x < tiles(W); x += 150) st.addImage(ivy(80, x), x, tiles(13.4), { solid: false });
    // The Abbot's congregation of geese, in rows before his pulpit.
    for (let i = 0; i < 7; i++) st.addImage(goose(i), PULPIT[0] - 30 + (i % 4) * 18, PULPIT[1] + 22 + Math.floor(i / 4) * 14, { flip: false });
    st.addImage(goldBar(30, 10, 9), PULPIT[0], PULPIT[1] + 6, { h: 0 });
    // The world upside down: a hare with a bow after a hunter, a snail after a knight.
    const hare = enemyStill('hare');
    if (hare) st.addImage(hare, tiles(27), tiles(9.2), { flip: true });
    const snail = enemyStill('greatSnail');
    if (snail) {
      const b = st.addImage(snail, tiles(34.4), tiles(5.4), { flip: true });
      b.scale = 0.5;
      b.sync();
    }
    if (session.game.flags.amabelScraped) st.addImage(hen(), HEN[0], HEN[1]);
    // In the alcove, the Court's guard round a Glossator's cache.
    guards = [];
    if (!session.game.cleared.includes('f8'))
      for (const [kind, dx, dy] of [
        ['babewyn', -26, 6],
        ['bishopFish', 0, 0],
        ['snail', 24, 8],
      ] as const) {
        const img = enemyStill(kind === 'snail' ? 'greatSnail' : kind);
        if (!img) continue;
        const b = st.addImage(img, ALCOVE[0] + dx, ALCOVE[1] + dy, { flip: true });
        if (kind === 'snail') {
          b.scale = 0.45;
          b.sync();
        }
        guards.push(b);
      }
    st.addEmitter({ kind: 'glint', area: [0, tiles(1), tiles(W), tiles(14)], heights: [2, 60], count: 34, color: '#FFF4C8', size: 1.6, intensity: 1.2 }, 37);
    return { blocked: [[PULPIT[0] - 15, PULPIT[1], 30, 8]] };
  },
  npcs: [
    { id: 'abbot', speaker: 'abbotUnreason', spec: CHARACTERS.abbotUnreason!, x: PULPIT[0], y: PULPIT[1], dir: 'down' },
    { id: 'hunter', speaker: 'villager', spec: CHARACTERS.hunter!, x: tiles(24.6), y: tiles(9), dir: 'left' },
    { id: 'knight', speaker: 'villager', spec: { ...CHARACTERS.george!, id: 'fleeingKnight', mask: undefined, cross: undefined, robe: '#C63D2A' }, x: tiles(31.6), y: tiles(5.2), dir: 'left' },
    ninefolder('folk1', 7, 10.4, 0.35),
    ninefolder('folk2', 19, 11.6, 0.45, CHARACTERS.goodwife!),
    ninefolder('folk3', 29, 12, 0.3),
    ninefolder('folk4', 22, 6.4, 0.5, CHARACTERS.goodwife!),
    GERVASE.npc,
  ],
  things: [
    GERVASE.thing,
    {
      id: 'abbot',
      x: PULPIT[0],
      y: PULPIT[1] + 4,
      h: 40,
      reach: 30,
      run: async (c) => {
        await c.say('abbotUnreason', { en: 'Brothers, sisters, ganders! Today’s text: the world is upside down, and it is lovely here, and nobody ends.', fr: 'Mes frères, mes sœurs, mes jars ! Le texte du jour : le monde est à l’envers, il fait bon ici, et personne ne finit.' });
        await c.say('abbotUnreason', { en: 'Oh. Oh, look. A knight with a blank shield. Are you the Reader? Is it time?', fr: 'Oh. Oh, regardez. Un chevalier au bouclier blanc. Êtes-vous le Lecteur ? Est-ce l’heure ?' });
        await c.say('whit', { en: 'I don’t know yet.', fr: 'Je ne sais pas encore.' });
        await c.say('abbotUnreason', { en: 'That’s what the Reader would say. Go and see the old ape on the vine. He knows the way down.', fr: 'C’est ce que dirait le Lecteur. Allez voir le vieux singe sur la vigne. Il connaît le chemin du fond.' });
      },
    },
    {
      id: 'hunter',
      x: tiles(25.6),
      y: tiles(9.2),
      h: 40,
      run: async (c) => {
        await c.say('villager', { en: 'Keep going round, keep going round! If it catches me it has to start again, and so do I.', fr: 'On tourne, on tourne ! S’il m’attrape il doit tout recommencer, et moi aussi.' });
        await c.say('isot', { en: 'The hare hunts the hunter. The margins of every psalter in the Abbey are full of this.', fr: 'Le lièvre chasse le chasseur. Les marges de tous les psautiers de l’Abbaye en sont pleines.' }, 'wry');
      },
    },
    {
      id: 'knight',
      x: tiles(32.6),
      y: tiles(5.4),
      h: 40,
      run: async (c) => {
        await c.say('villager', { en: 'Don’t look at it! It’s the slowest thing in the world and it’s never once stopped.', fr: 'Ne le regardez pas ! C’est la chose la plus lente du monde et elle ne s’est jamais arrêtée.' });
        await c.say('whit', { en: 'I would run too.', fr: 'Je courrais aussi.' });
      },
    },
    {
      id: 'folk',
      x: tiles(19),
      y: tiles(11.8),
      h: 36,
      run: async (c) => {
        await c.say('villager', { en: 'We were Ninefold. I think. There was bread. Are you the Reader? Is it time?', fr: 'Nous étions Ninefold. Je crois. Il y avait du pain. Êtes-vous le Lecteur ? Est-ce l’heure ?' });
        await c.say('villager', { en: 'We don’t want to go back. Only to be read. To be finished properly, like a good sentence.', fr: 'Nous ne voulons pas revenir. Seulement être lus. Être finis comme il faut, comme une bonne phrase.' });
        await c.say('isot', { en: 'They’re not asking to come home. They want an ending.', fr: 'Ils ne demandent pas à rentrer. Ils veulent une fin.' }, 'sad');
      },
    },
    {
      id: 'hen',
      x: HEN[0],
      y: HEN[1] + 2,
      h: 14,
      when: (c) => c.flag('amabelScraped'),
      run: async (c) => {
        await c.narrate({ en: 'A little brown hen comes and stands on Isot’s foot.', fr: 'Une petite poule brune vient se poser sur le pied d’Isot.' });
        await c.say('amabel', { en: 'Bok. …Isot? It’s me, love. It doesn’t hurt here. I just can’t remember Hob’s face.', fr: 'Bok. …Isot ? C’est moi, ma belle. Ça ne fait pas mal ici. Je ne me souviens juste plus du visage de Hob.' });
        await c.say('isot', { en: 'I’ll write you back. I promise. With his hand in yours.', fr: 'Je te réécrirai. Promis. Avec sa main dans la tienne.' }, 'sad');
        c.set('amabelFound');
      },
    },
    {
      id: 'court',
      x: ALCOVE[0],
      y: ALCOVE[1] + 10,
      h: 30,
      reach: 34,
      when: (c) => !c.cleared('f8'),
      run: async (c) => {
        await c.say('bishop', { en: 'Halt, pilgrims. This corner of the Court keeps a name for the Reader, and the Court is not sure you are him.', fr: 'Halte, pèlerins. Ce coin de la Cour garde un nom pour le Lecteur, et la Cour n’est pas sûre que ce soit vous.' });
        const pick = await c.choose([
          { en: 'Prove it to them.', fr: 'Le leur prouver.' },
          { en: 'Leave them be.', fr: 'Les laisser tranquilles.' },
        ]);
        if (pick === 0) c.battle('f8');
      },
    },
  ],
  underwriting: [
    { id: 'name-fishers', x: tiles(6), y: tiles(1.3), h: 16, art: ghostWords(['NELL AND TOM FISHER', 'WHO ARGUED SIXTY YEARS'], true), lostName: 'fishers' },
    { id: 'name-cutha', x: ALCOVE[0], y: ALCOVE[1] - 6, h: 20, art: ghostWords(['OLD CUTHA', 'WHO TOLD THE BEES'], true), lostName: 'cutha', when: (c) => c.cleared('f8') },
  ],
  exits: [{ rect: [tiles(W - 0.6), tiles(5), tiles(0.6), tiles(6)], to: 'vine', spawn: 'west' }],
  async enter(c: MapContext, from) {
    if (from === 'battle:f8') {
      for (const g of guards) g.visible = false;
      c.letterbox(true);
      await c.say('bishop', { en: 'Well blessed. The name is yours to read, if you tilt your candle.', fr: 'Bien béni. Le nom est à vous, si vous inclinez votre bougie.' });
      c.letterbox(false);
    }
    if (from === 'west' && !c.flag('fairSeen')) {
      c.set('fairSeen');
      c.letterbox(true);
      await c.wait(1);
      await c.narrate({ en: 'The Drollery Fair: everything the world forgot, putting on a show for no one in particular.', fr: 'La foire aux drôleries : tout ce que le monde a oublié, donnant un spectacle pour personne en particulier.' });
      c.letterbox(false);
    }
  },
};
