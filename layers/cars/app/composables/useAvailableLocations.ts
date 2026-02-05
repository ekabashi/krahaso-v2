import type { LocationDef } from '../utils/locations'
import { LOCATIONS, POPULAR_LOCATION_KEYS } from '../utils/locations'

export type { LocationDef }

export function useAvailableLocations() {
  const availableLocations = computed<LocationDef[]>(() =>
    LOCATIONS.filter((loc) => (POPULAR_LOCATION_KEYS as readonly string[]).includes(loc.key)),
  )

  const getLocationImage = (loc: LocationDef): string => `/city/${loc.key}.jpg`

  const findLocationBySlug = (slug: string): LocationDef | undefined =>
    LOCATIONS.find(
      (loc) =>
        loc.slugs.sq === slug || loc.slugs.en === slug || loc.slugs.de === slug,
    )

  const getLocationByKey = (key: string): LocationDef | undefined =>
    LOCATIONS.find((loc) => loc.key === key)

  const getLocationBySlug = (slug: string): LocationDef | undefined => {
    const fromAvailable = availableLocations.value.find(
      (loc) =>
        loc.slugs.sq === slug || loc.slugs.en === slug || loc.slugs.de === slug,
    )
    return fromAvailable ?? findLocationBySlug(slug)
  }

  return {
    availableLocations,
    getLocationImage,
    getLocationByKey,
    getLocationBySlug,
    findLocationBySlug,
  }
}
