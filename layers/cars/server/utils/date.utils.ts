import dayjs from 'dayjs'

export function getCurrentDate(): string {
  return dayjs().format('YYYY-MM-DD')
}

export function formatToYYYYMMDD(date: string | Date): string {
  return dayjs(date).format('YYYY-MM-DD')
}
