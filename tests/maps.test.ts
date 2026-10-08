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
