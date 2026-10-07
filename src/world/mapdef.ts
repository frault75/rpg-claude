/**
 * The typed shape of a map (DESIGN.md §10.3). Positions are in tiles (fractions allowed),
 * so maps are easy to edit by hand; the map scene converts them to world units.
 */

import type { Condition } from '../story/state';

export type Room = 'church' | 'interior' | 'cloister' | 'outdoor';

export interface PropDef {
  /** A key of PROP_KINDS, or 'arcade'. */
  kind: string;
  at: readonly [number, number];
  id?: string;
  flip?: boolean;
  if?: Condition;
  /** Script run when the player interacts. */
  script?: string;
  /** Arcade only: number of bays and bay width in tiles. */
  bays?: number;
  bay?: number;
}

export interface NpcDef {
  id: string;
  /** A key of FIGURES. */
  figure: string;
  at: readonly [number, number];
  facing?: 1 | -1;
  script?: string;
  if?: Condition;
}

export interface TriggerDef {
  id: string;
  /** x, y, w, h in tiles. */
  rect: readonly [number, number, number, number];
  script: string;
  /** Fire only once per game (remembered in flags as `trig:<map>:<id>`). */
  once?: boolean;
  if?: Condition;
}

export interface ExitDef {
  rect: readonly [number, number, number, number];
  to: string;
  spawn: string;
  if?: Condition;
  /** Shown when the exit exists but its condition does not hold. */
  blocked?: string;
}

export interface UnderwritingDef {
  id: string;
  at: readonly [number, number];
  lines: readonly string[];
  /** Draw the ghost of a doorway above the words. */
  door?: { w: number; h: number };
  size?: number;
  /** Script run when the player reads it (interacting under raking light). */
  script?: string;
  /** A Lost Name found by reading it. */
  lostName?: string;
  if?: Condition;
}

export interface EncounterMarker {
  id: string;
  /** Drolleries or figures to show standing on the map. */
  art: readonly { figure: string; at: readonly [number, number]; flip?: boolean }[];
  battle: string;
  /** Script that runs the fight (and anything around it). */
  script: string;
  if?: Condition;
}

/** Tiles that turn walkable when a condition holds (a broken wall, an opened door). */
export interface SwitchDef {
  cells: readonly (readonly [number, number])[];
  if: Condition;
}

export interface MapDef {
  id: string;
  /** Location card on entry. */
  title: string;
  line: string;
  palette: string;
  ambience: string;
  room: Room;
  tile: number;
  layout: readonly string[];
  props: readonly PropDef[];
  npcs: readonly NpcDef[];
  triggers: readonly TriggerDef[];
  exits: readonly ExitDef[];
  underwriting: readonly UnderwritingDef[];
  encounters: readonly EncounterMarker[];
  switches: readonly SwitchDef[];
  spawns: Readonly<Record<string, { at: readonly [number, number]; facing?: 1 | -1 }>>;
  /** Script run every time the map is entered, after the fade-in. */
  onEnter?: string;
}

/** Check a map for mistakes a hand-editor is likely to make. Returns problems found. */
export function lintMap(m: MapDef, scripts: ReadonlySet<string>, maps: ReadonlySet<string>): string[] {
  const out: string[] = [];
  const cols = Math.max(...m.layout.map((r) => r.length));
  const inside = ([x, y]: readonly [number, number]) => x >= 0 && y >= 0 && x <= cols && y <= m.layout.length;
  const walkable = (x: number, y: number) => '.,gd'.includes(m.layout[Math.floor(y)]?.[Math.floor(x)] ?? ' ');
  for (const [name, s] of Object.entries(m.spawns)) {
    if (!walkable(s.at[0], s.at[1])) out.push(`${m.id}: spawn "${name}" is not on a walkable tile`);
  }
  for (const p of m.props) if (!inside(p.at)) out.push(`${m.id}: prop ${p.kind} outside the map`);
  const needScript = (id: string | undefined, what: string) => {
    if (id && !scripts.has(id)) out.push(`${m.id}: ${what} uses unknown script "${id}"`);
  };
  for (const p of m.props) needScript(p.script, `prop ${p.kind}`);
  for (const n of m.npcs) needScript(n.script, `npc ${n.id}`);
  for (const t of m.triggers) needScript(t.script, `trigger ${t.id}`);
  for (const u of m.underwriting) needScript(u.script, `underwriting ${u.id}`);
  for (const e of m.encounters) needScript(e.script, `encounter ${e.id}`);
  needScript(m.onEnter, 'onEnter');
  for (const e of m.exits) if (!maps.has(e.to)) out.push(`${m.id}: exit to unknown map "${e.to}"`);
  return out;
}
