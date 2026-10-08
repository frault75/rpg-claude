/**
 * Chapter II, scene 3: the churchyard of Saint Hilda, Lychford (DESIGN.md §3.5). The
 * roses on the lych-gate still bloom in the snow; two babewyns perch on it (F4). No
 * grave is newer than ten years, but one stands open with its headstone scraped blank:
 * Hild's. She learns Immure. The bell tower door is at the west end of the church.
 */

import { hex } from '../../pixel/pixel';
import { textImage } from '../../pixel/font';
import { babewynArt } from '../../pixel/enemies';
import { yewTree } from '../../pixel/nature';
import { gravestone } from '../../pixel/props';
import { Billboard, pixelTexture } from '../../world3d/billboard';
import { relief } from '../../world3d/relief';
import { tiles } from '../../world3d/stage';
import { bareTree, lychGate, parishChurch3D } from '../../world3d/lychford';
import { WinterAmbience } from '../../audio/winter';
import type { MapContext, MapDef, Rect } from '../types';
import { SNOW_GROUND, snowfall, WINTER_SKY, winterDay } from './winter';
import { newArt } from '../../pixel/buildings';
import { PixelImage, ramp } from '../../pixel/pixel';

const W = 28;
const H = 16;
// The church stands on a terrace a step above the graves; the path from the lych-gate
// climbs to it by two stone steps.
const STEP_ROW = 6;
const GROUND = Array.from({ length: H }, (_, y) =>
  Array.from({ length: W }, (_, x) => {
    const path = y >= 4 && Math.abs(x + 0.5 - 15) < 1.4;
    if (path && y === STEP_ROW) return '=';
    return path || (y >= 4 && y <= 5 && x >= 4 && x <= 16) ? 'd' : 'n';
  }).join(''),
);
const HEIGHTS = relief(W, H, [
  { at: [0, 0, W, STEP_ROW], h: 1 },
  { at: [18, 0, 10, 3], h: 2, ragged: 's' },
], 91);
const CHURCH_X = tiles(4);
const CHURCH_Y = tiles(0.6);
const TOWER_DOOR: [number, number] = [CHURCH_X + 15, CHURCH_Y + 44];
const GATE: [number, number] = [tiles(15), tiles(13.6)];
const GRAVE: [number, number] = [tiles(21), tiles(8.4)];

/** An open grave: a dark slot in the snow, a mound of old earth beside it. */
function openGrave(): PixelImage {
  const img = new PixelImage(34, 16);
  const earth = ramp('#6C4B2D', 4);
  img.ellipse(12, 9, 10, 4.5, hex('#140E0C'));
  img.rect(4, 7, 16, 5, hex('#1A120E'));
  img.ellipse(27, 10, 6, 4, (_x, _y, nx, ny) => earth[Math.max(0, Math.min(3, Math.round(2 - nx - ny)))]!);
  for (let x = 22; x < 33; x++) if ((x * 7) % 3 === 0) img.set(x, 7, hex('#E8EEF8'));
  img.outline(null);
  return img;
}

/** A headstone, blank where a name was scraped. */
function blankStone(): ReturnType<typeof newArt> & { anchor: [number, number] } {
  const art = newArt(18, 24);
  const st = ramp('#9A968E', 6);
  for (let y = 0; y < 24; y++)
    for (let x = 2; x < 16; x++) {
      if (y < 6 && (x - 8.5) ** 2 + (y - 6) ** 2 > 40) continue;
      art.a.set(x, y, st[x === 2 ? 5 : x === 15 ? 1 : y > 8 && y < 18 ? 4 : 3]!);
    }
  art.a.outline(null);
  return { ...art, anchor: [9, 23] };
}

export const CHURCHYARD: MapDef = {
  id: 'churchyard',
  caches: [
    {
      id: 'churchyard',
      x: tiles(25.6),
      y: tiles(11.0),
      hidden: true,
      pennies: 6,
      satchel: { gallInk: 1 },
      note: { en: '“Dunstan digs. We write down the names he digs for, so that somebody still has them.”', fr: '« Dunstan creuse. Nous écrivons les noms pour qui il creuse, pour que quelqu’un les ait encore. »' },
    },
  ],
  card: { title: { en: 'Lychford', fr: 'Lychford' }, line: { en: 'The Churchyard of Saint Hilda', fr: 'Le cimetière de Sainte-Hilda' } },
  walkable: 'dn=',
  ground: GROUND,
  heights: HEIGHTS,
  bounds: { minX: tiles(13.4), maxX: tiles(W - 13.4), minY: tiles(5.6), maxY: tiles(8.6) },
  camera: { h: 4 },
  ambience: () => new WinterAmbience(),
  checkpoint: true,
  candle: false,
  spawns: {
    village: { x: GATE[0], y: GATE[1] + 18, dir: 'up' },
    tower: { x: TOWER_DOOR[0], y: TOWER_DOOR[1] + 16, dir: 'down' },
  },
  build(r, st) {
    winterDay(r);
    st.ground({ ground: GROUND, heights: HEIGHTS, seed: 91, palette: SNOW_GROUND });
    st.addSky({ ...WINTER_SKY }, 220);
    const blocked: Rect[] = [];
    const church = st.addBuilding(parishChurch3D(CHURCH_X, CHURCH_Y), st.heightAt(CHURCH_X + 60, CHURCH_Y + 20));
    blocked.push(...church.footprints);
    st.addArt(lychGate(), ...GATE, { solid: false });
    blocked.push([GATE[0] - 30, GATE[1] - 4, 18, 5], [GATE[0] + 12, GATE[1] - 4, 18, 5]);
    // Graves, all of them older than the Mercy.
    let k = 0;
    for (let gy = tiles(7); gy < tiles(12); gy += 26) {
      for (let gx = tiles(3); gx < tiles(26); gx += 34) {
        if (Math.abs(gx - GRAVE[0]) < 30 && Math.abs(gy - GRAVE[1]) < 30) continue;
        if (Math.abs(gx - tiles(15)) < 24) continue;
        st.addArt(gravestone(k++), gx + ((k * 13) % 9), gy + ((k * 7) % 6));
        blocked.push([gx - 6 + ((k * 13) % 9), gy - 3 + ((k * 7) % 6), 12, 4]);
      }
    }
    st.addArt(blankStone(), GRAVE[0], GRAVE[1] - 8);
    st.addImage(openGrave(), GRAVE[0] + 2, GRAVE[1] + 6, { shadow: false });
    blocked.push([GRAVE[0] - 12, GRAVE[1] - 10, 30, 18]);
    st.addImage(yewTree(4), tiles(25), tiles(5));
    st.addImage(yewTree(7), tiles(2), tiles(12));
    st.addImage(bareTree(21, 1.1), tiles(26.5), tiles(13));
    blocked.push([tiles(25) - 8, tiles(5) - 4, 16, 5], [tiles(2) - 8, tiles(12) - 4, 16, 5]);
    snowfall(st, tiles(W), tiles(H), 80);
    return { blocked };
  },
  zones: [
    {
      id: 'babewyns',
      rect: [0, 0, tiles(W), tiles(H)],
      when: (c) => !c.cleared('f4'),
      run: (c) => babewyns(c),
    },
  ],
  things: [
    {
      id: 'roses',
      x: GATE[0],
      y: GATE[1],
      h: 50,
      run: async (c) => {
        await c.say('isot', { en: 'Roses, in the snow. Ten winters, and not one petal has dropped. Nothing has died. Not even them.', fr: 'Des roses, dans la neige. Dix hivers, et pas un pétale n’est tombé. Rien n’est mort. Même pas elles.' }, 'sad');
      },
    },
    {
      id: 'graves',
      x: tiles(9),
      y: tiles(9.4),
      h: 20,
      run: async (c) => {
        await c.say('isot', { en: 'Wilfrid, carter. Joan, his wife. Little Edwy. All of them older than the Mercy. There isn’t a grave here newer than ten years.', fr: 'Wilfrid, charretier. Jeanne, sa femme. Le petit Edwy. Tous plus vieux que la Miséricorde. Il n’y a pas une tombe ici de moins de dix ans.' });
      },
    },
    {
      id: 'grave',
      x: GRAVE[0],
      y: GRAVE[1],
      h: 26,
      reach: 34,
      run: (c) => hildsGrave(c),
    },
    {
      id: 'towerDoor',
      x: TOWER_DOOR[0],
      y: TOWER_DOOR[1],
      h: 30,
      when: (c) => !c.flag('bellRung'),
      run: async (c) => {
        if (!c.flag('whitDrawn')) {
          c.set('whitDrawn');
          await c.say('whit', { en: 'There is a bell up there. It is waiting, the way I was waiting. I can hear it not ringing.', fr: 'Il y a une cloche là-haut. Elle attend, comme j’attendais. Je l’entends ne pas sonner.' });
        }
        c.goto('belltower', 'door');
      },
    },
  ],
  underwriting: [
    {
      id: 'hildStone',
      x: GRAVE[0],
      y: GRAVE[1] - 7,
      h: 6,
      art: textImage(['HILD OF', "SAINT EBB'S,", 'WHO NURSED US', 'THROUGH THE', 'GREY SWEAT'], hex('#E8C88A', 230)),
      revealed: async (c) => {
        c.set('hildStoneRead');
        await c.say('isot', { en: '“Hild of Saint Ebb’s, who nursed us through the Grey Sweat.” It’s your grave.', fr: '« Hild de Saint-Ebb, qui nous a soignés pendant la Suée grise. » C’est ta tombe.' }, 'alarmed');
        await c.say('hild', { en: 'They were very kind. They dug it the night I took the fever. Then the Mercy came, and nobody needed it.', fr: 'Ils ont été très gentils. Ils l’ont creusée la nuit où j’ai pris la fièvre. Puis la Miséricorde est venue, et personne n’en a eu besoin.' }, 'wry');
      },
    },
  ],
  exits: [{ rect: [GATE[0] - 12, tiles(H - 0.6), 24, tiles(0.6)], to: 'village', spawn: 'church' }],
};

/** F4: two babewyns perched on the lych-gate. */
async function babewyns(c: MapContext): Promise<void> {
  c.letterbox(true);
  const art = babewynArt();
  const perched = [-14, 14].map((dx) => {
    const b = new Billboard(pixelTexture(art.a), art.w, art.h, { cols: art.a.w / art.w, rows: 1, anchor: art.anchor, emissive: pixelTexture(art.e) });
    b.x = GATE[0] + dx;
    b.y = GATE[1] + 1;
    b.h = 46;
    b.flip = dx < 0;
    b.sync();
    c.r.scene.add(b.mesh);
    return b;
  });
  await c.pan(GATE[0], GATE[1] - 20, 0.8);
  c.emote(c.player, 'alarm');
  await c.narrate({ en: 'On the roof of the lych-gate, among the roses, two babewyns: grotesques with a face at each end, and both of them hungry.', fr: 'Sur le toit du porche, parmi les roses, deux babouins : des grotesques avec une face à chaque bout, et toutes deux affamées.' });
  await c.say('hild', { en: 'Each of them bites twice. Wall one in, and its bites wait a round.', fr: 'Chacun mord deux fois. Emmures-en un, et ses morsures attendront un tour.' }, 'stern');
  for (const b of perched) b.dispose();
  c.battle('f4');
}

/** Hild at her own open grave; she learns Immure. */
async function hildsGrave(c: MapContext): Promise<void> {
  if (c.flag('learnedImmure')) {
    await c.say('isot', { en: 'An open grave, and a stone with nothing on it. Unless you tilt the candle.', fr: 'Une tombe ouverte, et une pierre sans rien dessus. Sauf si on incline la bougie.' }, 'grave');
    return;
  }
  c.letterbox(true);
  await c.say('isot', { en: 'This one is open. Dug, and never filled. The headstone’s been scraped blank.', fr: 'Celle-ci est ouverte. Creusée, et jamais comblée. La pierre a été grattée à blanc.' }, 'grave');
  const hild = c.party.find((a) => a.id === 'hild');
  if (hild) {
    await c.walk(hild, [[GRAVE[0] - 18, GRAVE[1] + 14]]);
    c.face(hild, 'up');
  }
  await c.say('hild', { en: 'They dug me a hole, and I built myself a wall instead.', fr: 'Ils m’ont creusé un trou, et je me suis bâti un mur à la place.' }, 'wry');
  await c.say('hild', { en: 'I’m good at walls.', fr: 'Je suis douée pour les murs.' }, 'grave');
  c.set('learnedImmure');
  c.letterbox(false);
  await c.learn('hild', 'immure');
}
