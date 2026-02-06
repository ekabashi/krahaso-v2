import { useProviderRegistry } from '../../providers/registry'

/**
 * GET /api/providers
 * List all registered flight providers
 */
export default defineEventHandler(async () => {
  const registry = useProviderRegistry()
  const providers = registry.getAll()

  const providerList = await Promise.all(
    providers.map(async (provider) => {
      const health = await provider.getHealth()

      return {
        id: provider.id,
        name: provider.name,
        priority: provider.priority,
        health: {
          isHealthy: health.isHealthy,
          lastSync: health.lastSuccessfulSync?.toISOString() || null,
          lastError: health.lastError,
          stats: {
            airports: health.totalAirports,
            routes: health.totalRoutes,
            flights: health.totalFlights
          }
        }
      }
    })
  )

  return {
    providers: providerList,
    total: providerList.length
  }
})
