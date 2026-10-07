/**
 * Saving and loading (DESIGN.md §9). Versioned JSON in localStorage, one autosave and one
 * manual slot. A corrupt or unknown save is ignored, never a crash.
 */

import { type GameState, newGame } from '../story/state';

export const SAVE_VERSION = 1;
const KEY = 'palimpsest:save:v1';

export type Slot = 'auto' | 'manual';

export interface SaveData {
  version: number;
  slot: Slot;
  savedAt: number;
  state: GameState;
}

/** The subset of the Storage API we use, so tests can pass a fake. */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** Upgrade older save formats here, one version at a time. */
const MIGRATIONS: Record<number, (data: Record<string, unknown>) => Record<string, unknown>> = {};

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Parse and validate a save. Missing optional fields are filled from a new game. */
export function parseSave(raw: string | null): SaveData | null {
  if (!raw) return null;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isObject(data) || typeof data.version !== 'number') return null;
  let d: Record<string, unknown> = data;
  for (let v = d.version as number; v < SAVE_VERSION; v++) {
    const m = MIGRATIONS[v];
    if (!m) return null;
    d = { ...m(d), version: v + 1 };
  }
  if (d.version !== SAVE_VERSION) return null;
  const st = d.state;
  if (!isObject(st) || typeof st.map !== 'string' || typeof st.chapter !== 'number' || !isObject(st.flags)) return null;
  if (!Array.isArray(st.party) || !st.party.every((p) => p === 'isot' || p === 'hild' || p === 'whit')) return null;
  const base = newGame();
  const state: GameState = {
    ...base,
    ...(st as Partial<GameState>),
    abilities: { ...base.abilities, ...(isObject(st.abilities) ? (st.abilities as GameState['abilities']) : {}) },
    equipment: { ...base.equipment, ...(isObject(st.equipment) ? (st.equipment as GameState['equipment']) : {}) },
    inventory: Array.isArray(st.inventory) ? (st.inventory as unknown[]).filter((i): i is string => typeof i === 'string') : base.inventory,
    formation: Array.isArray(st.formation) && st.formation.length === 3 ? (st.formation as GameState['formation']) : base.formation,
  };
  return {
    version: SAVE_VERSION,
    slot: d.slot === 'manual' ? 'manual' : 'auto',
    savedAt: typeof d.savedAt === 'number' ? d.savedAt : 0,
    state,
  };
}

export class SaveStore {
  constructor(private readonly store: KeyValueStore | null) {}

  private key(slot: Slot): string {
    return `${KEY}:${slot}`;
  }

  save(slot: Slot, state: GameState, now = Date.now()): boolean {
    if (!this.store) return false;
    const data: SaveData = { version: SAVE_VERSION, slot, savedAt: now, state };
    try {
      this.store.setItem(this.key(slot), JSON.stringify(data));
      return true;
    } catch {
      // Storage full or disabled (private mode): play on without saving.
      return false;
    }
  }

  load(slot: Slot): SaveData | null {
    if (!this.store) return null;
    try {
      return parseSave(this.store.getItem(this.key(slot)));
    } catch {
      return null;
    }
  }

  /** The most recent of the two slots. */
  latest(): SaveData | null {
    const a = this.load('auto');
    const m = this.load('manual');
    if (!a) return m;
    if (!m) return a;
    return a.savedAt >= m.savedAt ? a : m;
  }

  clear(): void {
    if (!this.store) return;
    try {
      this.store.removeItem(this.key('auto'));
      this.store.removeItem(this.key('manual'));
    } catch {
      /* nothing to do */
    }
  }
}

/** localStorage, or null where it is unavailable. */
export function browserStore(): KeyValueStore | null {
  try {
    const s = window.localStorage;
    const probe = '__palimpsest_probe__';
    s.setItem(probe, '1');
    s.removeItem(probe);
    return s;
  } catch {
    return null;
  }
}
