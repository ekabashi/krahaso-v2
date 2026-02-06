/**
 * Database Queries with Drizzle ORM
 *
 * Replaces server/utils/database.ts with type-safe Drizzle queries
 */

import { createHash } from 'crypto'
import { eq, and, or, like, sql, desc, asc } from 'drizzle-orm'
import { db } from './client'
import {
  airports,
  routes,
  flights,
  priceHistory,
  syncStatus,
  searchHistory
} from './schema'
import type {
  Airport,
  FlightRoute,
  Flight,
  FlightSearchParams,
  ProviderStats,
  SyncStatus
} from '../types/provider'

// =============================================================================
// Airport Operations
// =============================================================================

export async function getAirportsByProvider(providerId: string): Promise<Airport[]> {
  const results = await db
    .select()
    .from(airports)
    .where(eq(airports.providerId, providerId))
    .orderBy(asc(airports.name))

  return results.map(mapDbAirport)
}

export async function getAllAirports(): Promise<Airport[]> {
  // Get distinct airports by code, prefer full country names over ISO codes and Unknown
  const results = await db
    .select({
      code: airports.code,
      name: sql<string>`MAX(${airports.name})`.as('name'),
      city: sql<string | null>`MAX(${airports.city})`.as('city'),
      // Priority: full country names > ISO codes > Unknown
      country: sql<string>`COALESCE(
        MAX(CASE WHEN ${airports.country} != 'Unknown' AND LENGTH(${airports.country}) > 2 THEN ${airports.country} ELSE NULL END),
        MAX(CASE WHEN ${airports.country} != 'Unknown' THEN ${airports.country} ELSE NULL END),
        'Unknown'
      )`.as('country'),
      id: sql<string>`MAX(${airports.id})`.as('id')
    })
    .from(airports)
    .groupBy(airports.code)
    .orderBy(sql`name`)

  return results.map(row => mapDbAirport(row as any))
}

export async function getAirportByCode(code: string): Promise<Airport | null> {
  // Prefer airport entries with non-Unknown country values, and prefer full names over ISO codes
  const results = await db
    .select()
    .from(airports)
    .where(sql`UPPER(${airports.code}) = UPPER(${code})`)
    .orderBy(
      sql`CASE WHEN ${airports.country} = 'Unknown' THEN 2 WHEN LENGTH(${airports.country}) <= 2 THEN 1 ELSE 0 END`
    )
    .limit(1)

  return results[0] ? mapDbAirport(results[0]) : null
}

export async function searchAirports(query: string, limit = 20): Promise<Airport[]> {
  const searchTerm = `%${query}%`

  const results = await db
    .select({
      code: airports.code,
      name: sql<string>`MAX(${airports.name})`.as('name'),
      city: sql<string | null>`MAX(${airports.city})`.as('city'),
      // Priority: full country names > ISO codes > Unknown
      country: sql<string>`COALESCE(
        MAX(CASE WHEN ${airports.country} != 'Unknown' AND LENGTH(${airports.country}) > 2 THEN ${airports.country} ELSE NULL END),
        MAX(CASE WHEN ${airports.country} != 'Unknown' THEN ${airports.country} ELSE NULL END),
        'Unknown'
      )`.as('country'),
      id: sql<string>`MAX(${airports.id})`.as('id')
    })
    .from(airports)
    .where(
      or(
        like(airports.code, searchTerm),
        like(airports.name, searchTerm),
        like(airports.city, searchTerm),
        like(airports.country, searchTerm)
      )
    )
    .groupBy(airports.code)
    .orderBy(
      sql`CASE WHEN UPPER(${airports.code}) = UPPER(${query}) THEN 0 ELSE 1 END`,
      sql`name`
    )
    .limit(limit)

  return results.map(row => mapDbAirport(row as any))
}

export async function upsertAirports(providerId: string, airportList: Airport[]): Promise<number> {
  if (airportList.length === 0) return 0

  for (const airport of airportList) {
    await db
      .insert(airports)
      .values({
        id: airport.id,
        providerId,
        code: airport.code,
        name: airport.name,
        city: airport.city || null,
        country: airport.country,
        latitude: airport.latitude || null,
        longitude: airport.longitude || null,
        timezone: airport.timezone || null,
        updatedAt: sql`datetime('now')`
      })
      .onConflictDoUpdate({
        target: [airports.providerId, airports.code],
        set: {
          name: sql`excluded.name`,
          city: sql`excluded.city`,
          country: sql`excluded.country`,
          updatedAt: sql`datetime('now')`
        }
      })
  }

  return airportList.length
}

// =============================================================================
// Route Operations
// =============================================================================

export async function getRoutesByProvider(providerId: string): Promise<FlightRoute[]> {
  const results = await db
    .select({
      originCode: routes.originCode,
      destinationCode: routes.destinationCode
    })
    .from(routes)
    .where(and(eq(routes.providerId, providerId), eq(routes.isActive, true)))

  return results.map(row => ({
    originCode: row.originCode,
    destinationCode: row.destinationCode
  }))
}

export async function getAllRoutes(): Promise<FlightRoute[]> {
  const results = await db
    .selectDistinct({
      originCode: routes.originCode,
      destinationCode: routes.destinationCode
    })
    .from(routes)
    .where(eq(routes.isActive, true))

  return results.map(row => ({
    originCode: row.originCode,
    destinationCode: row.destinationCode
  }))
}

export async function upsertRoutes(providerId: string, routeList: FlightRoute[]): Promise<number> {
  if (routeList.length === 0) return 0

  for (const route of routeList) {
    await db
      .insert(routes)
      .values({
        providerId,
        originCode: route.originCode,
        destinationCode: route.destinationCode,
        updatedAt: sql`datetime('now')`
      })
      .onConflictDoUpdate({
        target: [routes.providerId, routes.originCode, routes.destinationCode],
        set: {
          isActive: true,
          updatedAt: sql`datetime('now')`
        }
      })
  }

  return routeList.length
}

// =============================================================================
// Flight Cache Operations
// =============================================================================

export function generateSearchHash(params: FlightSearchParams): string {
  const key = `${params.origin}-${params.destination}-${params.departureDate}-${params.passengers}`
  return createHash('md5').update(key).digest('hex')
}

export async function getCachedFlights(providerId: string, params: FlightSearchParams): Promise<Flight[]> {
  const hash = generateSearchHash(params)

  const results = await db
    .select()
    .from(flights)
    .where(
      and(
        eq(flights.providerId, providerId),
        eq(flights.searchHash, hash),
        sql`datetime(${flights.expiresAt}) > datetime('now')`
      )
    )
    .orderBy(asc(flights.totalPrice))

  return results.map(mapDbFlight)
}

export async function searchFlightsInCache(params: FlightSearchParams): Promise<Flight[]> {
  const results = await db
    .select()
    .from(flights)
    .where(
      and(
        eq(flights.originCode, params.origin),
        eq(flights.destinationCode, params.destination),
        eq(flights.departureDate, params.departureDate),
        sql`datetime(${flights.expiresAt}) > datetime('now')`
      )
    )
    .orderBy(asc(flights.totalPrice))

  return results.map(mapDbFlight)
}

/**
 * Search cached flights for multiple dates at once
 * Returns a Map with date as key and flights array as value
 */
export async function searchFlightsInCacheByDateRange(
  origin: string,
  destination: string,
  dates: string[]
): Promise<Map<string, Flight[]>> {
  if (dates.length === 0) return new Map()

  // Query all dates in one go using IN clause
  const results = await db
    .select()
    .from(flights)
    .where(
      and(
        eq(flights.originCode, origin),
        eq(flights.destinationCode, destination),
        sql`${flights.departureDate} IN (${sql.join(dates.map(d => sql`${d}`), sql`, `)})`,
        sql`datetime(${flights.expiresAt}) > datetime('now')`
      )
    )
    .orderBy(asc(flights.departureDate), asc(flights.totalPrice))

  // Group results by date
  const flightsByDate = new Map<string, Flight[]>()
  for (const date of dates) {
    flightsByDate.set(date, [])
  }

  for (const row of results) {
    const flight = mapDbFlight(row)
    const dateFlights = flightsByDate.get(row.departureDate)
    if (dateFlights) {
      dateFlights.push(flight)
    }
  }

  return flightsByDate
}

export async function cacheFlights(
  providerId: string,
  flightList: Flight[],
  params: FlightSearchParams,
  cacheMinutes = 60
): Promise<number> {
  const hash = generateSearchHash(params)
  const expiresAt = new Date(Date.now() + cacheMinutes * 60 * 1000).toISOString()

  // Delete old cache for this search
  await db
    .delete(flights)
    .where(and(eq(flights.providerId, providerId), eq(flights.searchHash, hash)))

  // Insert new flights
  for (const flight of flightList) {
    await db.insert(flights).values({
      id: flight.id,
      providerId,
      flightNumber: flight.flightNumber,
      originCode: flight.origin.code,
      destinationCode: flight.destination.code,
      departureDate: flight.departureDate,
      departureTime: flight.departureTime,
      arrivalDate: flight.arrivalDate,
      arrivalTime: flight.arrivalTime,
      durationMinutes: flight.duration || null,
      basePrice: flight.basePrice,
      taxPrice: flight.taxPrice,
      totalPrice: flight.totalPrice,
      currency: flight.currency,
      seatsAvailable: flight.seatsAvailable,
      operatingCarrier: flight.operatingCarrier,
      marketingCarrier: flight.marketingCarrier || null,
      cabinClass: flight.cabinClass,
      aircraft: flight.aircraft || null,
      stops: flight.stops,
      bookingUrl: flight.bookingUrl || null,
      fetchedAt: flight.fetchedAt.toISOString(),
      expiresAt,
      searchHash: hash
    }).onConflictDoUpdate({
      target: [flights.id],
      set: {
        totalPrice: sql`excluded.total_price`,
        seatsAvailable: sql`excluded.seats_available`,
        fetchedAt: sql`excluded.fetched_at`,
        expiresAt: sql`excluded.expires_at`
      }
    })
  }

  return flightList.length
}

export async function cleanExpiredCache(): Promise<number> {
  const result = await db
    .delete(flights)
    .where(sql`datetime(${flights.expiresAt}) < datetime('now')`)

  return (result as any).rowsAffected || 0
}

// =============================================================================
// Price History
// =============================================================================

export async function recordPriceHistory(flight: Flight): Promise<void> {
  await db.insert(priceHistory).values({
    flightId: flight.id,
    providerId: flight.providerId,
    flightNumber: flight.flightNumber,
    departureDate: flight.departureDate,
    totalPrice: flight.totalPrice,
    currency: flight.currency,
    seatsAvailable: flight.seatsAvailable
  })
}

export async function getPriceHistory(
  flightNumber: string,
  departureDate: string
): Promise<Array<{ totalPrice: number, currency: string, recordedAt: string }>> {
  const results = await db
    .select({
      totalPrice: priceHistory.totalPrice,
      currency: priceHistory.currency,
      recordedAt: priceHistory.recordedAt
    })
    .from(priceHistory)
    .where(
      and(
        eq(priceHistory.flightNumber, flightNumber),
        eq(priceHistory.departureDate, departureDate)
      )
    )
    .orderBy(asc(priceHistory.recordedAt))

  return results.map(row => ({
    totalPrice: row.totalPrice,
    currency: row.currency,
    recordedAt: row.recordedAt!
  }))
}

// =============================================================================
// Sync Status
// =============================================================================

export async function updateSyncStatus(
  providerId: string,
  syncType: string,
  status: string,
  itemsProcessed = 0,
  errorMessage?: string
): Promise<void> {
  await db.insert(syncStatus).values({
    providerId,
    syncType,
    status,
    startedAt: status === 'running' ? sql`datetime('now')` : null,
    completedAt: status === 'success' || status === 'failed' ? sql`datetime('now')` : null,
    itemsProcessed,
    errorMessage: errorMessage || null
  })
}

export async function getLatestSyncStatus(providerId: string): Promise<SyncStatus[]> {
  const results = await db
    .select()
    .from(syncStatus)
    .where(eq(syncStatus.providerId, providerId))
    .orderBy(desc(syncStatus.completedAt))
    .limit(10)

  return results.map(row => ({
    providerId: row.providerId,
    syncType: row.syncType as SyncStatus['syncType'],
    status: row.status as SyncStatus['status'],
    startedAt: row.startedAt ? new Date(row.startedAt) : undefined,
    completedAt: row.completedAt ? new Date(row.completedAt) : undefined,
    itemsProcessed: row.itemsProcessed || 0,
    errorMessage: row.errorMessage || undefined
  }))
}

// =============================================================================
// Search History
// =============================================================================

export async function logSearch(
  params: FlightSearchParams,
  resultsCount: number,
  lowestPrice: number | null,
  currency: string
): Promise<void> {
  await db.insert(searchHistory).values({
    originCode: params.origin,
    destinationCode: params.destination,
    departureDate: params.departureDate,
    returnDate: params.returnDate || null,
    passengers: params.passengers,
    cabinClass: params.cabinClass || null,
    resultsCount,
    lowestPrice,
    currency
  })
}

export async function getPopularRoutes(
  days = 7,
  limit = 20
): Promise<Array<{ origin: string, destination: string, count: number }>> {
  const results = await db
    .select({
      originCode: searchHistory.originCode,
      destinationCode: searchHistory.destinationCode,
      searchCount: sql<number>`COUNT(*)`.as('search_count')
    })
    .from(searchHistory)
    .where(sql`${searchHistory.searchedAt} > datetime('now', '-' || ${days} || ' days')`)
    .groupBy(searchHistory.originCode, searchHistory.destinationCode)
    .orderBy(desc(sql`search_count`))
    .limit(limit)

  return results.map(row => ({
    origin: row.originCode,
    destination: row.destinationCode,
    count: row.searchCount
  }))
}

// =============================================================================
// Provider Stats
// =============================================================================

export async function getProviderStats(providerId: string): Promise<ProviderStats> {
  const [flightCountResult, airportCountResult, routeCountResult] = await Promise.all([
    db
      .select({ count: sql<number>`COUNT(*)` })
      .from(flights)
      .where(
        and(
          eq(flights.providerId, providerId),
          sql`datetime(${flights.expiresAt}) > datetime('now')`
        )
      ),
    db
      .select({ count: sql<number>`COUNT(*)` })
      .from(airports)
      .where(eq(airports.providerId, providerId)),
    db
      .select({ count: sql<number>`COUNT(*)` })
      .from(routes)
      .where(and(eq(routes.providerId, providerId), eq(routes.isActive, true)))
  ])

  return {
    flightCount: Number(flightCountResult[0]?.count ?? 0),
    airportCount: Number(airportCountResult[0]?.count ?? 0),
    routeCount: Number(routeCountResult[0]?.count ?? 0)
  }
}

// =============================================================================
// Helper Mappers
// =============================================================================

function mapDbAirport(row: any): Airport {
  return {
    id: row.id || `db-${row.code}`,
    code: row.code,
    name: row.name,
    city: row.city || undefined,
    country: row.country,
    latitude: row.latitude ?? undefined,
    longitude: row.longitude ?? undefined,
    timezone: row.timezone || undefined
  }
}

function mapDbFlight(row: any): Flight {
  const seatsAvailable = row.seatsAvailable || 0
  const totalPrice = row.totalPrice || 0

  return {
    id: row.id,
    providerId: row.providerId,
    flightNumber: row.flightNumber,
    legType: 'outbound' as const,
    origin: {
      id: '',
      code: row.originCode,
      name: row.originCode,
      country: ''
    },
    destination: {
      id: '',
      code: row.destinationCode,
      name: row.destinationCode,
      country: ''
    },
    departureDate: row.departureDate,
    departureTime: row.departureTime,
    arrivalDate: row.arrivalDate,
    arrivalTime: row.arrivalTime,
    duration: row.durationMinutes || 0,
    basePrice: row.basePrice,
    taxPrice: row.taxPrice,
    totalPrice,
    currency: row.currency,
    seatsAvailable,
    available: seatsAvailable > 0 && totalPrice > 0,
    operatingCarrier: row.operatingCarrier,
    marketingCarrier: row.marketingCarrier || undefined,
    cabinClass: row.cabinClass,
    aircraft: row.aircraft || undefined,
    stops: row.stops ?? 0,
    bookingUrl: row.bookingUrl || undefined,
    fetchedAt: new Date(row.fetchedAt)
  }
}
