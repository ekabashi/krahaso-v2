import { describe, it, expect, vi } from 'vitest'

vi.mock('../../../../layers/flights/server/database/client', () => ({ db: {} }))

describe('flights/server/database/queries', () => {
  describe('generateSearchHash', () => {
    it('is deterministic: same input -> same hash', async () => {
      const { generateSearchHash } = await import('../../../../layers/flights/server/database/queries')
      const params = {
        origin: 'PRN',
        destination: 'VIE',
        departureDate: '2025-06-01',
        passengers: 2,
      }
      const h1 = generateSearchHash(params)
      const h2 = generateSearchHash(params)
      expect(h1).toBe(h2)
      expect(h1).toMatch(/^[a-f0-9]{32}$/)
    })

    it('different passengers -> different hash', async () => {
      const { generateSearchHash } = await import('../../../../layers/flights/server/database/queries')
      const base = { origin: 'PRN', destination: 'VIE', departureDate: '2025-06-01', passengers: 1 }
      const h1 = generateSearchHash(base)
      const h2 = generateSearchHash({ ...base, passengers: 2 })
      expect(h1).not.toBe(h2)
    })

    it('different date -> different hash', async () => {
      const { generateSearchHash } = await import('../../../../layers/flights/server/database/queries')
      const h1 = generateSearchHash({
        origin: 'PRN',
        destination: 'VIE',
        departureDate: '2025-06-01',
        passengers: 1,
      })
      const h2 = generateSearchHash({
        origin: 'PRN',
        destination: 'VIE',
        departureDate: '2025-06-02',
        passengers: 1,
      })
      expect(h1).not.toBe(h2)
    })
  })
})
