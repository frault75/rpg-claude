import { describe, expect, it } from 'vitest';
import { hashString, Rng } from '../src/engine/rng';
import { Noise2D } from '../src/engine/noise';

describe('Rng', () => {
  it('is deterministic for a given seed', () => {
    const a = new Rng('isot');
    const b = new Rng('isot');
    for (let i = 0; i < 50; i++) expect(a.float()).toBe(b.float());
  });

  it('differs between seeds', () => {
    expect(new Rng('isot').float()).not.toBe(new Rng('hild').float());
  });

  it('keeps range() and int() inside their bounds', () => {
    const r = new Rng(7);
    for (let i = 0; i < 2000; i++) {
      const f = r.range(-3, 5);
      expect(f).toBeGreaterThanOrEqual(-3);
      expect(f).toBeLessThan(5);
      const n = r.int(1, 6);
      expect(Number.isInteger(n)).toBe(true);
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(6);
    }
  });

  it('forks into independent but reproducible streams', () => {
    const a = new Rng(42).fork('border');
    const b = new Rng(42).fork('border');
    const c = new Rng(42).fork('rock');
    expect(a.float()).toBe(b.float());
    expect(new Rng(42).fork('border').float()).not.toBe(c.float());
  });

  it('refuses to pick from an empty list', () => {
    expect(() => new Rng(1).pick([])).toThrow();
  });

  it('hashes strings stably', () => {
    expect(hashString('FINIS')).toBe(hashString('FINIS'));
    expect(hashString('FINIS')).not.toBe(hashString('finis'));
  });
});

describe('Noise2D', () => {
  const n = new Noise2D('vellum');

  it('stays in [0, 1)', () => {
    for (let i = 0; i < 1000; i++) {
      const v = n.value(i * 0.37, i * 0.11);
      const f = n.fbm(i * 0.21, i * 0.53);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThan(1);
    }
  });

  it('is continuous', () => {
    for (let i = 0; i < 100; i++) {
      const x = i * 0.73;
      expect(Math.abs(n.value(x, 2) - n.value(x + 1e-4, 2))).toBeLessThan(0.01);
    }
  });

  it('is deterministic per seed', () => {
    expect(new Noise2D(3).value(1.5, 2.5)).toBe(new Noise2D(3).value(1.5, 2.5));
  });
});
