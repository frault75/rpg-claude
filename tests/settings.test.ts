import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DEFAULT_KEYS } from '../src/engine/input';
import { defaultSettings, parseSettings, SETTINGS_KEY, SettingsStore } from '../src/engine/settings';
import { detectLanguage, lang, registerStrings, setLang, stringTable, t, tr } from '../src/i18n/i18n';
import '../src/i18n/strings';

describe('languages', () => {
  it('picks the first language the game speaks from the browser list', () => {
    expect(detectLanguage(['fr-FR', 'en'])).toBe('fr');
    expect(detectLanguage(['de-DE', 'en-GB'])).toBe('en');
    expect(detectLanguage(['ja'])).toBe('en');
  });

  it('translates keys and story lines, with English as the fallback', () => {
    registerStrings('en', { 'test.hello': 'Hello, {name}', 'test.only': 'English only' });
    registerStrings('fr', { 'test.hello': 'Bonjour, {name}' });
    setLang('fr');
    expect(lang()).toBe('fr');
    expect(t('test.hello', { name: 'Isot' })).toBe('Bonjour, Isot');
    expect(t('test.only')).toBe('English only');
    expect(tr({ en: 'the tide', fr: 'la marée' })).toBe('la marée');
    setLang('en');
    expect(tr({ en: 'the tide', fr: 'la marée' })).toBe('the tide');
  });

  it('has every interface string in both languages, with the same placeholders', () => {
    const en = stringTable('en');
    const fr = stringTable('fr');
    const holes = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');
    const real = (k: string) => !k.startsWith('test.');
    expect(Object.keys(en).filter(real).filter((k) => !(k in fr))).toEqual([]);
    expect(Object.keys(fr).filter(real).filter((k) => !(k in en))).toEqual([]);
    expect(Object.keys(en).filter(real).filter((k) => k in fr && holes(en[k]!) !== holes(fr[k]!))).toEqual([]);
  });

  it('shows the loading lines in French before the game loads, as the tables have them', () => {
    const html = readFileSync('index.html', 'utf8');
    for (const key of ['loading', 'rotate']) {
      expect(html).toContain(stringTable('en')[key]!);
      expect(html).toContain(stringTable('fr')[key]!);
    }
  });

  it('never sets a bilingual name or text straight into a string (it would read [object Object])', () => {
    const files = (dir: string): string[] =>
      readdirSync(dir).flatMap((f) => {
        const p = join(dir, f);
        return statSync(p).isDirectory() ? files(p) : p.endsWith('.ts') ? [p] : [];
      });
    const raw: string[] = [];
    for (const f of files('src')) {
      for (const m of readFileSync(f, 'utf8').matchAll(/\$\{([^{}]*\.(?:name|title|text|lore))\}/g)) raw.push(`${f}: ${m[1]}`);
    }
    expect(raw).toEqual([]);
  });
});

describe('settings', () => {
  it('falls back to defaults field by field on damaged data', () => {
    const s = parseSettings(JSON.stringify({ audio: { music: 7, sfx: 'loud' }, graphics: { quality: 'ultra', brightness: 1.2 }, language: 'fr' }));
    expect(s.audio.music).toBe(1);
    expect(s.audio.sfx).toBe(defaultSettings().audio.sfx);
    expect(s.graphics.quality).toBe('auto');
    expect(s.graphics.brightness).toBeCloseTo(1.2);
    expect(s.language).toBe('fr');
    expect(parseSettings('{not json').language).toBe('auto');
    expect(parseSettings(null).controls.keys).toEqual(DEFAULT_KEYS);
  });

  it('saves every change and tells listeners', () => {
    const mem = new Map<string, string>();
    const store = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) };
    const st = new SettingsStore(store);
    let seen = 0;
    st.onChange(() => seen++);
    st.update((s) => {
      s.gameplay.textSpeed = 'fast';
      s.controls.keys.confirm = ['KeyK'];
    });
    expect(seen).toBe(1);
    const again = new SettingsStore(store);
    expect(again.value.gameplay.textSpeed).toBe('fast');
    expect(again.value.controls.keys.confirm).toEqual(['KeyK']);
    again.reset('controls');
    expect(again.value.controls.keys.confirm).toEqual(DEFAULT_KEYS.confirm);
    expect(mem.has(SETTINGS_KEY)).toBe(true);
  });
});
