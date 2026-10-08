/**
 * The settings that modules read while running (text speed, shake, flashes), kept in
 * one small object so they need not know about the settings store.
 */

import type { Difficulty } from '../battle/growth';

export const prefs = {
  /** Dialogue letters per second. */
  textCps: 48,
  largeText: false,
  /** Multiplies screen shake (0 turns it off). */
  shake: 1,
  /** Multiplies screen flashes (reduced, not removed, when off). */
  flashes: 1,
  battleFast: false,
  difficulty: 'normal' as Difficulty,
};
