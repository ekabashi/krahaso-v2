export interface Airport {
  id: string
  code: string
  name: string
  city?: string
  country: string
}

export interface Flight {
  id: string
  providerId: string
  flightNumber: string
  legType: 'outbound' | 'return'
  origin: Airport
  destination: Airport
  departureDate: string
  departureTime: string
  arrivalDate: string
  arrivalTime: string
  duration: number
  basePrice: number
  taxPrice: number
  totalPrice: number
  currency: string
  seatsAvailable: number
  available: boolean
  operatingCarrier: string
  marketingCarrier?: string
  cabinClass: string
  aircraft?: string
  stops: number
  bookingUrl?: string
}

export interface PassengerCounts {
  adults: number
  children: number
  infants: number
}

export interface FlightSearchParams {
  origin: string
  destination: string
  departureDate: string
  returnDate?: string
  passengers: PassengerCounts
  cabinClass: 'Economy' | 'Business' | 'First'
}

export interface FlightSearchResult {
  flights: Flight[]
  outboundFlights: Flight[]
  returnFlights?: Flight[]
  meta: {
    origin: string
    destination: string
    departureDate: string
    returnDate?: string
    passengers: PassengerCounts
    totalResults: number
    outboundResults: number
    returnResults: number
    providers: string[]
    cacheHit: boolean
    searchedAt: string
  }
}

export type SortBy = 'price' | 'duration' | 'departure'
export type SortOrder = 'asc' | 'desc'
export type TripType = 'oneway' | 'roundtrip'
export type CabinClass = 'Economy' | 'Business' | 'First'

export interface FlightFilters {
  maxPrice: number | null
  maxStops: number | null
  carriers: string[]
  providers: string[]
  flightNumbers: string[]
  departureTimeRange: [number, number] | null
  hideSoldOut: boolean
}

export interface DatePriceInfo {
  date: string
  minPrice: number | null
  flightCount: number
  currency: string
  isCached: boolean
  isLoading: boolean
}

export interface FlexibleSearchResult {
  outbound: DatePriceInfo[]
  return?: DatePriceInfo[]
  cheapestOutboundDate: string | null
  cheapestReturnDate?: string | null
}
