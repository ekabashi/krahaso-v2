import dayjs, { type Dayjs } from 'dayjs'

export type RentalDaysInfo = {
  days: number
  hasExtraDay: boolean
  extraHours: number
}

export function useRentalPricing() {
  function calculateRentalDays(
    startDate: string | Date | null,
    endDate: string | Date | null,
    startTime?: string | null,
    endTime?: string | null,
  ): RentalDaysInfo {
    if (!startDate || !endDate) {
      return { days: 1, hasExtraDay: false, extraHours: 0 }
    }

    let start: Dayjs = dayjs(startDate)
    let end: Dayjs = dayjs(endDate)

    if (startTime) {
      const startTimeParts = startTime.split(':')
      if (startTimeParts.length === 2 && startTimeParts[0] && startTimeParts[1]) {
        const hour = Number.parseInt(startTimeParts[0]) || 0
        const minute = Number.parseInt(startTimeParts[1]) || 0
        start = dayjs(startDate)
          .hour(hour)
          .minute(minute)
          .second(0)
          .millisecond(0)
      }
    }

    if (endTime) {
      const endTimeParts = endTime.split(':')
      if (endTimeParts.length === 2 && endTimeParts[0] && endTimeParts[1]) {
        const hour = Number.parseInt(endTimeParts[0]) || 0
        const minute = Number.parseInt(endTimeParts[1]) || 0
        end = dayjs(endDate)
          .hour(hour)
          .minute(minute)
          .second(0)
          .millisecond(0)
      }
    }

    const totalHours = end.diff(start, 'hour', true)
    const fullDays = Math.floor(totalHours / 24)
    const remainingHours = totalHours % 24

    if (fullDays === 0 && remainingHours === 0) {
      return { days: 1, hasExtraDay: false, extraHours: 0 }
    }

    if (remainingHours < 3) {
      return {
        days: fullDays || 1,
        hasExtraDay: false,
        extraHours: remainingHours,
      }
    }

    return {
      days: fullDays + 1,
      hasExtraDay: true,
      extraHours: remainingHours,
    }
  }

  function calculateTotalPrice(dailyRate: number, rentalDays: number): number {
    return dailyRate * rentalDays
  }

  return {
    calculateRentalDays,
    calculateTotalPrice,
  }
}
