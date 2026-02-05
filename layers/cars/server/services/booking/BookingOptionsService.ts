import type { SupabaseClient } from '@supabase/supabase-js'
import type { BookingOptions } from '../../types'

type BookingOptionsRow = {
  id?: number
  tenant_id: number
  second_driver: boolean
  second_driver_price: number | null
  gps_navigation: boolean
  gps_navigation_price: number | null
  maksikos: boolean
  maksikos_price: number | null
  green_card: boolean
  green_card_price: number | null
  european_card: boolean
  european_card_price: number | null
  road_assistance: boolean
  road_assistance_price: number | null
  out_of_kosovo: boolean
  out_of_kosovo_price: number | null
}

const DEFAULT_OPTIONS: Omit<BookingOptions, 'tenant_id'> = {
  second_driver: false,
  second_driver_price: 0,
  gps_navigation: false,
  gps_navigation_price: 0,
  maksikos: false,
  maksikos_price: 0,
  green_card: false,
  green_card_price: 0,
  european_card: false,
  european_card_price: 0,
  road_assistance: false,
  road_assistance_price: 0,
  out_of_kosovo: false,
  out_of_kosovo_price: 0,
}

export class BookingOptionsService {
  constructor(private client: SupabaseClient) {}

  async getOptions(tenantId: number): Promise<BookingOptions> {
    if (!tenantId) {
      throw new Error('tenant_id is required')
    }

    const { data, error } = await this.client
      .from('bookings_options')
      .select('*')
      .eq('tenant_id', tenantId)
      .single<BookingOptionsRow>()

    if (error) {
      if (error.code === 'PGRST116') {
        return {
          tenant_id: tenantId,
          ...DEFAULT_OPTIONS,
        }
      }
      throw new Error(`Failed to fetch booking options: ${error.message}`)
    }

    return this.mapRowToOptions(data)
  }

  async getAvailableAddOns(
    tenantId: number,
  ): Promise<{ name: string; price: number }[]> {
    const options = await this.getOptions(tenantId)
    const addOns: { name: string; price: number }[] = []
    if (options.second_driver)
      addOns.push({ name: 'secondDriver', price: options.second_driver_price })
    if (options.gps_navigation)
      addOns.push({ name: 'gps', price: options.gps_navigation_price })
    if (options.maksikos)
      addOns.push({ name: 'maksikos', price: options.maksikos_price })
    if (options.green_card)
      addOns.push({ name: 'greenCard', price: options.green_card_price })
    if (options.european_card)
      addOns.push({ name: 'europeanCard', price: options.european_card_price })
    if (options.road_assistance)
      addOns.push({
        name: 'roadAssistance',
        price: options.road_assistance_price,
      })
    if (options.out_of_kosovo)
      addOns.push({ name: 'outOfKosovo', price: options.out_of_kosovo_price })
    return addOns
  }

  private mapRowToOptions(row: BookingOptionsRow): BookingOptions {
    return {
      id: row.id,
      tenant_id: row.tenant_id,
      second_driver: row.second_driver,
      second_driver_price: row.second_driver_price ?? 0,
      gps_navigation: row.gps_navigation,
      gps_navigation_price: row.gps_navigation_price ?? 0,
      maksikos: row.maksikos,
      maksikos_price: row.maksikos_price ?? 0,
      green_card: row.green_card,
      green_card_price: row.green_card_price ?? 0,
      european_card: row.european_card,
      european_card_price: row.european_card_price ?? 0,
      road_assistance: row.road_assistance,
      road_assistance_price: row.road_assistance_price ?? 0,
      out_of_kosovo: row.out_of_kosovo,
      out_of_kosovo_price: row.out_of_kosovo_price ?? 0,
    }
  }
}
