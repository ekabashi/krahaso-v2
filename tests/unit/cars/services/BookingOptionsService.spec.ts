import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BookingOptionsService } from '../../../../layers/cars/server/services/booking/BookingOptionsService'

describe('BookingOptionsService', () => {
  const mockClient = {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
    })),
  } as unknown as import('@supabase/supabase-js').SupabaseClient

  let service: BookingOptionsService

  beforeEach(() => {
    vi.clearAllMocks()
    service = new BookingOptionsService(mockClient)
  })

  describe('getOptions (mapRowToOptions behavior)', () => {
    it('maps null/undefined prices to 0', async () => {
      const row = {
        id: 1,
        tenant_id: 10,
        second_driver: true,
        second_driver_price: null,
        gps_navigation: true,
        gps_navigation_price: undefined,
        maksikos: false,
        maksikos_price: null,
        green_card: false,
        green_card_price: null,
        european_card: false,
        european_card_price: null,
        road_assistance: false,
        road_assistance_price: null,
        out_of_kosovo: false,
        out_of_kosovo_price: null,
      }
      ;(mockClient as unknown as { from: ReturnType<typeof vi.fn> }).from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: row, error: null }),
          })),
        })),
      }))

      const result = await service.getOptions(10)
      expect(result.tenant_id).toBe(10)
      expect(result.second_driver_price).toBe(0)
      expect(result.gps_navigation_price).toBe(0)
      expect(result.maksikos_price).toBe(0)
      expect(result.green_card_price).toBe(0)
      expect(result.european_card_price).toBe(0)
      expect(result.road_assistance_price).toBe(0)
      expect(result.out_of_kosovo_price).toBe(0)
    })

    it('maps all row fields correctly', async () => {
      const row = {
        id: 2,
        tenant_id: 20,
        second_driver: true,
        second_driver_price: 5,
        gps_navigation: true,
        gps_navigation_price: 10,
        maksikos: true,
        maksikos_price: 15,
        green_card: false,
        green_card_price: null,
        european_card: false,
        european_card_price: null,
        road_assistance: true,
        road_assistance_price: 20,
        out_of_kosovo: false,
        out_of_kosovo_price: null,
      }
      ;(mockClient as unknown as { from: ReturnType<typeof vi.fn> }).from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: row, error: null }),
          })),
        })),
      }))

      const result = await service.getOptions(20)
      expect(result.id).toBe(2)
      expect(result.second_driver).toBe(true)
      expect(result.second_driver_price).toBe(5)
      expect(result.gps_navigation_price).toBe(10)
      expect(result.road_assistance_price).toBe(20)
    })
  })
})
