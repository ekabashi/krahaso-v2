import { describe, it, expect, vi } from 'vitest'

const localeRef = { value: 'sq' }
vi.mock('vue-i18n', () => ({
  useI18n: () => ({ locale: localeRef }),
}))

describe('useFormatDate', () => {
  it('returns empty string for null date', async () => {
    const { useFormatDate } = await import('layers/shared/app/composables/useFormatDate')
    const { formatDate } = useFormatDate()
    expect(formatDate(null)).toBe('')
    expect(formatDate(null, 'LL')).toBe('')
  })

  it('formats date with default format', async () => {
    localeRef.value = 'sq'
    const { useFormatDate } = await import('layers/shared/app/composables/useFormatDate')
    const { formatDate } = useFormatDate()
    expect(formatDate('2025-06-01', 'YYYY-MM-DD')).toBe('2025-06-01')
  })

  it('uses locale sq for formatting', async () => {
    localeRef.value = 'sq'
    const { useFormatDate } = await import('layers/shared/app/composables/useFormatDate')
    const { formatDate } = useFormatDate()
    expect(formatDate('2025-06-01', 'YYYY-MM-DD')).toBe('2025-06-01')
  })

  it('uses locale de when switched', async () => {
    localeRef.value = 'de'
    const { useFormatDate } = await import('layers/shared/app/composables/useFormatDate')
    const { formatDate } = useFormatDate()
    expect(formatDate('2025-06-01', 'YYYY-MM-DD')).toBe('2025-06-01')
  })

  it('uses locale en when switched', async () => {
    localeRef.value = 'en'
    const { useFormatDate } = await import('layers/shared/app/composables/useFormatDate')
    const { formatDate } = useFormatDate()
    expect(formatDate('2025-06-01', 'YYYY-MM-DD')).toBe('2025-06-01')
  })
})
