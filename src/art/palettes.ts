/**
 * The master pigment set (DESIGN.md §6.3) and the palette of each location (§5).
 * Generators never invent colours: they ask a palette for a role.
 */

export const PIGMENTS = {
  vellum: '#EFE4CC',
  vellumShade: '#E2D2B0',
  vellumDeep: '#CDB68C',
  ironGall: '#2A1C14',
  lampBlack: '#18140F',
  leadWhite: '#F8F2E4',
  vermilion: '#C63D2A',
  minium: '#DA6A32',
  madder: '#A63A4C',
  brazilRose: '#D58193',
  folium: '#6B3C70',
  bone: '#E9DDC2',
  lapis: '#24418F',
  lapisDeep: '#172A5C',
  azurite: '#4A73B5',
  verdigris: '#2E8B74',
  malachite: '#4CAA6C',
  sapGreen: '#627F35',
  terreVerte: '#93A77F',
  orpiment: '#E2B73F',
  ochre: '#BC8D42',
  umber: '#6C4B2D',
  slate: '#5E6572',
  silver: '#B9BDC2',
  gold: '#C9A23C',
  goldLight: '#F4DE8E',
  goldDark: '#85661E',
} as const;

export type PigmentName = keyof typeof PIGMENTS;

/** Post-processing colour grade for a location. */
export interface Grade {
  /** Multiplied into the final colour. */
  tint: [number, number, number];
  lift: number;
  gamma: number;
  gain: number;
  saturation: number;
  /** 0 = full colour, 1 = bare vellum. */
  blanch: number;
}

/** The colour roles generators ask for. */
export interface PaletteRoles {
  stone: string;
  stoneShade: string;
  roof: string;
  roofAlt: string;
  window: string;
  /** Glass lit from within (candles at night); used when glassLit. */
  windowLit: string;
  glassLit: boolean;
  accent: string;
  accentAlt: string;
  foliage: string;
  foliageShade: string;
  flower: string;
  flowerAlt: string;
  water: string;
  waterDeep: string;
  waterWash: string;
  earth: string;
  earthShade: string;
  /** Rock ledges (islands, outcrops) and their lit tops. */
  rock: string;
  rockLight: string;
  /** Exterior landscape: the sky from zenith to horizon, distant land, the meadow. */
  skyTop: string;
  skyLow: string;
  farLand: string;
  meadow: string;
  meadowDark: string;
  /** What hangs in the sky. */
  sky: { stars: boolean; moon: boolean; sun: 'none' | 'low' | 'rising' };
  /** Interior floor tiles (encaustic red and yellow) and the wall tops seen from above. */
  floor: string;
  floorAlt: string;
  wallTop: string;
  path: string;
  /** The two alternating colours of the border's bar frame. */
  barA: string;
  barB: string;
  /** Leaves on the border sprays, in rotation. */
  leaves: string[];
}

export interface LocationPalette {
  id: string;
  name: string;
  /** Running title shown in the top margin. */
  heading: string;
  roles: PaletteRoles;
  grade: Grade;
}

const P = PIGMENTS;

export const PALETTES: Record<string, LocationPalette> = {
  ebbNight: {
    id: 'ebbNight',
    name: "Saint Ebb's by night",
    heading: "SAINT EBB'S · BY NIGHT",
    roles: {
      stone: '#CBC4B6',
      stoneShade: '#7F8697',
      roof: P.lapis,
      roofAlt: P.azurite,
      window: P.lapisDeep,
      windowLit: '#F0B04A',
      glassLit: true,
      accent: P.vermilion,
      accentAlt: P.gold,
      foliage: '#4E7E50',
      foliageShade: '#22422E',
      flower: P.leadWhite,
      flowerAlt: P.azurite,
      water: P.azurite,
      waterDeep: P.lapis,
      waterWash: '#C9D3E3',
      earth: P.slate,
      earthShade: '#41464F',
      rock: '#6E786C',
      rockLight: '#B4BDA8',
      skyTop: '#0E1B45',
      skyLow: '#4166AE',
      farLand: '#5F7C8E',
      meadow: '#4E7A4E',
      meadowDark: '#2C4E33',
      sky: { stars: true, moon: true, sun: 'none' },
      floor: '#8C5C48',
      floorAlt: '#CDB27C',
      wallTop: '#8E95A3',
      path: '#B9AE97',
      barA: P.lapis,
      barB: P.vermilion,
      leaves: [P.lapis, P.gold, P.azurite, P.vermilion],
    },
    grade: { tint: [0.975, 0.985, 1.02], lift: 0.0, gamma: 1.02, gain: 0.99, saturation: 0.95, blanch: 0 },
  },
  lychford: {
    id: 'lychford',
    name: 'Lychford, Midwinter',
    heading: 'LYCHFORD · MIDWINTER',
    roles: {
      stone: '#E8D7B4',
      stoneShade: '#B99A6A',
      roof: P.minium,
      roofAlt: P.madder,
      window: P.umber,
      windowLit: '#ECA548',
      glassLit: true,
      accent: P.madder,
      accentAlt: P.gold,
      foliage: P.verdigris,
      foliageShade: '#22685A',
      flower: P.brazilRose,
      flowerAlt: P.madder,
      water: P.azurite,
      waterDeep: '#36588F',
      waterWash: '#D7DEE5',
      earth: P.ochre,
      earthShade: P.umber,
      rock: '#B08E62',
      rockLight: '#E0CBA2',
      skyTop: '#27346B',
      skyLow: '#E8B58A',
      farLand: '#8A8EA2',
      meadow: '#E9E4DA',
      meadowDark: '#B9BCC6',
      sky: { stars: true, moon: false, sun: 'low' },
      floor: '#A0643E',
      floorAlt: '#DCC08A',
      wallTop: '#A58A62',
      path: '#D6BE8E',
      barA: P.madder,
      barB: P.gold,
      leaves: [P.minium, P.verdigris, P.gold, P.madder],
    },
    grade: { tint: [1.05, 0.99, 0.92], lift: 0.0, gamma: 0.98, gain: 1.0, saturation: 1.02, blanch: 0 },
  },
  blanchwood: {
    id: 'blanchwood',
    name: 'The Blanchwood',
    heading: 'THE BLANCHWOOD',
    roles: {
      stone: P.bone,
      stoneShade: '#A99FA9',
      roof: P.folium,
      roofAlt: P.umber,
      window: P.lampBlack,
      windowLit: '#C9B98A',
      glassLit: false,
      accent: P.folium,
      accentAlt: P.silver,
      foliage: P.sapGreen,
      foliageShade: '#3F5422',
      flower: P.terreVerte,
      flowerAlt: P.folium,
      water: '#6E8C88',
      waterDeep: '#4D6662',
      waterWash: '#DCDDCF',
      earth: P.umber,
      earthShade: '#4A3420',
      rock: '#8D8578',
      rockLight: '#D2C9B8',
      skyTop: '#6E7D80',
      skyLow: '#DAD8C9',
      farLand: '#A6AEA4',
      meadow: '#8C9A6A',
      meadowDark: '#5E6E45',
      sky: { stars: false, moon: false, sun: 'none' },
      floor: '#9A8C7A',
      floorAlt: '#D8CDB8',
      wallTop: '#9C948A',
      path: '#CBBFA2',
      barA: P.sapGreen,
      barB: P.folium,
      leaves: [P.sapGreen, P.terreVerte, P.folium, P.silver],
    },
    grade: { tint: [0.98, 1.0, 0.97], lift: 0.02, gamma: 1.02, gain: 0.98, saturation: 0.62, blanch: 0.3 },
  },
  margin: {
    id: 'margin',
    name: 'The Margin',
    heading: 'THE MARGIN',
    roles: {
      stone: P.goldLight,
      stoneShade: P.gold,
      roof: P.vermilion,
      roofAlt: P.lapis,
      window: P.lapisDeep,
      windowLit: '#F2CF6A',
      glassLit: false,
      accent: P.vermilion,
      accentAlt: P.gold,
      foliage: P.malachite,
      foliageShade: '#2E7A48',
      flower: P.brazilRose,
      flowerAlt: P.orpiment,
      water: P.lapis,
      waterDeep: P.lapisDeep,
      waterWash: '#CFD8EE',
      earth: P.gold,
      earthShade: P.goldDark,
      rock: P.brazilRose,
      rockLight: '#F3CBD2',
      skyTop: '#1E3A8A',
      skyLow: '#F1D88A',
      farLand: '#7FA86E',
      meadow: '#56AE6E',
      meadowDark: '#2E7A48',
      sky: { stars: true, moon: false, sun: 'rising' },
      floor: P.vermilion,
      floorAlt: P.goldLight,
      wallTop: P.gold,
      path: '#E9CF86',
      barA: P.vermilion,
      barB: P.lapis,
      leaves: [P.malachite, P.vermilion, P.lapis, P.brazilRose, P.gold],
    },
    grade: { tint: [1.03, 1.0, 0.95], lift: 0.0, gamma: 0.97, gain: 1.03, saturation: 1.18, blanch: 0 },
  },
  ebbDawn: {
    id: 'ebbDawn',
    name: "Saint Ebb's at dawn",
    heading: "SAINT EBB'S · AT DAWN",
    roles: {
      stone: '#F2E6DA',
      stoneShade: '#D2A9A6',
      roof: P.brazilRose,
      roofAlt: P.azurite,
      window: P.lapisDeep,
      windowLit: '#E8B070',
      glassLit: false,
      accent: P.brazilRose,
      accentAlt: P.goldLight,
      foliage: P.verdigris,
      foliageShade: '#2A6D60',
      flower: P.brazilRose,
      flowerAlt: P.goldLight,
      water: '#7C9BCF',
      waterDeep: P.azurite,
      waterWash: '#F1DCD6',
      earth: '#B9A08B',
      earthShade: '#8D6E5F',
      rock: '#B49A93',
      rockLight: '#EAD4CB',
      skyTop: '#3E57A0',
      skyLow: '#F3B8A0',
      farLand: '#8C93A8',
      meadow: '#5E8C5A',
      meadowDark: '#35603C',
      sky: { stars: false, moon: false, sun: 'rising' },
      floor: '#B07A6A',
      floorAlt: '#E8CFA8',
      wallTop: '#B8A0A0',
      path: '#E3CDB2',
      barA: P.brazilRose,
      barB: P.azurite,
      leaves: [P.brazilRose, P.goldLight, P.azurite, P.gold],
    },
    grade: { tint: [1.04, 0.98, 0.98], lift: 0.01, gamma: 0.97, gain: 1.02, saturation: 1.0, blanch: 0 },
  },
};

export const PALETTE_ORDER = ['ebbNight', 'lychford', 'blanchwood', 'margin', 'ebbDawn'] as const;

/** Parse '#RRGGBB' into 0–1 floats. */
export function hexToRgb(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) throw new Error(`Bad colour: ${hex}`);
  const n = parseInt(m[1]!, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export function rgbToHex([r, g, b]: [number, number, number]): string {
  const c = (v: number) =>
    Math.round(Math.min(1, Math.max(0, v)) * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`.toUpperCase();
}

const mixCache = new Map<string, string>();

/** Mix two hex colours; t = 0 gives a, t = 1 gives b. (Memoised: generators call it a lot.) */
export function mix(a: string, b: string, t: number): string {
  const key = `${a}${b}${Math.round(t * 1000)}`;
  const hit = mixCache.get(key);
  if (hit) return hit;
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  const out = rgbToHex([ca[0] + (cb[0] - ca[0]) * t, ca[1] + (cb[1] - ca[1]) * t, ca[2] + (cb[2] - ca[2]) * t]);
  if (mixCache.size > 20000) mixCache.clear();
  mixCache.set(key, out);
  return out;
}

/** Darken (t < 0, towards iron-gall) or lighten (t > 0, towards lead-white). */
export function shade(hex: string, t: number): string {
  return t < 0 ? mix(hex, PIGMENTS.ironGall, -t) : mix(hex, PIGMENTS.leadWhite, t);
}
