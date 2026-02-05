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
}
