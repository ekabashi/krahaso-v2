import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  AddressPoint,
  AddressLocationsResponse,
  CityOption,
} from '../../types'

const SPECIAL_PICKUP_ADDRESS_NAMES = ['Aeroporti i Prishtinës']

export class AddressService {
  constructor(private client: SupabaseClient) {}

  async getAllPartnerAddressPoints(): Promise<AddressPoint[]> {
    const { data: partnerships, error: partnershipsError } = await this.client
      .from('partnership')
      .select('tenant_id')
      .eq('is_partnership', true)

    if (partnershipsError) {
      throw new Error(`Database error: ${partnershipsError.message}`)
    }

    if (!partnerships || partnerships.length === 0) {
      return []
    }

    const tenantIds = partnerships.map((p) => p.tenant_id as number)

    const { data, error } = await this.client
      .from('adress_points')
      .select('id, tenant_id, adress, zip, city, position')
      .in('tenant_id', tenantIds)
      .order('position', { ascending: true, nullsFirst: false })

    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }

    let addressPoints: AddressPoint[] = (data || []).map((point: Record<string, unknown>) => ({
      id: point.id as number,
      tenant_id: point.tenant_id as number,
      adress: point.adress as string,
      zip: point.zip as string | undefined,
      city: point.city as string | undefined,
      position: point.position as number | undefined,
    }))

    const tenantsWithoutAddresses = tenantIds.filter(
      (id) => !addressPoints.some((ap) => ap.tenant_id === id),
    )

    if (tenantsWithoutAddresses.length > 0) {
      const { data: companyInfoList } = await this.client
        .from('company_public_info')
        .select('tenant_id, pickupPoint, returnPoint')
        .in('tenant_id', tenantsWithoutAddresses)

      if (companyInfoList) {
        for (const companyInfo of companyInfoList as Array<{
          tenant_id: number
          pickupPoint?: string[]
          returnPoint?: string[]
        }>) {
          const pickupPoints = companyInfo.pickupPoint || []
          const returnPoints = companyInfo.returnPoint || []
          const allPoints = [...new Set([...pickupPoints, ...returnPoints])]
          const tenantAddresses = allPoints.map(
            (point: string, index: number) =>
              ({
                id: addressPoints.length + index + 1,
                tenant_id: companyInfo.tenant_id,
                adress: point,
                zip: undefined,
                city: undefined,
                position: index + 1,
              }) as AddressPoint,
          )
          addressPoints = [...addressPoints, ...tenantAddresses]
        }
      }
    }

    return addressPoints.sort((a, b) => {
      if (a.position != null && b.position != null) return a.position - b.position
      if (a.position != null) return -1
      if (b.position != null) return 1
      return a.id - b.id
    })
  }

  async getAddressLocations(): Promise<AddressLocationsResponse> {
    const addresses = await this.getAllPartnerAddressPoints()

    const cityMap = new Map<string, CityOption>()
    for (const addr of addresses) {
      if (addr.city && !cityMap.has(addr.city)) {
        cityMap.set(addr.city, {
          label: addr.city,
          value: addr.city,
          tenant_id: addr.tenant_id,
          city: addr.city,
        })
      }
    }
    const cityOptions = Array.from(cityMap.values())

    const addressOptionsMap = new Map<string, CityOption>()
    const specialNamesSet = new Set(
      SPECIAL_PICKUP_ADDRESS_NAMES.map((n) => n.trim().toLowerCase()),
    )
    for (const addr of addresses) {
      const adr = addr.adress?.trim()
      if (!adr || !addr.city) continue
      if (!specialNamesSet.has(adr.toLowerCase())) continue
      if (addressOptionsMap.has(adr)) continue
      addressOptionsMap.set(adr, {
        label: adr,
        value: adr,
        tenant_id: addr.tenant_id,
        city: addr.city,
      })
    }
    const addressOptions = Array.from(addressOptionsMap.values())
    const pickupCities = [...addressOptions, ...cityOptions].sort((a, b) =>
      a.label.localeCompare(b.label),
    )

    const dropOffByPickupCity: Record<string, CityOption[]> = {}

    for (const pickupCity of cityMap.keys()) {
      const tenantsWithPickup = new Set<number>()
      for (const addr of addresses) {
        if (addr.city === pickupCity) tenantsWithPickup.add(addr.tenant_id)
      }
      if (tenantsWithPickup.size === 0) {
        dropOffByPickupCity[pickupCity] = []
        continue
      }

      const uniqueReturnCities = new Set<string>()
      for (const addr of addresses) {
        if (addr.city) uniqueReturnCities.add(addr.city)
      }

      const validReturnAddresses: CityOption[] = []
      for (const returnCity of uniqueReturnCities) {
        if (returnCity === pickupCity) {
          const firstTenantId = Array.from(tenantsWithPickup)[0]
          if (firstTenantId !== undefined) {
            validReturnAddresses.push({
              label: returnCity,
              value: returnCity,
              tenant_id: firstTenantId,
              city: returnCity,
            })
          }
        } else {
          const hasTenantWithBothCities = Array.from(tenantsWithPickup).some(
            (tenantId) => {
              const hasPickup = addresses.some(
                (a) => a.tenant_id === tenantId && a.city === pickupCity,
              )
              const hasReturn = addresses.some(
                (a) => a.tenant_id === tenantId && a.city === returnCity,
              )
              return hasPickup && hasReturn
            },
          )
          if (hasTenantWithBothCities) {
            const returnAddr = addresses.find((a) => a.city === returnCity)
            if (returnAddr) {
              validReturnAddresses.push({
                label: returnCity,
                value: returnCity,
                tenant_id: returnAddr.tenant_id,
                city: returnCity,
              })
            }
          }
        }
      }
      dropOffByPickupCity[pickupCity] = validReturnAddresses.sort((a, b) =>
        a.label.localeCompare(b.label),
      )
    }

    return {
      addresses,
      pickupCities,
      dropOffByPickupCity,
    }
  }
}
