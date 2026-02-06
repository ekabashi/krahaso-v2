import { useProviderRegistry } from '../../providers/registry'
import { searchFlightsInCacheByDateRange } from '../../database/queries'
import type { Flight, FlightSearchParams } from '../../types/provider'

interface FlexibleSearchRequestBody {
  origin: string
  destination: string
  departureDate: string // Center date
  returnDate?: string // Center date for return
  dateRange?: number // Default: 3 (for +/- 3 days)
  adults?: number
  children?: number
  infants?: number
  cabinClass?: 'Economy' | 'Business' | 'First'
}

interface DatePriceInfo {
  date: string
  minPrice: number | null
  flightCount: number
  currency: string
  isCached: boolean
  isLoading: boolean
}

interface FlexibleSearchResponse {
  outbound: {
    dates: DatePriceInfo[]
    cheapestDate: string | null
  }
  return?: {
    dates: DatePriceInfo[]
    cheapestDate: string | null
  }
  meta: {
    origin: string
    destination: string
    centerDepartureDate: string
    centerReturnDate?: string
    dateRange: number
    fromCache: number
    searchedAt: string
  }
}

/**
 * Generate array of dates around center date
 */
function generateDateRange(centerDate: string, range: number): string[] {
  const dates: string[] = []
  const center = new Date(centerDate)

  for (let i = -range; i <= range; i++) {
    const date = new Date(center)
    date.setDate(date.getDate() + i)
    const dateStr = date.toISOString().split('T')[0]
    if (dateStr) dates.push(dateStr)
  }

  return dates
}

/**
 * Convert cached flights to DatePriceInfo array
 */
function flightsToDatePriceInfo(
  flightsByDate: Map<string, Flight[]>,
  dates: string[]
): DatePriceInfo[] {
  return dates.map((date) => {
    const flights = flightsByDate.get(date) || []
    const availableFlights = flights.filter(f => f.available && f.totalPrice > 0)

    const minPrice = availableFlights.length > 0
      ? Math.min(...availableFlights.map(f => f.totalPrice))
      : null

    return {
      date,
      minPrice,
      flightCount: availableFlights.length,
      currency: availableFlights[0]?.currency || 'EUR',
      isCached: flights.length > 0,
      isLoading: false
    }
  })
}

/**
 * Find the date with lowest price
 */
function findCheapestDate(datePrices: DatePriceInfo[]): string | null {
  const withPrices = datePrices.filter(d => d.minPrice !== null)
  if (withPrices.length === 0) return null

  return withPrices.reduce((cheapest, current) =>
    (current.minPrice! < cheapest.minPrice!) ? current : cheapest
  ).date
}

/**
 * Fetch missing dates from providers (max 2 parallel)
 */
async function fetchMissingDates(
  origin: string,
  destination: string,
  missingDates: string[],
  params: Omit<FlightSearchParams, 'origin' | 'destination' | 'departureDate'>
): Promise<Map<string, Flight[]>> {
  if (missingDates.length === 0) return new Map()

  const registry = useProviderRegistry()
  const providers = registry.getEnabled()

  if (providers.length === 0) return new Map()

  const results = new Map<string, Flight[]>()

  // Fetch in batches of 2 to avoid overwhelming providers
  const BATCH_SIZE = 2
  for (let i = 0; i < missingDates.length; i += BATCH_SIZE) {
    const batch = missingDates.slice(i, i + BATCH_SIZE)

    const batchPromises = batch.map(async (date) => {
      const searchParams: FlightSearchParams = {
        origin,
        destination,
        departureDate: date,
        ...params
      }

      const flightsForDate: Flight[] = []

      // Query each provider
      const providerPromises = providers.map(async (provider) => {
        try {
          const flights = await provider.searchFlights(searchParams)
          return flights
        } catch (error) {
          console.error(`[flexible-search] ${provider.id} error for ${date}:`, error)
          return []
        }
      })

      const providerResults = await Promise.all(providerPromises)
      flightsForDate.push(...providerResults.flat())

      return { date, flights: flightsForDate }
    })

    const batchResults = await Promise.all(batchPromises)
    for (const { date, flights } of batchResults) {
      results.set(date, flights)
    }
  }

  return results
}

/**
 * POST /api/flights/flexible-search
 * Search for flights across a date range to find the cheapest day
 */
export default defineEventHandler(async (event): Promise<FlexibleSearchResponse> => {
  const body = await readBody<FlexibleSearchRequestBody>(event)

  // Validate required fields
  if (!body.origin || !body.destination || !body.departureDate) {
    throw createError({
      statusCode: 400,
      message: 'origin, destination, and departureDate are required'
    })
  }

  // Validate airport codes
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

  const origin = body.origin.toUpperCase()
  const destination = body.destination.toUpperCase()
  const dateRange = body.dateRange ?? 3
  const adults = body.adults ?? 1
  const children = body.children ?? 0
  const infants = body.infants ?? 0

  // Generate date arrays
  const outboundDates = generateDateRange(body.departureDate, dateRange)
  const returnDates = body.returnDate
    ? generateDateRange(body.returnDate, dateRange)
    : []

  // Query cache for all dates
  const [outboundCached, returnCached] = await Promise.all([
    searchFlightsInCacheByDateRange(origin, destination, outboundDates),
    returnDates.length > 0
      ? searchFlightsInCacheByDateRange(destination, origin, returnDates)
      : Promise.resolve(new Map<string, Flight[]>())
  ])

  // Find dates not in cache
  const outboundMissing = outboundDates.filter(d => (outboundCached.get(d) || []).length === 0)
  const returnMissing = returnDates.filter(d => (returnCached.get(d) || []).length === 0)

  // Fetch missing dates from providers
  const baseParams = {
    passengers: adults + children,
    adults,
    children,
    infants,
    cabinClass: body.cabinClass,
    forceFresh: false
  }

  const [outboundFresh, returnFresh] = await Promise.all([
    outboundMissing.length > 0
      ? fetchMissingDates(origin, destination, outboundMissing, baseParams)
      : Promise.resolve(new Map<string, Flight[]>()),
    returnMissing.length > 0
      ? fetchMissingDates(destination, origin, returnMissing, baseParams)
      : Promise.resolve(new Map<string, Flight[]>())
  ])

  // Merge cached and fresh results
  for (const [date, flights] of outboundFresh) {
    const existing = outboundCached.get(date) || []
    outboundCached.set(date, [...existing, ...flights])
  }

  for (const [date, flights] of returnFresh) {
    const existing = returnCached.get(date) || []
    returnCached.set(date, [...existing, ...flights])
  }

  // Convert to response format
  const outboundPrices = flightsToDatePriceInfo(outboundCached, outboundDates)
  const returnPrices = returnDates.length > 0
    ? flightsToDatePriceInfo(returnCached, returnDates)
    : undefined

  // Count cached dates
  const fromCache = outboundPrices.filter(d => d.isCached).length
    + (returnPrices?.filter(d => d.isCached).length || 0)

  return {
    outbound: {
      dates: outboundPrices,
      cheapestDate: findCheapestDate(outboundPrices)
    },
    return: returnPrices
      ? {
          dates: returnPrices,
          cheapestDate: findCheapestDate(returnPrices)
        }
      : undefined,
    meta: {
      origin,
      destination,
      centerDepartureDate: body.departureDate,
      centerReturnDate: body.returnDate,
      dateRange,
      fromCache,
      searchedAt: new Date().toISOString()
    }
  }
})
