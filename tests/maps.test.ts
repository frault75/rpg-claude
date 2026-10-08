import { describe, expect, it } from 'vitest';
import { ENCOUNTERS } from '../src/battle/data';
import { MAPS } from '../src/maps/index';
import { TILE } from '../src/pixel/terrain';

describe('the maps', () => {
  for (const [id, m] of Object.entries(MAPS)) {
    const at = (x: number, y: number) => m.ground[Math.floor(y / TILE)]?.[Math.floor(x / TILE)] ?? ' ';

    it(`${id}: every spawn stands on walkable ground`, () => {
      for (const [name, s] of Object.entries(m.spawns)) expect(m.walkable, `${id}.${name}`).toContain(at(s.x, s.y));
    });

    it(`${id}: every exit leads to a map and a spawn that exist`, () => {
      for (const e of m.exits ?? []) {
        if (e.to === 'seaGate') continue;
        const target = MAPS[e.to];
        expect(target, `${id} → ${e.to}`).toBeDefined();
        expect(Object.keys(target!.spawns)).toContain(e.spawn);
      }
    });

    it(`${id}: things and people are inside the map`, () => {
      const w = m.ground[0]!.length * TILE;
      const h = m.ground.length * TILE;
      for (const t of m.things ?? []) {
        expect(t.x, t.id).toBeGreaterThan(0);
        expect(t.x, t.id).toBeLessThan(w);
        expect(t.y, t.id).toBeGreaterThan(0);
        expect(t.y, t.id).toBeLessThan(h);
      }
    });
  }

  it('the fights of chapter I have their own stages', () => {
    expect(ENCOUNTERS.f1!.stage).toBe('scriptorium');
    expect(ENCOUNTERS.f2!.stage).toBe('cloister');
  });
});

describe('chapter II puzzles', () => {
  it('the rhyme gives the ringing order: Weeper, Morning, Singer, the Tenor last', async () => {
    const { RINGING_ORDER } = await import('../src/maps/lychford/belltower');
    expect([...RINGING_ORDER]).toEqual(['weeper', 'morning', 'singer', 'tenor']);
  });

  it('the ice holds on the ford and groans off it', async () => {
    const { MERE, watchIce } = await import('../src/maps/lychford/mere');
    const ctx = (x: number, y: number, crossed = false) => ({ player: { x, y }, flag: (f: string) => f === 'crossed' && crossed }) as never;
    // Every stone of the ford is safe ground, and stands on the map's walkable ice.
    for (const u of MERE.underwriting ?? []) {
      expect(watchIce(ctx(u.x, u.y)), u.id).toBe(false);
      expect(MERE.walkable).toContain(MERE.ground[Math.floor(u.y / TILE)]![Math.floor(u.x / TILE)]);
    }
    // Out in the middle, away from the stones, the ice gives.
    expect(watchIce(ctx(6 * TILE, 11 * TILE))).toBe(true);
    expect(watchIce(ctx(24 * TILE, 2 * TILE))).toBe(true);
    // The shores are always safe, and once across nothing groans.
    expect(watchIce(ctx(2 * TILE, 11 * TILE))).toBe(false);
    expect(watchIce(ctx(6 * TILE, 11 * TILE, true))).toBe(false);
  });

  it('the fights of chapter II have their stages', () => {
    expect(ENCOUNTERS.f3!.stage).toBe('lane');
    expect(ENCOUNTERS.f4!.stage).toBe('lychgate');
    expect(ENCOUNTERS.b2!.stage).toBe('green');
  });
});

describe('the Lost Names', () => {
  it('every cache names a Lost Name, two in each place, all ten placed', async () => {
    const { LOST_NAMES } = await import('../src/story/lostNames');
    const where: Record<string, string[]> = {};
    for (const [id, m] of Object.entries(MAPS))
      for (const u of m.underwriting ?? [])
        if (u.lostName) {
          expect(LOST_NAMES[u.lostName], `${id}: ${u.lostName}`).toBeDefined();
          (where[id] ??= []).push(u.lostName);
        }
    const found = Object.values(where).flat();
    expect(new Set(found).size).toBe(found.length);
    expect([...(where.cell ?? []), ...(where.cloister ?? [])]).toHaveLength(2);
    expect([...(where.village ?? []), ...(where.belltower ?? [])]).toHaveLength(2);
    expect(where.ninefold).toHaveLength(2);
    expect(where.fair).toHaveLength(2);
    expect([...(where.dawnCloister ?? []), ...(where.lodging ?? [])]).toHaveLength(2);
    expect(new Set(found)).toEqual(new Set(Object.keys(LOST_NAMES)));
  });

  it('the catchwords spell the Abbey motto', async () => {
    const { MOTTO } = await import('../src/maps/margin/ivy');
    expect(MOTTO.join(' ')).toBe('WHAT IS WRITTEN IS HELD');
  });
});

describe('the interludes', () => {
  it('there are four between the chapters, each leading to a real spawn, and the last page', async () => {
    const { INTERLUDES } = await import('../src/story/interludes');
    expect(Object.keys(INTERLUDES).map(Number)).toEqual([1, 2, 3, 4, 5]);
    for (const [n, it] of Object.entries(INTERLUDES)) {
      expect(it.chapter.n).toBe(Number(n) + 1);
      // The last page leads back to the title.
      if (it.finale) {
        expect(it.next.map).toBe('title');
        continue;
      }
      const map = MAPS[it.next.map];
      expect(map, `interlude ${n} → ${it.next.map}`).toBeDefined();
      expect(map!.spawns[it.next.spawn], `interlude ${n} → ${it.next.map}.${it.next.spawn}`).toBeDefined();
      for (const p of it.prose) expect(p.en.length * p.fr.length).toBeGreaterThan(0);
    }
  });

  it('the initial is the first letter of the prose, accents and all', async () => {
    const { splitInitial } = await import('../src/story/interludes');
    expect(splitInitial('We crossed')).toEqual(['W', 'e crossed']);
    expect(splitInitial('À Lychford')).toEqual(['À', ' Lychford']);
  });
});

describe('the journal', () => {
  it('has words for every map, in both languages', async () => {
    const { JOURNAL_MAPS, objective } = await import('../src/story/journal');
    const { newGame } = await import('../src/story/state');
    for (const id of [...Object.keys(MAPS), 'seaGate']) {
      expect(JOURNAL_MAPS, id).toContain(id);
      const g = newGame();
      g.map = id;
      const o = objective(g);
      expect(o.en.length * o.fr.length, id).toBeGreaterThan(0);
      expect(o.en, id).not.toBe('Onward.');
    }
  });

  it('follows the story on a map: the cell before and after Hild asks', async () => {
    const { objective } = await import('../src/story/journal');
    const { newGame } = await import('../src/story/state');
    const g = newGame();
    g.map = 'cell';
    const before = objective(g).en;
    g.flags.hildAsked = true;
    expect(objective(g).en).not.toBe(before);
    g.flags.finished = true;
    expect(objective(g).en).toMatch(/Book of Names/);
  });

  it('names every chapter', async () => {
    const { chapterTitle } = await import('../src/story/journal');
    expect([1, 2, 3, 4, 5, 6].map((n) => chapterTitle(n).title.en)).toEqual(['Chapter I', 'Chapter II', 'Chapter III', 'Chapter IV', 'Chapter V', 'Explicit']);
  });
});
