import type { Airport } from '~/types/flight'

export function useAirports() {
  const airports = useState<Airport[]>('airports', () => [])
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const isInitialized = useState('airports-initialized', () => false)

  async function fetchAirports(): Promise<Airport[]> {
    if (isLoading.value) return airports.value

    isLoading.value = true
    error.value = null

    try {
      const response = await $fetch<{ airports: Airport[], total: number }>('/api/airports', {
        query: { limit: 500 }
      })
      airports.value = response.airports || []
      isInitialized.value = true
      return airports.value
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load airports'
      return []
    } finally {
      isLoading.value = false
    }
  }

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

  async function getAirportByCode(code: string): Promise<Airport | null> {
    const cached = airports.value.find(a => a.code === code.toUpperCase())
    if (cached) return cached

    try {
      const data = await $fetch<Airport>(`/api/airports/${code.toUpperCase()}`)
      return data || null
    } catch {
      return null
    }
  }

  const popularAirports = computed(() => {
    const popularCodes = ['PRN', 'DUS', 'FRA', 'MUC', 'ZRH', 'VIE', 'STR', 'CGN', 'HAM', 'BSL']
    const filtered = airports.value.filter(a => popularCodes.includes(a.code))
    return filtered.sort((a, b) => popularCodes.indexOf(a.code) - popularCodes.indexOf(b.code))
  })

  const kosovoAirports = computed(() => {
    return airports.value.filter(a => a.country === 'KS')
  })

  const germanAirports = computed(() => {
    return airports.value.filter(a => a.country === 'DE')
  })

  const swissAirports = computed(() => {
    return airports.value.filter(a => a.country === 'CH')
  })

  if (!isInitialized.value) {
    fetchAirports()
  }

  return {
    airports,
    isLoading,
    error,
    popularAirports,
    kosovoAirports,
    germanAirports,
    swissAirports,
    fetchAirports,
    searchAirports,
    getAirportByCode
  }
}
