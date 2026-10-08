import { describe, expect, it } from 'vitest';
import { answered } from './fightkit';

describe('the Danse Macabre has its answer', () => {
  for (const d of ['normal', 'illuminated'] as const) it(d, { timeout: 90_000 }, () => expect(answered('b3', d)).toBe('victory'));
});
