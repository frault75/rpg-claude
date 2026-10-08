import { describe, expect, it } from 'vitest';
import { answered, ORDER, readTheHeap, writeFinis } from './fightkit';

// Every fight has an answer that wins it, in every difficulty. Where plain fighting already
// wins (tests/fights.test.ts) the answer is not searched for; Story is never harder than
// Normal (more HP and Ink, softer blows, the same enemies), so Normal's answers stand for it.
// The Danse Macabre, the slowest to search, has its own file so the two run side by side.
describe('every fight has its answer', () => {
  it('story, b5: written', () => expect(writeFinis('story').result).toBe('victory'));
  it('story, b6: read', () => expect(readTheHeap('story').result).toBe('victory'));
  for (const id of ['b2', 'b4', 'b5', 'b6'])
    it(`normal, ${id}`, { timeout: 60_000 }, () => expect(answered(id, 'normal')).toBe('victory'));
  for (const id of ORDER.filter((f) => f !== 'b3'))
    it(`illuminated, ${id}`, { timeout: 60_000 }, () => expect(answered(id, 'illuminated')).toBe('victory'));
});
