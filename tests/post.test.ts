import { describe, expect, it } from 'vitest';
import { BLOOM_PREFILTER_FRAG, DOWN_FRAG, FINAL_FRAG } from '../src/engine/diorama/post';

describe('post-processing', () => {
  // One pixel that is not a number, blurred through the bloom levels, shows as a pale rectangle.
  it('reads the scene only through safeColor in the passes that blur it', () => {
    for (const frag of [BLOOM_PREFILTER_FRAG, DOWN_FRAG]) {
      const reads = frag.match(/texture2D\(tMap[^;]*/g) ?? [];
      expect(reads.length).toBeGreaterThan(0);
      for (const r of reads) expect(frag.slice(Math.max(0, frag.indexOf(r) - 10), frag.indexOf(r))).toContain('safeColor(');
      expect(frag).toContain('floatBitsToUint');
    }
    expect(FINAL_FRAG).toContain('sharp = safeColor(sharp);');
    for (const t of ['tBlurSmall', 'tBlurLarge', 'tBloom']) expect(FINAL_FRAG).toContain(`safeColor(texture2D(${t}, uv).rgb)`);
  });
});
