/**
 * The session: the game being played and the stores around it, shared by the scenes
 * and the menus.
 */

import { newGame, type GameState } from '../story/state';
import { browserStore, SaveStore } from './save';
import { SettingsStore } from './settings';

const store = typeof window !== 'undefined' ? browserStore() : null;

export const session = {
  game: newGame() as GameState,
  settings: new SettingsStore(store),
  saves: new SaveStore(store),
};
