/**
 * Chapter III, scenes 6 to 8: the ossuary under Knell Chapel (DESIGN.md §3.6; B3, C8).
 * Bones stacked in the walls, a ring of candles, and four dancers in the rags of their
 * stations bowing to an empty fifth place: the Danse Macabre (B3). When it ends they turn
 * to Whit and bow, the smallest takes his hand, and Hild's Squint reads the gold under
 * the white of his shield: F I N I S. The midpoint twist, Hild's confession, a choice,
 * Read Aloud, and the hook into the Margin.
 */

import { bell, midiToHz } from '../../audio/instruments';
import { BlanchwoodAmbience } from '../../audio/blanchwood';
import { hash2 } from '../../engine/noise';
import { session } from '../../engine/session';
import type { Art } from '../../pixel/buildings';
import { CHARACTERS } from '../../pixel/characters';
import { textImage } from '../../pixel/font';
import { candleStand } from '../../pixel/furniture';
import { hex, PixelImage, ramp } from '../../pixel/pixel';
import { GROUND_DEFAULT } from '../../pixel/terrain';
import { tiles } from '../../world3d/stage';
import { backWall, FLOOR, nightInterior, sideWall } from '../interior';
import type { MapContext, MapDef, NpcDef } from '../types';

const W = 20;
const GROUND = ['                    ', '                    ', ...Array.from({ length: 7 }, () => ' ffffffffffffffffff '), '                    '];
const RING: [number, number] = [tiles(10), tiles(5.4)];

/** Skulls and long bones stacked in the wall, the way the old charnels kept them. */
export function paintBones(a: Art): void {
  const bone = ramp('#E2D6BC', 5);
  const dark = hex('#1A1410');
  const h = a.a.h;
  for (let y = 10; y < h - 8; y += 9) {
    const skulls = Math.floor(y / 9) % 2 === 0;
    for (let x = 2; x < a.a.w - 6; x += skulls ? 7 : 12) {
      if (skulls) {
        a.a.ellipse(x + 3, y + 3, 3, 3.2, (px) => bone[px < x + 3 ? 3 : 1]!);
        a.a.set(x + 2, y + 3, dark);
        a.a.set(x + 4, y + 3, dark);
        a.a.set(x + 3, y + 5, dark);
      } else {
        a.a.hline(x, x + 10, y + 3, bone[2]!);
        a.a.hline(x, x + 10, y + 4, bone[1]!);
        for (const ex of [x, x + 10]) a.a.rect(ex - 1, y + 2, 2, 4, bone[3]!);
      }
      if (hash2(x, y, 4) > 0.8) a.a.set(x + 1, y + 1, hex('#5A4A3A'));
    }
  }
}

const DANCERS: NpcDef[] = (
  [
    ['pope', -26, -4, 'right'],
    ['king', -10, -16, 'down'],
    ['ploughman', 12, -16, 'down'],
    ['childDancer', 28, -4, 'left'],
  ] as const
).map(([kind, dx, dy, dir]) => ({
  id: kind,
  speaker: kind === 'childDancer' ? 'dancer' : 'villager',
  spec: CHARACTERS[kind]!,
  x: RING[0] + dx,
  y: RING[1] + dy,
  dir,
  when: (c: MapContext) => !c.flag('childAtRest') || kind !== 'childDancer',
}));

export const OSSUARY: MapDef = {
  id: 'ossuary',
  card: { title: { en: 'Knell Chapel', fr: 'La chapelle du Glas' }, line: { en: 'The Ossuary', fr: 'L’ossuaire' } },
  walkable: 'f',
  ground: GROUND,
  bounds: { minX: tiles(W / 2), maxX: tiles(W / 2), minY: tiles(4.6), maxY: tiles(4.6) },
  camera: { h: 4, zoom: 1.08 },
  ambience: () => new BlanchwoodAmbience({ ossuary: true }),
  checkpoint: true,
  candle: true,
  spawns: { stair: { x: tiles(W / 2), y: tiles(8.4), dir: 'up' } },
  build(r, st) {
    nightInterior(r, { ambient: 0.4, moon: 0.08 });
    r.grade = { ...r.grade, saturation: 0.55, exposure: 1.15 };
    st.ground({ ground: GROUND, heights: GROUND.map((row) => '0'.repeat(row.length)), seed: 57, palette: { ...GROUND_DEFAULT, stone: FLOOR.stone } });
    backWall(st, tiles(1), tiles(1), tiles(W - 2), tiles(1), 76, { stone: '#7A746A', seed: 59, paint: paintBones });
    sideWall(st, tiles(0.5), tiles(1), tiles(8), 76);
    sideWall(st, tiles(W - 1), tiles(1), tiles(8), 76);
    // A ring of candles round the dancers, and the empty fifth place in it.
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const x = RING[0] + Math.cos(a) * 52;
      const y = RING[1] + Math.sin(a) * 26;
      st.addArt(candleStand(14), x, y);
      st.addCandle(x, y, 17, 0.45, 56);
    }
    st.addEmitter({ kind: 'mote', area: [tiles(2), tiles(2), tiles(16), tiles(6)], heights: [2, 40], count: 20, color: '#E8DCC0', size: 1.4, intensity: 0.3 }, 31);
    return { blocked: [] };
  },
  npcs: DANCERS.map((d) => ({ ...d, when: (c: MapContext) => (d.id === 'childDancer' ? !c.flag('childAtRest') : !c.flag('finisRead')) })),
  zones: [
    {
      id: 'dance',
      rect: [0, tiles(5.8), tiles(W), tiles(1.2)],
      when: (c) => !c.cleared('b3'),
      run: async (c) => {
        c.letterbox(true);
        c.shake(1, 1.4);
        await c.narrate({ en: 'Darkness, and the click of bones. Four dancers in the rags of their stations step out of the walls: a Pope, a King, a Ploughman, and a Child. They bow to an empty fifth place in the ring.', fr: 'L’obscurité, et le cliquetis des os. Quatre danseurs dans les haillons de leur état sortent des murs : un Pape, un Roi, un Laboureur, et un Enfant. Ils s’inclinent devant une cinquième place, vide, dans la ronde.' });
        await c.say('hild', { en: 'A danse macabre. They dance because the one who should lead them never came.', fr: 'Une danse macabre. Ils dansent parce que celui qui devait les mener n’est jamais venu.' }, 'grave');
        await c.say('isot', { en: 'Their steps are hidden. I can’t tell who leads. I’ll have to read them one by one, unless Hild looks.', fr: 'Leurs pas sont cachés. Je ne vois pas qui mène. Il faudra les lire un par un, à moins que Hild ne regarde.' });
        c.battle('b3');
      },
    },
  ],
  async enter(c, from) {
    if (from === 'battle:b3' && !c.flag('finisRead')) await finis(c);
  },
};

/** Pixel art made k times larger, nearest neighbour. */
function enlarge(src: PixelImage, k: number): PixelImage {
  const out = new PixelImage(src.w * k, src.h * k);
  for (let y = 0; y < out.h; y++) for (let x = 0; x < out.w; x++) out.set(x, y, src.get(Math.floor(x / k), Math.floor(y / k)));
  return out;
}

/** C8: the dancers bow to Whit, and the gold under the white of his shield. */
async function finis(c: MapContext): Promise<void> {
  c.letterbox(true);
  const whit = c.party.find((a) => a.id === 'whit') ?? c.player;
  await c.wait(0.8);
  for (const d of DANCERS) {
    const a = c.npc(d.id);
    c.face(a, a.x < whit.x ? 'right' : 'left');
  }
  await c.narrate({ en: 'The dancers stop. As one, they turn to Whit, and bow.', fr: 'Les danseurs s’arrêtent. D’un même mouvement, ils se tournent vers Whit, et s’inclinent.' });
  const child = c.npc('childDancer');
  await c.walk(child, [[whit.x - 12, whit.y + 2]]);
  c.face(child, 'right');
  await c.narrate({ en: 'The smallest takes his hand. Isot’s penknife slips out of her fingers and swings on its cord.', fr: 'Le plus petit lui prend la main. Le canif d’Isot glisse de ses doigts et se balance au bout de son cordon.' });
  await c.say('hild', { en: 'Hold still, knight. Let me look at your shield.', fr: 'Ne bouge pas, chevalier. Laisse-moi regarder ton bouclier.' }, 'grave');
  // F I N I S, one letter at a time, in gold under the white, rising over his head.
  const ctx = c.audio.ctx;
  const gold = hex('#E0A030', 255);
  c.stage.addLight(whit.x, whit.y + 10, 40, 90, '#FFC060', 0.4);
  for (const [i, ch] of ['F', 'I', 'N', 'I', 'S'].entries()) {
    const img = enlarge(textImage([ch], gold, 1), 2);
    c.stage.addImage(img, whit.x - 24 + i * 12, whit.y + 2, { h: 54, shadow: false, glow: img });
    if (ctx) {
      bell(ctx, c.audio.bus('sfx'), midiToHz(40), ctx.currentTime, 0.5, 8);
      bell(ctx, c.audio.reverbIn, midiToHz(40), ctx.currentTime, 0.4, 8);
    }
    c.shake(2, 0.5);
    await c.wait(1.3);
  }
  await c.say('isot', { en: 'Finis. It’s the last word of every book I’ve ever copied.', fr: 'Finis. C’est le dernier mot de chaque livre que j’ai jamais copié.' }, 'alarmed');
  await c.say('whit', { en: 'What does it mean?', fr: 'Qu’est-ce que ça veut dire ?' });
  await c.say('isot', { en: 'The end.', fr: 'La fin.' }, 'sad');
  await c.say('whit', { en: '…Oh.', fr: '…Oh.' });
  await c.wait(1);
  await c.say('hild', { en: 'I knew you on the causeway. You stood at my bedside ten years ago, in the Grey Sweat, and you were kind about it.', fr: 'Je t’ai reconnu sur la chaussée. Tu te tenais à mon chevet il y a dix ans, pendant la Suette grise, et tu étais doux.' }, 'grave');
  await c.say('hild', { en: 'Aumery scraped FINIS that night, to keep me. No one has died since, because Death forgot his name.', fr: 'Aumery a gratté FINIS cette nuit-là, pour me garder. Personne n’est mort depuis, parce que la Mort a oublié son nom.' }, 'sad');
  await c.say('hild', { en: 'You’ve been standing in the sea for ten years, waiting for a word.', fr: 'Tu es resté dans la mer dix ans, à attendre un mot.' }, 'sad');
  await c.say('isot', { en: 'You knew. From the causeway. You let him wonder.', fr: 'Tu savais. Depuis la chaussée. Tu l’as laissé se poser des questions.' }, 'stern');
  const pick = await c.choose([
    { en: '“I understand why. I forgive you.”', fr: '« Je comprends pourquoi. Je te pardonne. »' },
    { en: '“I don’t forgive you. Not yet.”', fr: '« Je ne te pardonne pas. Pas encore. »' },
  ]);
  if (pick === 0) {
    c.set('hildForgiven');
    await c.say('isot', { en: 'You were afraid of the end. Everyone is. I forgive you.', fr: 'Tu avais peur de la fin. Tout le monde a peur. Je te pardonne.' }, 'warm');
    await c.say('hild', { en: 'Then you’re better than my brother, and he was the best boy I ever knew.', fr: 'Alors tu vaux mieux que mon frère, et c’était le meilleur garçon que j’aie connu.' }, 'sad');
  } else {
    c.set('hildUnforgiven');
    await c.say('isot', { en: 'Not yet. You let him walk beside us for four days not knowing what he is.', fr: 'Pas encore. Tu l’as laissé marcher avec nous quatre jours sans savoir ce qu’il est.' }, 'stern');
    await c.say('hild', { en: 'That’s fair. I’ll carry it.', fr: 'C’est juste. Je le porterai.' }, 'grave');
  }
  await c.wait(0.6);
  await c.say('whit', { en: '…Tib.', fr: '…Tib.' });
  await c.narrate({ en: 'He says it without meaning to: the child’s name. Her bones lie down, at peace. It is the first ending in Hollin in ten years.', fr: 'Il le dit sans le vouloir : le nom de l’enfant. Ses os se couchent, en paix. C’est la première fin en Hollin depuis dix ans.' });
  for (let k = 1; k <= 10; k++) {
    child.sprite.fray = k / 10;
    child.sprite.opacity = 1 - k / 10;
    await c.wait(0.12);
  }
  child.visible = false;
  c.set('childAtRest');
  await c.say('whit', { en: '…She was so tired.', fr: '…Elle était si fatiguée.' });
  c.letterbox(false);
  await c.learn('whit', 'read');
  c.set('finisRead');
  c.letterbox(true);
  for (const d of DANCERS) if (d.id !== 'childDancer') c.npc(d.id).visible = false;
  await c.narrate({ en: 'When they climb back up into the chapel, the world outside has been scraped to its edge.', fr: 'Quand ils remontent dans la chapelle, le monde au-dehors a été gratté jusqu’au bord.' });
  await c.say('whit', { en: 'If I remember, people will die. Amabel. Dunstan. One day, you.', fr: 'Si je me souviens, des gens vont mourir. Amabel. Dunstan. Un jour, toi.' });
  await c.say('isot', { en: 'Yes.', fr: 'Oui.' }, 'sad');
  await c.say('whit', { en: 'Then I don’t want to remember.', fr: 'Alors je ne veux pas me souvenir.' });
  await c.say('hild', { en: 'You haven’t seen where the forgotten go.', fr: 'Tu n’as pas vu où vont les oubliés.' }, 'grave');
  await c.narrate({ en: 'They step off the page.', fr: 'Ils sortent de la page.' });
  c.close();
  session.game.chapter = 4;
  c.interlude(3);
}
