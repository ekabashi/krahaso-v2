import { getAllAirports, searchAirports } from '../../database/queries'

/**
 * GET /api/airports
 * List all airports or search by query
 *
 * Query params:
 * - q: Search term (searches code, name, city, country)
 * - country: Filter by country code
 * - limit: Max results (default 50)
 */
export default defineEventHandler(async (event) => {
  const query = getQuery(event)

  const searchTerm = query.q as string | undefined
  const country = query.country as string | undefined
  const limit = parseInt(query.limit as string) || 50

  let airports = searchTerm
    ? await searchAirports(searchTerm, limit)
    : await getAllAirports()

  // Filter by country if specified
  if (country) {
    airports = airports.filter(a =>
      a.country.toUpperCase() === country.toUpperCase()
    )
  }

  // Apply limit
  if (airports.length > limit) {
    airports = airports.slice(0, limit)
  }

  return {
    airports,
    total: airports.length
  }
})
