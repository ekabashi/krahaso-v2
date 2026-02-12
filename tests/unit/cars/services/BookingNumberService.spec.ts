import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BookingNumberService } from '../../../../layers/cars/server/services/booking/BookingNumberService'

describe('BookingNumberService', () => {
  const mockClient = {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(),
        })),
      })),
    })),
  } as unknown as import('@supabase/supabase-js').SupabaseClient

  let service: BookingNumberService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new BookingNumberService(mockClient)
  })

  describe('isValidBookingNumber', () => {
    it('returns true for valid format <tenantId>-<8 alphanumeric>', () => {
      expect(service.isValidBookingNumber('1-ABCD1234')).toBe(true)
      expect(service.isValidBookingNumber('99-12345678')).toBe(true)
    })

    it('returns false for invalid format', () => {
      expect(service.isValidBookingNumber('1-ABC')).toBe(false)   // too short
      expect(service.isValidBookingNumber('1-abcdefgh')).toBe(false) // lowercase
      expect(service.isValidBookingNumber('x-ABCD1234')).toBe(false) // non-numeric tenant
      expect(service.isValidBookingNumber('')).toBe(false)
    })
  })

  describe('extractTenantId', () => {
    it('returns tenant id for valid booking number', () => {
      expect(service.extractTenantId('1-ABCD1234')).toBe(1)
      expect(service.extractTenantId('42-XY987654')).toBe(42)
    })

    it('returns null for invalid format', () => {
      expect(service.extractTenantId('invalid')).toBe(null)
      expect(service.extractTenantId('1-2-3')).toBe(null)
      expect(service.extractTenantId('x-ABCD1234')).toBe(null)
    })
  })

  describe('generateUniqueBookingNumber', () => {
    it('returns format <tenantId>-<8 chars> and retries until unique', async () => {
      const maybeSingle = vi
        .fn()
        .mockResolvedValueOnce({ data: { id: 1 } })  // exists
        .mockResolvedValueOnce({ data: null })       // unique
      ;(mockClient as unknown as { from: ReturnType<typeof vi.fn> }).from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({ maybeSingle })),
        })),
      }))

      const result = await service.generateUniqueBookingNumber(5)
      expect(result).toMatch(/^5-[A-Z0-9]{8}$/)
      expect(maybeSingle).toHaveBeenCalledTimes(2)
    })
  })
})
