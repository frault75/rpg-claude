/**
 * Chapter II, scene 6 and 7: across the frozen mere (DESIGN.md §3.5; C6). The tower burns
 * behind; the bell is under the ice. The old ford runs beneath it, and only the raking
 * light shows the stones; off the ford the ice groans and sends the party back. On the far
 * shore Eadgyth's archers rise from the reeds. The hook, and Interlude II.
 */

import { fizzleSound } from '../../audio/battleSfx';
import { WinterAmbience } from '../../audio/winter';
import { CHARACTERS } from '../../pixel/characters';
import { reeds } from '../../pixel/nature';
import { hex, PixelImage } from '../../pixel/pixel';
import { tiles } from '../../world3d/stage';
import { bareTree } from '../../world3d/lychford';
import { session } from '../../engine/session';
import type { MapContext, MapDef, Rect, Underwriting } from '../types';
import { SNOW_GROUND, WINTER_NIGHT_SKY, winterNight } from './winter';

const W = 34;
const H = 13;
const GROUND = Array.from({ length: H }, () => Array.from({ length: W }, (_, x) => (x < 4 || x >= 30 ? 'n' : 'i')).join(''));

/** The ford, as the stones run under the ice: a zig-zag from shore to shore. */
const FORD: [number, number][] = [
  [3.5, 6.5],
  [9, 6.5],
  [12, 3.5],
  [18, 3.5],
  [21, 9],
  [27, 9],
  [30.5, 6.5],
].map(([x, y]) => [tiles(x), tiles(y)]);

function distToFord(x: number, y: number): number {
  let best = Infinity;
  for (let i = 0; i < FORD.length - 1; i++) {
    const [ax, ay] = FORD[i]!;
    const [bx, by] = FORD[i + 1]!;
    const t = Math.max(0, Math.min(1, ((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / ((bx - ax) ** 2 + (by - ay) ** 2)));
    best = Math.min(best, Math.hypot(x - (ax + (bx - ax) * t), y - (ay + (by - ay) * t)));
  }
  return best;
}

/** A stepping stone of the ford, pale under the ice. */
function stone(seed: number): PixelImage {
  const img = new PixelImage(12, 8);
  img.ellipse(6, 4, 5 + (seed % 2), 3.2, hex('#E8D8A8', 200));
  img.ellipse(6, 4, 3.5, 2, hex('#F4E8C0', 230));
  return img;
}

const STONES: Underwriting[] = [];
for (let i = 0; i < FORD.length - 1; i++) {
  const [ax, ay] = FORD[i]!;
  const [bx, by] = FORD[i + 1]!;
  const n = Math.max(1, Math.round(Math.hypot(bx - ax, by - ay) / 18));
  for (let k = 0; k < n; k++) {
    const t = (k + 0.5) / n;
    STONES.push({ id: `ford-${i}-${k}`, x: ax + (bx - ax) * t, y: ay + (by - ay) * t, h: 0.5, flat: true, art: stone(i + k) });
  }
}

let safe: [number, number] = FORD[0]!;

export const MERE: MapDef = {
  id: 'mere',
  card: { title: { en: 'Lychford', fr: 'Lychford' }, line: { en: 'The Frozen Mere', fr: 'La mare gelée' } },
  walkable: 'ni',
  ground: GROUND,
  bounds: { minX: tiles(13.4), maxX: tiles(W - 13.4), minY: tiles(6.4), maxY: tiles(6.4) },
  camera: { h: 4 },
  ambience: () => new WinterAmbience({ music: false }),
  checkpoint: true,
  candle: true,
  spawns: { shore: { x: tiles(2), y: tiles(6.5), dir: 'right' } },
  build(r, st) {
    winterNight(r);
    st.ground({ ground: GROUND, heights: GROUND.map((row) => '0'.repeat(row.length)), seed: 99, palette: { ...SNOW_GROUND, snow: '#C8D0DC' } });
    st.addSky({ ...WINTER_NIGHT_SKY, moon: [240, 110] }, 200);
    const blocked: Rect[] = [];
    // The burning tower and the torches behind, on the village shore.
    st.addLight(tiles(-2), tiles(2), 60, 240, '#FF7A30', 1, 'flame');
    for (const [x, y] of [
      [tiles(0.8), tiles(3)],
      [tiles(1.6), tiles(10)],
      [tiles(0.6), tiles(7.6)],
    ] as const)
      st.addFlame(x, y, 22, { light: 70 });
    st.addEmitter({ kind: 'ember', area: [0, tiles(1), tiles(3), tiles(2)], heights: [40, 90], count: 18, color: '#FFA040', size: 1.6, intensity: 1.6 }, 3);
    for (let i = 0; i < 8; i++) st.addImage(reeds(i, '#9A8A5A'), tiles(30.4 + (i % 3)), tiles(1 + i * 1.5));
    for (let i = 0; i < 4; i++) st.addImage(reeds(i + 9, '#9A8A5A'), tiles(1 + (i % 2)), tiles(0.8 + i * 3.2));
    st.addImage(bareTree(41, 1.1), tiles(32.6), tiles(3));
    st.addImage(bareTree(42, 0.9), tiles(32), tiles(11.6));
    st.addEmitter({ kind: 'glint', area: [tiles(4), 0, tiles(26), tiles(H)], heights: [0.5, 0.5], count: 6, color: '#E8F0FF', size: 1.4, intensity: 0.8 }, 9);
    return { blocked };
  },
  npcs: [
    { id: 'eadgyth', speaker: 'eadgyth', spec: CHARACTERS.eadgyth!, x: tiles(32), y: tiles(5.6), dir: 'left', when: (c) => c.flag('crossed') },
    { id: 'archerA', speaker: 'villager', spec: { ...CHARACTERS.eadgyth!, id: 'archer', hair: '#4A3020', cape: undefined, robe: '#4A5A3A' }, x: tiles(31.4), y: tiles(8.6), dir: 'left', when: (c) => c.flag('crossed') },
    { id: 'archerB', speaker: 'villager', spec: { ...CHARACTERS.eadgyth!, id: 'archer2', hair: '#2A2018', cape: undefined, robe: '#3A4A34' }, x: tiles(32.8), y: tiles(10), dir: 'left', when: (c) => c.flag('crossed') },
  ],
  watch: (c) => (watchIce(c) ? iceGroans : null),
  zones: [
    {
      id: 'farShore',
      rect: [tiles(30), 0, tiles(4), tiles(H)],
      when: (c) => !c.flag('crossed'),
      run: (c) => theFarShore(c),
    },
  ],
  underwriting: STONES,
  async enter(c, from) {
    if (from === 'shore') {
      safe = FORD[0]!;
      c.letterbox(true);
      await c.say('isot', { en: 'The old ford. It runs under the ice; the stones are still there.', fr: 'Le vieux gué. Il passe sous la glace ; les pierres y sont encore.' }, 'alarmed');
      await c.say('hild', { en: 'Tilt your candle, child, and walk where the stones are. Nowhere else.', fr: 'Incline ta bougie, petite, et marche là où sont les pierres. Nulle part ailleurs.' }, 'stern');
      c.letterbox(false);
    }
  },
};

/** Called every frame by the map: off the ford, the ice groans and sends the party back. */
export function watchIce(c: MapContext): boolean {
  if (c.flag('crossed')) return false;
  const p = c.player;
  if (p.x < tiles(4) || p.x > tiles(30)) {
    if (p.x < tiles(4)) safe = FORD[0]!;
    return false;
  }
  const d = distToFord(p.x, p.y);
  if (d < 12) {
    // Remember the last stone she stood on.
    for (const pt of FORD) if (Math.hypot(pt[0] - p.x, pt[1] - p.y) < 14) safe = pt;
    return false;
  }
  return true;
}

export async function iceGroans(c: MapContext): Promise<void> {
  c.shake(5, 0.6);
  fizzleSound(c.audio);
  await c.narrate({ en: 'The ice groans and starts to star under her feet. Back, to where it held.', fr: 'La glace gémit et s’étoile sous ses pieds. En arrière, là où elle tenait.' });
  c.player.x = safe[0];
  c.player.y = safe[1];
  for (const a of c.party) {
    a.x = safe[0] - 8;
    a.y = safe[1];
  }
}

/** The far shore: Eadgyth's archers rise from the reeds, and the hook. */
async function theFarShore(c: MapContext): Promise<void> {
  c.set('crossed');
  c.letterbox(true);
  await c.wait(0.4);
  c.shake(2, 0.5);
  await c.narrate({ en: 'Out of the reeds rise archers in fen-green, a dozen of them, bows drawn past the party at the torches on the far shore.', fr: 'Des roseaux se lèvent des archers vêtus de vert de marais, une douzaine, arcs bandés vers les torches de l’autre rive.' });
  await c.say('eadgyth', { en: 'Run, scribe. I’ll cover your back.', fr: 'Cours, scribe. Je couvre tes arrières.' });
  await c.narrate({ en: 'Arrows go over the ice. The torches stop at the water’s edge, and then go back.', fr: 'Des flèches passent au-dessus de la glace. Les torches s’arrêtent au bord, puis s’en retournent.' });
  await c.say('eadgyth', { en: 'Eadgyth, of Holmcaster. My father has been dying on his throne for ten years, and I can’t be crowned while he lives.', fr: 'Eadgyth, de Holmcaster. Mon père se meurt sur son trône depuis dix ans, et je ne peux pas être couronnée tant qu’il vit.' });
  await c.say('eadgyth', { en: 'The Abbot has thirty-nine bells. Whatever he’s building, he’s one short.', fr: 'L’abbé a trente-neuf cloches. Quoi qu’il construise, il lui en manque une.' });
  await c.say('hild', { en: 'There’s a chapel in the Blanchwood where they used to pray to the Reader. If your knight wants his name, he might find it there.', fr: 'Il y a une chapelle dans la Blanchewood où l’on priait le Lecteur. Si ton chevalier veut son nom, il le trouvera peut-être là.' }, 'grave');
  await c.say('isot', { en: 'Why are you helping him?', fr: 'Pourquoi tu l’aides ?' });
  await c.say('hild', { en: 'Because he’s lost. I know lost.', fr: 'Parce qu’il est perdu. Je connais ça.' }, 'sad');
  c.close();
  await c.narrate({ en: 'In Lychford the roses on the lych-gate had bloomed for ten winters, and the sexton had polished his spade until it shone like a mirror.', fr: 'À Lychford, les roses du porche avaient fleuri dix hivers, et le fossoyeur avait poli sa bêche jusqu’à ce qu’elle brille comme un miroir.' });
  await c.narrate({ en: 'When the passing bell spoke, the whole village came out into the snow to listen, the way you listen for a name on the tip of your tongue.', fr: 'Quand le glas a parlé, le village entier est sorti dans la neige pour écouter, comme on écoute un nom sur le bout de la langue.' });
  c.card({ en: 'Chapter III', fr: 'Chapitre III' }, { en: 'The Blanchwood', fr: 'La Blanchewood' });
  await c.wait(4);
  session.game.chapter = 3;
  c.goto('wood', 'start');
}
