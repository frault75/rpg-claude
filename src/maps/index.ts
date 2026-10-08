/** Every explorable map by id. (The Sea Gate is still its own scene.) */

import { CELL } from './cell';
import { CLOISTER } from './cloister';
import { SCRIPTORIUM } from './scriptorium';
import type { MapDef } from './types';

export const MAPS: Record<string, MapDef> = {
  scriptorium: SCRIPTORIUM,
  cell: CELL,
  cloister: CLOISTER,
};
