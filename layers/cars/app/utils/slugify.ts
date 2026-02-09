import type { CityOption } from '~/types'

/**
 * Converts a display name to a URL-safe slug.
 * "Aeroporti i Prishtinës" → "aeroporti-i-prishtines"
 */
export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Resolves a URL slug back to the original display name from a list of CityOptions.
 * Returns the original slug as fallback if no match is found.
 */
export function resolveLocationSlug(slug: string, cities: CityOption[]): string {
  if (!slug) return ''
  const match = cities.find(c => slugify(c.value) === slug || slugify(c.label) === slug)
  return match?.value ?? slug
}
