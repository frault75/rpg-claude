import { describe, expect, it } from 'vitest';
import { ENCOUNTERS } from '../src/battle/data';
import { MAPS } from '../src/maps/index';
import { TILE } from '../src/pixel/terrain';
import { TerrainModel } from '../src/world3d/terrain';
import { relief } from '../src/world3d/relief';

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

  // The relief must never strand anything: walking in 4-pixel steps, as a figure climbs
  // (at most 7 pixels at a time), everything a map offers is reached from one of its entrances.
  for (const [id, m] of Object.entries(MAPS)) {
    it(`${id}: the relief leaves everything within walking reach`, () => {
      const model = new TerrainModel({ ground: m.ground, heights: m.heights ?? [], seed: 1 });
      const cols = m.ground[0]!.length * (TILE / 4);
      const rows = m.ground.length * (TILE / 4);
      const at = (cx: number, cy: number) => [cx * 4 + 2, cy * 4 + 2] as const;
      const walk = (cx: number, cy: number) => cx >= 0 && cy >= 0 && cx < cols && cy < rows && m.walkable.includes(m.ground[Math.floor((cy * 4) / TILE)]![Math.floor((cx * 4) / TILE)]!);
      const seen = new Int32Array(cols * rows).fill(-1);
      const spawns = Object.entries(m.spawns);
      spawns.forEach(([, s], k) => {
        const start = [Math.floor(s.x / 4), Math.floor(s.y / 4)] as const;
        if (seen[start[1] * cols + start[0]]! >= 0) return;
        const stack: (readonly [number, number])[] = [start];
        seen[start[1] * cols + start[0]] = k;
        while (stack.length) {
          const [cx, cy] = stack.pop()!;
          const h = model.heightAt(...at(cx, cy));
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
            const nx = cx + dx;
            const ny = cy + dy;
            if (!walk(nx, ny) || seen[ny * cols + nx]! >= 0) continue;
            if (Math.abs(model.heightAt(...at(nx, ny)) - h) > 7) continue;
            seen[ny * cols + nx] = k;
            stack.push([nx, ny]);
          }
        }
      });
      const reached = (x: number, y: number, r = 0) => {
        for (let cy = Math.floor((y - r) / 4); cy <= Math.floor((y + r) / 4); cy++)
          for (let cx = Math.floor((x - r) / 4); cx <= Math.floor((x + r) / 4); cx++) if (cx >= 0 && cy >= 0 && cx < cols && cy < rows && seen[cy * cols + cx]! >= 0) return true;
        return false;
      };
      const inside = (rect: readonly number[]) => {
        for (let y = rect[1]!; y < rect[1]! + rect[3]!; y += 4) for (let x = rect[0]!; x < rect[0]! + rect[2]!; x += 4) if (reached(x, y)) return true;
        return false;
      };
      const w = m.ground[0]!.length * TILE;
      const h = m.ground.length * TILE;
      for (const n of m.npcs ?? []) if (n.x > 0 && n.y > 0 && n.x < w && n.y < h) expect(reached(n.x, n.y, 14), `npc ${n.id}`).toBe(true);
      for (const t of m.things ?? []) expect(reached(t.x, t.y, t.reach ?? 24), `thing ${t.id}`).toBe(true);
      for (const e of m.exits ?? []) expect(inside(e.rect), `exit to ${e.to}`).toBe(true);
      for (const z of m.zones ?? []) expect(inside(z.rect), `zone ${z.id}`).toBe(true);
      for (const u of m.underwriting ?? []) expect(reached(u.x, u.y, 70), `underwriting ${u.id}`).toBe(true);
      // No entrance is a ledge of its own: each leads somewhere to go or something to do.
      for (const [name, s] of spawns) {
        const k = seen[Math.floor(s.y / 4) * cols + Math.floor(s.x / 4)];
        const mine = (x: number, y: number, r = 0) => {
          for (let cy = Math.floor((y - r) / 4); cy <= Math.floor((y + r) / 4); cy++)
            for (let cx = Math.floor((x - r) / 4); cx <= Math.floor((x + r) / 4); cx++) if (cx >= 0 && cy >= 0 && cx < cols && cy < rows && seen[cy * cols + cx] === k) return true;
          return false;
        };
        const leads =
          (m.exits ?? []).some((e) => mine(e.rect[0] + e.rect[2] / 2, e.rect[1] + e.rect[3] / 2, Math.max(e.rect[2], e.rect[3]))) ||
          (m.zones ?? []).some((z) => mine(z.rect[0] + z.rect[2] / 2, z.rect[1] + z.rect[3] / 2, Math.max(z.rect[2], z.rect[3]) / 2)) ||
          (m.things ?? []).some((t) => mine(t.x, t.y, t.reach ?? 24)) ||
          spawns.some(([other, o]) => other !== name && mine(o.x, o.y));
        expect(leads, `spawn ${name}`).toBe(true);
      }
    });
  }

  it('a bank cannot be climbed: the top of the sunken lane\'s bank is out of reach', () => {
    const m = MAPS.lane!;
    const model = new TerrainModel({ ground: m.ground, heights: m.heights ?? [], seed: 1 });
    const cols = m.ground[0]!.length * 4;
    const rows = m.ground.length * 4;
    const seen = new Uint8Array(cols * rows);
    const s = m.spawns.start!;
    const stack: [number, number][] = [[Math.floor(s.x / 4), Math.floor(s.y / 4)]];
    seen[stack[0]![1] * cols + stack[0]![0]] = 1;
    while (stack.length) {
      const [cx, cy] = stack.pop()!;
      const h = model.heightAt(cx * 4 + 2, cy * 4 + 2);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows || seen[ny * cols + nx]) continue;
        if (Math.abs(model.heightAt(nx * 4 + 2, ny * 4 + 2) - h) > 7) continue;
        seen[ny * cols + nx] = 1;
        stack.push([nx, ny]);
      }
    }
    const at = (tx: number, ty: number) => seen[(ty * 4 + 2) * cols + tx * 4 + 2];
    expect(model.tileHeight(5, 2)).toBeGreaterThan(7);
    expect(at(5, 2), 'on the bank').toBe(0);
    expect(at(5, 7), 'on the road').toBe(1);
  });

  it('relief lifts its rectangles, and a ragged edge only ever pulls back', () => {
    const r = relief(6, 4, [{ at: [0, 0, 6, 2], h: 2, ragged: 's' }, { at: [4, 0, 2, 1], h: 5 }], 3);
    expect(r).toHaveLength(4);
    expect(r[0]).toBe('222255');
    expect(r[1]!.split('').every((c) => c === '2' || c === '0')).toBe(true);
    expect(r[2]).toBe('000000');
    expect(r[3]).toBe('000000');
  });

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
