import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat.js'
import localizedFormat from 'dayjs/plugin/localizedFormat.js'
import 'dayjs/locale/sq.js'
import 'dayjs/locale/de.js'
import 'dayjs/locale/en.js'

dayjs.extend(customParseFormat)
dayjs.extend(localizedFormat)

export function useFormatDate() {
  const { locale } = useI18n()

  const formatDate = (date: Date | string | null, format = 'YYYY-MM-DD'): string => {
    if (!date) return ''
    const dayjsLocale = locale.value === 'sq' ? 'sq' : locale.value === 'de' ? 'de' : 'en'
    return dayjs(date).locale(dayjsLocale).format(format)
  }

  return {
    formatDate,
  }
}
