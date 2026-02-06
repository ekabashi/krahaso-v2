import { useProviderRegistry } from '../../providers/registry'
import { searchFlightsInCache, logSearch } from '../../database/queries'
import type { Flight, FlightSearchParams, SortBy, SortOrder } from '../../types/provider'

interface SearchRequestBody {
  origin: string
  destination: string
  departureDate: string
  returnDate?: string
  adults?: number
  children?: number
  infants?: number
  cabinClass?: 'Economy' | 'Business' | 'First'
  sortBy?: SortBy
  sortOrder?: SortOrder
  providers?: string[]
  forceFresh?: boolean
}

interface ProviderSearchResult {
  providerId: string
  flights: Flight[]
  loadTime: number
  error?: string
  fromCache: boolean
}

/**
 * Search flights from a single direction (used for both outbound and return)
 */
async function searchDirection(
  params: FlightSearchParams,
  legType: 'outbound' | 'return',
  providersToQuery: ReturnType<typeof useProviderRegistry>['getEnabled'] extends () => infer R ? R : never,
  forceFresh: boolean
): Promise<{
  flights: Flight[]
  errors: Array<{ providerId: string, message: string, legType: 'outbound' | 'return' }>
  providerResults: ProviderSearchResult[]
}> {
  // Check cache first
  const cachedFlights = forceFresh ? [] : await searchFlightsInCache(params)
  const cachedProviderIds = new Set(cachedFlights.map(f => f.providerId))
  const providersToFetch = forceFresh
    ? providersToQuery
    : providersToQuery.filter(p => !cachedProviderIds.has(p.id))

  console.log(`[search:${legType}] Cache: ${cachedFlights.length} flights from [${[...cachedProviderIds].join(', ')}]`)
  console.log(`[search:${legType}] Fetching from: [${providersToFetch.map(p => p.id).join(', ')}]`)

  // Track per-provider results
  const providerResults: ProviderSearchResult[] = []

  // Add cached results as provider results
  for (const providerId of cachedProviderIds) {
    const providerFlights = cachedFlights.filter(f => f.providerId === providerId)
    providerResults.push({
      providerId,
      flights: providerFlights,
      loadTime: 0,
      fromCache: true
    })
  }

  // Fetch from providers not in cache
  let freshFlights: Flight[] = []
  const errors: Array<{ providerId: string, message: string, legType: 'outbound' | 'return' }> = []
  if (providersToFetch.length > 0) {
    const fetchPromises = providersToFetch.map(async (provider) => {
      const startTime = Date.now()
      try {
        console.log(`[search:${legType}] Querying ${provider.id}...`)
        const flights = await provider.searchFlights(params)
        const loadTime = Date.now() - startTime
        console.log(`[search:${legType}] ${provider.id} returned ${flights.length} flights in ${loadTime}ms`)

        providerResults.push({
          providerId: provider.id,
          flights,
          loadTime,
          fromCache: false
        })

        return flights
      } catch (error) {
        const loadTime = Date.now() - startTime
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.error(`[${provider.id}] Search error:`, error)

        errors.push({
          providerId: provider.id,
          message: errorMessage,
          legType
        })

        providerResults.push({
          providerId: provider.id,
          flights: [],
          loadTime,
          error: errorMessage,
          fromCache: false
        })

        return []
      }
    })

    const results = await Promise.all(fetchPromises)
    freshFlights = results.flat()
  }

  // Combine and add legType
  const allFlights = [...cachedFlights, ...freshFlights].map(f => ({
    ...f,
    legType
  }))

  return { flights: allFlights, errors, providerResults }
}

/**
 * POST /api/flights/search
 * Search for flights across all providers
 */
export default defineEventHandler(async (event) => {
  const body = await readBody<SearchRequestBody>(event)

  // Validate required fields
  if (!body.origin || !body.destination || !body.departureDate) {
    throw createError({
      statusCode: 400,
      message: 'origin, destination, and departureDate are required'
    })
  }

  // Validate airport codes (3 letters)
  if (!/^[A-Z]{3}$/i.test(body.origin) || !/^[A-Z]{3}$/i.test(body.destination)) {
    throw createError({
      statusCode: 400,
      message: 'Invalid airport code format (must be 3 letters)'
    })
  }

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(body.departureDate)) {
    throw createError({
      statusCode: 400,
      message: 'Invalid date format (must be YYYY-MM-DD)'
    })
  }

  const adults = body.adults || 1
  const children = body.children || 0
  const infants = body.infants || 0

  const registry = useProviderRegistry()

  // Determine which providers to query
  const providersToQuery = body.providers
    ? registry.getAll().filter(p => body.providers!.includes(p.id))
    : registry.getEnabled()

  if (providersToQuery.length === 0) {
    throw createError({
      statusCode: 400,
      message: 'No providers available'
    })
  }

  const sortBy = body.sortBy || 'price'
  const sortOrder = body.sortOrder || 'asc'

  // Search outbound flights (origin → destination)
  const outboundParams: FlightSearchParams = {
    origin: body.origin.toUpperCase(),
    destination: body.destination.toUpperCase(),
    departureDate: body.departureDate,
    passengers: adults + children,
    adults,
    children,
    infants,
    cabinClass: body.cabinClass,
    forceFresh: Boolean(body.forceFresh)
  }

  const outboundResult = await searchDirection(outboundParams, 'outbound', providersToQuery, Boolean(body.forceFresh))

  // Filter to ensure flights match the requested route (providers sometimes return wrong direction)
  const outboundFlights = outboundResult.flights.filter((f) => {
    const matchesRoute = f.origin.code === outboundParams.origin && f.destination.code === outboundParams.destination
    if (!matchesRoute) {
      console.warn(`[search:outbound] Filtered out flight ${f.flightNumber} from ${f.providerId}: wrong route ${f.origin.code} → ${f.destination.code} (expected ${outboundParams.origin} → ${outboundParams.destination})`)
    }
    return matchesRoute
  })

  // Collect all provider results for analytics
  let allProviderResults = [...outboundResult.providerResults]

  // Search return flights if returnDate is provided (destination → origin)
  let returnFlights: Flight[] = []
  if (body.returnDate) {
    const returnParams: FlightSearchParams = {
      origin: body.destination.toUpperCase(), // Reversed
      destination: body.origin.toUpperCase(), // Reversed
      departureDate: body.returnDate,
      passengers: adults + children,
      adults,
      children,
      infants,
      cabinClass: body.cabinClass,
      forceFresh: Boolean(body.forceFresh)
    }

    const returnResult = await searchDirection(returnParams, 'return', providersToQuery, Boolean(body.forceFresh))

    // Filter to ensure return flights match the requested route
    returnFlights = returnResult.flights.filter((f) => {
      const matchesRoute = f.origin.code === returnParams.origin && f.destination.code === returnParams.destination
      if (!matchesRoute) {
        console.warn(`[search:return] Filtered out flight ${f.flightNumber} from ${f.providerId}: wrong route ${f.origin.code} → ${f.destination.code} (expected ${returnParams.origin} → ${returnParams.destination})`)
      }
      return matchesRoute
    })
    outboundResult.errors.push(...returnResult.errors)
    allProviderResults = [...allProviderResults, ...returnResult.providerResults]
  }

  // Combine and sort all flights
  let allFlights = [...outboundFlights, ...returnFlights]
  allFlights = sortFlights(allFlights, sortBy, sortOrder)

  // Log search for analytics
  const availablePrices = outboundFlights
    .filter(f => f.available)
    .map(f => f.totalPrice)
    .filter(price => Number.isFinite(price))
  const lowestPrice = availablePrices.length > 0
    ? Math.min(...availablePrices)
    : null

  try {
    await logSearch(
      outboundParams,
      allFlights.length,
      lowestPrice,
      allFlights[0]?.currency || 'EUR'
    )
  } catch (error) {
    console.error('[search] logSearch failed:', error)
  }

  return {
    flights: allFlights,
    outboundFlights: sortFlights(outboundFlights, sortBy, sortOrder),
    returnFlights: body.returnDate ? sortFlights(returnFlights, sortBy, sortOrder) : undefined,
    meta: {
      origin: body.origin.toUpperCase(),
      destination: body.destination.toUpperCase(),
      departureDate: body.departureDate,
      returnDate: body.returnDate,
      passengers: {
        adults,
        children,
        infants
      },
      totalResults: allFlights.length,
      outboundResults: outboundFlights.length,
      returnResults: returnFlights.length,
      providers: providersToQuery.map(p => p.id),
      cacheHit: false, // Simplified - could be per-direction
      searchedAt: new Date().toISOString(),
      providerErrors: outboundResult.errors.length > 0 ? outboundResult.errors : undefined
    }
  }
})

/**
 * Sort flights by given criteria
 */
function sortFlights(flights: Flight[], sortBy: SortBy, order: SortOrder): Flight[] {
  const multiplier = order === 'asc' ? 1 : -1

  return flights.sort((a, b) => {
    switch (sortBy) {
      case 'price':
        return (a.totalPrice - b.totalPrice) * multiplier
      case 'duration':
        return ((a.duration || 0) - (b.duration || 0)) * multiplier
      case 'departure':
        return a.departureTime.localeCompare(b.departureTime) * multiplier
      default:
        return 0
    }
  })
}
