import type { SupabaseClient } from '@supabase/supabase-js'
import type { Customer } from '../../types'

export class CustomerService {
  constructor(private client: SupabaseClient) {}

  async getByEmail(tenantId: number, email: string): Promise<Customer | null> {
    if (!email || !tenantId) {
      throw new Error('email and tenant_id are required')
    }

    const { data, error } = await this.client
      .from('customers')
      .select(
        'id, name, surname, email, phone, address, PersonalNr, licenseClasses',
      )
      .eq('tenant_id', tenantId)
      .eq('email', email.trim())
      .maybeSingle()

    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }

    return data as Customer | null
  }
}
