import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { IFlightProvider } from '../../../../layers/flights/server/types/provider'
import { ProviderRegistry } from '../../../../layers/flights/server/providers/registry'

function fakeProvider(id: string, name: string, priority: number): IFlightProvider {
  return {
    id,
    name,
    priority,
    getAirports: vi.fn().mockResolvedValue([]),
    getRoutes: vi.fn().mockResolvedValue([]),
    searchFlights: vi.fn().mockResolvedValue([]),
    syncAirports: vi.fn().mockResolvedValue(0),
    syncRoutes: vi.fn().mockResolvedValue(0),
    syncFlights: vi.fn().mockResolvedValue(0),
    getHealth: vi.fn().mockResolvedValue({
      isHealthy: true,
      lastSuccessfulSync: null,
      lastError: null,
      totalFlights: 0,
      totalAirports: 0,
      totalRoutes: 0,
    }),
  }
}

describe('flights/server/providers/registry', () => {
  let registry: ProviderRegistry

  beforeEach(() => {
    registry = new ProviderRegistry()
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  describe('register', () => {
    it('does not allow duplicate id', () => {
      const p1 = fakeProvider('p1', 'Provider 1', 1)
      registry.register(p1)
      registry.register(fakeProvider('p1', 'Other', 2))
      expect(registry.getIds()).toEqual(['p1'])
      expect(registry.get('p1')?.name).toBe('Provider 1')
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('already registered'))
    })
  })

  describe('getAll', () => {
    it('returns providers sorted by priority', () => {
      registry.register(fakeProvider('c', 'C', 30))
      registry.register(fakeProvider('a', 'A', 10))
      registry.register(fakeProvider('b', 'B', 20))
      const all = registry.getAll()
      expect(all.map((p) => p.id)).toEqual(['a', 'b', 'c'])
      expect(all[0].priority).toBe(10)
    })
  })

  describe('get', () => {
    it('returns provider by id', () => {
      const p = fakeProvider('x', 'X', 1)
      registry.register(p)
      expect(registry.get('x')).toBe(p)
      expect(registry.get('missing')).toBeUndefined()
    })
  })

  describe('has', () => {
    it('returns true when provider registered', () => {
      registry.register(fakeProvider('id1', 'N', 1))
      expect(registry.has('id1')).toBe(true)
      expect(registry.has('id2')).toBe(false)
    })
  })

  describe('getIds', () => {
    it('returns all registered ids', () => {
      registry.register(fakeProvider('a', 'A', 1))
      registry.register(fakeProvider('b', 'B', 2))
      expect(registry.getIds()).toEqual(expect.arrayContaining(['a', 'b']))
      expect(registry.getIds().length).toBe(2)
    })
  })
})
