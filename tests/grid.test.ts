import { describe, expect, it } from 'vitest';
import { Grid } from '../src/world/grid';

const ROOM = [
  '##########',
  '#........#',
  '#........#',
  '#...##...#',
  '#...##...#',
  '#........#',
  '##########',
];

describe('grid', () => {
  const g = Grid.fromRows(ROOM, 32, '.');

  it('reads solid tiles and treats outside as solid', () => {
    expect(g.isSolidTile(0, 0)).toBe(true);
    expect(g.isSolidTile(1, 1)).toBe(false);
    expect(g.isSolidTile(4, 3)).toBe(true);
    expect(g.isSolidTile(-1, 2)).toBe(true);
    expect(g.isSolidTile(10, 2)).toBe(true);
    expect(g.width).toBe(320);
    expect(g.height).toBe(224);
  });

  it('checks the whole footprint, not just the feet', () => {
    expect(g.canStand(64, 64)).toBe(true);
    // Too close to the west wall for the footprint to fit.
    expect(g.canStand(36, 64)).toBe(false);
  });

  it('slides along walls instead of stopping dead', () => {
    const [x, y] = g.slide(48, 60, -20, 10);
    expect(x).toBe(48);
    expect(y).toBe(70);
  });

  it('respects blockers', () => {
    const b = { x: 200, y: 60, rx: 10, ry: 6 };
    g.blockers = [b];
    expect(g.canStand(200, 60)).toBe(false);
    expect(g.canStand(200, 60, b)).toBe(true);
    g.blockers = [];
  });

  it('finds a way around the pillar', () => {
    const path = g.findPath(80, 112, 240, 112);
    expect(path).not.toBeNull();
    expect(path![path!.length - 1]).toEqual([240, 112]);
    for (const [x, y] of path!) expect(g.isSolidAt(x, y)).toBe(false);
  });

  it('walks to the nearest open tile when the goal is inside a wall', () => {
    const path = g.findPath(80, 80, 144, 112);
    expect(path).not.toBeNull();
    const [x, y] = path![path!.length - 1]!;
    expect(g.isSolidAt(x, y)).toBe(false);
  });

  it('returns null when there is no way', () => {
    const closed = Grid.fromRows(['#####', '#.#.#', '#####'], 32, '.');
    expect(closed.findPath(48, 48, 112, 48)).toBeNull();
  });
});
