/**
 * The Blanchwood and Ninefold Blank (DESIGN.md §7.3, §8.6): a forest that forgets itself
 * the deeper you go. Its trees drain down their colour ramps to grisaille, then to bare
 * vellum with only a broken ink outline left, then to nothing. Under it lies Ninefold, a
 * city that survives only as underwriting: house fronts, doorways and streets drawn in
 * pale ghost-ink that the raking light picks out. Also Ninefold Gate, half inked, and
 * the panels of the Danse Macabre in Knell Chapel.
 */

import { hash2 } from '../engine/noise';
import { type Art, ashlar, newArt } from '../pixel/buildings';
import { CHARACTERS, type CharSpec, drawCharacter, FRAMES } from '../pixel/characters';
import { oakTree, pineTree } from '../pixel/nature';
import { hex, PixelImage, type RGBA, ramp } from '../pixel/pixel';

const VELLUM: RGBA = hex('#EFE6D0');
const INK: RGBA = hex('#4A3A2A');
const GHOST = hex('#E8C88A', 220);
const GHOST_DIM = hex('#B8925A', 160);
/** Underwriting on bright vellum is read as old sepia ink rather than pale gold. */
export const SEPIA = hex('#6A4A28', 235);
const SEPIA_DIM = hex('#8A6A44', 170);

const mix = (a: RGBA, b: RGBA, k: number): RGBA => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k, a[3]];
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/**
 * Blanch a piece of art (0 = as drawn, 1 = gone): colour drains to a warm grisaille, the
 * grisaille fades to vellum, then the inside drops away and only a broken ink outline is
 * left, and at the last even that goes.
 */
export function blanch(src: PixelImage, k: number, seed = 1): PixelImage {
  const out = new PixelImage(src.w, src.h);
  if (k >= 1) return out;
  const grey = clamp01(k * 2.2);
  const pale = clamp01((k - 0.4) * 2.2) * 0.85;
  const hollow = clamp01((k - 0.68) / 0.26);
  const lost = clamp01((k - 0.9) / 0.1);
  for (let y = 0; y < src.h; y++) {
    for (let x = 0; x < src.w; x++) {
      const c = src.get(x, y);
      if (c[3] < 8) continue;
      const edge = src.alpha(x - 1, y) < 8 || src.alpha(x + 1, y) < 8 || src.alpha(x, y - 1) < 8 || src.alpha(x, y + 1) < 8;
      const h = hash2(x, y, seed);
      if (edge) {
        if (h < lost) continue;
        out.set(x, y, hollow > 0 ? mix(mix(c, INK, 0.6), INK, hollow) : mix(c, INK, grey * 0.3));
        continue;
      }
      if (h < hollow) continue;
      const lum = c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11;
      const gris: RGBA = [lum * 1.02 + 12, lum * 0.98 + 10, lum * 0.9 + 6, c[3]];
      out.set(x, y, mix(mix(c, gris, grey), VELLUM, pale));
    }
  }
  return out;
}

/** A tree of the wood (oak or pine), in the wood's own greens. */
export function woodTree(seed: number): PixelImage {
  return seed % 3 === 2 ? pineTree(seed, false, '#3E5A3A') : oakTree(seed, seed % 2 ? '#627F35' : '#6E8A3E');
}

/** A bird on a bough, drawn only as an outline: the colour went first. */
export function outlineBird(seed = 1): PixelImage {
  const img = new PixelImage(10, 7);
  const pts: [number, number][] = [
    [1, 3],
    [2, 2],
    [3, 2],
    [4, 3],
    [5, 3],
    [6, 2],
    [7, 2],
    [8, 3],
    [7, 4],
    [6, 5],
    [4, 5],
    [3, 4],
    [8, 1],
    [9, 1],
  ];
  for (const [x, y] of pts) if (hash2(x, y, seed) > 0.18) img.set(x, y, INK);
  img.set(7, 3, INK);
  return img;
}

/** A house front of Ninefold, as underwriting: walls, a gable, a door and two windows in ghost-ink. */
export function ghostFacade(w = 40, h = 44, seed = 1, sepia = false): PixelImage {
  const img = new PixelImage(w, h);
  const wallTop = Math.round(h * 0.38);
  const dot = (x: number, y: number, dim = false) => {
    if (hash2(x, y, seed) > 0.12) img.set(x, y, sepia ? (dim ? SEPIA_DIM : SEPIA) : dim ? GHOST_DIM : GHOST);
  };
  // Walls and the gable.
  for (let y = wallTop; y < h; y++) {
    dot(1, y);
    dot(w - 2, y);
  }
  for (let x = 1; x < w - 1; x++) dot(x, h - 1, true);
  const peak = 1;
  for (let x = 1; x < w - 1; x++) {
    const t = Math.abs(x + 0.5 - w / 2) / (w / 2);
    dot(x, Math.round(peak + t * (wallTop - peak)));
  }
  // Timber framing, faint.
  for (let x = 4; x < w - 4; x += 7) for (let y = wallTop + 2; y < h - 2; y += 2) dot(x, y, true);
  // A door with a round head.
  const dw = 10;
  const dx = Math.round(w / 2 - dw / 2 + (hash2(1, 2, seed) - 0.5) * 6);
  const dh = 16;
  for (let y = h - dh; y < h; y++) {
    dot(dx, y);
    dot(dx + dw, y);
  }
  for (let a = 0; a <= 12; a++) {
    const ang = Math.PI * (a / 12);
    dot(Math.round(dx + dw / 2 - Math.cos(ang) * (dw / 2)), Math.round(h - dh - Math.sin(ang) * 4));
  }
  // Two small windows.
  for (const wx of [5, w - 12]) {
    if (Math.abs(wx + 3 - (dx + dw / 2)) < 9) continue;
    for (let x = wx; x < wx + 7; x++) {
      dot(x, wallTop + 4);
      dot(x, wallTop + 10);
    }
    for (let y = wallTop + 4; y <= wallTop + 10; y++) {
      dot(wx, y);
      dot(wx + 6, y);
      dot(wx + 3, y, true);
    }
  }
  return img;
}

/** A cobbled street of Ninefold, flat on the ground as underwriting. */
export function ghostStreet(w = 48, d = 18, seed = 1, sepia = false): PixelImage {
  const img = new PixelImage(w, d);
  const [ink, dim] = sepia ? [SEPIA, SEPIA_DIM] : [GHOST, GHOST_DIM];
  for (let y = 0; y < d; y++)
    for (let x = 0; x < w; x++) {
      const cell = (Math.floor(x / 5) + Math.floor(y / 4) * 3) % 2;
      const joint = x % 5 === (cell ? 2 : 0) || y % 4 === 0;
      if (joint && hash2(x, y, seed) > 0.45) img.set(x, y, dim);
    }
  for (let x = 0; x < w; x++) {
    if (hash2(x, 0, seed) > 0.2) img.set(x, 0, ink);
    if (hash2(x, 1, seed) > 0.2) img.set(x, d - 1, ink);
  }
  return img;
}

/** A stone of the faded path through Ninefold: pale, with the dry-point of an old ruling. */
export function pathStone(seed = 1): PixelImage {
  const img = new PixelImage(14, 9);
  img.ellipse(7, 4.5, 6 + (seed % 2), 3.6, hex('#8A6A44', 200));
  img.ellipse(7, 4.5, 4.5, 2.4, hex('#A88A5A', 220));
  img.ellipse(6, 3.5, 2, 1, hex('#C8AA78', 220));
  return img;
}

/**
 * Ninefold Gate: a gatehouse of pale stone, inked only on one side. The city behind it was
 * scoured; the gate was half-way through being forgotten when the Scouring stopped.
 */
export function ninefoldGate(seed = 9): Art & { anchor: [number, number] } {
  const W = 120;
  const H = 96;
  const art = newArt(W, H);
  const stone = '#C8BEA8';
  // Two towers and the arch between.
  for (const [x0, w] of [
    [0, 34],
    [W - 34, 34],
  ] as const) {
    ashlar(art, x0, 10, w, H - 10, { stone, seed: seed + x0 });
    for (let x = x0; x < x0 + w; x += 6) art.a.rect(x, 4, 4, 6, ramp(stone, 5)[2]!);
  }
  ashlar(art, 34, 24, W - 68, 28, { stone, seed: seed + 3 });
  // The gateway: a round-headed arch, open to blank vellum beyond.
  for (let y = 24; y < H; y++)
    for (let x = 34; x < W - 34; x++) {
      const inArch = y >= 54 || ((x + 0.5 - W / 2) / 19) ** 2 + ((y + 0.5 - 54) / 18) ** 2 <= 1;
      if (inArch && x >= W / 2 - 19 && x < W / 2 + 19) art.a.set(x, y, [0, 0, 0, 0]);
    }
  // Voussoirs round the arch.
  for (let a = 0; a <= 16; a++) {
    const ang = Math.PI * (a / 16);
    const x = Math.round(W / 2 - Math.cos(ang) * 20.5);
    const y = Math.round(54 - Math.sin(ang) * 19.5);
    art.a.rect(x - 1, y - 1, 2, 2, ramp(stone, 5)[a % 2 ? 1 : 3]!);
  }
  // The eastern half is already blanched: grisaille, then vellum and ink.
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const k = clamp01((x - W * 0.45) / (W * 0.55)) * 0.86;
      if (k <= 0) continue;
      const c = art.a.get(x, y);
      if (c[3] < 8) continue;
      const lum = c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11;
      const g: RGBA = [lum + 14, lum + 10, lum + 4, 255];
      art.a.set(x, y, mix(mix(c, g, clamp01(k * 2)), VELLUM, clamp01(k * 1.2 - 0.3)));
    }
  art.a.outline(INK);
  return Object.assign(art, { anchor: [W / 2, H - 1] as [number, number] });
}

// ---------------------------------------------------------------------------------------
// The Danse Macabre mural (Knell Chapel)

export type MuralFigure = 'pope' | 'king' | 'knight' | 'merchant' | 'ploughman' | 'child';
/** "From the highest to the least the dance goes down." */
export const MURAL_ORDER: readonly MuralFigure[] = ['pope', 'king', 'knight', 'merchant', 'ploughman', 'child'];

const LIVING: Record<MuralFigure, CharSpec> = {
  pope: { ...CHARACTERS.aumery!, id: 'm-pope', headwear: 'tiara', robe: '#F2EDE2' },
  king: { ...CHARACTERS.villager!, id: 'm-king', headwear: 'crown', headwearColor: '#D8A838', robe: '#6B3C70', cape: '#2E4A8A' },
  knight: { ...CHARACTERS.george!, id: 'm-knight', mask: undefined, cross: undefined, robe: '#E6DFD0' },
  merchant: { ...CHARACTERS.doctor!, id: 'm-merchant', mask: undefined, robe: '#7A3A2E', cape: undefined, held: 'none' },
  ploughman: { ...CHARACTERS.dunstan!, id: 'm-ploughman' },
  child: { ...CHARACTERS.child!, id: 'm-child', scale: 1 },
};
const DEATH: CharSpec = { id: 'm-death', skin: '#E9DDC2', hair: '#D8CCB0', eyes: '#141010', headwear: 'none', headwearColor: '#000000', robe: '#D8D0BC', held: 'none', skull: true, rags: true };

/**
 * One panel of the mural: a Death leading a living figure by the hand, on a fresco ground
 * with a painted frame. The Knight's Death has no face, only a blank shield.
 */
export function muralPanel(fig: MuralFigure): PixelImage {
  const W = 46;
  const H = 58;
  const img = new PixelImage(W, H);
  const ground = ramp(fig === 'knight' ? '#B8A07A' : '#C8A87A', 5);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const t = 2 + (hash2(x >> 1, y >> 1, 3) - 0.5) * 1.2 - (y > H - 10 ? 0.8 : 0);
      img.set(x, y, ground[Math.max(0, Math.min(4, Math.round(t)))]!);
    }
  // A border of red ochre with a white line.
  for (let x = 0; x < W; x++) {
    for (const y of [0, 1, H - 2, H - 1]) img.set(x, y, hex('#8A3A2A'));
    img.set(x, 2, hex('#E8DCC0'));
    img.set(x, H - 3, hex('#E8DCC0'));
  }
  for (let y = 0; y < H; y++) {
    for (const x of [0, 1, W - 2, W - 1]) img.set(x, y, hex('#8A3A2A'));
    img.set(2, y, hex('#E8DCC0'));
    img.set(W - 3, y, hex('#E8DCC0'));
  }
  const death = drawCharacter(DEATH, 'right', FRAMES[6]!);
  const living = drawCharacter(LIVING[fig], 'left', FRAMES[0]!);
  img.blit(death, 0, 7);
  img.blit(living, 14, 7);
  // Their hands meet.
  img.rect(21, 37, 3, 2, hex('#E9DDC2'));
  if (fig === 'knight') {
    // The knight's Death: a blank shield where its face should be.
    const shield = ramp('#F4F0E6', 4);
    img.poly(
      [
        [10, 10],
        [21, 10],
        [21, 19],
        [15.5, 25],
        [10, 19],
      ],
      (x) => shield[x < 13 ? 3 : x < 18 ? 2 : 1]!,
    );
    img.hline(10, 20, 10, INK);
  }
  return img;
}

/** The inscription under the mural, in the chapel's single vermilion. */
export const MURAL_INSCRIPTION = { en: '“From the highest to the least the dance goes down.”', fr: '« Du plus haut au plus petit, la danse descend. »' };
