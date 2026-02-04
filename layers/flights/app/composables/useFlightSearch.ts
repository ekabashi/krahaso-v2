import type { CalendarDate } from '@internationalized/date'
import type {
  Airport,
  FlightSearchResult,
  SortBy,
  SortOrder,
  TripType,
  CabinClass,
  FlightFilters
} from '~/types/flight'

export interface FlightSearchState {
  origin: Airport | null
  destination: Airport | null
  departureDate: CalendarDate | null
  returnDate: CalendarDate | null
  passengers: { adults: number, children: number, infants: number }
  cabinClass: CabinClass
  tripType: TripType
  flexibleDates: boolean
}

function formatCalendarDate(date: CalendarDate): string {
  const year = date.year
  const month = String(date.month).padStart(2, '0')
  const day = String(date.day).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function useFlightSearch() {
  const router = useRouter()
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

  const results = useState<FlightSearchResult | null>('flight-results', () => null)
  const isSearching = ref(false)
  const searchError = ref<string | null>(null)
  const sortBy = ref<SortBy>('price')
  const sortOrder = ref<SortOrder>('asc')
  const filters = ref<FlightFilters>({
    maxPrice: null,
    maxStops: null,
    carriers: [],
    providers: [],
    flightNumbers: [],
    departureTimeRange: null,
    hideSoldOut: false
  })

  async function search(): Promise<boolean> {
    if (!searchState.value.origin || !searchState.value.destination || !searchState.value.departureDate) {
      searchError.value = 'Please fill all required fields'
      return false
    }
    await navigateToFlightsSearch()
    return true
  }

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

  async function navigateToFlightsSearch(): Promise<void> {
    const queryParams = buildFlightQueryFromState()
    const localePath = useLocalePath()
    const path = localePath('/flights')
    await router.push({ path, query: queryParams })
  }

  function swapAirports(): void {
    const temp = searchState.value.origin
    searchState.value.origin = searchState.value.destination
    searchState.value.destination = temp
  }

  function clearResults(): void {
    results.value = null
    searchError.value = null
  }

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

  const filteredResults = computed(() => {
    if (!results.value) return null
    let flights = [...results.value.flights]

    if (filters.value.hideSoldOut) {
      flights = flights.filter(f => f.available)
    }

    if (filters.value.maxPrice !== null) {
      flights = flights.filter(f => f.totalPrice <= filters.value.maxPrice!)
    }

    if (filters.value.maxStops !== null) {
      flights = flights.filter(f => f.stops <= filters.value.maxStops!)
    }

    if (filters.value.carriers.length > 0) {
      flights = flights.filter(f => filters.value.carriers.includes(f.operatingCarrier))
    }

    if (filters.value.providers.length > 0) {
      flights = flights.filter(f => filters.value.providers.includes(f.providerId))
    }

    if (filters.value.flightNumbers.length > 0) {
      flights = flights.filter(f => filters.value.flightNumbers.includes(f.flightNumber))
    }

    const multiplier = sortOrder.value === 'asc' ? 1 : -1
    flights.sort((a, b) => {
      switch (sortBy.value) {
        case 'price':
          return (a.totalPrice - b.totalPrice) * multiplier
        case 'duration':
          return ((a.duration || 0) - (b.duration || 0)) * multiplier
        case 'departure':
          return a.departureTime.localeCompare(b.departureTime) * multiplier
        default:
          return 0
      }
    })

    return {
      ...results.value,
      flights
    }
  })

  const isRoundTrip = computed(() => searchState.value.tripType === 'roundtrip')

  return {
    searchState,
    results,
    isSearching,
    searchError,
    sortBy,
    sortOrder,
    filters,
    filteredResults,
    isRoundTrip,
    search,
    buildFlightQueryFromState,
    navigateToFlightsSearch,
    swapAirports,
    clearResults,
    resetFilters
  }
}
