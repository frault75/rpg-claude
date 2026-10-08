/**
 * Game state: everything a save file holds. Story flags drive conditions on map
 * entities and branches in scripts. Pure data, no DOM.
 */

export type FlagValue = boolean | number | string;
export type Flags = Record<string, FlagValue>;

export type CharId = 'isot' | 'hild' | 'whit';

/**
 * A condition on the flags.
 *   'name'                 the flag is truthy
 *   { not: c }             negation
 *   { all: [..] }          every condition holds
 *   { any: [..] }          at least one holds
 *   { flag, eq }           the flag equals a value
 *   { flag, gte }          a numeric flag is at least a value
 */
export type Condition =
  | string
  | { not: Condition }
  | { all: Condition[] }
  | { any: Condition[] }
  | { flag: string; eq: FlagValue }
  | { flag: string; gte: number };

export function check(cond: Condition | undefined, flags: Flags): boolean {
  if (cond === undefined) return true;
  if (typeof cond === 'string') return !!flags[cond];
  if ('not' in cond) return !check(cond.not, flags);
  if ('all' in cond) return cond.all.every((c) => check(c, flags));
  if ('any' in cond) return cond.any.some((c) => check(c, flags));
  if ('eq' in cond) return flags[cond.flag] === cond.eq;
  const v = flags[cond.flag];
  return typeof v === 'number' && v >= cond.gte;
}

export interface GameState {
  chapter: number;
  map: string;
  /** Spawn point name used when the map is entered without a saved position. */
  spawn: string;
  x: number | null;
  y: number | null;
  facing: 1 | -1;
  flags: Flags;
  party: CharId[];
  /** Who stands in the Front, Middle and Rear when a battle begins. */
  formation: CharId[];
  abilities: Record<CharId, string[]>;
  /** Equipped relic and charm per character (item ids). */
  equipment: Record<CharId, { relic: string | null; charm: string | null }>;
  /** Items carried, equipped or not. */
  inventory: string[];
  /** Encounters already won. */
  cleared: string[];
  /** Experience, which sets the party's shared level (DESIGN.md §5.16). */
  xp: number;
  /** Silver pennies in the purse (§6.1). */
  pennies: number;
  /** How many of each satchel item are carried (§6.2), three at most. */
  satchel: Partial<Record<string, number>>;
  lostNames: string[];
  /** Seconds played. */
  playTime: number;
}

export const START = { chapter: 1, map: 'scriptorium', spawn: 'start' } as const;

export function newGame(): GameState {
  return {
    chapter: START.chapter,
    map: START.map,
    spawn: START.spawn,
    x: null,
    y: null,
    facing: 1,
    flags: {},
    party: ['isot'],
    formation: ['whit', 'hild', 'isot'],
    abilities: { isot: ['penknife', 'gloss', 'strike'], hild: [], whit: [] },
    equipment: { isot: { relic: null, charm: null }, hild: { relic: null, charm: null }, whit: { relic: null, charm: null } },
    inventory: [],
    cleared: [],
    xp: 0,
    pennies: 0,
    satchel: {},
    lostNames: [],
    playTime: 0,
  };
}

export function cloneState(s: GameState): GameState {
  return JSON.parse(JSON.stringify(s)) as GameState;
}
