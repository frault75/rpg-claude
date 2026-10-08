/**
 * Chapter V, scene 1: the scriptorium at dawn on the Feast of Saint Ebba (DESIGN.md §3.8; C12).
 * The party climbs out of Wystan's psalter the way the grylli did in chapter I. MERCY, the
 * Abbot's great bell of thirty-nine melted bells, tolls for the first time, and a white
 * ring spreads across the fens. At low tide Eadgyth's Fen Fyrd storms the causeway. The
 * lectern is bare: Aumery has carried the Book into the church. The raking light reads
 * the scraped second half of the Abbey motto on it.
 */

import { EbbNightAmbience } from '../../audio/ambient';
import { bell, midiToHz, sing } from '../../audio/instruments';
import { session } from '../../engine/session';
import { CHARACTERS } from '../../pixel/characters';
import { ghostWords } from '../../pixel/underwriting';
import { isReturned, returnName } from '../../story/returns';
import { tiles } from '../../world3d/stage';
import { pedlar } from '../gervase';
import { CUTHWIN_DESK, DOOR_X, LECTERN, SCRIPTORIUM, scriptoriumAtDawn, WALL_Y, WYSTAN_DESK } from '../scriptorium';
import type { MapContext, MapDef } from '../types';
import { drawLowDoor, LOW_DOOR_X } from './lowDoor';

/** Gervase's last stall, by the low door down to the Undercroft. */
const GERVASE = pedlar('undercroft', LOW_DOOR_X + 20, WALL_Y + 12, 'down');

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
  caches: [
    {
      id: 'dawnScriptorium',
      x: tiles(4.4),
      y: tiles(7.2),
      pennies: 6,
      satchel: { poultice: 1, waxSeal: 1 },
      note: { en: '“Isot. We saw you scrape the line, and we saw you cry over it. Write it back. — the Glossators.”', fr: '« Isot. Nous t’avons vue gratter la ligne, et nous t’avons vue pleurer dessus. Réécris-la. — les Glossateurs. »' },
    },
  ],
  card: { title: { en: 'Saint Ebb’s', fr: 'Saint-Ebb' }, line: { en: 'Dawn, the Feast of Saint Ebba', fr: 'L’aube, la fête de sainte Ebba' } },
  ambience: () => new EbbNightAmbience(),
  checkpoint: true,
  candle: true,
  spawns: {
    psalter: { x: WYSTAN_DESK[0] + 16, y: WYSTAN_DESK[1] + 6, dir: 'up' },
    door: { x: DOOR_X, y: WALL_Y + 14, dir: 'down' },
    undercroft: { x: LOW_DOOR_X, y: WALL_Y + 14, dir: 'down' },
  },
  build(r, st) {
    scriptoriumAtDawn(true);
    const set = SCRIPTORIUM.build(r, st);
    scriptoriumAtDawn(false);
    if (session.game.flags.undercroftOpen) drawLowDoor(st, WALL_Y);
    return set;
  },
  npcs: [
    // Cuthwin never left his desk. He is humming.
    { id: 'cuthwin', speaker: 'cuthwin', spec: CHARACTERS.scribe!, x: CUTHWIN_DESK[0], y: CUTHWIN_DESK[1] - 9, dir: 'down' },
    GERVASE.npc,
  ],
  zones: [],
  things: [
    GERVASE.thing,
    { id: 'cuthwin', x: CUTHWIN_DESK[0], y: CUTHWIN_DESK[1] - 9, h: 44, run: (c) => cuthwin(c) },
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
  exits: [
    { rect: [DOOR_X - 12, WALL_Y, 24, 6], to: 'lodging', spawn: 'door', when: (c) => c.flag('mercyTolled') },
    { rect: [LOW_DOOR_X - 10, WALL_Y, 20, 6], to: 'undercroft', spawn: 'stair', when: (c) => c.flag('undercroftOpen') },
  ],
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


/** Cuthwin at his desk at dawn, humming the flat note; and Brother Osric, if his name was read. */
async function cuthwin(c: MapContext): Promise<void> {
  const g = session.game;
  const hum = (flat: boolean) => {
    const ctx = c.audio.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    for (const [k, m] of [62, 64, 62, 59].entries()) sing(ctx, c.audio.reverbIn, m - (flat && k === 3 ? 0.5 : 0), t + k * 0.45, 0.5, 0.05);
  };
  if (isReturned(g, 'osric')) {
    hum(true);
    await c.say('cuthwin', { en: 'Flat on the Amen. He’d be pleased.', fr: 'Faux sur l’Amen. Ça lui ferait plaisir.' });
    return;
  }
  hum(true);
  await c.narrate({ en: 'Brother Cuthwin has not left his desk. He is humming the Amen of the night office, and it goes flat at the end, a quarter of a tone, every time.', fr: 'Frère Cuthwin n’a pas quitté son pupitre. Il fredonne l’Amen de l’office de nuit, et la fin descend, d’un quart de ton, à chaque fois.' });
  await c.say('cuthwin', { en: 'I can never get that note. Ten years. It’s like singing next to a hole.', fr: 'Je n’arrive jamais à avoir cette note. Dix ans. C’est comme chanter à côté d’un trou.' });
  if (!g.lostNames.includes('osric')) return;
  const pick = await c.choose([
    { en: 'Read him the name from the cloister wall.', fr: 'Lui lire le nom du mur du cloître.' },
    { en: 'Let him hum.', fr: 'Le laisser fredonner.' },
  ]);
  if (pick !== 0) return;
  await c.say('isot', { en: '“Brother Osric, who sang a quarter-tone flat for forty years and was loved anyway.” It was on the cloister wall, under the whitewash.', fr: '« Frère Osric, qui chanta un quart de ton trop bas pendant quarante ans, et fut aimé quand même. » C’était sur le mur du cloître, sous la chaux.' }, 'sad');
  await c.wait(0.8);
  await c.say('cuthwin', { en: '…Osric.', fr: '…Osric.' });
  await c.say('cuthwin', { en: 'He stood on my left in choir. Thirty years. He was always flat on the Amen, and I always went flat with him, so he wouldn’t be alone in it.', fr: 'Il se tenait à ma gauche au chœur. Trente ans. Il était toujours faux sur l’Amen, et je descendais toujours avec lui, pour qu’il n’y soit pas seul.' });
  await c.say('cuthwin', { en: 'And then I went on going flat. For ten years. With nobody.', fr: 'Et puis j’ai continué à descendre. Pendant dix ans. Avec personne.' });
  await c.say('hild', { en: 'Not with nobody. With him. You just didn’t know his name.', fr: 'Pas avec personne. Avec lui. Tu ne savais simplement plus son nom.' }, 'warm');
  await c.narrate({ en: 'Cuthwin opens the drawer of his desk and takes out a little wooden pitch-pipe, worn dark where a thumb held it.', fr: 'Cuthwin ouvre le tiroir de son pupitre et en sort un petit diapason de bois, noirci là où un pouce le tenait.' });
  await c.say('cuthwin', { en: 'It was in my stall. I never knew whose. It’s a quarter-tone flat. Of course it is. Take it. I don’t need it now.', fr: 'Il était dans ma stalle. Je n’ai jamais su à qui. Il est faux d’un quart de ton. Évidemment. Prends-le. Je n’en ai plus besoin.' });
  hum(true);
  await c.narrate({ en: 'He hums the Amen again. It goes flat at the end, the same as before, and this time it sounds like two voices.', fr: 'Il fredonne l’Amen encore. La fin descend, comme avant, et cette fois on dirait deux voix.' });
  await returnName(c, 'osric');
}
