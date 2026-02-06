import type { CalendarDate } from '@internationalized/date'
import type {
  Airport,
  Flight,
  FlightSearchResult,
  FlexibleSearchResult,
  DatePriceInfo,
  SortBy,
  SortOrder,
  TripType,
  CabinClass,
  FlightFilters
} from '~/types/flight'

/**
 * Passenger counts
 */
export interface PassengerCounts {
  adults: number
  children: number
  infants: number
}

/**
 * Search state interface
 */
export interface FlightSearchState {
  origin: Airport | null
  destination: Airport | null
  departureDate: CalendarDate | null
  returnDate: CalendarDate | null
  passengers: PassengerCounts
  cabinClass: CabinClass
  tripType: TripType
  flexibleDates: boolean
}

/**
 * Main composable for flight search functionality
 */
export function useFlightSearch() {
  const route = useRoute()
  const { startSearch: startFlightAnalyticsSearch } = useFlightAnalytics()
  const { trackSearchSubmitted, trackResultsViewed } = useAnalytics()

  // Search form state
  const searchState = useState<FlightSearchState>('flight-search', () => ({
    origin: null,
    destination: null,
    departureDate: null,
    returnDate: null,
    passengers: { adults: 1, children: 0, infants: 0 },
    cabinClass: 'Economy',
    tripType: 'roundtrip',
    flexibleDates: false
  }))

  // Don't set default dates here - let pages handle it
  // This prevents race conditions with query param parsing

  // Results state
  const results = useState<FlightSearchResult | null>('flight-results', () => null)
  const flexibleResults = useState<FlexibleSearchResult | null>('flexible-results', () => null)
  const isSearching = ref(false)
  const isSearchingFlexible = ref(false)
  const searchError = ref<string | null>(null)

  // Sort state
  const sortBy = ref<SortBy>('price')
  const sortOrder = ref<SortOrder>('asc')

  // Filter state
  const filters = ref<FlightFilters>({
    maxPrice: null,
    maxStops: null,
    carriers: [],
    providers: [],
    flightNumbers: [],
    departureTimeRange: null,
    hideSoldOut: false
  })

  /**
   * Normalize carrier names (merge variants like "GP-Aviation" and "GP Aviation", "ENTER AIR" and "Enter Air")
   */
  function normalizeCarrier(carrier: string): string {
    // Normalize to lowercase without spaces/hyphens for comparison
    const normalized = carrier.toLowerCase().replace(/[-\s]/g, '')

    // Known carrier name mappings
    const carrierMappings: Record<string, string> = {
      gpaviation: 'GP Aviation',
      enterair: 'Enter Air',
      eurowings: 'Eurowings'
    }

    return carrierMappings[normalized] || carrier
  }

  /**
   * Normalize flight numbers (merge variants like "E4 6063" and "E46063")
   * Format: "XX 1234" (airline code + space + number)
   * IATA codes are 2 chars: 2 letters (EW), letter+digit (E4), or digit+letter (3K)
   */
  function normalizeFlightNumber(flightNumber: string): string {
    // Remove all spaces first
    const noSpaces = flightNumber.replace(/\s+/g, '')
    // Match 2-char airline code (2 letters, letter+digit, or digit+letter) + flight number
    const match = noSpaces.match(/^([A-Z]{2}|[A-Z]\d|\d[A-Z])(\d+)$/i)
    if (match && match[1] && match[2]) {
      return `${match[1].toUpperCase()} ${match[2]}`
    }
    return flightNumber
  }

  /**
   * Execute flight search
   */
  async function search(options?: { forceFresh?: boolean }): Promise<boolean> {
    // Validate required fields
    if (!searchState.value.origin || !searchState.value.destination || !searchState.value.departureDate) {
      searchError.value = 'Bitte fülle alle Pflichtfelder aus'
      return false
    }

    isSearching.value = true
    searchError.value = null
    results.value = null

    // Track search initiation (flight funnel + dataLayer for GTM)
    startFlightAnalyticsSearch({
      origin: searchState.value.origin.code,
      destination: searchState.value.destination.code,
      departureDate: formatCalendarDate(searchState.value.departureDate),
      returnDate: searchState.value.tripType === 'roundtrip' && searchState.value.returnDate
        ? formatCalendarDate(searchState.value.returnDate)
        : undefined,
      adults: searchState.value.passengers.adults,
      children: searchState.value.passengers.children,
      infants: searchState.value.passengers.infants,
    })
    trackSearchSubmitted('flight', {
      form_source: 'krahaso_flight_search',
      route_path: route.path,
      from: searchState.value.origin.code,
      to: searchState.value.destination.code,
      departureDate: formatCalendarDate(searchState.value.departureDate),
      returnDate:
        searchState.value.tripType === 'roundtrip' && searchState.value.returnDate
          ? formatCalendarDate(searchState.value.returnDate)
          : undefined,
      tripType: searchState.value.tripType,
      passengers:
        searchState.value.passengers.adults +
        searchState.value.passengers.children +
        searchState.value.passengers.infants,
      flexibleDates: searchState.value.flexibleDates,
    })

    try {
      const data = await $fetch<FlightSearchResult>('/api/flights/search', {
        method: 'POST',
        body: {
          origin: searchState.value.origin.code,
          destination: searchState.value.destination.code,
          departureDate: formatCalendarDate(searchState.value.departureDate),
          returnDate: searchState.value.tripType === 'roundtrip' && searchState.value.returnDate
            ? formatCalendarDate(searchState.value.returnDate)
            : undefined,
          adults: searchState.value.passengers.adults,
          children: searchState.value.passengers.children,
          infants: searchState.value.passengers.infants,
          cabinClass: searchState.value.cabinClass,
          sortBy: sortBy.value,
          sortOrder: sortOrder.value,
          forceFresh: options?.forceFresh ? true : undefined
        }
      })

      results.value = data

      const count = data?.flights?.length ?? 0
      trackResultsViewed('flight', count)

      // Sync flexible matrix with actual search results
      syncFlexibleWithResults(data)

      return true
    } catch (error) {
      searchError.value = error instanceof Error ? error.message : 'Suche fehlgeschlagen'
      results.value = null
      return false
    } finally {
      isSearching.value = false
    }
  }

  /**
   * Sync flexible matrix prices with actual search results
   * This ensures the matrix shows the correct price from fresh search data
   */
  function syncFlexibleWithResults(data: FlightSearchResult): void {
    if (!flexibleResults.value || !searchState.value.departureDate) return

    const currentDate = formatCalendarDate(searchState.value.departureDate)

    // Calculate actual minPrice from outbound flights
    const availableOutbound = data.flights.filter(f =>
      f.legType === 'outbound' && f.available && f.totalPrice > 0
    )
    const actualOutboundMinPrice = availableOutbound.length > 0
      ? Math.min(...availableOutbound.map(f => f.totalPrice))
      : null

    // Update the outbound date entry
    const outboundEntry = flexibleResults.value.outbound.find(d => d.date === currentDate)
    if (outboundEntry && actualOutboundMinPrice !== null) {
      outboundEntry.minPrice = actualOutboundMinPrice
      outboundEntry.flightCount = availableOutbound.length
    }

    // Update cheapest date if needed
    if (actualOutboundMinPrice !== null) {
      const allWithPrices = flexibleResults.value.outbound.filter(d => d.minPrice !== null)
      if (allWithPrices.length > 0) {
        const cheapest = allWithPrices.reduce((min, d) =>
          (d.minPrice! < min.minPrice!) ? d : min
        )
        flexibleResults.value.cheapestOutboundDate = cheapest.date
      }
    }

    // Handle return flights if roundtrip
    if (searchState.value.tripType === 'roundtrip' && searchState.value.returnDate && flexibleResults.value.return) {
      const returnDate = formatCalendarDate(searchState.value.returnDate)

      const availableReturn = data.flights.filter(f =>
        f.legType === 'return' && f.available && f.totalPrice > 0
      )
      const actualReturnMinPrice = availableReturn.length > 0
        ? Math.min(...availableReturn.map(f => f.totalPrice))
        : null

      const returnEntry = flexibleResults.value.return.find(d => d.date === returnDate)
      if (returnEntry && actualReturnMinPrice !== null) {
        returnEntry.minPrice = actualReturnMinPrice
        returnEntry.flightCount = availableReturn.length
      }

      // Update cheapest return date if needed
      if (actualReturnMinPrice !== null) {
        const allReturnWithPrices = flexibleResults.value.return.filter(d => d.minPrice !== null)
        if (allReturnWithPrices.length > 0) {
          const cheapestReturn = allReturnWithPrices.reduce((min, d) =>
            (d.minPrice! < min.minPrice!) ? d : min
          )
          flexibleResults.value.cheapestReturnDate = cheapestReturn.date
        }
      }
    }
  }

  /**
   * Execute flexible date search (±3 days around selected date)
   */
  async function searchFlexible(): Promise<boolean> {
    // Validate required fields
    if (!searchState.value.origin || !searchState.value.destination || !searchState.value.departureDate) {
      searchError.value = 'Bitte fülle alle Pflichtfelder aus'
      return false
    }

    isSearchingFlexible.value = true
    searchError.value = null
    flexibleResults.value = null

    try {
      const response = await $fetch<{
        outbound: { dates: DatePriceInfo[], cheapestDate: string | null }
        return?: { dates: DatePriceInfo[], cheapestDate: string | null }
        meta: { fromCache: number, searchedAt: string }
      }>('/api/flights/flexible-search', {
        method: 'POST',
        body: {
          origin: searchState.value.origin.code,
          destination: searchState.value.destination.code,
          departureDate: formatCalendarDate(searchState.value.departureDate),
          returnDate: searchState.value.tripType === 'roundtrip' && searchState.value.returnDate
            ? formatCalendarDate(searchState.value.returnDate)
            : undefined,
          dateRange: 3,
          adults: searchState.value.passengers.adults,
          children: searchState.value.passengers.children,
          infants: searchState.value.passengers.infants,
          cabinClass: searchState.value.cabinClass
        }
      })

      flexibleResults.value = {
        outbound: response.outbound.dates,
        return: response.return?.dates,
        cheapestOutboundDate: response.outbound.cheapestDate,
        cheapestReturnDate: response.return?.cheapestDate
      }

      return true
    } catch (error) {
      searchError.value = error instanceof Error ? error.message : 'Flexible Suche fehlgeschlagen'
      flexibleResults.value = null
      return false
    } finally {
      isSearchingFlexible.value = false
    }
  }

  /**
   * Apply filters to a list of flights
   */
  function applyFilters(flights: Flight[]): Flight[] {
    let filtered = [...flights]

    // Filter sold out flights (hide when checkbox is checked)
    if (filters.value.hideSoldOut) {
      filtered = filtered.filter(f => f.available)
    }

    // Apply filters
    if (filters.value.maxPrice !== null) {
      filtered = filtered.filter(f => f.totalPrice <= filters.value.maxPrice!)
    }

    if (filters.value.maxStops !== null) {
      filtered = filtered.filter(f => f.stops <= filters.value.maxStops!)
    }

    if (filters.value.carriers.length > 0) {
      filtered = filtered.filter(f => filters.value.carriers.includes(normalizeCarrier(f.operatingCarrier)))
    }

    if (filters.value.providers.length > 0) {
      filtered = filtered.filter(f => filters.value.providers.includes(f.providerId))
    }

    if (filters.value.flightNumbers.length > 0) {
      filtered = filtered.filter(f => filters.value.flightNumbers.includes(normalizeFlightNumber(f.flightNumber)))
    }

    if (filters.value.departureTimeRange) {
      const [minHour, maxHour] = filters.value.departureTimeRange
      filtered = filtered.filter((f) => {
        const hourStr = f.departureTime.split(':')[0] ?? '0'
        const hour = parseInt(hourStr, 10)
        return hour >= minHour && hour <= maxHour
      })
    }

    // Apply sorting
    const multiplier = sortOrder.value === 'asc' ? 1 : -1
    filtered.sort((a, b) => {
      switch (sortBy.value) {
        case 'price':
          return (a.totalPrice - b.totalPrice) * multiplier
        case 'duration':
          return (a.duration - b.duration) * multiplier
        case 'departure':
          return a.departureTime.localeCompare(b.departureTime) * multiplier
        default:
          return 0
      }
    })

    return filtered
  }

  /**
   * Filtered and sorted results (all flights)
   */
  const filteredResults = computed(() => {
    if (!results.value?.flights) return []
    return applyFilters(results.value.flights)
  })

  /**
   * Filtered outbound flights
   */
  const filteredOutboundFlights = computed(() => {
    if (!results.value?.outboundFlights) return []
    return applyFilters(results.value.outboundFlights)
  })

  /**
   * Filtered return flights
   */
  const filteredReturnFlights = computed(() => {
    if (!results.value?.returnFlights) return []
    return applyFilters(results.value.returnFlights)
  })

  /**
   * Is this a roundtrip search?
   */
  const isRoundTrip = computed(() => {
    return !!results.value?.meta?.returnDate
  })

  /**
   * Available carriers from results (for filter options)
   * Normalizes carrier names to merge variants (e.g., "GP-Aviation" and "GP Aviation")
   */
  const availableCarriers = computed(() => {
    if (!results.value?.flights) return []
    const carriers = new Set(results.value.flights.map(f => normalizeCarrier(f.operatingCarrier)))
    return Array.from(carriers).sort()
  })

  /**
   * Available flight numbers from results (for filter options)
   * Normalizes flight numbers to merge variants (e.g., "E46063" and "E4 6063")
   */
  const availableFlightNumbers = computed(() => {
    if (!results.value?.flights) return []
    const flightNumbers = new Set(results.value.flights.map(f => normalizeFlightNumber(f.flightNumber)))
    return Array.from(flightNumbers).sort()
  })

  /**
   * Available providers from results (for filter options)
   */
  const availableProviders = computed(() => {
    if (!results.value?.meta?.providers) return []
    return results.value.meta.providers.map(id => ({
      id,
      name: getProviderName(id)
    }))
  })

  /**
   * Get display name for provider
   */
  function getProviderName(id: string): string {
    const names: Record<string, string> = {
      airprishtina: 'AirPrishtina',
      kosovafly: 'KosovaFly',
      dituria: 'Dituria',
      erifly: 'EriFly',
      airtiketa: 'AirTiketa',
      prishtinaticket: 'Prishtina Ticket',
      flyksa: 'FlyKSA'
    }
    return names[id] || id
  }

  /**
   * Price range from results
   */
  const priceRange = computed(() => {
    if (!results.value?.flights || results.value.flights.length === 0) {
      return { min: 0, max: 1000 }
    }
    const prices = results.value.flights.map(f => f.totalPrice)
    return {
      min: Math.floor(Math.min(...prices)),
      max: Math.ceil(Math.max(...prices))
    }
  })

  /**
   * Swap origin and destination
   */
  function swapAirports(): void {
    const temp = searchState.value.origin
    searchState.value.origin = searchState.value.destination
    searchState.value.destination = temp
  }

  /**
   * Reset all filters
   */
  function resetFilters(): void {
    filters.value = {
      maxPrice: null,
      maxStops: null,
      carriers: [],
      providers: [],
      flightNumbers: [],
      departureTimeRange: null,
      hideSoldOut: false
    }
  }

  /**
   * Clear search results
   */
  function clearResults(): void {
    results.value = null
    searchError.value = null
  }

  /**
   * Build flight query parameters from current search state
   */
  function buildFlightQueryFromState(): Record<string, string> {
    const q: Record<string, string> = {}
    if (searchState.value.origin) q.from = searchState.value.origin.code
    if (searchState.value.destination) q.to = searchState.value.destination.code
    if (searchState.value.departureDate) {
      q.date = formatCalendarDate(searchState.value.departureDate)
    }
    if (searchState.value.tripType === 'roundtrip' && searchState.value.returnDate) {
      q.returnDate = formatCalendarDate(searchState.value.returnDate)
    }
    if (searchState.value.passengers.adults) q.adults = String(searchState.value.passengers.adults)
    if (searchState.value.passengers.children) q.children = String(searchState.value.passengers.children)
    if (searchState.value.passengers.infants) q.infants = String(searchState.value.passengers.infants)
    if (searchState.value.flexibleDates) q.flexibleDates = 'true'
    return q
  }

  /**
   * Navigate to flight search page with current search parameters (keeps current locale)
   */
  async function navigateToFlightsSearch(): Promise<void> {
    const router = useRouter()
    const localePath = useLocalePath()
    const path = localePath('/fluturime/search')
    const queryParams = buildFlightQueryFromState()
    if (import.meta.client) {
      const url = router.resolve({ path, query: queryParams }).href
      await navigateTo(url, { external: true })
    } else {
      await router.push({ path, query: queryParams })
    }
  }

  return {
    // State
    searchState,
    results,
    flexibleResults,
    isSearching,
    isSearchingFlexible,
    searchError,
    sortBy,
    sortOrder,
    filters,

    // Computed
    filteredResults,
    filteredOutboundFlights,
    filteredReturnFlights,
    isRoundTrip,
    availableCarriers,
    availableFlightNumbers,
    availableProviders,
    priceRange,

    // Actions
    search,
    searchFlexible,
    swapAirports,
    resetFilters,
    clearResults,
    buildFlightQueryFromState,
    navigateToFlightsSearch
  }
}

/**
 * Format CalendarDate to YYYY-MM-DD string for API
 */
function formatCalendarDate(date: CalendarDate): string {
  const year = date.year
  const month = String(date.month).padStart(2, '0')
  const day = String(date.day).padStart(2, '0')
  return `${year}-${month}-${day}`
}
