import { describe, expect, it } from 'vitest';
import { type KeyValueStore, parseSave, SAVE_VERSION, SaveStore } from '../src/engine/save';
import { newGame } from '../src/story/state';

function memory(): KeyValueStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
}

describe('saving', () => {
  it('round-trips a game state', () => {
    const store = new SaveStore(memory());
    const s = newGame();
    s.flags.metHild = true;
    s.party.push('hild');
    s.x = 100;
    s.y = 200;
    expect(store.save('auto', s, 1000)).toBe(true);
    const back = store.load('auto');
    expect(back?.state).toEqual(s);
    expect(back?.version).toBe(SAVE_VERSION);
    expect(back?.savedAt).toBe(1000);
  });

  it('returns the most recent slot', () => {
    const store = new SaveStore(memory());
    const a = newGame();
    a.map = 'cloister';
    const m = newGame();
    m.map = 'cell';
    store.save('manual', m, 500);
    store.save('auto', a, 900);
    expect(store.latest()?.state.map).toBe('cloister');
    store.save('manual', m, 1200);
    expect(store.latest()?.state.map).toBe('cell');
  });

  it('ignores garbage and wrong versions instead of crashing', () => {
    expect(parseSave(null)).toBeNull();
    expect(parseSave('not json')).toBeNull();
    expect(parseSave('[]')).toBeNull();
    expect(parseSave(JSON.stringify({ version: 99, state: newGame() }))).toBeNull();
    expect(parseSave(JSON.stringify({ version: 1, state: { map: 3 } }))).toBeNull();
    expect(parseSave(JSON.stringify({ version: 1, state: { ...newGame(), party: ['nobody'] } }))).toBeNull();
  });

  it('fills fields missing from older saves', () => {
    const partial = { version: 1, slot: 'auto', savedAt: 5, state: { map: 'cell', chapter: 1, flags: {}, party: ['isot'] } };
    const back = parseSave(JSON.stringify(partial));
    expect(back?.state.lostNames).toEqual([]);
    expect(back?.state.abilities.isot.length).toBeGreaterThan(0);
  });

  it('survives storage that throws', () => {
    const broken: KeyValueStore = {
      getItem: () => {
        throw new Error('denied');
      },
      setItem: () => {
        throw new Error('full');
      },
      removeItem: () => undefined,
    };
    const store = new SaveStore(broken);
    expect(store.save('auto', newGame())).toBe(false);
    expect(store.load('auto')).toBeNull();
    expect(new SaveStore(null).latest()).toBeNull();
  });

  it('clears both slots', () => {
    const mem = memory();
    const store = new SaveStore(mem);
    store.save('auto', newGame());
    store.save('manual', newGame());
    store.clear();
    expect(mem.data.size).toBe(0);
  });
});
