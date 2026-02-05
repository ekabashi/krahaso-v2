import type { SupabaseClient } from '@supabase/supabase-js'
import type { BookingFormData, BookingOptions } from '../../types'
import { getDaysDifference } from '../../utils/date.utils'
import {
  SeasonalPricingService,
  type Season,
} from './SeasonalPricingService'
import { BookingOptionsService } from '../booking/BookingOptionsService'

export interface AddOnBreakdown {
  name: string
  dailyCost: number
  totalCost: number
}

export interface PricingResult {
  totalPrice: number
  dailyRate: number
  baseRate: number
  rentalDays: number
  seasonalMultiplier?: number
  season?: Season
  addOns: AddOnBreakdown[]
}

export class PricingService {
  private seasonalPricingService: SeasonalPricingService
  private bookingOptionsService: BookingOptionsService

  constructor(private client: SupabaseClient) {
    this.seasonalPricingService = new SeasonalPricingService(client)
    this.bookingOptionsService = new BookingOptionsService(client)
  }

  async calculateTotalPrice(
    tenantId: number,
    vehicleId: number,
    startDateTime: string,
    endDateTime: string,
    options: BookingFormData['options'],
  ): Promise<PricingResult> {
    const { data: vehicle, error: vehicleError } = await this.client
      .from('vehicles')
      .select('daily_rate, tenant_id')
      .eq('id', vehicleId)
      .single<{ daily_rate: number | null; tenant_id: number }>()

    if (vehicleError) {
      throw new Error(`Vehicle not found: ${vehicleError.message}`)
    }

    if (vehicle.daily_rate === null) {
      throw new Error('Vehicle daily rate is not set')
    }

    const baseRate = vehicle.daily_rate

    const seasonalPricing =
      await this.seasonalPricingService.calculateSeasonalRateForRange(
        baseRate,
        vehicle.tenant_id,
        startDateTime,
        endDateTime,
      )

    const dailyRate = seasonalPricing.rate
    const season = seasonalPricing.season

    const rentalDays = getDaysDifference(startDateTime, endDateTime)
    let totalPrice = dailyRate * rentalDays

    const bookingOptions =
      await this.bookingOptionsService.getOptions(tenantId)
    const { addOns, addOnTotal } = this.calculateAddOnCosts(
      options,
      bookingOptions,
      rentalDays,
    )

    totalPrice += addOnTotal

    return {
      totalPrice,
      dailyRate,
      baseRate,
      rentalDays,
      seasonalMultiplier: season?.price_multiplier,
      season: season ?? undefined,
      addOns,
    }
  }

  private calculateAddOnCosts(
    selectedOptions: BookingFormData['options'],
    bookingOptions: BookingOptions,
    rentalDays: number,
  ): { addOns: AddOnBreakdown[]; addOnTotal: number } {
    const addOns: AddOnBreakdown[] = []
    let addOnTotal = 0

    const optionMappings: {
      selectedKey: keyof BookingFormData['options']
      enabledKey: keyof BookingOptions
      priceKey: keyof BookingOptions
      name: string
    }[] = [
      {
        selectedKey: 'secondDriver',
        enabledKey: 'second_driver',
        priceKey: 'second_driver_price',
        name: 'Second Driver',
      },
      {
        selectedKey: 'gps',
        enabledKey: 'gps_navigation',
        priceKey: 'gps_navigation_price',
        name: 'GPS Navigation',
      },
      {
        selectedKey: 'maksikos',
        enabledKey: 'maksikos',
        priceKey: 'maksikos_price',
        name: 'Maksikos Insurance',
      },
      {
        selectedKey: 'greenCard',
        enabledKey: 'green_card',
        priceKey: 'green_card_price',
        name: 'Green Card',
      },
      {
        selectedKey: 'europeanCard',
        enabledKey: 'european_card',
        priceKey: 'european_card_price',
        name: 'European Card',
      },
      {
        selectedKey: 'roadAssistance',
        enabledKey: 'road_assistance',
        priceKey: 'road_assistance_price',
        name: 'Road Assistance',
      },
      {
        selectedKey: 'outOfKosovo',
        enabledKey: 'out_of_kosovo',
        priceKey: 'out_of_kosovo_price',
        name: 'Out of Kosovo',
      },
    ]

    for (const mapping of optionMappings) {
      if (
        selectedOptions[mapping.selectedKey] &&
        bookingOptions[mapping.enabledKey]
      ) {
        const priceValue = bookingOptions[mapping.priceKey]
        const dailyCost =
          typeof priceValue === 'number' && priceValue > 0 ? priceValue : 0
        const totalCost = dailyCost * rentalDays
        addOns.push({
          name: mapping.name,
          dailyCost,
          totalCost,
        })
        addOnTotal += totalCost
      }
    }

    return { addOns, addOnTotal }
  }

}
