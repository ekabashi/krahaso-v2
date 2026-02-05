import type { SupabaseClient } from '@supabase/supabase-js'
import { getLogger } from '../../utils/logger'

export interface SettlementRequest {
  id: string
  tenant_id: number
  booking_numbers: string[]
  booking_ids: number[]
  status: 'pending' | 'approved' | 'rejected' | 'completed'
  requested_by: string | null
  notes: string | null
  created_at: string
  updated_at: string | null
  tenant?: {
    id: number
    name: string | null
    subdomain: string
    status: string | null
    company_name: string | null
    logo_url: string | null
    public_email: string | null
    public_phone: string | null
  }
  bookings?: Array<{
    id: number
    booking_number: string
    total_price: number
    fee: number
    vehicle: {
      make: string
      model: string
      year: number
      license_plate?: string | null
    } | null
    customer: {
      name: string
      surname: string
    } | null
    startDateTime: string
    endDateTime: string
  }>
}

export interface TenantSettlementSummary {
  tenant_id: number
  company_name: string | null
  subdomain: string
  request_count: number
  tenant: {
    id: number
    name: string | null
    subdomain: string
    status: string | null
    company_name: string | null
    logo_url: string | null
    public_email: string | null
    public_phone: string | null
  }
}

export class SettlementRequestService {
  private log = getLogger({} as any)

  constructor(private client: SupabaseClient) {}

  async getTenantSummaries(params?: {
    page?: number
    limit?: number
    search?: string
  }): Promise<{
    data: TenantSettlementSummary[]
    total: number
    page: number
    limit: number
  }> {
    const page = params?.page || 1
    const limit = params?.limit || 10
    const search = params?.search?.trim() || ''
    const offset = (page - 1) * limit

    let query = this.client
      .from('settlement_requests')
      .select('tenant_id', { count: 'exact' })
      .neq('status', 'completed')

    if (search) {
      const searchPattern = `%${search}%`

      const { data: tenantIds, error: tenantSearchError } = await this.client
        .from('tenants')
        .select('id')
        .or(`name.ilike.${searchPattern},subdomain.ilike.${searchPattern}`)

      if (tenantSearchError) {
        this.log.error(
          'Failed to search tenants',
          tenantSearchError as Error,
          {
            search,
            supabaseError: tenantSearchError.message,
          }
        )
      }

      const { data: companyIds, error: companySearchError } = await this.client
        .from('company_public_info')
        .select('tenant_id')
        .or(`company_name.ilike.${searchPattern},public_email.ilike.${searchPattern},public_phone.ilike.${searchPattern}`)

      if (companySearchError) {
        this.log.error(
          'Failed to search company info',
          companySearchError as Error,
          {
            search,
            supabaseError: companySearchError.message,
          }
        )
      }

      const allTenantIds = [
        ...(tenantIds || []).map((t) => t.id as number),
        ...(companyIds || []).map((c) => c.tenant_id as number),
      ]

      const uniqueTenantIds = [...new Set(allTenantIds)]

      if (uniqueTenantIds.length > 0) {
        query = query.in('tenant_id', uniqueTenantIds)
      } else {
        return {
          data: [],
          total: 0,
          page,
          limit,
        }
      }
    }

    const { data: allSettlementRequests, error: settlementError, count } = await query

    if (settlementError) {
      this.log.error(
        'Failed to fetch settlement requests from database',
        settlementError as Error,
        {
          supabaseError: settlementError.message,
        }
      )
      throw new Error(`Database error: ${settlementError.message}`)
    }

    if (!allSettlementRequests || allSettlementRequests.length === 0) {
      return {
        data: [],
        total: count || 0,
        page,
        limit,
      }
    }

    const tenantIdCounts = new Map<number, number>()
    for (const request of allSettlementRequests) {
      const tenantId = request.tenant_id as number
      tenantIdCounts.set(tenantId, (tenantIdCounts.get(tenantId) || 0) + 1)
    }

    const uniqueTenantIds = Array.from(tenantIdCounts.keys())
    const sortedTenantIds = uniqueTenantIds.sort((a, b) => {
      const countA = tenantIdCounts.get(a) || 0
      const countB = tenantIdCounts.get(b) || 0
      return countB - countA
    })

    const paginatedTenantIds = sortedTenantIds.slice(offset, offset + limit)

    const { data: tenants, error: tenantsError } = await this.client
      .from('tenants')
      .select('id, name, subdomain, status')
      .in('id', paginatedTenantIds)

    if (tenantsError) {
      this.log.error(
        'Failed to fetch tenants from database',
        tenantsError as Error,
        {
          tenantIds: paginatedTenantIds,
          supabaseError: tenantsError.message,
        }
      )
      throw new Error(`Database error: ${tenantsError.message}`)
    }

    const { data: companyInfoList, error: companyError } = await this.client
      .from('company_public_info')
      .select('tenant_id, company_name, logo_url, public_phone, public_email')
      .in('tenant_id', paginatedTenantIds)

    if (companyError) {
      this.log.error(
        'Failed to fetch company public info from database',
        companyError as Error,
        {
          tenantIds: paginatedTenantIds,
          supabaseError: companyError.message,
        }
      )
      throw new Error(`Database error: ${companyError.message}`)
    }

    const tenantsMap = new Map(
      (tenants || []).map((t) => [
        t.id as number,
        {
          id: t.id as number,
          name: t.name as string | null,
          subdomain: t.subdomain as string,
          status: t.status as string | null,
        },
      ])
    )

    const companyInfoMap = new Map(
      (companyInfoList || []).map((info) => [
        info.tenant_id as number,
        {
          company_name: info.company_name as string | null,
          logo_url: info.logo_url as string | null,
          public_phone: info.public_phone as string | null,
          public_email: info.public_email as string | null,
        },
      ])
    )

    const summaries: TenantSettlementSummary[] = paginatedTenantIds.map((tenantId) => {
      const tenant = tenantsMap.get(tenantId)
      const companyInfo = companyInfoMap.get(tenantId) || {
        company_name: null,
        logo_url: null,
        public_phone: null,
        public_email: null,
      }

      return {
        tenant_id: tenantId,
        company_name: companyInfo.company_name,
        subdomain: tenant?.subdomain || '',
        request_count: tenantIdCounts.get(tenantId) || 0,
        tenant: {
          id: tenant?.id || tenantId,
          name: tenant?.name || null,
          subdomain: tenant?.subdomain || '',
          status: tenant?.status || null,
          company_name: companyInfo.company_name,
          logo_url: companyInfo.logo_url,
          public_email: companyInfo.public_email,
          public_phone: companyInfo.public_phone,
        },
      }
    })

    return {
      data: summaries,
      total: uniqueTenantIds.length,
      page,
      limit,
    }
  }

  async getRequestsByTenant(
    tenantId: number,
    params?: {
      page?: number
      limit?: number
      status?: string
    }
  ): Promise<{
    data: SettlementRequest[]
    total: number
    page: number
    limit: number
  }> {
    const page = params?.page || 1
    const limit = params?.limit || 10
    const offset = (page - 1) * limit

    let query = this.client
      .from('settlement_requests')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })

    if (params?.status) {
      query = query.eq('status', params.status)
    } else {
      query = query.neq('status', 'completed')
    }

    const { data: settlementRequests, error: settlementError, count } = await query
      .range(offset, offset + limit - 1)

    if (settlementError) {
      this.log.error(
        'Failed to fetch settlement requests by tenant from database',
        settlementError as Error,
        {
          tenantId,
          supabaseError: settlementError.message,
        }
      )
      throw new Error(`Database error: ${settlementError.message}`)
    }

    if (!settlementRequests || settlementRequests.length === 0) {
      return {
        data: [],
        total: count || 0,
        page,
        limit,
      }
    }

    const { data: tenant, error: tenantError } = await this.client
      .from('tenants')
      .select('id, name, subdomain, status')
      .eq('id', tenantId)
      .single()

    if (tenantError) {
      this.log.error(
        'Failed to fetch tenant from database',
        tenantError as Error,
        {
          tenantId,
          supabaseError: tenantError.message,
        }
      )
    }

    const { data: companyInfo, error: companyError } = await this.client
      .from('company_public_info')
      .select('tenant_id, company_name, logo_url, public_phone, public_email')
      .eq('tenant_id', tenantId)
      .maybeSingle()

    if (companyError) {
      this.log.error(
        'Failed to fetch company public info from database',
        companyError as Error,
        {
          tenantId,
          supabaseError: companyError.message,
        }
      )
    }

    const { data: partnership, error: partnershipError } = await this.client
      .from('partnership')
      .select('percentage')
      .eq('tenant_id', tenantId)
      .eq('is_partnership', true)
      .maybeSingle<{ percentage: number }>()

    if (partnershipError) {
      this.log.error(
        'Failed to fetch partnership percentage',
        partnershipError as Error,
        {
          tenantId,
          supabaseError: partnershipError.message,
        }
      )
    }

    const percentage = partnership?.percentage || 0

    const allBookingIds: number[] = []
    settlementRequests.forEach((request) => {
      const bookingIds = (request.booking_ids as number[]) || []
      allBookingIds.push(...bookingIds)
    })

    const bookingsMap = new Map<number, {
      id: number
      booking_number: string
      total_price: number
      fee: number
      vehicle: {
        make: string
        model: string
        year: number
        license_plate?: string | null
      } | null
      customer: {
        name: string
        surname: string
      } | null
      startDateTime: string
      endDateTime: string
    }>()

    if (allBookingIds.length > 0) {
      const { data: bookings, error: bookingsError } = await this.client
        .from('bookings')
        .select(
          `
          id,
          booking_number,
          total_price,
          startDateTime,
          endDateTime,
          vehicles:vehicle_id (
            make,
            model,
            year,
            license_plate
          ),
          customers:customer_id (
            name,
            surname
          )
        `
        )
        .in('id', allBookingIds)

      if (bookingsError) {
        this.log.error(
          'Failed to fetch bookings for settlement requests',
          bookingsError as Error,
          {
            tenantId,
            bookingIds: allBookingIds,
            supabaseError: bookingsError.message,
          }
        )
      } else if (bookings) {
        bookings.forEach((booking: {
          id: number
          booking_number: string
          total_price: number | string
          startDateTime: string
          endDateTime: string
          vehicles: {
            make: string
            model: string
            year: number
            license_plate?: string | null
          } | null
          customers: {
            name: string
            surname: string
          } | null
        }) => {
          const totalPrice = Number(booking.total_price) || 0
          const fee = percentage > 0
            ? Math.round((totalPrice * percentage) * 100) / 10000
            : 0

          bookingsMap.set(booking.id, {
            id: booking.id,
            booking_number: booking.booking_number,
            total_price: totalPrice,
            fee,
            vehicle: booking.vehicles
              ? {
                  make: booking.vehicles.make,
                  model: booking.vehicles.model,
                  year: booking.vehicles.year,
                  license_plate: booking.vehicles.license_plate || null,
                }
              : null,
            customer: booking.customers
              ? {
                  name: booking.customers.name,
                  surname: booking.customers.surname,
                }
              : null,
            startDateTime: booking.startDateTime || '',
            endDateTime: booking.endDateTime || '',
          })
        })
      }
    }

    const requests: SettlementRequest[] = settlementRequests.map((request) => {
      const bookingIds = (request.booking_ids as number[]) || []
      const bookings = bookingIds
        .map((id) => bookingsMap.get(id))
        .filter((b) => b !== undefined) as typeof bookingsMap extends Map<number, infer V> ? V[] : never[]

      return {
        id: request.id as string,
        tenant_id: request.tenant_id as number,
        booking_numbers: request.booking_numbers as string[],
        booking_ids: bookingIds,
        status: request.status as 'pending' | 'approved' | 'rejected' | 'completed',
        requested_by: request.requested_by as string | null,
        notes: request.notes as string | null,
        created_at: request.created_at as string,
        updated_at: request.updated_at as string | null,
        tenant: tenant
          ? {
              id: tenant.id as number,
              name: tenant.name as string | null,
              subdomain: tenant.subdomain as string,
              status: tenant.status as string | null,
              company_name: companyInfo?.company_name as string | null || null,
              logo_url: companyInfo?.logo_url as string | null || null,
              public_email: companyInfo?.public_email as string | null || null,
              public_phone: companyInfo?.public_phone as string | null || null,
            }
          : undefined,
        bookings: bookings.length > 0 ? bookings : undefined,
      }
    })

    return {
      data: requests,
      total: count || 0,
      page,
      limit,
    }
  }

  async updateMultipleRequestStatuses(
    requestIds: string[],
    status: 'pending' | 'approved' | 'rejected' | 'completed'
  ): Promise<SettlementRequest[]> {
    const now = new Date().toISOString()

    const { data: requestsBeforeUpdate, error: fetchError } = await this.client
      .from('settlement_requests')
      .select('id, booking_ids')
      .in('id', requestIds)

    if (fetchError) {
      this.log.error(
        'Failed to fetch settlement requests before update',
        fetchError as Error,
        {
          requestIds,
          supabaseError: fetchError.message,
        }
      )
      throw new Error(`Database error: ${fetchError.message}`)
    }

    const { data: updatedRequests, error: updateError } = await this.client
      .from('settlement_requests')
      .update({
        status,
        updated_at: now,
      })
      .in('id', requestIds)
      .select()

    if (updateError) {
      this.log.error(
        'Failed to update multiple settlement request statuses',
        updateError as Error,
        {
          requestIds,
          status,
          supabaseError: updateError.message,
        }
      )
      throw new Error(`Database error: ${updateError.message}`)
    }

    if (!updatedRequests || updatedRequests.length === 0) {
      return []
    }

    if (status === 'completed' && requestsBeforeUpdate) {
      const allBookingIds: number[] = []
      requestsBeforeUpdate.forEach((request) => {
        const bookingIds = request.booking_ids as number[] | null
        if (bookingIds && Array.isArray(bookingIds)) {
          allBookingIds.push(...bookingIds)
        }
      })

      const uniqueBookingIds = [...new Set(allBookingIds)]

      if (uniqueBookingIds.length > 0) {
        this.log.info('Updating booking statuses to settled', {
          bookingIds: uniqueBookingIds,
          requestIds,
        })

        const { error: bookingUpdateError } = await this.client
          .from('bookings')
          .update({ status: 'settled' })
          .in('id', uniqueBookingIds)

        if (bookingUpdateError) {
          this.log.error(
            'Failed to update booking statuses to settled',
            bookingUpdateError as Error,
            {
              bookingIds: uniqueBookingIds,
              requestIds,
              supabaseError: bookingUpdateError.message,
            }
          )
        } else {
          this.log.info('Booking statuses updated to settled successfully', {
            bookingIds: uniqueBookingIds,
            count: uniqueBookingIds.length,
          })
        }
      }
    }

    return updatedRequests.map((request) => ({
      id: request.id as string,
      tenant_id: request.tenant_id as number,
      booking_numbers: request.booking_numbers as string[],
      booking_ids: request.booking_ids as number[],
      status: request.status as 'pending' | 'approved' | 'rejected' | 'completed',
      requested_by: request.requested_by as string | null,
      notes: request.notes as string | null,
      created_at: request.created_at as string,
      updated_at: request.updated_at as string | null,
    }))
  }
}
