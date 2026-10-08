/**
 * Chapter V, scene 1: the scriptorium at dawn on the Feast of Saint Ebba (DESIGN.md §3.8; C12).
 * The party climbs out of Wystan's psalter the way the grylli did in chapter I. MERCY, the
 * Abbot's great bell of thirty-nine melted bells, tolls for the first time, and a white
 * ring spreads across the fens. At low tide Eadgyth's Fen Fyrd storms the causeway. The
 * lectern is bare: Aumery has carried the Book into the church. The raking light reads
 * the scraped second half of the Abbey motto on it.
 */

import { EbbNightAmbience } from '../../audio/ambient';
import { bell, midiToHz } from '../../audio/instruments';
import { ghostWords } from '../../pixel/underwriting';
import { DOOR_X, LECTERN, SCRIPTORIUM, scriptoriumAtDawn, WALL_Y, WYSTAN_DESK } from '../scriptorium';
import type { MapContext, MapDef } from '../types';

/** One toll of MERCY: the white ring goes out, and the colour drains for a moment. */
export async function mercyTolls(c: MapContext, n: number): Promise<void> {
  const ctx = c.audio.ctx;
  if (ctx) {
    bell(ctx, c.audio.bus('sfx'), midiToHz(29), ctx.currentTime, 0.8, 14);
    bell(ctx, c.audio.reverbIn, midiToHz(29), ctx.currentTime, 0.7, 14);
    bell(ctx, c.audio.reverbIn, midiToHz(41.3), ctx.currentTime + 0.02, 0.3, 10);
  }
  c.shake(5, 2);
  c.flash(0.8);
  const before = c.r.grade.saturation;
  for (let k = 0; k <= 10; k++) {
    c.r.grade.saturation = before * (k < 3 ? 1 - k * 0.25 : 0.25 + (k - 3) * 0.1);
    await c.wait(0.12);
  }
  c.r.grade.saturation = before;
  void n;
}

export const DAWN_SCRIPTORIUM: MapDef = {
  ...SCRIPTORIUM,
  id: 'dawnScriptorium',
  card: { title: { en: 'Saint Ebb’s', fr: 'Saint-Ebb' }, line: { en: 'Dawn, the Feast of Saint Ebba', fr: 'L’aube, la fête de sainte Ebba' } },
  ambience: () => new EbbNightAmbience(),
  checkpoint: true,
  candle: true,
  spawns: { psalter: { x: WYSTAN_DESK[0] + 16, y: WYSTAN_DESK[1] + 6, dir: 'up' }, door: { x: DOOR_X, y: WALL_Y + 14, dir: 'down' } },
  build(r, st) {
    scriptoriumAtDawn(true);
    const set = SCRIPTORIUM.build(r, st);
    scriptoriumAtDawn(false);
    return set;
  },
  npcs: [],
  zones: [],
  things: [
    {
      id: 'lectern',
      x: LECTERN[0],
      y: LECTERN[1] + 2,
      h: 30,
      run: async (c) => {
        await c.say('isot', { en: 'The lectern’s bare. Only the chain, cut. He’s carried the Book into the church.', fr: 'Le lutrin est vide. Seulement la chaîne, coupée. Il a porté le Livre dans l’église.' }, 'grave');
        if (!c.flag('seen.motto')) await c.say('hild', { en: 'There’s writing under the varnish. Tilt your candle.', fr: 'Il y a de l’écriture sous le vernis. Incline ta bougie.' });
      },
    },
  ],
  underwriting: [
    {
      id: 'motto',
      x: LECTERN[0],
      y: LECTERN[1] + 1,
      h: 34,
      art: ghostWords(['QUOD LECTUM EST', 'LIGATUR']),
      revealed: async (c) => {
        await c.say('isot', { en: '“Quod lectum est, ligatur.” What is read is bound. That’s the other half of the motto. Someone scraped it off the lectern.', fr: '« Quod lectum est, ligatur. » Ce qui est lu est lié. C’est l’autre moitié de la devise. Quelqu’un l’a grattée du lutrin.' }, 'alarmed');
        await c.say('whit', { en: 'What is written is held, and what is read is bound. So reading is how a thing is finished.', fr: 'Ce qui est écrit est tenu, et ce qui est lu est lié. Alors c’est en lisant qu’une chose est finie.' });
      },
    },
  ],
  exits: [{ rect: [DOOR_X - 12, WALL_Y, 24, 6], to: 'lodging', spawn: 'door', when: (c) => c.flag('mercyTolled') }],
  async enter(c, from) {
    if (from !== 'psalter' || c.flag('mercyTolled')) return;
    c.set('mercyTolled');
    c.letterbox(true);
    await c.wait(1);
    await c.narrate({ en: 'They climb out of the margin of Wystan’s psalter onto his desk, the way the grylli did, an hour before.', fr: 'Ils sortent de la marge du psautier de Wystan sur son pupitre, comme l’avaient fait les grylles, une heure plus tôt.' });
    await mercyTolls(c, 1);
    await c.narrate({ en: 'MERCY tolls for the first time. Out from the Abbey a white ring goes across the fens, and wherever it passes the colour drains out of the world.', fr: 'MERCY sonne pour la première fois. Depuis l’Abbaye, un anneau blanc s’étend sur les marais, et partout où il passe la couleur quitte le monde.' });
    await c.say('isot', { en: 'Nine tolls. That was the first.', fr: 'Neuf glas. C’était le premier.' }, 'stern');
    await c.narrate({ en: 'Below the walls, at low tide, the Fen Fyrd comes across the wet sand of the causeway with Eadgyth at its head.', fr: 'Sous les murs, à marée basse, la milice des marais traverse le sable mouillé de la chaussée, Eadgyth à sa tête.' });
    await c.say('eadgyth', { en: 'Low tide! For the old king, and everyone he can’t let go of. Forward!', fr: 'Marée basse ! Pour le vieux roi, et pour tous ceux qu’il ne peut pas laisser partir. En avant !' });
    await c.narrate({ en: 'Only Lychford, far off across the water, keeps its colour: its bell is the one MERCY is missing.', fr: 'Seul Lychford, au loin de l’autre côté de l’eau, garde ses couleurs : sa cloche est celle qui manque à MERCY.' });
    c.letterbox(false);
  },
};

