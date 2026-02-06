import { useProviderRegistry } from '../providers/registry'
import { cleanExpiredCache, getPopularRoutes } from '../database/queries'

/**
 * Nitro plugin for background synchronization
 * Handles periodic syncing of airports, routes, and flight data
 */
export default defineNitroPlugin((nitroApp) => {
  // Only run sync in production or when explicitly enabled
  const enableSync = process.env.ENABLE_SYNC === 'true' || process.env.NODE_ENV === 'production'

  if (!enableSync) {
    console.log('[Sync] Scheduler disabled (set ENABLE_SYNC=true to enable)')
    return
  }

  console.log('[Sync] Scheduler starting...')

  const registry = useProviderRegistry()

  // ==========================================================================
  // Initial sync after startup (delayed to let server fully start)
  // ==========================================================================
  setTimeout(async () => {
    console.log('[Sync] Running initial sync...')
    await runInitialSync()
  }, 10000) // 10 second delay

  // ==========================================================================
  // Scheduled tasks
  // ==========================================================================

  // Airports & Routes: Every 24 hours
  const dailySyncInterval = 24 * 60 * 60 * 1000
  setInterval(async () => {
    console.log('[Sync] Running daily airports/routes sync...')
    await syncAirportsAndRoutes()
  }, dailySyncInterval)

  // Popular routes flight cache: Every 2 hours
  const flightSyncInterval = 2 * 60 * 60 * 1000
  setInterval(async () => {
    console.log('[Sync] Running popular routes flight sync...')
    await syncPopularRoutes()
  }, flightSyncInterval)

  // Clean expired cache: Every hour
  const cleanupInterval = 60 * 60 * 1000
  setInterval(async () => {
    console.log('[Sync] Cleaning expired cache...')
    const deleted = await cleanExpiredCache()
    console.log(`[Sync] Cleaned ${deleted} expired cache entries`)
  }, cleanupInterval)

  // ==========================================================================
  // Sync Functions
  // ==========================================================================

  async function runInitialSync(): Promise<void> {
    for (const provider of registry.getEnabled()) {
      try {
        console.log(`[Sync] Initial sync for ${provider.name}...`)

        // Sync airports first
        const airportCount = await provider.syncAirports()
        console.log(`[Sync] ${provider.name}: ${airportCount} airports synced`)

        // Then routes
        const routeCount = await provider.syncRoutes()
        console.log(`[Sync] ${provider.name}: ${routeCount} routes synced`)

        // Don't sync all flights on startup - too expensive
        // Popular routes will be synced on first search or by scheduled task
      } catch (error) {
        console.error(`[Sync] ${provider.name} initial sync failed:`, error)
      }
    }
  }

  async function syncAirportsAndRoutes(): Promise<void> {
    for (const provider of registry.getEnabled()) {
      try {
        await provider.syncAirports()
        await provider.syncRoutes()
        console.log(`[Sync] ${provider.name}: airports and routes synced`)
      } catch (error) {
        console.error(`[Sync] ${provider.name} sync failed:`, error)
      }
    }
  }

  async function syncPopularRoutes(): Promise<void> {
    // Get most searched routes from last 7 days
    const popularRoutes = await getPopularRoutes(7, 10)

    if (popularRoutes.length === 0) {
      // If no search history, sync default Kosovo routes
      const defaultRoutes = [
        { origin: 'DUS', destination: 'PRN' },
        { origin: 'FRA', destination: 'PRN' },
        { origin: 'ZRH', destination: 'PRN' },
        { origin: 'MUC', destination: 'PRN' },
        { origin: 'PRN', destination: 'DUS' },
        { origin: 'PRN', destination: 'ZRH' }
      ]

      for (const provider of registry.getEnabled()) {
        for (const route of defaultRoutes) {
          await syncRouteFlights(provider, route.origin, route.destination)
        }
      }
      return
    }

    // Sync popular routes
    for (const provider of registry.getEnabled()) {
      for (const route of popularRoutes) {
        await syncRouteFlights(provider, route.origin, route.destination)
      }
    }
  }

  async function syncRouteFlights(
    provider: ReturnType<typeof registry.get>,
    origin: string,
    destination: string,
    days = 14
  ): Promise<void> {
    if (!provider) return

    try {
      for (let i = 0; i < days; i++) {
        const date = new Date()
        date.setDate(date.getDate() + i)
        const dateStr = date.toISOString().split('T')[0]

        await provider.searchFlights({
          origin,
          destination,
          departureDate: dateStr,
          passengers: 1
        })

        // Rate limiting - 1 second between requests
        await new Promise(resolve => setTimeout(resolve, 1000))
      }

      console.log(`[Sync] ${provider.name}: ${origin}->${destination} synced for ${days} days`)
    } catch (error) {
      console.error(`[Sync] Error syncing ${origin}->${destination}:`, error)
    }
  }

  // ==========================================================================
  // Graceful shutdown
  // ==========================================================================
  nitroApp.hooks.hook('close', () => {
    console.log('[Sync] Scheduler shutting down...')
  })
})
