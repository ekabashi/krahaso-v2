import { BaseFlightProvider } from './base.provider'
import { getHttpClient } from '../utils/http-client'
import type {
  Airport,
  FlightRoute,
  Flight,
  FlightSearchParams
} from '../types/provider'

/**
 * PrishtinaTicket API response types
 */
interface PrishtinaTicketAirport {
  id: string // Usually PRN or BSL
  name: string // Airport name
  code: string // IATA code
  area: string // 1=Kosovo, 2=Europe, 3=Switzerland
}

interface PrishtinaTicketFlight {
  id: string // Flight ID
  von: string // Origin IATA code
  nach: string // Destination IATA code
  ab_datum_f: string // Departure date DD.MM.YYYY
  ab_zeit_f: string // Departure time HH:MM
  ab_we_tag: string | number // Day of week (0-6)
  preis_ow: number | string // Base price one-way
  preis_erw_ow_var1?: number | string
  preis_erw_ow_var2?: number | string
  preis_erw_ow_var3?: number | string
  preis_erw_ow_var4?: number | string
  preis_erw_ow_var5?: number | string
  preis_erw_ow_var6?: number | string
  best_erw_chd?: number | string // Child discount
  stufe_1?: number | string // Capacity level 1
  stufe_2?: number | string
  stufe_3?: number | string
  stufe_4?: number | string
  stufe_5?: number | string
  name: string // Airline name
  kuerzel: string // Airline code
  waehrung_id: number | string // Currency ID (1=EUR, 2=CHF)
  symbol: string // Currency symbol
  from_airport?: string // Origin airport name
  to_airport?: string // Destination airport name
  img_path?: string
}

interface PrishtinaTicketFlightOfferResponse {
  country: string // DE, CH, SW, KS
  data: PrishtinaTicketFlight[]
}

/**
 * PrishtinaTicket flight provider
 * Uses modern JSON API (api2.php) - much simpler than legacy WEBKOS form-based system
 *
 * LIMITATION: This provider uses the getFlightOffers API which only returns
 * flights for approximately 7-8 weeks in advance. For dates further in the future,
 * no flights will be found. This is a limitation of the available public API.
 * The booking website uses a different internal API that we cannot access.
 */
export class PrishtinaTicketProvider extends BaseFlightProvider {
  readonly id = 'prishtinaticket'
  readonly name = 'Prishtina Ticket'
  readonly priority = 6

  private readonly baseUrl = 'https://www.prishtinaticket.net'
  private readonly apiUrl = 'https://sys.prishtinaticket.net/api2.php'

  // Cache for flight offers (refreshed on each search)
  private flightOffersCache: PrishtinaTicketFlight[] = []
  private flightOffersCacheTime: Date | null = null
  private readonly cacheValidityMs = 5 * 60 * 1000 // 5 minutes

  private get http() {
    return getHttpClient(this.id, this.apiUrl)
  }

  // ==========================================================================
  // Fetch Methods (Abstract implementations)
  // ==========================================================================

  protected async fetchAirports(): Promise<Airport[]> {
    console.log(`[${this.id}] Fetching airports...`)

    const url = `${this.apiUrl}?scope=Booking&action=getAirports`
    const response = await this.http.requestRaw(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch airports: HTTP ${response.status}`)
    }

    const data = await response.json() as { data?: PrishtinaTicketAirport[] }
    const airports = data.data || []

    console.log(`[${this.id}] Found ${airports.length} airports`)

    return airports.map(apt => this.normalizeAirport(apt))
  }

  protected async fetchRoutes(): Promise<FlightRoute[]> {
    // Load flight offers to determine actual routes
    await this.loadFlightOffers()

    const routeSet = new Set<string>()
    const routes: FlightRoute[] = []

    for (const flight of this.flightOffersCache) {
      const key = `${flight.von}-${flight.nach}`
      if (!routeSet.has(key)) {
        routeSet.add(key)
        routes.push({
          originCode: flight.von,
          destinationCode: flight.nach
        })
      }
    }

    console.log(`[${this.id}] Found ${routes.length} routes from flight offers`)
    return routes
  }

  protected async fetchFlights(params: FlightSearchParams): Promise<Flight[]> {
    // Load all flight offers
    await this.loadFlightOffers()

    // Check if requested date is within available range (~7-8 weeks)
    const searchDate = new Date(params.departureDate)
    const maxDate = new Date()
    maxDate.setDate(maxDate.getDate() + 60) // ~8 weeks

    if (searchDate > maxDate) {
      console.log(`[${this.id}] Warning: Date ${params.departureDate} is beyond available range (~8 weeks). This provider only has limited future data.`)
    }

    // Convert search date to DD.MM.YYYY format for comparison
    const targetDate = this.toDisplayDate(params.departureDate)

    // Filter flights matching the search criteria
    const matchingFlights = this.flightOffersCache.filter((flight) => {
      const matchesRoute = flight.von === params.origin && flight.nach === params.destination
      const matchesDate = flight.ab_datum_f === targetDate
      return matchesRoute && matchesDate
    })

    console.log(`[${this.id}] Found ${matchingFlights.length} flights for ${params.origin} → ${params.destination} on ${targetDate}`)

    // Normalize to Flight objects
    return matchingFlights.map(flight => this.normalizeFlight(flight, params))
  }

  // ==========================================================================
  // Data Loading
  // ==========================================================================

  /**
   * Load all flight offers from API (cached for 5 minutes)
   */
  private async loadFlightOffers(): Promise<void> {
    // Check cache validity
    if (
      this.flightOffersCache.length > 0
      && this.flightOffersCacheTime
      && Date.now() - this.flightOffersCacheTime.getTime() < this.cacheValidityMs
    ) {
      return // Use cached data
    }

    console.log(`[${this.id}] Loading flight offers from API...`)

    const url = `${this.apiUrl}?scope=clientSite&action=getFlightOffers`
    const response = await this.http.requestRaw(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch flight offers: HTTP ${response.status}`)
    }

    const data = await response.json() as PrishtinaTicketFlightOfferResponse[]

    // Combine all country data into single array
    this.flightOffersCache = []
    for (const countryData of data) {
      if (countryData.data && Array.isArray(countryData.data)) {
        this.flightOffersCache.push(...countryData.data)
      }
    }

    this.flightOffersCacheTime = new Date()
    console.log(`[${this.id}] Loaded ${this.flightOffersCache.length} flight offers`)
  }

  // ==========================================================================
  // Data Normalization
  // ==========================================================================

  private normalizeAirport(apt: PrishtinaTicketAirport): Airport {
    return {
      id: `${this.id}-${apt.code}`,
      code: apt.code,
      name: apt.name,
      city: apt.name,
      country: this.getCountryFromArea(apt.area)
    }
  }

  private getCountryFromArea(area: string): string {
    switch (area) {
      case '1': return 'Kosovo'
      case '2': return 'Europe'
      case '3': return 'Switzerland'
      default: return 'Unknown'
    }
  }

  private normalizeFlight(flight: PrishtinaTicketFlight, params: FlightSearchParams): Flight {
    const departureDate = this.parseDisplayDate(flight.ab_datum_f)
    const departureTime = flight.ab_zeit_f || '00:00'

    // Estimate arrival time (assume ~2h flight duration for Kosovo routes)
    const arrivalTime = this.estimateArrivalTime(departureTime, 120)

    const totalPrice = this.extractPrice(flight)
    const currency = this.getCurrency(flight.waehrung_id)
    const seatsAvailable = this.extractSeatsAvailable(flight)

    // Build flight number with airline code prefix
    const airlineCode = flight.kuerzel || ''
    const flightNumber = airlineCode ? `${airlineCode} ${flight.id}` : flight.id

    return {
      id: `${this.id}-${flight.id}-${departureDate}`,
      providerId: this.id,
      flightNumber,
      legType: 'outbound' as const,
      origin: {
        id: `${this.id}-${flight.von}`,
        code: flight.von,
        name: flight.from_airport || flight.von,
        country: 'Unknown'
      },
      destination: {
        id: `${this.id}-${flight.nach}`,
        code: flight.nach,
        name: flight.to_airport || flight.nach,
        country: 'Unknown'
      },
      departureDate,
      departureTime,
      arrivalDate: departureDate, // Same day for short flights
      arrivalTime,
      duration: 120, // Estimated 2h
      basePrice: totalPrice,
      taxPrice: 0,
      totalPrice,
      currency,
      seatsAvailable,
      available: seatsAvailable > 0 && totalPrice > 0,
      operatingCarrier: flight.name || 'Unknown',
      cabinClass: 'Economy',
      stops: 0,
      bookingUrl: this.generateBookingUrl(params),
      fetchedAt: new Date()
    }
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  private toDisplayDate(isoDate: string): string {
    // Convert "2026-01-20" to "20.01.2026"
    const [year, month, day] = isoDate.split('-')
    return `${day}.${month}.${year}`
  }

  private parseDisplayDate(displayDate: string): string {
    // Convert "20.01.2026" to "2026-01-20"
    const match = displayDate.match(/(\d{2})\.(\d{2})\.(\d{4})/)
    if (!match || !match[1] || !match[2] || !match[3]) {
      return new Date().toISOString().split('T')[0] ?? ''
    }
    return `${match[3]}-${match[2]}-${match[1]}`
  }

  private estimateArrivalTime(departureTime: string, durationMinutes: number): string {
    const [hours, minutes] = departureTime.split(':').map(Number)
    if (hours === undefined || minutes === undefined) return '00:00'

    const totalMinutes = hours * 60 + minutes + durationMinutes
    const arrHours = Math.floor(totalMinutes / 60) % 24
    const arrMinutes = totalMinutes % 60

    return `${arrHours.toString().padStart(2, '0')}:${arrMinutes.toString().padStart(2, '0')}`
  }

  private extractPrice(flight: PrishtinaTicketFlight): number {
    // Try base price first
    const basePrice = this.toNumber(flight.preis_ow)
    if (basePrice > 0) return basePrice

    // Try price variants
    const variants = [
      flight.preis_erw_ow_var1,
      flight.preis_erw_ow_var2,
      flight.preis_erw_ow_var3,
      flight.preis_erw_ow_var4,
      flight.preis_erw_ow_var5,
      flight.preis_erw_ow_var6
    ]

    for (const variant of variants) {
      const price = this.toNumber(variant)
      if (price > 0) return price
    }

    return 0
  }

  private extractSeatsAvailable(flight: PrishtinaTicketFlight): number {
    // Check capacity levels (stufe_1 through stufe_5)
    const levels = [
      flight.stufe_1,
      flight.stufe_2,
      flight.stufe_3,
      flight.stufe_4,
      flight.stufe_5
    ]

    for (const level of levels) {
      const seats = this.toNumber(level)
      if (seats > 0) return seats
    }

    // Default to available if we have a price
    const price = this.extractPrice(flight)
    return price > 0 ? 9 : 0
  }

  private getCurrency(waehrungId: number | string): string {
    const id = typeof waehrungId === 'string' ? parseInt(waehrungId, 10) : waehrungId
    return id === 2 ? 'CHF' : 'EUR'
  }

  private toNumber(value: unknown): number {
    if (typeof value === 'number') return value
    if (typeof value === 'string') {
      const normalized = value.replace(',', '.')
      const parsed = Number(normalized)
      return Number.isFinite(parsed) ? parsed : 0
    }
    return 0
  }

  private generateBookingUrl(params: FlightSearchParams): string {
    const flightType = params.returnDate ? 'ROUND_TRIP' : 'ONE_WAY'
    const dateFrom = this.toDisplayDate(params.departureDate)

    const searchParams = new URLSearchParams({
      FLIGHT_TYPE: flightType,
      FROM: params.origin,
      TO: params.destination,
      DATE_FROM: dateFrom,
      passengers: (params.adults || params.passengers || 1).toString()
    })

    if (params.returnDate) {
      searchParams.set('DATE_TO', this.toDisplayDate(params.returnDate))
    }

    return `${this.baseUrl}/en/flights/booking?${searchParams.toString()}`
  }
}
