import { serverSupabaseClient } from '#supabase/server'
import type { H3Event } from 'h3'
import { AddressService } from '../../services/address.service'
import { getLogger } from '../../utils/logger'

export default defineEventHandler(async (event: H3Event) => {
  const log = getLogger(event)
  const client = await serverSupabaseClient(event)

  log.info('Fetching all partner address points')

  try {
    const addressService = new AddressService(client)
    const result = await addressService.getAddressLocations()
    log.info('Address locations fetched successfully', {
      addressCount: result.addresses.length,
      pickupCitiesCount: result.pickupCities.length,
    })
    return result
  } catch (error) {
    log.error('Failed to fetch address points', error as Error)
    throw error
  }
})
