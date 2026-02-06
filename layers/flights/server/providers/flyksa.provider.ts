import { BaseFlightProvider } from './base.provider'
import { getHttpClient, resetHttpClient } from '../utils/http-client'
import type {
  Airport,
  FlightRoute,
  Flight,
  FlightSearchParams
} from '../types/provider'

/**
 * FlyKSA (Eurokoha) flight provider
 * Uses October CMS AJAX handlers for flight search
 * Different from WebKOS system - custom Laravel/October CMS implementation
 */
export class FlyKsaProvider extends BaseFlightProvider {
  readonly id = 'flyksa'
  readonly name = 'FlyKSA'
  readonly priority = 7

  private readonly baseUrl = 'https://flyksa.com'

  // Static airport data based on FlyKSA routes
  private static readonly AIRPORTS: Array<{ code: string, name: string, country: string }> = [
    // Germany
    { code: 'DUS', name: 'Düsseldorf', country: 'Germany' },
    { code: 'FRA', name: 'Frankfurt', country: 'Germany' },
    { code: 'STR', name: 'Stuttgart', country: 'Germany' },
    { code: 'MUC', name: 'München', country: 'Germany' },
    { code: 'BER', name: 'Berlin', country: 'Germany' },
    { code: 'HAM', name: 'Hamburg', country: 'Germany' },
    { code: 'HAJ', name: 'Hannover', country: 'Germany' },
    { code: 'CGN', name: 'Köln/Bonn', country: 'Germany' },
    { code: 'NUE', name: 'Nürnberg', country: 'Germany' },
    // Switzerland
    { code: 'ZRH', name: 'Zürich', country: 'Switzerland' },
    { code: 'BSL', name: 'Basel', country: 'Switzerland' },
    { code: 'GVA', name: 'Genf', country: 'Switzerland' },
    // Sweden
    { code: 'GOT', name: 'Göteborg', country: 'Sweden' },
    { code: 'ARN', name: 'Stockholm', country: 'Sweden' },
    { code: 'MMX', name: 'Malmö', country: 'Sweden' },
    // Kosovo
    { code: 'PRN', name: 'Prishtina', country: 'Kosovo' }
  ]

  private get http() {
    return getHttpClient(this.id, this.baseUrl)
  }

  // ==========================================================================
  // Fetch Methods
  // ==========================================================================

  protected async fetchAirports(): Promise<Airport[]> {
    return FlyKsaProvider.AIRPORTS.map(apt => ({
      id: `${this.id}-${apt.code}`,
      code: apt.code,
      name: apt.name,
      city: apt.name,
      country: apt.country
    }))
  }

  protected async fetchRoutes(): Promise<FlightRoute[]> {
    const routes: FlightRoute[] = []
    const europeAirports = FlyKsaProvider.AIRPORTS
      .filter(a => a.country !== 'Kosovo')
      .map(a => a.code)

    // Routes to/from PRN
    for (const euroAirport of europeAirports) {
      routes.push({ originCode: euroAirport, destinationCode: 'PRN' })
      routes.push({ originCode: 'PRN', destinationCode: euroAirport })
    }

    return routes
  }

  protected async fetchFlights(params: FlightSearchParams): Promise<Flight[]> {
    // Reset session for fresh search
    resetHttpClient(this.id)

    console.log(`[${this.id}] Searching: ${params.origin} → ${params.destination} on ${params.departureDate}`)

    // Step 1: Get session cookie
    const homeResponse = await this.http.requestRaw(`${this.baseUrl}/de`, {
      method: 'GET',
      headers: { Accept: 'text/html' }
    })

    if (!homeResponse.ok) {
      throw new Error(`Failed to get session: HTTP ${homeResponse.status}`)
    }

    // Step 2: Trigger search via October CMS AJAX handler
    // Note: Date format is YYYY-MM-DD (not DD.MM.YYYY like in the URL display)
    const formData = new URLSearchParams({
      'drejtim': params.returnDate ? '2' : '1', // 1=one-way, 2=roundtrip
      'outd': params.origin,
      'outa': params.destination,
      'outd-date': params.departureDate, // Keep ISO format YYYY-MM-DD
      'currency': 'EUR',
      'passager_number': (params.adults || params.passengers || 1).toString()
    })

    if (params.returnDate) {
      formData.set('outa-date', params.returnDate)
    }

    // The searchFlights::onSearch handler triggers the search
    // It may return 500 but still sets up the session correctly
    await this.http.requestRaw(`${this.baseUrl}/de`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-OCTOBER-REQUEST-HANDLER': 'searchFlights::onSearch',
        'X-Requested-With': 'XMLHttpRequest',
        'Accept': '*/*'
      },
      body: formData.toString()
    })
    // Note: We don't check response status - the session is set regardless

    // Step 3: Get results page
    const resultsResponse = await this.http.requestRaw(`${this.baseUrl}/de/search/results`, {
      method: 'GET',
      headers: { Accept: 'text/html' }
    })

    if (!resultsResponse.ok) {
      throw new Error(`Results request failed: HTTP ${resultsResponse.status}`)
    }

    const html = await resultsResponse.text()

    // Step 4: Parse flight data from HTML
    const flights = this.parseFlightResults(html, params)

    console.log(`[${this.id}] Found ${flights.length} flights`)
    return flights
  }

  // ==========================================================================
  // HTML Parsing
  // ==========================================================================

  private parseFlightResults(html: string, params: FlightSearchParams): Flight[] {
    const flights: Flight[] = []

    // Extract flights from the HTML structure
    // Pattern: <label class="flight_info_content..."> contains flight details
    const flightPattern = /<label[^>]*class="flight_info_content[^"]*"[^>]*for="([^"]+)"[^>]*>([\s\S]*?)<\/label>/gi

    let match
    while ((match = flightPattern.exec(html)) !== null) {
      const flightId = match[1]
      const flightHtml = match[2]

      if (!flightId || !flightHtml) continue

      const flight = this.parseFlightBlock(flightId, flightHtml, params)
      if (flight) {
        flights.push(flight)
      }
    }

    // If no flights found with label pattern, try alternative parsing
    if (flights.length === 0) {
      const altFlights = this.parseAlternativeFormat(html, params)
      flights.push(...altFlights)
    }

    // Get price from the price slider or price_content
    const price = this.extractMainPrice(html, params.departureDate)

    // Apply price to flights if not already set
    for (const flight of flights) {
      if (flight.totalPrice === 0 && price > 0) {
        flight.totalPrice = price
        flight.basePrice = price
        flight.available = true
      }
    }

    // Remove duplicates based on flight number + departure time
    const uniqueFlights = new Map<string, Flight>()
    for (const flight of flights) {
      const key = `${flight.flightNumber}-${flight.departureTime}`
      if (!uniqueFlights.has(key)) {
        uniqueFlights.set(key, flight)
      }
    }

    return Array.from(uniqueFlights.values())
  }

  private parseFlightBlock(flightId: string, html: string, params: FlightSearchParams): Flight | null {
    // Extract times: <h5>13:00</h5> ... <h5>15:20</h5>
    const timeMatches = html.match(/<h5>(\d{2}:\d{2})<\/h5>/g) || []
    const times = timeMatches.map(t => t.replace(/<\/?h5>/g, ''))

    if (times.length < 2) return null

    const departureTime = times[0] || '00:00'
    const arrivalTime = times[1] || '00:00'

    // Extract duration: <span class="small-font">2hr 20min</span>
    const durationMatch = html.match(/(\d+)hr\s*(\d+)?min/i)
    let duration = 0
    if (durationMatch) {
      duration = parseInt(durationMatch[1] || '0', 10) * 60 + parseInt(durationMatch[2] || '0', 10)
    } else {
      duration = this.calculateDuration(departureTime, arrivalTime)
    }

    // Extract flight number: IV8221 (appears as plain text in a div)
    const flightNumMatch = html.match(/([A-Z]{2}\d{4})/i)
    const flightNumber = flightNumMatch?.[1] || 'UNKNOWN'

    // Extract airline from data-name or "Operated by" text
    const airlineMatch = html.match(/Operated by:[^<]*<b>([^<]+)<\/b>/i)
    const operatingCarrier = airlineMatch?.[1]?.trim() || 'GP Aviation'

    // Extract airports - use search params as fallback
    const origin = params.origin
    const destination = params.destination

    return {
      id: `${this.id}-${flightId}`,
      providerId: this.id,
      flightNumber,
      legType: 'outbound' as const,
      origin: {
        id: `${this.id}-${origin}`,
        code: origin,
        name: origin,
        country: 'Unknown'
      },
      destination: {
        id: `${this.id}-${destination}`,
        code: destination,
        name: destination,
        country: 'Unknown'
      },
      departureDate: params.departureDate,
      departureTime,
      arrivalDate: params.departureDate,
      arrivalTime,
      duration,
      basePrice: 0, // Will be set later
      taxPrice: 0,
      totalPrice: 0, // Will be set later
      currency: 'EUR',
      seatsAvailable: 9,
      available: false, // Will be set when price is found
      operatingCarrier,
      cabinClass: 'Economy',
      stops: 0,
      bookingUrl: this.generateBookingUrl(params),
      fetchedAt: new Date()
    }
  }

  private parseAlternativeFormat(html: string, params: FlightSearchParams): Flight[] {
    const flights: Flight[] = []

    // Try to find time pairs with context
    const timePattern = /<h5>(\d{2}:\d{2})<\/h5>[\s\S]*?<h5>(\d{2}:\d{2})<\/h5>/gi
    let match
    let index = 0

    while ((match = timePattern.exec(html)) !== null) {
      const departureTime = match[1] || '00:00'
      const arrivalTime = match[2] || '00:00'

      // Find flight number near this match
      const contextStart = Math.max(0, match.index - 500)
      const contextEnd = Math.min(html.length, match.index + 500)
      const context = html.substring(contextStart, contextEnd)

      const flightNumMatch = context.match(/>([A-Z]{2}\d{3,4})</i)
      const flightNumber = flightNumMatch?.[1] || `FLY${index}`

      flights.push({
        id: `${this.id}-${flightNumber}-${params.departureDate}-${index}`,
        providerId: this.id,
        flightNumber,
        legType: 'outbound' as const,
        origin: {
          id: `${this.id}-${params.origin}`,
          code: params.origin,
          name: params.origin,
          country: 'Unknown'
        },
        destination: {
          id: `${this.id}-${params.destination}`,
          code: params.destination,
          name: params.destination,
          country: 'Unknown'
        },
        departureDate: params.departureDate,
        departureTime,
        arrivalDate: params.departureDate,
        arrivalTime,
        duration: this.calculateDuration(departureTime, arrivalTime),
        basePrice: 0,
        taxPrice: 0,
        totalPrice: 0,
        currency: 'EUR',
        seatsAvailable: 9,
        available: false,
        operatingCarrier: 'GP Aviation',
        cabinClass: 'Economy',
        stops: 0,
        bookingUrl: this.generateBookingUrl(params),
        fetchedAt: new Date()
      })

      index++
    }

    return flights
  }

  private extractMainPrice(html: string, departureDate: string): number {
    // Format: data-date="20.01.2026" data-price="69"
    const formattedDate = this.formatDate(departureDate)
    const pricePattern = new RegExp(`data-date="${formattedDate}"[^>]*data-price="(\\d+)"`, 'i')
    const match = html.match(pricePattern)

    if (match?.[1]) {
      return parseInt(match[1], 10)
    }

    // Fallback: Get price from price_content
    const priceContentMatch = html.match(/<strong>(\d+\.?\d*)<\/strong>\s*<span[^>]*>€<\/span>/i)
    if (priceContentMatch?.[1]) {
      return parseFloat(priceContentMatch[1])
    }

    return 0
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  private formatDate(isoDate: string): string {
    // Convert "2026-01-20" to "20.01.2026"
    const [year, month, day] = isoDate.split('-')
    return `${day}.${month}.${year}`
  }

  private generateBookingUrl(params: FlightSearchParams): string {
    const searchParams = new URLSearchParams({
      'iutd': params.origin,
      'iuta': params.destination,
      'outd-date': this.formatDate(params.departureDate),
      'passager_number': (params.adults || params.passengers || 1).toString(),
      'drejtim': params.returnDate ? 'round-trip' : 'one-way'
    })

    if (params.returnDate) {
      searchParams.set('outa-date', this.formatDate(params.returnDate))
    }

    return `${this.baseUrl}/de/search?${searchParams.toString()}`
  }
}
