import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ITEMS } from '../src/data/equipment';
import { STALLS } from '../src/data/stalls';
import { MAPS } from '../src/maps/index';

/** Every source file under a folder. */
function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? sources(p) : p.endsWith('.ts') ? [p] : [];
  });
}

describe('the items', () => {
  it('every one can be had: carried from the start, found at a story beat or in a cache, or bought from Gervase', () => {
    const code = [...sources('src/maps'), 'src/scenes/seaGate.ts'].map((f) => readFileSync(f, 'utf8')).join('\n');
    const main = readFileSync('src/main.ts', 'utf8');
    const start = /game\.inventory = \[([^\]]*)\]/.exec(main)?.[1] ?? '';
    const where: Record<string, string> = {};
    const cached = Object.values(MAPS).flatMap((m) => (m.caches ?? []).map((k) => k.item));
    const sold = STALLS.flatMap((st) => st.items);
    for (const id of Object.keys(ITEMS)) {
      const found = new RegExp(`(find|found)\\('${id}'`).test(code);
      const carried = start.includes(`'${id}'`);
      where[id] = found ? 'found' : carried ? 'carried' : cached.includes(id) ? 'cache' : sold.includes(id) ? 'sold' : 'nowhere';
    }
    expect(Object.values(where).filter((w) => w === 'nowhere'), JSON.stringify(where)).toEqual([]);
    expect(Object.keys(where)).toHaveLength(19);
    // What is sold has a price; what is found or given has none.
    for (const id of Object.keys(ITEMS)) expect(!!ITEMS[id]!.price, id).toBe(where[id] === 'sold');
  });
});
