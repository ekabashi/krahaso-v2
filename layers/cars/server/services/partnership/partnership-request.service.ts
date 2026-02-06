import type { SupabaseClient } from '@supabase/supabase-js'

export interface PartnershipRequestDto {
  id: string
  tenant_id: number
  created_at: string
  updated_at: string | null
  is_partnership: boolean
  percentage: number | null
  partner_start_date: string | null
  partnership_status: 'pending' | 'approved' | 'rejected'
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

export class PartnershipRequestService {
  constructor(private client: SupabaseClient) {}

  async getPendingRequests(params?: {
    page?: number
    limit?: number
    search?: string
  }): Promise<{
    data: PartnershipRequestDto[]
    total: number
    page: number
    limit: number
  }> {
    const page = params?.page ?? 1
    const limit = params?.limit ?? 10
    const search = params?.search?.trim() ?? ''
    const offset = (page - 1) * limit

    let query = this.client
      .from('partnership')
      .select(
        'id, tenant_id, created_at, updated_at, is_partnership, percentage, partner_start_date, partnership_status',
        { count: 'exact' },
      )

    if (search) {
      const searchPattern = `%${search}%`

      const { data: tenantIds } = await this.client
        .from('tenants')
        .select('id')
        .or(`name.ilike.${searchPattern},subdomain.ilike.${searchPattern}`)

      const { data: companyIds } = await this.client
        .from('company_public_info')
        .select('tenant_id')
        .or(
          `company_name.ilike.${searchPattern},public_email.ilike.${searchPattern},public_phone.ilike.${searchPattern}`,
        )

      const allTenantIds = [
        ...(tenantIds ?? []).map((t) => t.id as number),
        ...(companyIds ?? []).map((c) => c.tenant_id as number),
      ]
      const uniqueTenantIds = [...new Set(allTenantIds)]

      if (uniqueTenantIds.length > 0) {
        query = query.in('tenant_id', uniqueTenantIds)
      } else {
        return { data: [], total: 0, page, limit }
      }
    }

    const { data: allPartnerships, error: partnershipsError, count } = await query

    if (partnershipsError) {
      console.error('PartnershipRequestService.getPendingRequests', partnershipsError)
      throw new Error(`Database error: ${partnershipsError.message}`)
    }

    if (!allPartnerships?.length) {
      return { data: [], total: count ?? 0, page, limit }
    }

    const statusOrder: Record<string, number> = {
      pending: 0,
      approved: 1,
      rejected: 2,
    }
    const sorted = [...allPartnerships].sort((a, b) => {
      const statusA = statusOrder[a.partnership_status as string] ?? 99
      const statusB = statusOrder[b.partnership_status as string] ?? 99
      if (statusA !== statusB) return statusA - statusB
      return (
        new Date(b.created_at as string).getTime() -
        new Date(a.created_at as string).getTime()
      )
    })
    const partnerships = sorted.slice(offset, offset + limit)
    const tenantIds = partnerships.map((p) => p.tenant_id as number)

    const { data: tenants, error: tenantsError } = await this.client
      .from('tenants')
      .select('id, name, subdomain, status')
      .in('id', tenantIds)

    if (tenantsError) {
      console.error('PartnershipRequestService tenants', tenantsError)
      throw new Error(`Database error: ${tenantsError.message}`)
    }

    const { data: companyInfoList, error: companyError } = await this.client
      .from('company_public_info')
      .select('tenant_id, company_name, logo_url, public_phone, public_email')
      .in('tenant_id', tenantIds)

    if (companyError) {
      console.error('PartnershipRequestService company_public_info', companyError)
      throw new Error(`Database error: ${companyError.message}`)
    }

    const tenantsMap = new Map(
      (tenants ?? []).map((t) => [
        t.id as number,
        {
          id: t.id as number,
          name: t.name as string | null,
          subdomain: t.subdomain as string,
          status: t.status as string | null,
        },
      ]),
    )
    const companyInfoMap = new Map(
      (companyInfoList ?? []).map((info) => [
        info.tenant_id as number,
        {
          company_name: info.company_name as string | null,
          logo_url: info.logo_url as string | null,
          public_phone: info.public_phone as string | null,
          public_email: info.public_email as string | null,
        },
      ]),
    )

    const data: PartnershipRequestDto[] = partnerships.map((p) => {
      const tenant = tenantsMap.get(p.tenant_id as number)
      const companyInfo = companyInfoMap.get(p.tenant_id as number) ?? {
        company_name: null,
        logo_url: null,
        public_phone: null,
        public_email: null,
      }
      return {
        id: p.id as string,
        tenant_id: p.tenant_id as number,
        created_at: p.created_at as string,
        updated_at: p.updated_at as string | null,
        is_partnership: p.is_partnership as boolean,
        percentage: p.percentage as number | null,
        partner_start_date: p.partner_start_date as string | null,
        partnership_status: p.partnership_status as 'pending' | 'approved' | 'rejected',
        tenant: {
          id: tenant?.id ?? (p.tenant_id as number),
          name: tenant?.name ?? null,
          subdomain: tenant?.subdomain ?? '',
          status: tenant?.status ?? null,
          company_name: companyInfo.company_name,
          logo_url: companyInfo.logo_url,
          public_email: companyInfo.public_email,
          public_phone: companyInfo.public_phone,
        },
      }
    })

    return { data, total: count ?? 0, page, limit }
  }

  async approveRequest(
    partnershipId: string,
    percentage: number,
  ): Promise<PartnershipRequestDto> {
    if (percentage < 0 || percentage > 100) {
      throw new Error('Percentage must be between 0 and 100')
    }
    const now = new Date().toISOString()

    const { data: partnership, error: updateError } = await this.client
      .from('partnership')
      .update({
        is_partnership: true,
        partnership_status: 'approved',
        partner_start_date: now,
        percentage,
        updated_at: now,
      })
      .eq('id', partnershipId)
      .eq('is_partnership', false)
      .eq('partnership_status', 'pending')
      .select()
      .maybeSingle()

    if (updateError) {
      console.error('PartnershipRequestService.approveRequest', updateError)
      throw new Error(`Database error: ${updateError.message}`)
    }
    if (!partnership) {
      throw new Error(
        `Partnership request ${partnershipId} not found or already processed`,
      )
    }
    return this.enrichPartnership(partnership)
  }

  async rejectRequest(partnershipId: string): Promise<PartnershipRequestDto> {
    const now = new Date().toISOString()

    const { data: partnership, error: updateError } = await this.client
      .from('partnership')
      .update({
        partnership_status: 'rejected',
        is_partnership: false,
        updated_at: now,
      })
      .eq('id', partnershipId)
      .eq('partnership_status', 'pending')
      .select()
      .maybeSingle()

    if (updateError) {
      console.error('PartnershipRequestService.rejectRequest', updateError)
      throw new Error(`Database error: ${updateError.message}`)
    }
    if (!partnership) {
      throw new Error(
        `Partnership request ${partnershipId} not found or already processed`,
      )
    }
    return this.enrichPartnership(partnership)
  }

  async updatePercentage(
    partnershipId: string,
    percentage: number,
  ): Promise<PartnershipRequestDto> {
    if (percentage < 0 || percentage > 100) {
      throw new Error('Percentage must be between 0 and 100')
    }
    const now = new Date().toISOString()

    const { data: partnership, error: updateError } = await this.client
      .from('partnership')
      .update({ percentage, updated_at: now })
      .eq('id', partnershipId)
      .eq('partnership_status', 'approved')
      .select()
      .maybeSingle()

    if (updateError) {
      console.error('PartnershipRequestService.updatePercentage', updateError)
      throw new Error(`Database error: ${updateError.message}`)
    }
    if (!partnership) {
      throw new Error(
        `Partnership ${partnershipId} not found or not approved`,
      )
    }
    return this.enrichPartnership(partnership)
  }

  async updatePartnershipStatus(
    partnershipId: string,
    isPartnership: boolean,
  ): Promise<PartnershipRequestDto> {
    const now = new Date().toISOString()

    const { data: partnership, error: updateError } = await this.client
      .from('partnership')
      .update({ is_partnership: isPartnership, updated_at: now })
      .eq('id', partnershipId)
      .eq('partnership_status', 'approved')
      .select()
      .maybeSingle()

    if (updateError) {
      console.error('PartnershipRequestService.updatePartnershipStatus', updateError)
      throw new Error(`Database error: ${updateError.message}`)
    }
    if (!partnership) {
      throw new Error(
        `Partnership ${partnershipId} not found or not approved`,
      )
    }
    return this.enrichPartnership(partnership)
  }

  private async enrichPartnership(
    partnership: Record<string, unknown>,
  ): Promise<PartnershipRequestDto> {
    const tenantId = partnership.tenant_id as number
    const { data: tenant } = await this.client
      .from('tenants')
      .select('id, name, subdomain, status')
      .eq('id', tenantId)
      .single()
    const { data: companyInfo } = await this.client
      .from('company_public_info')
      .select('company_name, logo_url, public_phone, public_email')
      .eq('tenant_id', tenantId)
      .maybeSingle()

    return {
      id: partnership.id as string,
      tenant_id: partnership.tenant_id as number,
      created_at: partnership.created_at as string,
      updated_at: partnership.updated_at as string | null,
      is_partnership: partnership.is_partnership as boolean,
      percentage: partnership.percentage as number | null,
      partner_start_date: partnership.partner_start_date as string | null,
      partnership_status: partnership.partnership_status as 'pending' | 'approved' | 'rejected',
      tenant: {
        id: tenant?.id ?? tenantId,
        name: (tenant?.name as string | null) ?? null,
        subdomain: (tenant?.subdomain as string) ?? '',
        status: (tenant?.status as string | null) ?? null,
        company_name: (companyInfo?.company_name as string | null) ?? null,
        logo_url: (companyInfo?.logo_url as string | null) ?? null,
        public_email: (companyInfo?.public_email as string | null) ?? null,
        public_phone: (companyInfo?.public_phone as string | null) ?? null,
      },
    }
  }
}
