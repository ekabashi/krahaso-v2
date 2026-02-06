import type { SupabaseClient } from '@supabase/supabase-js'

const log = {
  error: (msg: string, err?: Error, meta?: Record<string, unknown>) => {
    console.error(msg, err, meta ?? '')
  },
  warn: (msg: string, meta?: Record<string, unknown>) => {
    console.warn(msg, meta ?? '')
  },
  info: (msg: string, meta?: Record<string, unknown>) => {
    console.info(msg, meta ?? '')
  },
}

export interface SuperadminTenant {
  id: number
  name: string | null
  company_name: string | null
  logo_url: string | null
  public_phone: string | null
  public_email: string | null
  status: string | null
  created_at: string
  subdomain: string
  isPartnership: boolean
  percentage: number | null
}

export class TenantService {
  constructor(private client: SupabaseClient) {}

  async getPartnershipTenants(): Promise<SuperadminTenant[]> {
    const { data: partnerships, error: partnershipsError } = await this.client
      .from('partnership')
      .select('tenant_id, is_partnership, percentage, created_at')
      .eq('is_partnership', true)
      .order('created_at', { ascending: false })

    if (partnershipsError) {
      log.error('Failed to fetch partnerships from database', partnershipsError as Error, {
        supabaseError: partnershipsError.message,
      })
      throw new Error(`Database error: ${partnershipsError.message}`)
    }

    if (!partnerships || partnerships.length === 0) {
      return []
    }

    const tenantIds = partnerships.map((p) => p.tenant_id as number)
    const partnershipMap = new Map(
      partnerships.map((p) => [
        p.tenant_id as number,
        {
          is_partnership: p.is_partnership as boolean,
          percentage: p.percentage as number | null,
        },
      ]),
    )

    const { data: tenants, error: tenantsError } = await this.client
      .from('tenants')
      .select('id, name, status, created_at, subdomain')
      .in('id', tenantIds)
      .order('created_at', { ascending: false })

    if (tenantsError) {
      log.error('Failed to fetch tenants from database', tenantsError as Error, {
        tenantIds,
        supabaseError: tenantsError.message,
      })
      throw new Error(`Database error: ${tenantsError.message}`)
    }

    if (!tenants || tenants.length === 0) {
      return []
    }

    const { data: companyInfoList, error: companyError } = await this.client
      .from('company_public_info')
      .select('tenant_id, company_name, logo_url, public_phone, public_email')
      .in('tenant_id', tenantIds)

    if (companyError) {
      log.error('Failed to fetch company public info', companyError as Error, {
        tenantIds,
        supabaseError: companyError.message,
      })
      throw new Error(`Database error: ${companyError.message}`)
    }

    const companyInfoMap = new Map(
      (companyInfoList || []).map((info: { tenant_id: number; company_name: string | null; logo_url: string | null; public_phone: string | null; public_email: string | null }) => [
        info.tenant_id,
        {
          company_name: info.company_name,
          logo_url: info.logo_url,
          public_phone: info.public_phone,
          public_email: info.public_email,
        },
      ]),
    )

    const superadminTenants: SuperadminTenant[] = tenants.map((tenant: { id: number; name: string | null; status: string | null; created_at: string; subdomain: string }) => {
      const companyInfo = companyInfoMap.get(tenant.id) ?? {
        company_name: null,
        logo_url: null,
        public_phone: null,
        public_email: null,
      }
      const partnership = partnershipMap.get(tenant.id)
      return {
        id: tenant.id,
        name: tenant.name,
        company_name: companyInfo.company_name,
        logo_url: companyInfo.logo_url,
        public_phone: companyInfo.public_phone,
        public_email: companyInfo.public_email,
        status: tenant.status,
        created_at: tenant.created_at,
        subdomain: tenant.subdomain,
        isPartnership: partnership?.is_partnership ?? true,
        percentage: partnership?.percentage ?? null,
      }
    })

    return superadminTenants
  }

  async getDashboardStats(createdBy: string): Promise<{
    totalPartners: number
    totalBookings: number
    activeCars: number
    totalFee: number
    totalRevenue: number
    pendingPartnershipRequests: number
    pendingSettlementRequests: number
  }> {
    const { data: partnerships, error: partnershipsError } = await this.client
      .from('partnership')
      .select('tenant_id')
      .eq('is_partnership', true)

    if (partnershipsError) {
      log.error('Failed to fetch partnerships', partnershipsError as Error, {
        supabaseError: partnershipsError.message,
      })
      throw new Error(`Database error: ${partnershipsError.message}`)
    }

    const tenantIds = (partnerships || []).map((p) => p.tenant_id as number)

    if (tenantIds.length === 0) {
      return {
        totalPartners: 0,
        totalBookings: 0,
        activeCars: 0,
        totalFee: 0,
        totalRevenue: 0,
        pendingPartnershipRequests: 0,
        pendingSettlementRequests: 0,
      }
    }

    const { count: bookingsCount, error: bookingsError } = await this.client
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .in('tenant_id', tenantIds)
      .eq('created_by', createdBy)
      .neq('status', 'cancelled')

    if (bookingsError) {
      log.error('Failed to fetch bookings count', bookingsError as Error, {
        supabaseError: bookingsError.message,
      })
      throw new Error(`Database error: ${bookingsError.message}`)
    }

    const { count: carsCount, error: carsError } = await this.client
      .from('vehicles')
      .select('*', { count: 'exact', head: true })
      .in('tenant_id', tenantIds)

    if (carsError) {
      log.error('Failed to fetch vehicles count', carsError as Error, {
        supabaseError: carsError.message,
      })
      throw new Error(`Database error: ${carsError.message}`)
    }

    const { data: bookings, error: bookingsDataError } = await this.client
      .from('bookings')
      .select('total_price, tenant_id')
      .in('tenant_id', tenantIds)
      .eq('created_by', createdBy)
      .neq('status', 'cancelled')

    if (bookingsDataError) {
      log.error('Failed to fetch bookings data', bookingsDataError as Error, {
        supabaseError: bookingsDataError.message,
      })
      throw new Error(`Database error: ${bookingsDataError.message}`)
    }

    let totalRevenue = 0
    ;(bookings || []).forEach((b: { total_price: string | number }) => {
      totalRevenue += Number(b.total_price) || 0
    })

    const { data: reconciliationHistory, error: reconciliationError } = await this.client
      .from('reconciliation_history')
      .select('marketplace_share')
      .in('tenant_id', tenantIds)

    if (reconciliationError) {
      log.error('Failed to fetch reconciliation history', reconciliationError as Error, {
        supabaseError: reconciliationError.message,
      })
      throw new Error(`Database error: ${reconciliationError.message}`)
    }

    let totalFee = 0
    ;(reconciliationHistory || []).forEach((r: { marketplace_share: string | number }) => {
      totalFee += parseFloat(String(r.marketplace_share)) || 0
    })

    totalFee = Math.round(totalFee * 100) / 100
    totalRevenue = Math.round(totalRevenue * 100) / 100

    const { count: pendingPartnershipCount, error: partnershipRequestsError } = await this.client
      .from('partnership')
      .select('*', { count: 'exact', head: true })
      .eq('partnership_status', 'pending')

    if (partnershipRequestsError) {
      log.warn('Failed to fetch pending partnership requests', {
        supabaseError: partnershipRequestsError.message,
      })
    }

    const { count: pendingSettlementCount, error: settlementRequestsError } = await this.client
      .from('settlement_requests')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')

    if (settlementRequestsError) {
      log.warn('Failed to fetch pending settlement requests', {
        supabaseError: settlementRequestsError.message,
      })
    }

    return {
      totalPartners: tenantIds.length,
      totalBookings: bookingsCount ?? 0,
      activeCars: carsCount ?? 0,
      totalFee,
      totalRevenue,
      pendingPartnershipRequests: pendingPartnershipCount ?? 0,
      pendingSettlementRequests: pendingSettlementCount ?? 0,
    }
  }

  async getMonthlyRevenue(createdBy: string): Promise<Array<{
    month: string
    revenue: number
    fee: number
    bookingsCount: number
  }>> {
    const { data: partnerships, error: partnershipsError } = await this.client
      .from('partnership')
      .select('tenant_id')
      .eq('is_partnership', true)

    if (partnershipsError) {
      log.error('Failed to fetch partnerships', partnershipsError as Error, {
        supabaseError: partnershipsError.message,
      })
      throw new Error(`Database error: ${partnershipsError.message}`)
    }

    const tenantIds = (partnerships || []).map((p) => p.tenant_id as number)

    if (tenantIds.length === 0) {
      return []
    }

    const twelveMonthsAgo = new Date()
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12)

    const { data: bookings, error: bookingsError } = await this.client
      .from('bookings')
      .select('total_price, created_at')
      .in('tenant_id', tenantIds)
      .eq('created_by', createdBy)
      .neq('status', 'cancelled')
      .gte('created_at', twelveMonthsAgo.toISOString())

    if (bookingsError) {
      log.error('Failed to fetch bookings for monthly revenue', bookingsError as Error, {
        supabaseError: bookingsError.message,
      })
      throw new Error(`Database error: ${bookingsError.message}`)
    }

    const { data: reconciliations, error: reconciliationsError } = await this.client
      .from('reconciliation_history')
      .select('marketplace_share, created_at')
      .in('tenant_id', tenantIds)
      .gte('created_at', twelveMonthsAgo.toISOString())

    if (reconciliationsError) {
      log.warn('Failed to fetch reconciliations for monthly fee', {
        supabaseError: reconciliationsError.message,
      })
    }

    const monthlyData = new Map<string, { revenue: number; bookingsCount: number }>()
    const monthlyFee = new Map<string, number>()

    ;(bookings || []).forEach((b: { total_price: string | number; created_at: string }) => {
      const date = new Date(b.created_at)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const revenue = Number(b.total_price) || 0
      const current = monthlyData.get(monthKey) ?? { revenue: 0, bookingsCount: 0 }
      monthlyData.set(monthKey, {
        revenue: current.revenue + revenue,
        bookingsCount: current.bookingsCount + 1,
      })
    })

    ;(reconciliations || []).forEach((r: { marketplace_share: string | number; created_at: string }) => {
      const date = new Date(r.created_at)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const fee = Number(r.marketplace_share) || 0
      monthlyFee.set(monthKey, (monthlyFee.get(monthKey) ?? 0) + fee)
    })

    const result: Array<{ month: string; revenue: number; fee: number; bookingsCount: number }> = []
    const now = new Date()

    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const data = monthlyData.get(monthKey) ?? { revenue: 0, bookingsCount: 0 }
      const fee = monthlyFee.get(monthKey) ?? 0
      result.push({
        month: monthKey,
        revenue: Math.round(data.revenue * 100) / 100,
        fee: Math.round(fee * 100) / 100,
        bookingsCount: data.bookingsCount,
      })
    }

    return result
  }

  async getTenantBookingStats(tenantId: number): Promise<{
    tenant: SuperadminTenant
    totalBookings: number
    totalRevenue: number
    marketplaceShare: number
    tenantShare: number
    percentage: number
    bookings: Array<{
      id: number
      booking_number: string
      total_price: number
      status: string
      created_at: string
      startDateTime: string
      endDateTime: string
      vehicle: { make: string; model: string; year: number }
      customer: { name: string; surname: string; email: string }
    }>
  }> {
    const { data: partnership, error: partnershipError } = await this.client
      .from('partnership')
      .select('tenant_id, is_partnership, percentage')
      .eq('tenant_id', tenantId)
      .eq('is_partnership', true)
      .maybeSingle()

    if (partnershipError) {
      log.error('Failed to fetch partnership from database', partnershipError as Error, {
        tenantId,
        supabaseError: partnershipError.message,
      })
      throw new Error(`Database error: ${partnershipError.message}`)
    }

    if (!partnership) {
      throw new Error(`Tenant with ID ${tenantId} is not a partnership tenant`)
    }

    const { data: tenant, error: tenantError } = await this.client
      .from('tenants')
      .select('id, name, status, created_at, subdomain')
      .eq('id', tenantId)
      .single()

    if (tenantError) {
      log.error('Failed to fetch tenant from database', tenantError as Error, {
        tenantId,
        supabaseError: tenantError.message,
      })
      throw new Error(`Database error: ${tenantError.message}`)
    }

    if (!tenant) {
      throw new Error(`Tenant with ID ${tenantId} not found`)
    }

    const { data: companyInfo, error: companyError } = await this.client
      .from('company_public_info')
      .select('company_name, logo_url, public_phone, public_email')
      .eq('tenant_id', tenantId)
      .maybeSingle()

    if (companyError) {
      log.error('Failed to fetch company info', companyError as Error, {
        tenantId,
        supabaseError: companyError.message,
      })
    }

    const superadminTenant: SuperadminTenant = {
      id: tenant.id as number,
      name: tenant.name as string | null,
      company_name: (companyInfo?.company_name as string | null) || null,
      logo_url: (companyInfo?.logo_url as string | null) || null,
      public_phone: (companyInfo?.public_phone as string | null) || null,
      public_email: (companyInfo?.public_email as string | null) || null,
      status: tenant.status as string | null,
      created_at: tenant.created_at as string,
      subdomain: tenant.subdomain as string,
      isPartnership: partnership.is_partnership as boolean,
      percentage: partnership.percentage as number | null,
    }

    // Fetch all bookings created by autopika for this tenant
    const { data: bookings, error: bookingsError } = await this.client
      .from('bookings')
      .select(
        `
        id,
        booking_number,
        total_price,
        status,
        created_at,
        startDateTime,
        endDateTime,
        vehicles:vehicle_id (
          make,
          model,
          year
        ),
        customers:customer_id (
          name,
          surname,
          email
        )
      `
      )
      .eq('tenant_id', tenantId)
      .eq('created_by', 'autopika')
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false })

    if (bookingsError) {
      log.error('Failed to fetch bookings from database', bookingsError as Error, {
        tenantId,
        supabaseError: bookingsError.message,
      })
      throw new Error(`Database error: ${bookingsError.message}`)
    }

    const bookingsList = (bookings || []).map((booking: any) => {
      const vehicles = booking.vehicles
      const customers = booking.customers

      const vehicle = Array.isArray(vehicles) ? vehicles[0] : vehicles
      const customer = Array.isArray(customers) ? customers[0] : customers

      return {
        id: booking.id as number,
        booking_number: booking.booking_number as string,
        total_price: Number(booking.total_price),
        status: booking.status as string,
        created_at: booking.created_at as string,
        startDateTime: booking.startDateTime as string,
        endDateTime: booking.endDateTime as string,
        vehicle: {
          make: vehicle?.make || 'Unknown',
          model: vehicle?.model || 'Unknown',
          year: vehicle?.year || 0,
        },
        customer: {
          name: customer?.name || 'Unknown',
          surname: customer?.surname || '',
          email: customer?.email || '',
        },
      }
    })

    // Calculate statistics
    const totalRevenue = bookingsList.reduce(
      (sum, booking) => sum + booking.total_price,
      0
    )
    const percentage = (partnership.percentage as number) || 0
    const marketplaceShare = (totalRevenue * percentage) / 100
    const tenantShare = totalRevenue - marketplaceShare

    return {
      tenant: superadminTenant,
      totalBookings: bookingsList.length,
      totalRevenue,
      marketplaceShare,
      tenantShare,
      percentage,
      bookings: bookingsList,
    }
  }

  async getTenantReconciliationHistory(tenantId: number): Promise<{
    tenant: SuperadminTenant
    history: Array<{
      id: number
      tenant_id: number
      settled_count: number
      total_revenue: number
      marketplace_share: number
      tenant_share: number
      percentage: number
      booking_ids: number[]
      created_at: string
      created_by: string
      notes: string | null
      bookings: Array<{
        id: number
        booking_number: string
        total_price: number
        status: string
        created_at: string
        startDateTime: string
        endDateTime: string
        vehicle: { make: string; model: string; year: number }
        customer: { name: string; surname: string; email: string }
      }>
    }>
  }> {
    const { data: tenant, error: tenantError } = await this.client
      .from('tenants')
      .select('id, name, status, created_at, subdomain')
      .eq('id', tenantId)
      .single()

    if (tenantError) {
      log.error('Failed to fetch tenant from database', tenantError as Error, {
        tenantId,
        supabaseError: tenantError.message,
      })
      throw new Error(`Database error: ${tenantError.message}`)
    }

    if (!tenant) {
      throw new Error(`Tenant with ID ${tenantId} not found`)
    }

    const { data: partnership, error: partnershipError } = await this.client
      .from('partnership')
      .select('tenant_id, is_partnership, percentage')
      .eq('tenant_id', tenantId)
      .eq('is_partnership', true)
      .maybeSingle()

    if (partnershipError) {
      log.error('Failed to fetch partnership', partnershipError as Error, {
        tenantId,
        supabaseError: partnershipError.message,
      })
    }

    const { data: companyInfo, error: companyError } = await this.client
      .from('company_public_info')
      .select('company_name, logo_url, public_phone, public_email')
      .eq('tenant_id', tenantId)
      .maybeSingle()

    if (companyError) {
      log.error('Failed to fetch company info', companyError as Error, {
        tenantId,
        supabaseError: companyError.message,
      })
    }

    const superadminTenant: SuperadminTenant = {
      id: tenant.id as number,
      name: tenant.name as string | null,
      company_name: (companyInfo?.company_name as string | null) || null,
      logo_url: (companyInfo?.logo_url as string | null) || null,
      public_phone: (companyInfo?.public_phone as string | null) || null,
      public_email: (companyInfo?.public_email as string | null) || null,
      status: tenant.status as string | null,
      created_at: tenant.created_at as string,
      subdomain: tenant.subdomain as string,
      isPartnership: partnership?.is_partnership ?? false,
      percentage: partnership?.percentage ?? null,
    }

    const { data: reconciliationHistory, error: historyError } = await this.client
      .from('reconciliation_history')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })

    if (historyError) {
      log.error(
        'Failed to fetch reconciliation history from database',
        historyError as Error,
        {
          tenantId,
          supabaseError: historyError.message,
        }
      )
      throw new Error(`Database error: ${historyError.message}`)
    }

    if (!reconciliationHistory || reconciliationHistory.length === 0) {
      return {
        tenant: superadminTenant,
        history: [],
      }
    }

    const allBookingIds = new Set<number>()
    reconciliationHistory.forEach((entry: any) => {
      const bookingIds = (entry.booking_ids as number[]) || []
      bookingIds.forEach((id) => allBookingIds.add(id))
    })

    if (allBookingIds.size === 0) {
      return {
        tenant: superadminTenant,
        history: reconciliationHistory.map((entry: any) => ({
          id: entry.id as number,
          tenant_id: entry.tenant_id as number,
          settled_count: entry.settled_count as number,
          total_revenue: Number(entry.total_revenue),
          marketplace_share: Number(entry.marketplace_share),
          tenant_share: Number(entry.tenant_share),
          percentage: entry.percentage as number,
          booking_ids: (entry.booking_ids as number[]) || [],
          created_at: entry.created_at as string,
          created_by: (entry.created_by as string) || 'superadmin',
          notes: (entry.notes as string | null) || null,
          bookings: [],
        })),
      }
    }

    const { data: bookings, error: bookingsError } = await this.client
      .from('bookings')
      .select(
        `
        id,
        booking_number,
        total_price,
        status,
        created_at,
        startDateTime,
        endDateTime,
        vehicles:vehicle_id (
          make,
          model,
          year
        ),
        customers:customer_id (
          name,
          surname,
          email
        )
      `
      )
      .in('id', Array.from(allBookingIds))

    if (bookingsError) {
      log.error('Failed to fetch bookings for reconciliation history', bookingsError as Error, {
        tenantId,
        supabaseError: bookingsError.message,
      })
    }

    const bookingsMap = new Map(
      (bookings || []).map((booking: any) => {
        const vehicles = booking.vehicles
        const customers = booking.customers

        const vehicle = Array.isArray(vehicles) ? vehicles[0] : vehicles
        const customer = Array.isArray(customers) ? customers[0] : customers

        return [
          booking.id as number,
          {
            id: booking.id as number,
            booking_number: booking.booking_number as string,
            total_price: Number(booking.total_price),
            status: booking.status as string,
            created_at: booking.created_at as string,
            startDateTime: booking.startDateTime as string,
            endDateTime: booking.endDateTime as string,
            vehicle: {
              make: vehicle?.make || 'Unknown',
              model: vehicle?.model || 'Unknown',
              year: vehicle?.year || 0,
            },
            customer: {
              name: customer?.name || 'Unknown',
              surname: customer?.surname || '',
              email: customer?.email || '',
            },
          },
        ]
      })
    )

    return {
      tenant: superadminTenant,
      history: reconciliationHistory.map((entry: any) => {
        const bookingIds = (entry.booking_ids as number[]) || []
        return {
          id: entry.id as number,
          tenant_id: entry.tenant_id as number,
          settled_count: entry.settled_count as number,
          total_revenue: Number(entry.total_revenue),
          marketplace_share: Number(entry.marketplace_share),
          tenant_share: Number(entry.tenant_share),
          percentage: entry.percentage as number,
          booking_ids: bookingIds,
          created_at: entry.created_at as string,
          created_by: (entry.created_by as string) || 'superadmin',
          notes: (entry.notes as string | null) || null,
          bookings: bookingIds.map((id) => bookingsMap.get(id)).filter(Boolean) as any[],
        }
      }),
    }
  }

  async getReconciliationDetails(reconciliationId: number): Promise<{
    id: number
    tenant_id: number
    settled_count: number
    total_revenue: number
    marketplace_share: number
    tenant_share: number
    percentage: number
    booking_ids: number[]
    created_at: string
    created_by: string
    notes: string | null
    bookings: Array<{
      id: number
      booking_number: string
      total_price: number
      status: string
      created_at: string
      startDateTime: string
      endDateTime: string
      vehicle: { make: string; model: string; year: number }
      customer: { name: string; surname: string; email: string }
    }>
  }> {
    const { data: reconciliationEntry, error: entryError } = await this.client
      .from('reconciliation_history')
      .select('*')
      .eq('id', reconciliationId)
      .single()

    if (entryError) {
      log.error(
        'Failed to fetch reconciliation entry from database',
        entryError as Error,
        {
          reconciliationId,
          supabaseError: entryError.message,
        }
      )
      throw new Error(`Database error: ${entryError.message}`)
    }

    if (!reconciliationEntry) {
      throw new Error(`Reconciliation entry with ID ${reconciliationId} not found`)
    }

    const bookingIds = (reconciliationEntry.booking_ids as number[]) || []

    if (bookingIds.length === 0) {
      return {
        id: reconciliationEntry.id as number,
        tenant_id: reconciliationEntry.tenant_id as number,
        settled_count: reconciliationEntry.settled_count as number,
        total_revenue: Number(reconciliationEntry.total_revenue),
        marketplace_share: Number(reconciliationEntry.marketplace_share),
        tenant_share: Number(reconciliationEntry.tenant_share),
        percentage: reconciliationEntry.percentage as number,
        booking_ids: bookingIds,
        created_at: reconciliationEntry.created_at as string,
        created_by: (reconciliationEntry.created_by as string) || 'superadmin',
        notes: (reconciliationEntry.notes as string | null) || null,
        bookings: [],
      }
    }

    const { data: bookings, error: bookingsError } = await this.client
      .from('bookings')
      .select(
        `
        id,
        booking_number,
        total_price,
        status,
        created_at,
        startDateTime,
        endDateTime,
        vehicles:vehicle_id (
          make,
          model,
          year
        ),
        customers:customer_id (
          name,
          surname,
          email
        )
      `
      )
      .in('id', bookingIds)
      .order('created_at', { ascending: false })

    if (bookingsError) {
      log.error(
        'Failed to fetch bookings for reconciliation details',
        bookingsError as Error,
        {
          reconciliationId,
          bookingIds,
          supabaseError: bookingsError.message,
        }
      )
      throw new Error(`Database error: ${bookingsError.message}`)
    }

    const bookingsList = (bookings || []).map((booking: any) => {
      const vehicles = booking.vehicles
      const customers = booking.customers

      const vehicle = Array.isArray(vehicles) ? vehicles[0] : vehicles
      const customer = Array.isArray(customers) ? customers[0] : customers

      return {
        id: booking.id as number,
        booking_number: booking.booking_number as string,
        total_price: Number(booking.total_price),
        status: booking.status as string,
        created_at: booking.created_at as string,
        startDateTime: booking.startDateTime as string,
        endDateTime: booking.endDateTime as string,
        vehicle: {
          make: vehicle?.make || 'Unknown',
          model: vehicle?.model || 'Unknown',
          year: vehicle?.year || 0,
        },
        customer: {
          name: customer?.name || 'Unknown',
          surname: customer?.surname || '',
          email: customer?.email || '',
        },
      }
    })

    return {
      id: reconciliationEntry.id as number,
      tenant_id: reconciliationEntry.tenant_id as number,
      settled_count: reconciliationEntry.settled_count as number,
      total_revenue: Number(reconciliationEntry.total_revenue),
      marketplace_share: Number(reconciliationEntry.marketplace_share),
      tenant_share: Number(reconciliationEntry.tenant_share),
      percentage: reconciliationEntry.percentage as number,
      booking_ids: bookingIds,
      created_at: reconciliationEntry.created_at as string,
      created_by: (reconciliationEntry.created_by as string) || 'superadmin',
      notes: (reconciliationEntry.notes as string | null) || null,
      bookings: bookingsList,
    }
  }
}
