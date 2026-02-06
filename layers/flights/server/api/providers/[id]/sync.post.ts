import { useProviderRegistry } from '../../../providers/registry'

interface SyncRequestBody {
  type?: 'airports' | 'routes' | 'flights' | 'all'
  days?: number
}

/**
 * POST /api/providers/:id/sync
 * Trigger synchronization for a specific provider
 */
export default defineEventHandler(async (event) => {
  const providerId = getRouterParam(event, 'id')
  const body: Partial<SyncRequestBody> = await readBody<SyncRequestBody>(event).catch(() => ({}))

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

  const syncType = body?.type || 'all'
  const days = body?.days || 14

  // Run sync in background using waitUntil
  const syncPromise = (async () => {
    const results: Record<string, number | string> = {}

    try {
      if (syncType === 'airports' || syncType === 'all') {
        results.airports = await provider.syncAirports()
      }

      if (syncType === 'routes' || syncType === 'all') {
        results.routes = await provider.syncRoutes()
      }

      if (syncType === 'flights' || syncType === 'all') {
        results.flights = await provider.syncFlights(undefined, days)
      }

      console.log(`[${providerId}] Sync completed:`, results)
    } catch (error) {
      console.error(`[${providerId}] Sync failed:`, error)
      results.error = error instanceof Error ? error.message : 'Unknown error'
    }

    return results
  })()

  // For 'airports' and 'routes' which are fast, wait for them
  // For 'flights' or 'all', run in background
  if (syncType === 'airports' || syncType === 'routes') {
    const results = await syncPromise
    return {
      message: `Sync completed for ${providerId}`,
      type: syncType,
      results
    }
  }

  // Don't await for long-running syncs
  event.waitUntil?.(syncPromise)

  return {
    message: `Sync started for ${providerId}`,
    type: syncType,
    status: 'running',
    note: 'Flight sync runs in background. Check provider health for status.'
  }
})
