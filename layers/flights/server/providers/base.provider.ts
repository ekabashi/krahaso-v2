import type {
  IFlightProvider,
  Airport,
  FlightRoute,
  Flight,
  FlightSearchParams,
  ProviderHealth
} from '../types/provider'
import {
  getAirportsByProvider,
  getRoutesByProvider,
  getCachedFlights,
  cacheFlights,
  upsertAirports,
  upsertRoutes,
  getProviderStats,
  updateSyncStatus,
  recordPriceHistory
} from '../database/queries'

/**
 * Abstract base class for flight providers
 * Implements common functionality like caching, error handling, and sync logic
 */
export abstract class BaseFlightProvider implements IFlightProvider {
  abstract readonly id: string
  abstract readonly name: string
  abstract readonly priority: number

  protected lastError: string | null = null
  protected lastSuccessfulSync: Date | null = null

  // Cache settings
  protected cacheMinutes = 60
  protected rateLimitMs = 1000

  // ==========================================================================
  // Abstract methods - must be implemented by each provider
  // ==========================================================================

  /**
   * Fetch airports from the external API
   */
  protected abstract fetchAirports(): Promise<Airport[]>

  /**
   * Fetch available routes from the external API
   */
  protected abstract fetchRoutes(): Promise<FlightRoute[]>

  /**
   * Fetch flights from the external API for given search parameters
   */
  protected abstract fetchFlights(params: FlightSearchParams): Promise<Flight[]>

  // ==========================================================================
  // Public interface implementation
  // ==========================================================================

  /**
   * Get airports from local cache/database
   */
  async getAirports(): Promise<Airport[]> {
    return await getAirportsByProvider(this.id)
  }

  /**
   * Get routes from local cache/database
   */
  async getRoutes(): Promise<FlightRoute[]> {
    return await getRoutesByProvider(this.id)
  }

  /**
   * Search for flights - uses cache-first strategy
   */
  async searchFlights(params: FlightSearchParams): Promise<Flight[]> {
    // Check cache first
    const cached = params.forceFresh ? [] : await getCachedFlights(this.id, params)
    if (!params.forceFresh && cached.length > 0 && cached[0] && this.isCacheValid(cached[0].fetchedAt)) {
      console.log(`[${this.id}] Cache hit for ${params.origin}-${params.destination} on ${params.departureDate}`)
      return cached
    }

    // Fetch fresh data
    console.log(`[${this.id}] Fetching fresh data for ${params.origin}-${params.destination} on ${params.departureDate}`)

    try {
      const flights = await this.fetchFlights(params)

      if (flights.length > 0) {
        // Cache the results
        await cacheFlights(this.id, flights, params, this.cacheMinutes)

        // Record price history
        for (const flight of flights) {
          await recordPriceHistory(flight)
        }
      }

      this.lastError = null
      return flights
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : 'Unknown error'
      console.error(`[${this.id}] Search error:`, error)

      // Return stale cache if available
      if (cached.length > 0) {
        console.log(`[${this.id}] Returning stale cache due to error`)
        return cached
      }

      throw error
    }
  }

  /**
   * Sync airports from external API to local database
   */
  async syncAirports(): Promise<number> {
    console.log(`[${this.id}] Starting airport sync...`)
    await updateSyncStatus(this.id, 'airports', 'running')

    try {
      const airports = await this.fetchAirports()
      const count = await upsertAirports(this.id, airports)

      this.lastSuccessfulSync = new Date()
      this.lastError = null
      await updateSyncStatus(this.id, 'airports', 'success', count)

      console.log(`[${this.id}] Airport sync complete: ${count} airports`)
      return count
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : 'Unknown error'
      await updateSyncStatus(this.id, 'airports', 'failed', 0, this.lastError)
      console.error(`[${this.id}] Airport sync failed:`, error)
      throw error
    }
  }

  /**
   * Sync routes from external API to local database
   */
  async syncRoutes(): Promise<number> {
    console.log(`[${this.id}] Starting route sync...`)
    await updateSyncStatus(this.id, 'routes', 'running')

    try {
      const routes = await this.fetchRoutes()
      const count = await upsertRoutes(this.id, routes)

      this.lastSuccessfulSync = new Date()
      this.lastError = null
      await updateSyncStatus(this.id, 'routes', 'success', count)

      console.log(`[${this.id}] Route sync complete: ${count} routes`)
      return count
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : 'Unknown error'
      await updateSyncStatus(this.id, 'routes', 'failed', 0, this.lastError)
      console.error(`[${this.id}] Route sync failed:`, error)
      throw error
    }
  }

  /**
   * Sync flights for specified routes or all routes
   */
  async syncFlights(routes?: FlightRoute[], days = 30): Promise<number> {
    const routesToSync = routes || await this.getRoutes()

    if (routesToSync.length === 0) {
      console.log(`[${this.id}] No routes to sync`)
      return 0
    }

    console.log(`[${this.id}] Starting flight sync for ${routesToSync.length} routes, ${days} days...`)
    await updateSyncStatus(this.id, 'flights', 'running')

    let totalFlights = 0
    let errors = 0

    for (const route of routesToSync) {
      try {
        for (let i = 0; i < days; i++) {
          const date = new Date()
          date.setDate(date.getDate() + i)
          const dateStr = date.toISOString().split('T')[0] ?? ''

          const flights = await this.searchFlights({
            origin: route.originCode,
            destination: route.destinationCode,
            departureDate: dateStr,
            passengers: 1
          })

          totalFlights += flights.length

          // Rate limiting
          await this.delay(this.rateLimitMs)
        }
      } catch (error) {
        errors++
        console.error(
          `[${this.id}] Error syncing ${route.originCode}->${route.destinationCode}:`,
          error
        )
      }
    }

    if (errors === 0) {
      this.lastSuccessfulSync = new Date()
      await updateSyncStatus(this.id, 'flights', 'success', totalFlights)
    } else {
      await updateSyncStatus(this.id, 'flights', 'failed', totalFlights, `${errors} routes failed`)
    }

    console.log(`[${this.id}] Flight sync complete: ${totalFlights} flights, ${errors} errors`)
    return totalFlights
  }

  /**
   * Get provider health status
   */
  async getHealth(): Promise<ProviderHealth> {
    const stats = await getProviderStats(this.id)

    return {
      isHealthy: this.lastError === null,
      lastSuccessfulSync: this.lastSuccessfulSync,
      lastError: this.lastError,
      totalFlights: stats.flightCount,
      totalAirports: stats.airportCount,
      totalRoutes: stats.routeCount
    }
  }

  // ==========================================================================
  // Protected utility methods
  // ==========================================================================

  /**
   * Check if cached data is still valid
   */
  protected isCacheValid(fetchedAt: Date, maxAgeMinutes?: number): boolean {
    const maxAge = maxAgeMinutes || this.cacheMinutes
    const age = Date.now() - fetchedAt.getTime()
    return age < maxAge * 60 * 1000
  }

  /**
   * Utility for rate limiting
   */
  protected delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Parse time string to hours and minutes
   */
  protected parseTime(timeStr: string): { hours: number, minutes: number } {
    // Handle "1900-01-01T10:55:00" format
    const match = timeStr.match(/(\d{2}):(\d{2})/)
    if (match && match[1] && match[2]) {
      return {
        hours: parseInt(match[1], 10),
        minutes: parseInt(match[2], 10)
      }
    }
    return { hours: 0, minutes: 0 }
  }

  /**
   * Format time as HH:MM
   */
  protected formatTime(timeStr: string): string {
    const { hours, minutes } = this.parseTime(timeStr)
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
  }

  /**
   * Calculate flight duration in minutes
   */
  protected calculateDuration(departureTime: string, arrivalTime: string): number {
    const dep = this.parseTime(departureTime)
    const arr = this.parseTime(arrivalTime)

    let minutes = (arr.hours * 60 + arr.minutes) - (dep.hours * 60 + dep.minutes)

    // Handle overnight flights
    if (minutes < 0) {
      minutes += 24 * 60
    }

    return minutes
  }

  /**
   * Format duration as "Xh Ym"
   */
  protected formatDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h ${mins}m`
  }
}
