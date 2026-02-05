import type { SupabaseClient } from '@supabase/supabase-js'
import { getCurrentDate, formatToYYYYMMDD } from '../../utils/date.utils'
import dayjs from 'dayjs'

export interface Season {
  id: number
  tenant_id: number
  name?: string
  start_date: string
  end_date: string
  price_multiplier: number
  min_rental_days?: number
}

export interface SeasonOverlap {
  max_multiplier: number
  min_rental_days: number | null
  season: Season | null
}

export class SeasonalPricingService {
  constructor(private client: SupabaseClient) {}

  async getSeasons(tenantId: number): Promise<Season[]> {
    const { data, error } = await this.client
      .from('season')
      .select('*')
      .eq('tenant_id', tenantId)

    if (error) {
      throw new Error(`Failed to fetch seasons: ${error.message}`)
    }

    return (data || []) as Season[]
  }

  async getActiveSeason(tenantId: number): Promise<Season | null> {
    const seasons = await this.getSeasons(tenantId)
    if (seasons.length === 0) return null

    const currentDate = getCurrentDate()
    const activeSeason = seasons.find(
      (season) =>
        currentDate >= season.start_date && currentDate <= season.end_date,
    )
    return activeSeason ?? null
  }

  async getSeasonOverlap(
    tenantId: number,
    startDate: string,
    endDate: string,
  ): Promise<SeasonOverlap> {
    const seasons = await this.getSeasons(tenantId)
    if (seasons.length === 0) {
      return {
        max_multiplier: 1,
        min_rental_days: null,
        season: null,
      }
    }

    const searchStart = formatToYYYYMMDD(startDate)
    const searchEnd = formatToYYYYMMDD(endDate)

    const overlappingSeasons = seasons.filter((season) => {
      const seasonStart = dayjs(season.start_date)
      const seasonEnd = dayjs(season.end_date)
      const rangeStart = dayjs(searchStart)
      const rangeEnd = dayjs(searchEnd)
      return (
        (rangeStart.isBefore(seasonEnd, 'day') ||
          rangeStart.isSame(seasonEnd, 'day')) &&
        (rangeEnd.isAfter(seasonStart, 'day') ||
          rangeEnd.isSame(seasonStart, 'day'))
      )
    })

    if (overlappingSeasons.length === 0) {
      return {
        max_multiplier: 1,
        min_rental_days: null,
        season: null,
      }
    }

    const maxMultiplier = Math.max(
      ...overlappingSeasons.map((s) => s.price_multiplier),
    )
    const seasonWithMaxMultiplier = overlappingSeasons.find(
      (s) => s.price_multiplier === maxMultiplier,
    )
    const minRentalDays =
      Math.max(
        ...overlappingSeasons
          .map((s) => s.min_rental_days ?? 0)
          .filter((days) => days > 0),
        0,
      ) || null

    return {
      max_multiplier: maxMultiplier,
      min_rental_days: minRentalDays,
      season: seasonWithMaxMultiplier ?? null,
    }
  }

  async calculateSeasonalRateForRange(
    baseRate: number,
    tenantId: number,
    startDate: string,
    endDate: string,
  ): Promise<{
    rate: number
    originalRate: number
    season: Season | null
    isSeason: boolean
    minRentalDays: number | null
  }> {
    const overlap = await this.getSeasonOverlap(tenantId, startDate, endDate)

    if (overlap.season) {
      return {
        rate: baseRate * overlap.max_multiplier,
        originalRate: baseRate,
        season: overlap.season,
        isSeason: true,
        minRentalDays: overlap.min_rental_days,
      }
    }

    return {
      rate: baseRate,
      originalRate: baseRate,
      season: null,
      isSeason: false,
      minRentalDays: null,
    }
  }
}
