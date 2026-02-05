import type { SupabaseClient } from '@supabase/supabase-js'
import type { AddressPoint } from '../../types'

export class AddressPointService {
  constructor(private client: SupabaseClient) {}

  async getAddressPoints(tenantId: number): Promise<AddressPoint[]> {
    if (!tenantId) {
      throw new Error('tenant_id is required')
    }

    const { data, error } = await this.client
      .from('adress_points')
      .select('id, tenant_id, adress, zip, city, position')
      .eq('tenant_id', tenantId)
      .order('position', { ascending: true, nullsFirst: false })

    if (error) {
      throw new Error(`Failed to fetch address points: ${error.message}`)
    }

    const addressPoints: AddressPoint[] = (data ?? []).map((point: Record<string, unknown>) => ({
      id: point.id as number,
      tenant_id: point.tenant_id as number,
      adress: point.adress as string,
      zip: point.zip as string | undefined,
      city: point.city as string | undefined,
      position: point.position as number | undefined,
    }))

    if (addressPoints.length === 0) {
      return this.getAddressPointsFromCompanyInfo(tenantId)
    }

    return addressPoints
  }

  async getPickupPoints(tenantId: number): Promise<AddressPoint[]> {
    return this.getAddressPoints(tenantId)
  }

  async getReturnPoints(tenantId: number): Promise<AddressPoint[]> {
    return this.getAddressPoints(tenantId)
  }

  private async getAddressPointsFromCompanyInfo(
    tenantId: number,
  ): Promise<AddressPoint[]> {
    const { data: companyInfo } = await this.client
      .from('company_public_info')
      .select('pickupPoint, returnPoint')
      .eq('tenant_id', tenantId)
      .single()

    if (!companyInfo) {
      return []
    }

    const pickupPoints =
      (companyInfo as { pickupPoint?: string[] }).pickupPoint ?? []
    const returnPoints =
      (companyInfo as { returnPoint?: string[] }).returnPoint ?? []
    const allPoints = [...new Set([...pickupPoints, ...returnPoints])]

    return allPoints.map((point: string, index: number) => ({
      id: index + 1,
      tenant_id: tenantId,
      adress: point,
      zip: undefined,
      city: undefined,
      position: index + 1,
    }))
  }
}
