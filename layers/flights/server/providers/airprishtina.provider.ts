import { BaseFlightProvider } from './base.provider'
import { getHttpClient } from '../utils/http-client'
import type {
  Airport,
  FlightRoute,
  Flight,
  FlightSearchParams,
  AirPrishtinaAirport,
  AirPrishtinaRoute,
  AirPrishtinaFlight,
  AirPrishtinaApiResponse
} from '../types/provider'

/**
 * AirPrishtina flight provider
 * Fetches flight data from be.airprishtina.com API
 * Uses cookie-based session handling for API access
 */
export class AirPrishtinaProvider extends BaseFlightProvider {
  readonly id = 'airprishtina'
  readonly name = 'AirPrishtina'
  readonly priority = 1

  private readonly baseUrl = 'https://be.airprishtina.com/be/services'
  private readonly siteUrl = 'https://www.airprishtina.com'
  private readonly culture = 'de'

  // Internal mapping of AirPrishtina IDs to airport data
  private airportIdMap = new Map<number, AirPrishtinaAirport>()
  private airportCodeMap = new Map<string, number>()
  private sessionInitialized = false

  /**
   * Get HTTP client with session handling for API calls
   * Note: Trailing slash is required for correct URL resolution
   */
  private get http() {
    return getHttpClient(this.id, 'https://be.airprishtina.com/be/services/')
  }

  /**
   * Ensure we have an active session before making API calls
   * Initializes by calling a simple GET endpoint to establish cookies
   */
  private async ensureSession(): Promise<void> {
    if (!this.sessionInitialized || !this.http.hasSession()) {
      console.log(`[${this.id}] Initializing API session...`)
      try {
        // Initialize by calling GetFlightSearchSettings to establish session cookies
        await this.http.get<AirPrishtinaApiResponse<unknown>>(
          'GetFlightSearchSettings.aspx',
          { culture: this.culture }
        )
        this.sessionInitialized = true
        await this.delay(300)
        console.log(`[${this.id}] Session initialized`)
      } catch (error) {
        console.warn(`[${this.id}] Session init failed:`, error)
      }
    }
  }

  // ==========================================================================
  // Fetch Methods (External API)
  // ==========================================================================

  protected async fetchAirports(): Promise<Airport[]> {
    const response = await this.http.get<AirPrishtinaApiResponse<AirPrishtinaAirport[]>>(
      'GetAirports.aspx',
      { culture: this.culture }
    )

    if (response.Status !== 0) {
      throw new Error(`AirPrishtina API error: ${response.Messages?.[0]?.Value || 'Unknown error'}`)
    }

    // Build internal maps for route/flight resolution
    this.airportIdMap.clear()
    this.airportCodeMap.clear()

    for (const apt of response.Data) {
      this.airportIdMap.set(apt.Id, apt)
      this.airportCodeMap.set(apt.Code, apt.Id)
    }

    return response.Data.map(apt => this.normalizeAirport(apt))
  }

  protected async fetchRoutes(): Promise<FlightRoute[]> {
    // Ensure airport maps are populated
    if (this.airportIdMap.size === 0) {
      await this.fetchAirports()
    }

    const response = await this.http.get<AirPrishtinaApiResponse<AirPrishtinaRoute[]>>(
      'GetFlightRoutes.aspx',
      { culture: this.culture }
    )

    if (response.Status !== 0) {
      throw new Error(`AirPrishtina API error: ${response.Messages?.[0]?.Value || 'Unknown error'}`)
    }

    return response.Data
      .map((route) => {
        const origin = this.airportIdMap.get(route.OriginId)
        const destination = this.airportIdMap.get(route.DestinationId)

        if (!origin || !destination) {
          console.warn(`[airprishtina] Unknown airport ID in route: ${route.OriginId} -> ${route.DestinationId}`)
          return null
        }

        return {
          originCode: origin.Code,
          destinationCode: destination.Code
        }
      })
      .filter((route): route is FlightRoute => route !== null)
  }

  protected async fetchFlights(params: FlightSearchParams): Promise<Flight[]> {
    // Ensure airport maps are populated
    if (this.airportIdMap.size === 0) {
      await this.fetchAirports()
    }

    const originId = this.airportCodeMap.get(params.origin)
    const destinationId = this.airportCodeMap.get(params.destination)

    if (!originId || !destinationId) {
      console.warn(`[airprishtina] Unknown airport code: ${params.origin} or ${params.destination}`)
      return []
    }

    try {
      // Ensure we have an active session with cookies
      await this.ensureSession()

      // Step 1: Set search data
      const setDataResponse = await this.http.post<AirPrishtinaApiResponse<unknown>>(
        'SetFlightSearchData.aspx',
        {
          originID: originId,
          destinationID: destinationId,
          originBackID: params.returnDate ? destinationId : 0,
          destinationBackID: params.returnDate ? originId : 0,
          dateThere: this.toApiDate(params.departureDate),
          dateBack: params.returnDate ? this.toApiDate(params.returnDate) : this.toApiDate(params.departureDate),
          adults: params.adults || params.passengers,
          children: params.children || 0,
          infants: params.infants || 0,
          ticketType: params.returnDate ? '2' : '1',
          BookingId: '0'
        }
      )

      console.log(`[airprishtina] SetFlightSearchData response status: ${setDataResponse?.Status}`)

      // Step 2: Initialize search with date range
      const searchDate = new Date(params.departureDate)
      // Search a range of 7 days to get more results
      const searchDateFrom = new Date(searchDate)
      searchDateFrom.setDate(searchDateFrom.getDate() - 1)
      searchDateFrom.setHours(23, 0, 0, 0)
      const searchDateTo = new Date(searchDate)
      searchDateTo.setDate(searchDateTo.getDate() + 7)
      searchDateTo.setHours(22, 59, 59, 999)

      const searchResponse = await this.http.post<AirPrishtinaApiResponse<unknown>>(
        'SearchFlights.aspx',
        {
          originID: originId,
          destinationID: destinationId,
          searchDTFrom: searchDateFrom.toISOString(),
          searchDTTo: searchDateTo.toISOString(),
          defaultCurrency: 'EUR',
          forcedCurrency: '',
          seatsCount: params.passengers,
          ignoreTime: 'true',
          isRoundTrip: params.returnDate ? 'true' : 'false'
        }
      )

      console.log(`[airprishtina] SearchFlights response status: ${searchResponse?.Status}`)

      // Step 3: Get results
      const resultResponse = await this.http.post<AirPrishtinaApiResponse<AirPrishtinaFlight[]>>(
        'GetFlightSearchResult.aspx',
        {
          returnLeg0: true,
          returnLeg1: false,
          dateFrom: searchDateFrom.toISOString(),
          dateTo: searchDateTo.toISOString(),
          BookingId: 0
        }
      )

      console.log(`[airprishtina] GetFlightSearchResult: Status=${resultResponse?.Status}, Flights=${resultResponse?.Data?.length || 0}`)

      // Handle API errors gracefully
      if (!resultResponse?.Data || !Array.isArray(resultResponse.Data)) {
        console.warn(`[airprishtina] No flight data in response`)
        return []
      }

      // Filter to exact date and normalize
      const targetDate = params.departureDate

      // Debug: Log all flights returned by API
      console.log(`[airprishtina] API returned ${resultResponse.Data.length} total flights`)
      resultResponse.Data.forEach((f, i) => {
        console.log(`[airprishtina]   Flight ${i + 1}: ${f.FlightNbr} on ${f.DepartureDate} at ${f.DepartureTime}`)
      })

      const flights = resultResponse.Data
        .filter((flight) => {
          const flightDate = flight.DepartureDate?.split('T')[0]
          const matches = flightDate === targetDate
          if (!matches) {
            console.log(`[airprishtina]   Filtered out: ${flight.FlightNbr} (${flightDate} != ${targetDate})`)
          }
          return matches
        })
        .map(flight => this.normalizeFlight(flight, params))

      console.log(`[airprishtina] Found ${flights.length} flights for ${targetDate}`)
      return flights
    } catch (error) {
      // Log detailed error info
      console.error(`[airprishtina] fetchFlights error:`, error)

      // Don't throw - return empty array so search can continue with other providers
      return []
    }
  }

  // ==========================================================================
  // Data Normalization
  // ==========================================================================

  private normalizeAirport(apt: AirPrishtinaAirport): Airport {
    return {
      id: `${this.id}-${apt.Id}`,
      code: apt.Code,
      name: apt.Name,
      city: apt.Name,
      country: apt.Land
    }
  }

  private normalizeFlight(flight: AirPrishtinaFlight, params: FlightSearchParams): Flight {
    const departureTime = this.formatTime(flight.DepartureTime)
    const arrivalTime = this.formatTime(flight.ArrivalTime)
    const duration = this.calculateDuration(flight.DepartureTime, flight.ArrivalTime)

    const origin = this.airportIdMap.get(flight.OriginID)
    const destination = this.airportIdMap.get(flight.DestinationID)

    const seatsAvailable = flight.SeatsFree
    const totalPrice = flight.Price + flight.TaxPrice

    return {
      id: `${this.id}-${flight.FlightInstanceID}`,
      providerId: this.id,
      flightNumber: flight.FlightNbr,
      legType: 'outbound' as const, // Will be overwritten by search API if needed
      origin: {
        id: `${this.id}-${flight.OriginID}`,
        code: origin?.Code || params.origin,
        name: flight.Origin,
        country: origin?.Land || ''
      },
      destination: {
        id: `${this.id}-${flight.DestinationID}`,
        code: destination?.Code || params.destination,
        name: flight.Destination,
        country: destination?.Land || ''
      },
      departureDate: flight.DepartureDate.split('T')[0] ?? '',
      departureTime,
      arrivalDate: flight.ArrivalDate?.split('T')[0] ?? flight.DepartureDate.split('T')[0] ?? '',
      arrivalTime,
      duration,
      basePrice: flight.Price,
      taxPrice: flight.TaxPrice,
      totalPrice,
      currency: flight.Currency,
      seatsAvailable,
      available: seatsAvailable > 0 && totalPrice > 0,
      operatingCarrier: flight.OperatingBy,
      cabinClass: this.mapCabinClass(flight.ClassName),
      stops: 0, // AirPrishtina only has direct flights
      bookingUrl: this.generateBookingUrl(flight, params),
      fetchedAt: new Date()
    }
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  private toApiDate(dateStr: string): string {
    // Convert "2025-01-15" to ISO date
    const date = new Date(dateStr)
    date.setHours(23, 0, 0, 0)
    return date.toISOString()
  }

  private mapCabinClass(_className: string): string {
    // AirPrishtina uses single-letter class codes
    // These seem to be fare classes rather than cabin classes
    // All flights appear to be economy
    return 'Economy'
  }

  private generateBookingUrl(flight: AirPrishtinaFlight, params: FlightSearchParams): string {
    const origin = this.airportIdMap.get(flight.OriginID)
    const destination = this.airportIdMap.get(flight.DestinationID)

    // Generate deep link to AirPrishtina booking page
    const baseUrl = 'https://www.airprishtina.com'
    const searchParams = new URLSearchParams({
      from: origin?.Code || '',
      to: destination?.Code || '',
      date: params.departureDate,
      adults: params.passengers.toString(),
      children: '0',
      infants: '0'
    })

    return `${baseUrl}/de/flug-buchen?${searchParams.toString()}`
  }
}
