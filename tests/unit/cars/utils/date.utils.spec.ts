import { describe, it, expect } from 'vitest'
import { getDaysDifference } from '../../../../layers/cars/server/utils/date.utils'

describe('cars/server/utils/date.utils', () => {
  describe('getDaysDifference', () => {
    it('returns 1 when 0h diff (same day)', () => {
      const d = '2025-06-01'
      expect(getDaysDifference(d, d)).toBe(1)
    })

    it('returns fullDays when remaining hours < 3', () => {
      // 24h = 1 full day, 0 remaining -> returns fullDays || 1 => 1
      expect(getDaysDifference('2025-06-01', '2025-06-02')).toBe(1)
      // 48h + 2h = 2 full days, 2 remaining (< 3) -> returns 2
      expect(getDaysDifference('2025-06-01T00:00:00', '2025-06-03T02:00:00')).toBe(2)
      // 24h + 1h -> fullDays=1, remaining 1 < 3 -> returns 1
      expect(getDaysDifference('2025-06-01T00:00:00', '2025-06-02T01:00:00')).toBe(1)
    })

    it('returns fullDays + 1 when remaining hours >= 3', () => {
      // 24h + 3h -> fullDays=1, remaining 3 >= 3 -> returns 2
      expect(getDaysDifference('2025-06-01T00:00:00', '2025-06-02T03:00:00')).toBe(2)
      // 48h + 5h -> fullDays=2, remaining 5 >= 3 -> returns 3
      expect(getDaysDifference('2025-06-01T00:00:00', '2025-06-03T05:00:00')).toBe(3)
    })
  })
})
