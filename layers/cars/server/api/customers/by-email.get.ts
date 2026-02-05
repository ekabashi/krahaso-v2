import { serverSupabaseClient } from '#supabase/server'
import type { H3Event } from 'h3'
import { CustomerService } from '../../services/customers/customer.service'
import { getLogger } from '../../utils/logger'
import { validateQuery } from '../../utils/validate'
import { customerByEmailQuerySchema } from '../../schemas/customers/by-email.schema'

export default defineEventHandler(async (event: H3Event) => {
  const log = getLogger(event)
  const client = await serverSupabaseClient(event)
  const query = getQuery(event)

  const { email, tenant_id: tenantId } = validateQuery(
    customerByEmailQuerySchema,
    query,
  )

  log.info('Fetching customer by email', { email, tenantId })

  try {
    const customerService = new CustomerService(client)
    const customer = await customerService.getByEmail(tenantId, email)

    if (!customer) {
      log.info('Customer not found', { email, tenantId })
      return null
    }

    log.info('Customer found successfully', { customerId: customer.id })
    return customer
  } catch (error) {
    log.error('Failed to fetch customer', error as Error, { email, tenantId })
    throw error
  }
})
