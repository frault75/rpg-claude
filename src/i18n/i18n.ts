/**
 * Languages. The game ships in English and French; the language is the player's
 * choice in the settings, or, by default, the first of the browser's languages the
 * game speaks. Text is either a key into the string tables (interface) or a local
 * text object written in both languages (story lines).
 */

export const LANGUAGES = ['en', 'fr'] as const;
export type Lang = (typeof LANGUAGES)[number];

/** A line of text in every language the game ships. */
export type LocalText = Readonly<Record<Lang, string>>;

export const LANGUAGE_NAMES: Record<Lang, string> = { en: 'English', fr: 'Français' };

/** Pick the language from the browser's preferences (pure, for tests). */
export function detectLanguage(preferred: readonly string[]): Lang {
  for (const p of preferred) {
    const base = p.toLowerCase().split('-')[0];
    if ((LANGUAGES as readonly string[]).includes(base!)) return base as Lang;
  }
  return 'en';
}

let current: Lang = 'en';
const listeners = new Set<(l: Lang) => void>();

export function lang(): Lang {
  return current;
}

export function setLang(l: Lang): void {
  if (l === current) return;
  current = l;
  if (typeof document !== 'undefined') document.documentElement.lang = l;
  for (const fn of listeners) fn(l);
}

/** Call when the language changes; returns a function that stops listening. */
export function onLangChange(fn: (l: Lang) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Text in the current language. */
export function tr(t: LocalText | string): string {
  return typeof t === 'string' ? t : t[current] ?? t.en;
}

type Table = Readonly<Record<string, string>>;
const tables: Partial<Record<Lang, Table>> = {};

export function registerStrings(l: Lang, table: Table): void {
  tables[l] = { ...tables[l], ...table };
}

/** An interface string by key, with {name} placeholders filled in. */
export function t(key: string, params: Record<string, string | number> = {}): string {
  const s = tables[current]?.[key] ?? tables.en?.[key] ?? key;
  return s.replace(/\{(\w+)\}/g, (_, k: string) => String(params[k] ?? `{${k}}`));
}
