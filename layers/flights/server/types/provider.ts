/**
 * Core TypeScript interfaces for the flight provider system
 */

// =============================================================================
// Airport & Route Types
// =============================================================================

export interface Airport {
  id: string
  code: string // IATA code (e.g., "PRN", "DUS")
  name: string
  city?: string
  country: string
  latitude?: number
  longitude?: number
  timezone?: string
}

export interface FlightRoute {
  originCode: string
  destinationCode: string
}

// =============================================================================
// Flight Types
// =============================================================================

export interface Flight {
  id: string // Provider-specific unique ID
  providerId: string // Which provider this came from
  flightNumber: string // e.g., "EW5702"
  legType: 'outbound' | 'return' // Outbound (Hinflug) or Return (Rückflug)
  origin: Airport
  destination: Airport
  departureDate: string // ISO date "2025-01-15"
  departureTime: string // "14:30"
  arrivalDate: string // ISO date (may differ for overnight flights)
  arrivalTime: string // "17:45"
  duration: number // Minutes
  basePrice: number
  taxPrice: number
  totalPrice: number
  currency: string
  seatsAvailable: number
  available: boolean // false = sold out / not bookable
  operatingCarrier: string // "Eurowings"
  marketingCarrier?: string
  cabinClass: string // "Economy", "Business"
  aircraft?: string
  stops: number
  bookingUrl?: string
  fetchedAt: Date
}

// =============================================================================
// Search Types
// =============================================================================

export interface FlightSearchParams {
  origin: string // Airport code
  destination: string // Airport code
  departureDate: string // ISO date
  returnDate?: string // For round trips
  passengers: number // Total seated passengers (adults + children)
  adults?: number
  children?: number
  infants?: number
  cabinClass?: 'Economy' | 'Business' | 'First'
  forceFresh?: boolean
}

export interface FlightSearchResult {
  flights: Flight[]
  meta: {
    origin: string
    destination: string
    departureDate: string
    returnDate?: string
    passengers: {
      adults?: number
      children?: number
      infants?: number
    }
    totalResults: number
    providers: string[]
    cacheHit: boolean
    searchedAt: string
  }
}

export type SortBy = 'price' | 'duration' | 'departure'
export type SortOrder = 'asc' | 'desc'

export interface FlightFilters {
  maxPrice?: number
  maxStops?: number
  carriers?: string[]
  departureTimeRange?: [number, number] // [minHour, maxHour]
}

// =============================================================================
// Provider Types
// =============================================================================

export interface ProviderHealth {
  isHealthy: boolean
  lastSuccessfulSync: Date | null
  lastError: string | null
  totalFlights: number
  totalAirports: number
  totalRoutes: number
}

export interface ProviderStats {
  flightCount: number
  airportCount: number
  routeCount: number
}

export interface SyncStatus {
  providerId: string
  syncType: 'airports' | 'routes' | 'flights' | 'full'
  status: 'pending' | 'running' | 'success' | 'failed'
  startedAt?: Date
  completedAt?: Date
  errorMessage?: string
  itemsProcessed: number
}

// =============================================================================
// Provider Interface
// =============================================================================

export interface IFlightProvider {
  readonly id: string
  readonly name: string
  readonly priority: number // Lower = higher priority for display

  // Core methods
  getAirports(): Promise<Airport[]>
  getRoutes(): Promise<FlightRoute[]>
  searchFlights(params: FlightSearchParams): Promise<Flight[]>

  // Sync methods
  syncAirports(): Promise<number>
  syncRoutes(): Promise<number>
  syncFlights(routes?: FlightRoute[], days?: number): Promise<number>

  // Health check
  getHealth(): Promise<ProviderHealth>

  // Optional: Provider-specific configuration
  configure?(config: Record<string, unknown>): void
}

// =============================================================================
// Currency Types
// =============================================================================

export type SupportedCurrency = 'EUR' | 'CHF' | 'GBP'

export interface CurrencyRates {
  base: SupportedCurrency
  rates: Record<SupportedCurrency, number>
  updatedAt: Date
}

// =============================================================================
// Error Types
// =============================================================================

export class ProviderError extends Error {
  constructor(
    public providerId: string,
    public code: string,
    message: string,
    public retryable: boolean = true
  ) {
    super(message)
    this.name = 'ProviderError'
  }
}

export class RateLimitError extends ProviderError {
  retryAfter?: number

  constructor(providerId: string, retryAfter?: number) {
    super(providerId, 'RATE_LIMITED', 'Rate limit exceeded', true)
    this.retryAfter = retryAfter
  }
}

export class NetworkError extends ProviderError {
  constructor(providerId: string, message: string) {
    super(providerId, 'NETWORK_ERROR', message, true)
  }
}

export class ParseError extends ProviderError {
  constructor(providerId: string, message: string) {
    super(providerId, 'PARSE_ERROR', message, false)
  }
}

// =============================================================================
// AirPrishtina API Types (Provider-specific)
// =============================================================================

export interface AirPrishtinaAirport {
  Id: number
  Code: string
  Name: string
  Land: string
}

export interface AirPrishtinaRoute {
  OriginId: number
  DestinationId: number
}

export interface AirPrishtinaFlight {
  FlightInstanceID: number
  FlightID: number
  FlightNbr: string
  OriginID: number
  DestinationID: number
  Origin: string
  Destination: string
  DepartureDate: string
  DepartureTime: string
  ArrivalDate: string
  ArrivalTime: string
  Currency: string
  Price: number
  IsCustomerPrice: string
  SeatsTotal: number
  SeatsFreeReal: number
  SeatsFree: number
  TaxPrice: number
  TaxCurrency: string
  Status: string
  UTCDepartureDT: string
  FlightPriceBaseDetId: number
  ClassName: string
  OperatingBy: string
  RemarkTextID: number
}

export interface AirPrishtinaApiResponse<T> {
  Data: T
  Status: number
  SessionTimeout: number
  Messages: Array<{ Name: string, Value: string }>
}

// =============================================================================
// KosovaFly Types (Provider-specific)
// =============================================================================

/**
 * Airport data from KosovaFly JavaScript config (city_kuerzel)
 */
export interface KosovaFlyAirport {
  stadt: string // City name
  kuerzel: string // IATA code
}

/**
 * Form data for KosovaFly flight search
 */
export interface KosovaFlySearchForm {
  VON: string // Origin airport code
  NACH: string // Destination airport code
  DATUM_HIN: string // Departure date DD.MM.YYYY
  DATUM_RUK?: string // Return date DD.MM.YYYY
  FLGART: 'ow' | 'rt' // one-way or round-trip
  ANZERW: number // Adults (MR/S)
  ANZCHD: number // Children
  ANZINF: number // Infants
  form_hidden?: string // Validation rules (base64)
}

/**
 * Parsed flight data from KosovaFly HTML response
 */
export interface KosovaFlyParsedFlight {
  flightNumber: string
  origin: string
  destination: string
  departureDate: string
  departureTime: string
  arrivalTime: string
  price: number
  currency: string
  airline: string
  seatsAvailable?: number
  flightId?: string
}
