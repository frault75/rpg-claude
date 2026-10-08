/**
 * Hints that name a control, for the device the player is actually using: "hold R" at the
 * keyboard, "hold Y" with a gamepad, "hold the candle button" on a touch screen. Never all
 * three at once, which reads like a manual and takes the player out of the story.
 */

import { BINDABLE, type Bindable, DEFAULT_KEYS, DEFAULT_PAD, type Device, Input, keyLabel, padLabel } from '../engine/input';
import { lang, type LocalText } from '../i18n/i18n';

/** The on-screen controls of a touch screen (engine/touch.ts). */
const TOUCH: Record<Bindable, LocalText> = {
  up: { en: 'the stick', fr: 'le stick' },
  down: { en: 'the stick', fr: 'le stick' },
  left: { en: 'the stick', fr: 'le stick' },
  right: { en: 'the stick', fr: 'le stick' },
  confirm: { en: 'Tap', fr: 'Touchez' },
  cancel: { en: 'B', fr: 'B' },
  menu: { en: '☰', fr: '☰' },
  rake: { en: 'the candle button', fr: 'le bouton de la bougie' },
  journal: { en: '☰', fr: '☰' },
};

/** French names for the keys whose English names are words. */
const FR_KEYS: Record<string, string> = { Enter: 'Entrée', Space: 'Espace', Esc: 'Échap', Tab: 'Tab', Shift: 'Maj' };

/** The key or button that does this, on the device the player is using (or the one given). */
export function control(a: Bindable, device?: Device): LocalText {
  const input = Input.current;
  const d = device ?? input?.prompts ?? 'keys';
  if (d === 'touch') return TOUCH[a];
  if (d === 'pad') {
    const b = (input?.pad ?? DEFAULT_PAD)[a][0];
    const l = b === undefined ? '—' : padLabel(b);
    return { en: l, fr: l };
  }
  const k = (input?.keys ?? DEFAULT_KEYS)[a][0];
  const l = k ? keyLabel(k) : '—';
  return { en: l, fr: FR_KEYS[l] ?? l };
}

/** Text with {rake}, {confirm}, {cancel}, {menu} or {journal} filled in for the player's device. */
export function withControls(text: LocalText, device?: Device): LocalText {
  const fill = (s: string, lang: 'en' | 'fr') => s.replace(/\{(\w+)\}/g, (m, a: string) => ((BINDABLE as readonly string[]).includes(a) ? control(a as Bindable, device)[lang] : m));
  return { en: fill(text.en, 'en'), fr: fill(text.fr, 'fr') };
}

/** The controls as parameters for t(), in the current language: t('page.help', controlParams()). */
export function controlParams(): Record<string, string> {
  const l = lang();
  return Object.fromEntries(BINDABLE.map((a) => [a, control(a)[l]]));
}
