import { useProviderRegistry } from '../../../providers/registry'
import { getLatestSyncStatus } from '../../../database/queries'

/**
 * GET /api/providers/:id/health
 * Get health status and sync history for a specific provider
 */
export default defineEventHandler(async (event) => {
  const providerId = getRouterParam(event, 'id')

  if (!providerId) {
    throw createError({
      statusCode: 400,
      message: 'Provider ID is required'
    })
  }

  const registry = useProviderRegistry()
  const provider = registry.get(providerId)

  if (!provider) {
    throw createError({
      statusCode: 404,
      message: `Provider ${providerId} not found`
    })
  }

  const health = await provider.getHealth()
  const syncHistory = await getLatestSyncStatus(providerId)

  return {
    id: provider.id,
    name: provider.name,
    health: {
      isHealthy: health.isHealthy,
      lastSuccessfulSync: health.lastSuccessfulSync?.toISOString() || null,
      lastError: health.lastError
    },
    stats: {
      airports: health.totalAirports,
      routes: health.totalRoutes,
      cachedFlights: health.totalFlights
    },
    recentSyncs: syncHistory.map(s => ({
      type: s.syncType,
      status: s.status,
      startedAt: s.startedAt?.toISOString() || null,
      completedAt: s.completedAt?.toISOString() || null,
      itemsProcessed: s.itemsProcessed,
      error: s.errorMessage || null
    }))
  }
})
