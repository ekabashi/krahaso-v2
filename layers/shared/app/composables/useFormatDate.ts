import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import localizedFormat from 'dayjs/plugin/localizedFormat'
import 'dayjs/locale/sq'
import 'dayjs/locale/de'
import 'dayjs/locale/en'

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
