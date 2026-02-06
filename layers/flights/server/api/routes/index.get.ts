import { getAllRoutes, getAirportByCode } from '../../database/queries'

/**
 * GET /api/routes
 * List all available flight routes
 *
 * Query params:
 * - origin: Filter by origin airport code
 * - destination: Filter by destination airport code
 */
export default defineEventHandler(async (event) => {
  const query = getQuery(event)

  const originFilter = query.origin as string | undefined
  const destinationFilter = query.destination as string | undefined

  let routes = await getAllRoutes()

  // Filter by origin
  if (originFilter) {
    routes = routes.filter(r =>
      r.originCode.toUpperCase() === originFilter.toUpperCase()
    )
  }

  // Filter by destination
  if (destinationFilter) {
    routes = routes.filter(r =>
      r.destinationCode.toUpperCase() === destinationFilter.toUpperCase()
    )
  }

  // Enrich with airport names
  const enrichedRoutes = await Promise.all(routes.map(async (route) => {
    const [origin, destination] = await Promise.all([
      getAirportByCode(route.originCode),
      getAirportByCode(route.destinationCode)
    ])

    return {
      originCode: route.originCode,
      originName: origin?.name || route.originCode,
      originCountry: origin?.country || '',
      destinationCode: route.destinationCode,
      destinationName: destination?.name || route.destinationCode,
      destinationCountry: destination?.country || ''
    }
  }))

  return {
    routes: enrichedRoutes,
    total: enrichedRoutes.length
  }
})
