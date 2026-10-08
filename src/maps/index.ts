/** Every explorable map by id. (The Sea Gate is still its own scene.) */

import { CHAPEL } from './blanchwood/chapel';
import { FLIGHT } from './blanchwood/flight';
import { HOLLOW } from './blanchwood/hollow';
import { GATEHOUSE } from './blanchwood/gate';
import { NINEFOLD } from './blanchwood/ninefold';
import { OSSUARY } from './blanchwood/ossuary';
import { WOOD } from './blanchwood/wood';
import { CELL } from './cell';
import { DAWN_CLOISTER } from './dawn/cloister';
import { LODGING } from './dawn/lodging';
import { NAVE } from './dawn/nave';
import { DAWN_SCRIPTORIUM } from './dawn/scriptorium';
import { EDGE_MAP } from './margin/edge';
import { FAIR } from './margin/fair';
import { INKWELL } from './margin/inkwell';
import { IVY } from './margin/ivy';
import { VINE } from './margin/vine';
import { CLOISTER } from './cloister';
import { BELLTOWER } from './lychford/belltower';
import { CHURCHYARD } from './lychford/churchyard';
import { LANE } from './lychford/lane';
import { MERE } from './lychford/mere';
import { MILL_MAP } from './lychford/mill';
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
  mill: MILL_MAP,
  wood: WOOD,
  ninefold: NINEFOLD,
  hollow: HOLLOW,
  gate: GATEHOUSE,
  flight: FLIGHT,
  chapel: CHAPEL,
  ossuary: OSSUARY,
  edge: EDGE_MAP,
  ivy: IVY,
  fair: FAIR,
  vine: VINE,
  inkwell: INKWELL,
  dawnScriptorium: DAWN_SCRIPTORIUM,
  lodging: LODGING,
  dawnCloister: DAWN_CLOISTER,
  nave: NAVE,
};
