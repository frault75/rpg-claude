/**
 * Growth (DESIGN.md §5.16–§5.17): the party's shared level, the experience that raises it,
 * the ranks some levels bring, and the three difficulties. Pure, so the solver and the tests
 * can play any fight at any level.
 */

import type { LocalText } from '../i18n/i18n';
import type { CharId, GameState } from '../story/state';
import { ABILITIES, REWARDS } from './data';
import type { AbilityId } from './types';

export type Difficulty = 'story' | 'normal' | 'illuminated';
export const DIFFICULTIES: readonly Difficulty[] = ['story', 'normal', 'illuminated'];

export const MAX_LEVEL = 12;

/** Experience needed to reach each level (index = level; level 1 needs none). */
export const LEVEL_XP = [0, 0, 10, 25, 45, 70, 100, 135, 175, 220, 270, 325, 385] as const;

/** The party's level for so much experience. */
export function levelFor(xp: number): number {
  let level = 1;
  while (level < MAX_LEVEL && xp >= LEVEL_XP[level + 1]!) level++;
  return level;
}

/** How far into the current level, and how much the next one takes (0 at the top). */
export function progress(xp: number): { level: number; into: number; need: number } {
  const level = levelFor(xp);
  if (level >= MAX_LEVEL) return { level, into: 0, need: 0 };
  return { level, into: xp - LEVEL_XP[level]!, need: LEVEL_XP[level + 1]! - LEVEL_XP[level]! };
}

/** HP by level, 1..12. At level 3 they are 12/22/18, the numbers the first fights were tuned for. */
const HP: Record<CharId, readonly number[]> = {
  isot: [12, 12, 12, 13, 13, 14, 14, 15, 15, 16, 16, 17],
  hild: [19, 20, 22, 23, 24, 25, 26, 27, 28, 29, 30, 32],
  whit: [15, 16, 18, 19, 20, 21, 22, 23, 24, 25, 26, 28],
};

export function hpAt(c: CharId, level: number): number {
  const row = HP[c];
  return row[Math.max(1, Math.min(MAX_LEVEL, Math.round(level))) - 1]!;
}

/** The level the first fights were tuned at, used when none is given. */
export const TUNED_LEVEL = 3;

export type RankId = 'shove2' | 'lance2' | 'penknife2' | 'shrive2' | 'inkwell';

export interface Rank {
  id: RankId;
  level: number;
  name: LocalText;
  text: LocalText;
}

export const RANKS: readonly Rank[] = [
  { id: 'shove2', level: 4, name: { en: 'Shove II', fr: 'Bousculer II' }, text: { en: 'Shove deals 3.', fr: 'Bousculer inflige 3.' } },
  { id: 'lance2', level: 6, name: { en: 'Lance II', fr: 'Lance II' }, text: { en: 'Lance deals 5.', fr: 'Lance inflige 5.' } },
  { id: 'penknife2', level: 8, name: { en: 'Penknife II', fr: 'Canif II' }, text: { en: 'Penknife deals 3.', fr: 'Canif inflige 3.' } },
  { id: 'shrive2', level: 10, name: { en: 'Shrive II', fr: 'Absoudre II' }, text: { en: 'Shrive heals 8.', fr: 'Absoudre soigne 8.' } },
  { id: 'inkwell', level: 12, name: { en: 'The Ink-well', fr: 'L’encrier' }, text: { en: 'Isot’s Ink holds 4.', fr: 'L’encre d’Isot monte à 4.' } },
];

export function hasRank(level: number, id: RankId): boolean {
  return level >= RANKS.find((r) => r.id === id)!.level;
}

/** The ranks gained in going from one level to another. */
export function ranksBetween(from: number, to: number): Rank[] {
  return RANKS.filter((r) => r.level > from && r.level <= to);
}

/** An enemy's HP in a difficulty. */
export function enemyHp(base: number, d: Difficulty): number {
  return d === 'illuminated' ? Math.ceil(base * 1.25) : base;
}

/** An enemy blow in a difficulty: a point softer in Story, a point harder in Illuminated (from 3 up). */
export function enemyDamage(damage: number, d: Difficulty): number {
  if (damage <= 0) return damage;
  if (d === 'story') return Math.max(1, damage - 1);
  if (d === 'illuminated' && damage >= 3) return damage + 1;
  return damage;
}

/** Banderoles name their blows ("Butts the Front · 2"): keep the number true to the blow. */
export function relabel(label: LocalText, from: number, to: number): LocalText {
  if (from === to) return label;
  const swap = (s: string) => s.replace(new RegExp(`· ${from}(?!\\d)`), `· ${to}`);
  return { en: swap(label.en), fr: swap(label.fr) };
}

/** The experience and pennies of the fights already won (for saves and the debug jumps). */
export function spoilsOf(cleared: readonly string[]): { xp: number; pennies: number } {
  let xp = 0;
  let pennies = 0;
  for (const id of new Set(cleared)) {
    xp += REWARDS[id]?.xp ?? 0;
    pennies += REWARDS[id]?.pennies ?? 0;
  }
  return { xp, pennies };
}

/** The level the party is sure to have at a fight by following the story to it, skipping what is optional. */
export function storyLevel(id: string): number {
  const order = Object.keys(REWARDS);
  const i = order.indexOf(id);
  return levelFor(spoilsOf((i < 0 ? order : order.slice(0, i)).filter((f) => !REWARDS[f]!.optional)).xp);
}

export interface Spoils {
  xp: number;
  pennies: number;
  /** The level before and after. */
  from: number;
  to: number;
  /** Experience before, for the bar to fill from. */
  before: number;
  ranks: Rank[];
}

/** Win a fight: the first time, its experience and pennies go to the party. Again, nothing. */
export function claim(g: GameState, id: string): Spoils | null {
  if (g.cleared.includes(id)) return null;
  g.cleared.push(id);
  const r = REWARDS[id];
  if (!r) return null;
  const before = g.xp;
  const from = levelFor(before);
  g.xp += r.xp;
  g.pennies += r.pennies;
  const to = levelFor(g.xp);
  return { xp: r.xp, pennies: r.pennies, from, to, before, ranks: ranksBetween(from, to) };
}

/** An ability's rule as the party's level has sharpened it. */
export function abilityText(id: AbilityId, level: number): LocalText {
  const rank = RANKED[id];
  return rank && hasRank(level, rank[0]) ? rank[1] : ABILITIES[id].text;
}

const RANKED: Partial<Record<AbilityId, [RankId, LocalText]>> = {
  shove: ['shove2', { en: '3 damage to the 1st enemy, then push it to the back.', fr: '3 dégâts au 1er ennemi, puis le repousse au fond.' }],
  lance: ['lance2', { en: '5 damage to the 1st or 2nd enemy.', fr: '5 dégâts au 1er ou au 2e ennemi.' }],
  penknife: ['penknife2', { en: '3 damage to any enemy.', fr: '3 dégâts à n’importe quel ennemi.' }],
  shrive: ['shrive2', { en: 'An ally regains 8 HP, or a fallen ally rises with 8.', fr: 'Un allié regagne 8 PV, ou un allié tombé se relève avec 8.' }],
};
