import type { SupabaseClient } from '@supabase/supabase-js'
import type { Vehicle, CarsApiResponse } from '../types'
import dayjs from 'dayjs'
import { SeasonalPricingService } from './pricing/SeasonalPricingService'

type SearchParams = {
  startDateTime: string
  endDateTime: string
  page?: number
  limit?: number
  pickupLocation?: string
  returnLocation?: string
  minPrice?: number
  maxPrice?: number
  transmission?: string[]
  fuel?: string[]
  seats?: number[]
  category?: string[]
  color?: string[]
  sortBy?: 'price-asc' | 'price-desc' | 'year-desc' | 'name-asc'
}

type SearchAvailableCarsRpcResult = {
  vehicle_id: number
  tenant_id: number
  make: string
  model: string
  year: number
  images: string
  transmission: string
  fuel: string
  seats: number
  doors: number
  category: string | null
  v_color: string | null
  company_name: string | null
  logo_url: string | null
  daily_rate: number
  original_daily_rate: number | null
  is_season: boolean
  min_rental_days: number | null
  km_per_day: number | null
  price_per_km: number | null
  total_count: number
}

export class CarService {
  private seasonalPricingService: SeasonalPricingService

  constructor(private client: SupabaseClient) {
    this.seasonalPricingService = new SeasonalPricingService(client)
  }

  private transformRpcResultsToVehicles(
    data: SearchAvailableCarsRpcResult[],
  ): Vehicle[] {
    return data.map((vehicle) => ({
      id: vehicle.vehicle_id,
      tenant_id: vehicle.tenant_id,
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      daily_rate: vehicle.daily_rate,
      original_price: vehicle.original_daily_rate ?? undefined,
      images: vehicle.images,
      transmission: vehicle.transmission as 'Automatik' | 'Manual',
      fuel: vehicle.fuel as 'Diesel' | 'Benzin' | 'Electric' | 'Hybrid',
      seats: vehicle.seats,
      doors: vehicle.doors,
      category: vehicle.category ?? undefined,
      v_color: vehicle.v_color ?? undefined,
      tenant_name: vehicle.company_name || 'Unknown Partner',
      tenant_logo: vehicle.logo_url,
      company_name: vehicle.company_name ?? undefined,
      logo_url: vehicle.logo_url,
      is_season: vehicle.is_season,
      min_rental_days: vehicle.min_rental_days ?? undefined,
      kmPerDay: vehicle.km_per_day ?? undefined,
      pricePerKm: vehicle.price_per_km ?? undefined,
    }))
  }

  async getVehicleById(
    vehicleId: number,
    options?: {
      startDateTime?: string
      endDateTime?: string
    },
  ): Promise<Vehicle | null> {
    const { data: vehicle, error } = await this.client
      .from('vehicles')
      .select(
        `
        id,
        tenant_id,
        make,
        model,
        year,
        daily_rate,
        images,
        transmission,
        fuel,
        seats,
        doors,
        category,
        status,
        v_color,
        kmPerDay,
        pricePerKm
      `,
      )
      .eq('id', vehicleId)
      .maybeSingle()

    if (error || !vehicle) return null

    const { data: companyInfo } = await this.client
      .from('company_public_info')
      .select('company_name, logo_url')
      .eq('tenant_id', vehicle.tenant_id)
      .maybeSingle()

    let dailyRate = vehicle.daily_rate as number
    let originalPrice: number | undefined
    let isSeason = false
    let minRentalDays: number | undefined

    if (options?.startDateTime && options?.endDateTime) {
      const seasonalPricing =
        await this.seasonalPricingService.calculateSeasonalRateForRange(
          vehicle.daily_rate as number,
          vehicle.tenant_id as number,
          options.startDateTime,
          options.endDateTime,
        )
      dailyRate = seasonalPricing.rate
      originalPrice = seasonalPricing.isSeason
        ? seasonalPricing.originalRate
        : undefined
      isSeason = seasonalPricing.isSeason
      minRentalDays = seasonalPricing.minRentalDays ?? undefined
    }

    return {
      id: vehicle.id as number,
      tenant_id: vehicle.tenant_id as number,
      make: vehicle.make as string,
      model: vehicle.model as string,
      year: vehicle.year as number,
      daily_rate: dailyRate,
      original_price: originalPrice,
      images: (vehicle.images as string) || '',
      transmission: vehicle.transmission as 'Automatik' | 'Manual',
      fuel: vehicle.fuel as 'Diesel' | 'Benzin' | 'Electric' | 'Hybrid',
      seats: vehicle.seats as number,
      doors: vehicle.doors as number,
      category: (vehicle.category as string) || undefined,
      status: (vehicle.status as string) || undefined,
      v_color: (vehicle.v_color as string) || undefined,
      company_name: (companyInfo?.company_name as string) || undefined,
      logo_url: companyInfo?.logo_url ?? undefined,
      tenant_name: (companyInfo?.company_name as string) || undefined,
      tenant_logo: companyInfo?.logo_url ?? undefined,
      is_season: isSeason,
      min_rental_days: minRentalDays,
      kmPerDay: (vehicle.kmPerDay as number) ?? undefined,
      pricePerKm: (vehicle.pricePerKm as number) ?? undefined,
    }
  }

  async searchAvailableCars(params: SearchParams): Promise<CarsApiResponse> {
    const searchStart = dayjs(params.startDateTime)
    const searchEnd = dayjs(params.endDateTime)

    if (searchEnd.isBefore(searchStart) || searchEnd.isSame(searchStart)) {
      throw new Error('End date/time must be after start date/time')
    }

    const pickupCity = params.pickupLocation || ''
    const returnCity = params.returnLocation || params.pickupLocation || ''
    const page = params.page ?? 1
    const limit = params.limit ?? 10

    const rpcParams: Record<
      string,
      string | number | string[] | number[] | undefined
    > = {
      p_search_start: params.startDateTime,
      p_search_end: params.endDateTime,
      p_pickup_city: pickupCity,
      p_return_city: returnCity,
      p_page: page,
      p_limit: limit,
    }

    if (params.minPrice !== undefined) rpcParams.p_min_price = params.minPrice
    if (params.maxPrice !== undefined) rpcParams.p_max_price = params.maxPrice
    if (params.transmission?.length) rpcParams.p_transmission = params.transmission
    if (params.fuel?.length) rpcParams.p_fuel = params.fuel
    if (params.seats?.length) rpcParams.p_seats = params.seats
    if (params.category?.length) rpcParams.p_category = params.category
    if (params.color?.length) rpcParams.p_color = params.color
    if (params.sortBy !== undefined) rpcParams.p_sort_by = params.sortBy

    const rpcResponse = await this.client.rpc(
      'search_available_cars',
      rpcParams,
    )

    if (rpcResponse.error) {
      throw new Error(
        `RPC function error: ${rpcResponse.error.message}. Please verify that the 'search_available_cars' function exists in your Supabase database.`,
      )
    }

    const data = rpcResponse.data as SearchAvailableCarsRpcResult[] | null

    if (!data || !Array.isArray(data) || data.length === 0) {
      return { cars: [], total: 0, page, limit }
    }

    const total =
      data.length > 0 && data[0] ? (data[0] as SearchAvailableCarsRpcResult).total_count : 0
    const cars = this.transformRpcResultsToVehicles(data)

    return { cars, total, page, limit }
  }
}
