/**
 * Re-export from cars layer so that ~/utils/locations resolves
 * when used from root app and from tools (Vitest, TS).
 */
export type { LocaleCode, LocationDef } from './layers/cars/app/utils/locations'
export {
  LOCATIONS,
  POPULAR_LOCATION_KEYS,
} from './layers/cars/app/utils/locations'
