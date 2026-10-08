/** Every explorable map by id. (The Sea Gate is still its own scene.) */

import { CHAPEL } from './blanchwood/chapel';
import { FLIGHT } from './blanchwood/flight';
import { GATEHOUSE } from './blanchwood/gate';
import { NINEFOLD } from './blanchwood/ninefold';
import { OSSUARY } from './blanchwood/ossuary';
import { WOOD } from './blanchwood/wood';
import { CELL } from './cell';
import { CLOISTER } from './cloister';
import { BELLTOWER } from './lychford/belltower';
import { CHURCHYARD } from './lychford/churchyard';
import { LANE } from './lychford/lane';
import { MERE } from './lychford/mere';
import { VILLAGE } from './lychford/village';
import { SCRIPTORIUM } from './scriptorium';
import type { MapDef } from './types';

export const MAPS: Record<string, MapDef> = {
  scriptorium: SCRIPTORIUM,
  cell: CELL,
  cloister: CLOISTER,
  lane: LANE,
  village: VILLAGE,
  churchyard: CHURCHYARD,
  belltower: BELLTOWER,
  mere: MERE,
  wood: WOOD,
  ninefold: NINEFOLD,
  gate: GATEHOUSE,
  flight: FLIGHT,
  chapel: CHAPEL,
  ossuary: OSSUARY,
};
