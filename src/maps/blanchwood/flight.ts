/**
 * Chapter III, the Blanching (DESIGN.md §4, C7). On the ridge behind, Ermeline scrapes the
 * air with her pumice blade, murmuring her litany, and each stroke wipes out a strip of
 * forest. A wave of blank rolls through the wood after the party; ahead, Knell Chapel.
 * Caught, the page folds them back to the start, with no harm done. The trees drain and
 * break up as the wave reaches them, and the music forgets itself faster and faster
 * until only the drum is left.
 */

import { BlanchwoodAmbience } from '../../audio/blanchwood';
import { fizzleSound } from '../../audio/battleSfx';
import { hash2 } from '../../engine/noise';
import { hex, PixelImage, ramp } from '../../pixel/pixel';
import type { Billboard } from '../../world3d/billboard';
import { relief } from '../../world3d/relief';
import { tiles } from '../../world3d/stage';
import type { MapContext, MapDef, Rect } from '../types';
import { blanchedTree, blanchingGround, setDepth, WOOD_GROUND, WOOD_SKY, woodLight } from './common';

const W = 60;
const H = 11;
const GROUND = blanchingGround(W, H, () => 0.08, (_x, y) => y >= 4 && y <= 6, 43);
const START: [number, number] = [tiles(4), tiles(5.4)];
/** Where the wave starts, and how fast it comes (art pixels per second, rising). */
const WAVE_START = tiles(-3);
const waveSpeed = (t: number) => 38 + Math.min(10, t * 0.4);

/** Fallen trunks across the way: the party has to weave between them. */
const LOGS: Rect[] = [
  [tiles(13), tiles(5.2), tiles(3), 12],
  [tiles(21), tiles(2.6), tiles(3), 12],
  [tiles(30), tiles(6.4), tiles(3.4), 12],
  [tiles(38), tiles(3.2), tiles(3), 12],
  [tiles(46), tiles(5.6), tiles(3.2), 12],
];

function log(w: number, seed: number): PixelImage {
  const img = new PixelImage(w, 12);
  const bark = ramp('#6A5440', 5);
  for (let x = 0; x < w; x++)
    for (let y = 2; y < 11; y++) {
      const t = y < 4 ? 3 : y < 8 ? 2 : 1;
      img.set(x, y, bark[Math.max(0, t - (hash2(x >> 1, y, seed) > 0.85 ? 1 : 0))]!);
    }
  img.ellipse(1.5, 6.5, 1.8, 4.5, hex('#C8A878'));
  img.outline(null);
  return img;
}

/** The wave itself: a wall of blank vellum with a torn leading edge, flecked with old ink. */
function waveImage(): PixelImage {
  const w = 260;
  const h = 210;
  const img = new PixelImage(w, h);
  for (let y = 0; y < h; y++) {
    const edge = w - 6 - Math.round(4 * Math.sin(y * 0.21) + 3 * Math.sin(y * 0.07 + 1) + hash2(y >> 1, 0, 9) * 4);
    for (let x = 0; x < edge; x++) {
      const k = (edge - x) / 24;
      const a = Math.min(255, Math.round(140 + k * 115));
      img.set(x, y, [246, 240, 228, a]);
      if (x > edge - 10 && hash2(x, y, 3) > 0.94) img.set(x, y, [74, 58, 42, 200]);
    }
  }
  return img;
}

interface TreeAt {
  b: Billboard;
  x: number;
}

let wave: Billboard | null = null;
let trees: TreeAt[] = [];
let front = WAVE_START;
let chaseT = 0;

// The path runs at the foot of a bank, the wood above it.
const HEIGHTS = relief(W, H, [
  { at: [0, 0, W, 3], h: 2, ragged: 's' },
  { at: [0, 0, W, 1], h: 3 },
], 47);

export const FLIGHT: MapDef = {
  id: 'flight',
  card: { title: { en: 'The Blanchwood', fr: 'La Blanchewood' }, line: { en: 'The Blanching', fr: 'Le Blanchiment' } },
  walkable: '.dv',
  ground: GROUND,
  heights: HEIGHTS,
  bounds: { minX: tiles(13.4), maxX: tiles(W - 13.4), minY: tiles(5), maxY: tiles(5) },
  camera: { h: 4, lookAhead: 6 },
  ambience: () => new BlanchwoodAmbience({ depth: () => Math.min(1, 0.4 + chaseT / 30) }),
  checkpoint: false,
  candle: false,
  spawns: { start: { x: START[0], y: START[1], dir: 'right' } },
  build(r, st) {
    woodLight(r, 0.45);
    st.ground({ ground: GROUND, heights: HEIGHTS, seed: 47, palette: WOOD_GROUND });
    st.addSky({ ...WOOD_SKY }, 200);
    trees = [];
    for (let i = 0; i < 26; i++) {
      const x = tiles(1) + i * tiles(2.35) + hash2(i, 1, 9) * 14;
      const b = st.addImage(blanchedTree(i + 91, 0.3 + hash2(i, 2, 9) * 0.15), x, tiles(1.2) + hash2(i, 3, 9) * 12);
      trees.push({ b, x });
    }
    for (let i = 0; i < 12; i++) {
      const x = tiles(2) + i * tiles(5) + hash2(i, 4, 9) * 20;
      const b = st.addImage(blanchedTree(i + 121, 0.35), x, tiles(10.6) + hash2(i, 5, 9) * 6);
      trees.push({ b, x });
    }
    const blocked: Rect[] = [];
    LOGS.forEach((l, i) => {
      const b = st.addImage(log(l[2], i), l[0] + l[2] / 2, l[1] + 10);
      trees.push({ b, x: l[0] });
      blocked.push(l);
    });
    wave = st.addImage(waveImage(), WAVE_START - 130, tiles(H) + 4, { shadow: false });
    wave.glow = 1;
    return { blocked };
  },
  zones: [
    {
      id: 'chapel',
      rect: [tiles(W - 3), 0, tiles(3), tiles(H)],
      when: (c) => !c.flag('escaped'),
      run: async (c) => {
        c.set('escaped');
        c.letterbox(true);
        await c.narrate({ en: 'Knell Chapel, grey stone among grey trees. The blank comes to its step and stops there, as if it daren’t.', fr: 'La chapelle du Glas, pierre grise parmi les arbres gris. Le blanc arrive jusqu’à sa marche et s’arrête là, comme s’il n’osait pas.' });
        await c.say('hild', { en: 'Put me down now, knight.', fr: 'Repose-moi, maintenant, chevalier.' });
        await c.say('whit', { en: 'No. Not yet.', fr: 'Non. Pas encore.' });
        c.goto('chapel', 'door');
      },
    },
  ],
  watch: (c, dt) => {
    if (!c.flag('chaseOn')) return null;
    chaseT += dt;
    front += waveSpeed(chaseT) * dt;
    placeWave();
    setDepth(c.r, Math.min(0.85, 0.45 + chaseT / 40));
    return front > c.player.x - 6 ? caught : null;
  },
  async enter(c) {
    c.set('chaseOn', false);
    front = WAVE_START;
    chaseT = 0;
    placeWave();
    c.letterbox(true);
    c.shake(3, 1);
    await c.narrate({ en: 'Behind them Ermeline’s blade rises and falls, and with every stroke a strip of the wood is gone.', fr: 'Derrière eux, la lame d’Ermeline monte et descend, et à chaque coup une bande du bois disparaît.' });
    await c.say('ermeline', { en: '…Agnes, Cole, Wenna… I’m sorry. Hold still.', fr: '…Agnès, Cole, Wenna… Pardon. Ne bougez pas.' });
    await c.say('hild', { en: 'My legs won’t, child. Go without me.', fr: 'Mes jambes ne veulent pas, petite. Partez sans moi.' });
    await c.say('whit', { en: 'No.', fr: 'Non.' });
    await c.narrate({ en: 'Whit lifts Hild as if she weighed nothing, and runs.', fr: 'Whit soulève Hild comme si elle ne pesait rien, et court.' });
    c.letterbox(false);
    c.set('chaseOn');
  },
};

/** Move the wave, and blanch the trees it has reached. */
function placeWave(): void {
  if (wave) {
    wave.x = front - 130;
    wave.sync();
  }
  for (const t of trees) {
    const k = Math.max(0, Math.min(1, (front - t.x + 20) / 40));
    t.b.fray = k;
    t.b.opacity = 1 - k * k;
    t.b.visible = k < 1;
  }
}

async function caught(c: MapContext): Promise<void> {
  c.flash(1);
  fizzleSound(c.audio);
  c.player.x = START[0];
  c.player.y = START[1];
  for (const a of c.party) {
    a.x = START[0] - 10;
    a.y = START[1];
  }
  front = WAVE_START;
  chaseT = 0;
  placeWave();
  await c.narrate({ en: 'The blank takes their heels, and the wood folds back like a page turned too soon. Again.', fr: 'Le blanc les rattrape aux talons, et le bois se replie comme une page tournée trop tôt. Encore.' });
}
