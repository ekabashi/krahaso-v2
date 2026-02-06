import type { Airport } from '~/types/flight'

/**
 * Composable for airport data management
 */
export function useAirports() {
  const airports = useState<Airport[]>('airports', () => [])
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const isInitialized = useState('airports-initialized', () => false)

  /**
   * Fetch all airports
   */
  async function fetchAirports(): Promise<Airport[]> {
    if (isLoading.value) return airports.value

    isLoading.value = true
    error.value = null

    try {
      // Fetch all airports (no limit)
      const response = await $fetch<{ airports: Airport[], total: number }>('/api/airports', {
        query: { limit: 500 }
      })
      airports.value = response.airports || []
      isInitialized.value = true
      return airports.value
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Fehler beim Laden der Flughäfen'
      return []
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Search airports by query (for autocomplete)
   */
  async function searchAirports(query: string): Promise<Airport[]> {
    if (query.length < 2) return popularAirports.value

    try {
      const response = await $fetch<{ airports: Airport[], total: number }>('/api/airports', {
        query: { q: query, limit: 10 }
      })
      return response.airports || []
    } catch {
      return []
    }
  }

  /**
   * Get airport by code
   */
  async function getAirportByCode(code: string): Promise<Airport | null> {
    // First check local cache
    const cached = airports.value.find(a => a.code === code)
    if (cached) return cached

    // Fetch from API
    try {
      const data = await $fetch<Airport>(`/api/airports/${code}`)
      return data || null
    } catch {
      return null
    }
  }

  /**
   * Popular airports for Kosovo flights
   */
  const popularAirports = computed(() => {
    const popularCodes = ['PRN', 'DUS', 'FRA', 'MUC', 'ZRH', 'VIE', 'STR', 'CGN', 'HAM', 'BSL']
    const filtered = airports.value.filter(a => popularCodes.includes(a.code))
    // Sort by popularity order
    return filtered.sort((a, b) => popularCodes.indexOf(a.code) - popularCodes.indexOf(b.code))
  })

  /**
   * Kosovo airports
   */
  const kosovoAirports = computed(() => {
    return airports.value.filter(a => a.country === 'KS')
  })

  /**
   * German airports
   */
  const germanAirports = computed(() => {
    return airports.value.filter(a => a.country === 'DE')
  })

  /**
   * Swiss airports
   */
  const swissAirports = computed(() => {
    return airports.value.filter(a => a.country === 'CH')
  })

  // Initialize airports on first use (client-side only)
  if (!isInitialized.value) {
    fetchAirports()
  }

  return {
    // State
    airports,
    isLoading,
    error,

    // Computed
    popularAirports,
    kosovoAirports,
    germanAirports,
    swissAirports,

    // Actions
    fetchAirports,
    searchAirports,
    getAirportByCode
  }
}
