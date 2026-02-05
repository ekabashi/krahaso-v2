import dayjs from 'dayjs'

export function getCurrentDate(): string {
  return dayjs().format('YYYY-MM-DD')
}

export function formatToYYYYMMDD(date: string | Date): string {
  return dayjs(date).format('YYYY-MM-DD')
}

/**
 * Calculate difference in days between two dates.
 * If extra hours are < 3, counts as same day; if >= 3, counts as additional day.
 */
export function getDaysDifference(
  startDate: string | Date,
  endDate: string | Date,
): number {
  const start = dayjs(startDate)
  const end = dayjs(endDate)
  const totalHours = end.diff(start, 'hour', true)
  const fullDays = Math.floor(totalHours / 24)
  const remainingHours = totalHours % 24
  if (fullDays === 0 && remainingHours === 0) return 1
  if (remainingHours < 3) return fullDays || 1
  return fullDays + 1
}
