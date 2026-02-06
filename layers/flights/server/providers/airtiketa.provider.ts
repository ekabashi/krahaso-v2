import { BaseFlightProvider } from './base.provider'
import { getHttpClient, resetHttpClient } from '../utils/http-client'
import type {
  Airport,
  FlightRoute,
  Flight,
  FlightSearchParams,
  KosovaFlyAirport
} from '../types/provider'

/**
 * AirTiketa flight object structure (same as KosovaFly/Dituria - WEBKOS system)
 */
interface AirTiketaFlight {
  ab_datum: string // Departure date "Mi DD.MM.YYYY" or "DD.MM.YYYY"
  ab_datum_zeit?: string // Departure datetime "YYYY-MM-DD HH:MM:SS"
  an_datum?: string | null // Arrival date DD.MM.YYYY
  an_datum_zeit?: string // Arrival datetime "YYYY-MM-DD HH:MM:SS"
  ab_zeit: string // Departure time HH:MM
  ab_zeit_f?: string // Departure time formatted
  an_zeit: string // Arrival time HH:MM
  an_zeit_f?: string // Arrival time formatted
  carrier_flugnr: string // Flight number e.g. "EW5702"
  company_name: string // Airline name
  comp_id?: string // Company ID
  von: string // Origin IATA code
  von_name?: string // Origin airport name
  nach: string // Destination IATA code
  nach_name?: string // Destination airport name
  waehrung_id?: number // Currency ID
  saison?: 'haupt' | 'neben' // Season (high/low)
  company_gepeck?: number // Baggage allowance
  a_buchbar?: number // Seats bookable
  a_geb?: number // Seats taken
  available?: number | string
  ec?: number | string
  pec?: number | string
  plaetze_erw_chd?: number | string | null
  best_erw_chd?: number | string
  plaetze_anz?: number | string
  stufe_1?: number | string
  stufe_2?: number | string
  stufe_3?: number | string
  stufe_4?: number | string
  stufe_5?: number | string
  preis_b_platz?: number | string
  fremd_preis?: number | string
  tax?: number | string
  aktiv?: string
  del?: number | string
  verbotenWeil?: unknown
  preise?: {
    preise: AirTiketaFlightPriceItem[]
  }
}

interface AirTiketaFlightPriceItem {
  typ: 'erw' | 'chd' | 'inf' // Passenger type
  preis_hs: [AirTiketaFlightPrice, number] // High season [price, count]
  preis_ns: [AirTiketaFlightPrice, number] // Low season [price, count]
}

interface AirTiketaFlightPrice {
  endpreis: number
  ohne_tax: number
  tax: number
  provision?: number
}

/**
 * AirTiketa flight provider
 * Fetches flight data from airtiketa.com via web scraping
 * Uses the WEBKOS i-booking system (same as KosovaFly/Dituria)
 */
export class AirTiketaProvider extends BaseFlightProvider {
  readonly id = 'airtiketa'
  readonly name = 'AirTiketa'
  readonly priority = 5

  private readonly baseUrl = 'https://www.airtiketa.com'
  private ajaxUrl: string | null = null
  private formHidden: string | null = null

  // Static airport data (same WEBKOS system airports)
  private static readonly AIRPORTS: KosovaFlyAirport[] = [
    { stadt: 'Adana', kuerzel: 'ADA' },
    { stadt: 'IZMIR', kuerzel: 'ADB' },
    { stadt: 'Alicante', kuerzel: 'ALC' },
    { stadt: 'AMSTERDAM', kuerzel: 'AMS' },
    { stadt: 'STOCKHOLM-SKAVSTA', kuerzel: 'ARN' },
    { stadt: 'Antalya', kuerzel: 'AYT' },
    { stadt: 'Berlin Brandenburg', kuerzel: 'BER' },
    { stadt: 'MILANO-BERGAMO', kuerzel: 'BGY' },
    { stadt: 'Bodrum', kuerzel: 'BJV' },
    { stadt: 'Burgas', kuerzel: 'BOJ' },
    { stadt: 'Bremen', kuerzel: 'BRE' },
    { stadt: 'BRUSELLS', kuerzel: 'BRU' },
    { stadt: 'BASEL', kuerzel: 'BSL' },
    { stadt: 'BUDAPEST', kuerzel: 'BUD' },
    { stadt: 'Bucharest-Otopeni', kuerzel: 'BUH' },
    { stadt: 'Paris Beauvais', kuerzel: 'BVA' },
    { stadt: 'PARIS', kuerzel: 'CDG' },
    { stadt: 'Köln/Bonn', kuerzel: 'CGN' },
    { stadt: 'Copenhagen', kuerzel: 'CPH' },
    { stadt: 'DORTMUND', kuerzel: 'DTM' },
    { stadt: 'DÜSSELDORF', kuerzel: 'DUS' },
    { stadt: 'Rom/Fiumicino', kuerzel: 'FCO' },
    { stadt: 'Friedrichshafen', kuerzel: 'FDH' },
    { stadt: 'PODGORICA', kuerzel: 'FGD' },
    { stadt: 'Memmingen', kuerzel: 'FMM' },
    { stadt: 'Münster Osnabrück', kuerzel: 'FMO' },
    { stadt: 'Frankfurt/Main', kuerzel: 'FRA' },
    { stadt: 'Göteborg Landvetter', kuerzel: 'GOT' },
    { stadt: 'GENEVE/Genf', kuerzel: 'GVA' },
    { stadt: 'HALMSTAD', kuerzel: 'HAD' },
    { stadt: 'HANNOVER', kuerzel: 'HAJ' },
    { stadt: 'HAMBURG', kuerzel: 'HAM' },
    { stadt: 'Helsinki', kuerzel: 'HEL' },
    { stadt: 'Frankfurt HAHN', kuerzel: 'HHN' },
    { stadt: 'Washington DC', kuerzel: 'IAD' },
    { stadt: 'ISTANBUL', kuerzel: 'IST' },
    { stadt: 'KIEV', kuerzel: 'KBP' },
    { stadt: 'Kukës', kuerzel: 'KFZ' },
    { stadt: 'Ljubljana', kuerzel: 'LJU' },
    { stadt: 'LONDON LUTON', kuerzel: 'LTN' },
    { stadt: 'Luxembourg', kuerzel: 'LUX' },
    { stadt: 'Lyon-Saint Exupery', kuerzel: 'LYS' },
    { stadt: 'MADRID', kuerzel: 'MAD' },
    { stadt: 'BASEL-MULHOUSE', kuerzel: 'MLH' },
    { stadt: 'Malmö', kuerzel: 'MMX' },
    { stadt: 'Maastricht/Aachen', kuerzel: 'MST' },
    { stadt: 'MÜNCHEN', kuerzel: 'MUC' },
    { stadt: 'MILANO/Malpensa', kuerzel: 'MXP' },
    { stadt: 'NÜRNBERG', kuerzel: 'NUE' },
    { stadt: 'Ohrid', kuerzel: 'OHD' },
    { stadt: 'Bucharest-Otopeni', kuerzel: 'OTP' },
    { stadt: 'Paderborn-Lippstadt', kuerzel: 'PAD' },
    { stadt: 'PRISHTINA', kuerzel: 'PRN' },
    { stadt: 'PULA', kuerzel: 'PUY' },
    { stadt: 'ISTANBUL/S.GOKCEN', kuerzel: 'SAW' },
    { stadt: 'THESSALONIKI', kuerzel: 'SKG' },
    { stadt: 'SKOPJE', kuerzel: 'SKP' },
    { stadt: 'Sofia', kuerzel: 'SOF' },
    { stadt: 'LONDON STANSTED', kuerzel: 'STN' },
    { stadt: 'STUTTGART', kuerzel: 'STR' },
    { stadt: 'Samsun', kuerzel: 'SZF' },
    { stadt: 'Salzburg', kuerzel: 'SZG' },
    { stadt: 'PODGORICA', kuerzel: 'TGD' },
    { stadt: 'TIRANA', kuerzel: 'TIA' },
    { stadt: 'Oslo-Torp', kuerzel: 'TRF' },
    { stadt: 'VENEZIA', kuerzel: 'VCE' },
    { stadt: 'VIENNA', kuerzel: 'VIE' },
    { stadt: 'VERONA', kuerzel: 'VRN' },
    { stadt: 'Växjö-Småland', kuerzel: 'VXO' },
    { stadt: 'ZÜRICH', kuerzel: 'ZRH' }
  ]

  // Kosovo-related routes (main focus)
  private static readonly KOSOVO_AIRPORTS = ['PRN']
  private static readonly BALKAN_AIRPORTS = ['PRN', 'KFZ', 'TIA', 'SKP', 'OHD', 'TGD', 'SKG']

  private get http() {
    return getHttpClient(this.id, this.baseUrl)
  }

  // ==========================================================================
  // Session Management
  // ==========================================================================

  /**
   * Reset session to force re-initialization
   */
  private resetSession(): void {
    this.ajaxUrl = null
    this.formHidden = null
    resetHttpClient(this.id)
  }

  /**
   * Initialize session by fetching homepage and extracting AJAX URL
   */
  private async initSession(): Promise<void> {
    if (this.ajaxUrl) {
      return // Session already initialized
    }

    console.log(`[${this.id}] Initializing session...`)

    const response = await this.http.requestRaw(this.baseUrl, {
      method: 'GET',
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'de-DE,de;q=0.9'
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    // Extract AJAX URL and form data from HTML
    const html = await response.text()

    // Extract AJAX URL (form action points to ajax.php?a=...)
    const ajaxUrlMatch = html.match(/action="(https?:\/\/[^"]*ajax\.php\?a=[^"]+)"/)
      || html.match(/action="([^"]*ajax\.php\?a=[^"]+)"/)
    if (ajaxUrlMatch?.[1]) {
      let url = ajaxUrlMatch[1]
        .replace(/\\"/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/\\\//g, '/')
      // Make absolute URL if relative
      if (url.startsWith('/')) {
        url = this.baseUrl + url
      } else if (!url.startsWith('http')) {
        url = this.baseUrl + '/' + url
      }
      this.ajaxUrl = url
    }

    // Extract form_hidden value
    const formHiddenMatch = html.match(/name="form_hidden"[^>]*value="([^"]+)"/)
      || html.match(/name=\\"form_hidden\\"[^>]*value=\\"([^"]+)\\"/)
    if (formHiddenMatch?.[1]) {
      this.formHidden = formHiddenMatch[1].replace(/\\\\/g, '')
    }

    console.log(`[${this.id}] Session initialized: cookie=${this.http.hasSession()}, ajaxUrl=${this.ajaxUrl?.substring(0, 80)}...`)
  }

  // ==========================================================================
  // Fetch Methods (Abstract implementations)
  // ==========================================================================

  protected async fetchAirports(): Promise<Airport[]> {
    // Return static airport list from embedded JavaScript config
    return AirTiketaProvider.AIRPORTS.map(apt => this.normalizeAirport(apt))
  }

  protected async fetchRoutes(): Promise<FlightRoute[]> {
    // Generate routes based on Kosovo/Balkan airports connecting to European destinations
    const routes: FlightRoute[] = []
    const europeAirports = AirTiketaProvider.AIRPORTS
      .map(a => a.kuerzel)
      .filter(code => !AirTiketaProvider.BALKAN_AIRPORTS.includes(code))

    // Routes FROM Kosovo to Europe
    for (const kosovoAirport of AirTiketaProvider.KOSOVO_AIRPORTS) {
      for (const euroAirport of europeAirports) {
        routes.push({
          originCode: kosovoAirport,
          destinationCode: euroAirport
        })
        // Reverse route
        routes.push({
          originCode: euroAirport,
          destinationCode: kosovoAirport
        })
      }
    }

    return routes
  }

  protected async fetchFlights(params: FlightSearchParams): Promise<Flight[]> {
    // Force fresh session for each search
    this.resetSession()
    await this.initSession()

    if (!this.ajaxUrl) {
      throw new Error(`Session not properly initialized: ajaxUrl=${!!this.ajaxUrl}`)
    }

    // Build form data
    const formData = this.buildFormData(params)

    console.log(`[${this.id}] Searching: ${params.origin} → ${params.destination} on ${params.departureDate}`)

    // Submit search form to AJAX endpoint
    const response = await this.http.requestRaw(this.ajaxUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'X-Requested-With': 'XMLHttpRequest',
        'Origin': this.baseUrl
      },
      body: formData
    })

    if (!response.ok) {
      throw new Error(`Search request failed: HTTP ${response.status}`)
    }

    const responseText = await response.text()

    // Parse flight data from response (JSON with embedded JS or HTML)
    const airtiketaFlights = this.parseFlightResponse(responseText)

    // Normalize to Flight objects
    const allFlights = airtiketaFlights.map(df => this.normalizeAirTiketaFlight(df, params))

    // Filter to requested date only
    const targetDate = params.departureDate
    const filteredFlights = allFlights.filter(flight => flight.departureDate === targetDate)

    console.log(`[${this.id}] Found ${filteredFlights.length} flights for ${targetDate}`)
    return filteredFlights
  }

  // ==========================================================================
  // Form Building
  // ==========================================================================

  private buildFormData(params: FlightSearchParams): string {
    // Build form with ALL required fields including hidden ones
    const formParts: string[] = []

    // Main search fields
    formParts.push(`VON=${encodeURIComponent(params.origin)}`)
    formParts.push(`NACH=${encodeURIComponent(params.destination)}`)
    formParts.push(`DATUM_HIN=${encodeURIComponent(this.toAirTiketaDate(params.departureDate))}`)
    formParts.push(`FLGART=${params.returnDate ? 'rt' : 'ow'}`)
    formParts.push(`ANZERW=${params.adults || params.passengers || 1}`)
    formParts.push(`ANZCHD=${params.children || 0}`)
    formParts.push(`ANZINF=${params.infants || 0}`)

    // Return date if roundtrip
    if (params.returnDate) {
      formParts.push(`DATUM_RUK=${encodeURIComponent(this.toAirTiketaDate(params.returnDate))}`)
    }

    // Additional required fields
    formParts.push('preis_cc_nur_eur=true')

    // Form hidden token
    if (this.formHidden) {
      formParts.push(`form_hidden=${encodeURIComponent(this.formHidden)}`)
    }

    return formParts.join('&')
  }

  // ==========================================================================
  // Response Parsing
  // ==========================================================================

  private parseFlightResponse(responseText: string): AirTiketaFlight[] {
    const flights: AirTiketaFlight[] = []

    try {
      // First, try to parse as JSON
      let content = responseText

      // If it's JSON wrapped, extract the json field
      if (responseText.trim().startsWith('{')) {
        try {
          const jsonResponse = JSON.parse(responseText)
          if (jsonResponse.json) {
            content = jsonResponse.json
          }
        } catch {
          // Not JSON, use raw content
        }
      }

      // Unescape the content if it's escaped JavaScript
      content = content
        .replace(/\\n/g, '\n')
        .replace(/\\t/g, '\t')
        .replace(/\\"/g, '"')
        .replace(/\\\//g, '/')
        .replace(/\\'/g, '\'')

      // Strategy 0: Look for "hin":[ or "ruk":[ patterns (WEBKOS)
      const hinRukPattern = /"(hin|ruk)"\s*:\s*\[/g
      let hinRukMatch
      while ((hinRukMatch = hinRukPattern.exec(content)) !== null) {
        const startIdx = content.indexOf('[', hinRukMatch.index)
        if (startIdx === -1) continue

        let bracketCount = 0
        let endIdx = startIdx
        for (let i = startIdx; i < content.length && i < startIdx + 200000; i++) {
          if (content[i] === '[') bracketCount++
          if (content[i] === ']') bracketCount--
          if (bracketCount === 0) {
            endIdx = i + 1
            break
          }
        }

        if (endIdx > startIdx) {
          const arrayStr = content.substring(startIdx, endIdx)
          try {
            const parsed = JSON.parse(arrayStr)
            if (Array.isArray(parsed) && parsed.length > 0) {
              const firstItem = parsed[0]
              if (firstItem && (firstItem.von || firstItem.ab_datum || firstItem.ab_zeit)) {
                flights.push(...parsed as AirTiketaFlight[])
              }
            }
          } catch {
            // Failed to parse this array, continue
          }
        }
      }

      if (flights.length > 0) {
        return flights
      }

      // Fallback: Look for array of flight objects with balanced brackets
      const arrayStartIndices: number[] = []
      let searchIdx = 0
      while ((searchIdx = content.indexOf('[', searchIdx)) !== -1) {
        const nextChunk = content.substring(searchIdx, searchIdx + 5000)
        if (nextChunk.includes('ab_datum') || nextChunk.includes('ab_zeit') || nextChunk.includes('"von"')) {
          arrayStartIndices.push(searchIdx)
        }
        searchIdx++
      }

      for (const startIdx of arrayStartIndices) {
        let bracketCount = 0
        let endIdx = startIdx

        for (let i = startIdx; i < content.length && i < startIdx + 100000; i++) {
          if (content[i] === '[') bracketCount++
          if (content[i] === ']') bracketCount--
          if (bracketCount === 0) {
            endIdx = i + 1
            break
          }
        }

        if (endIdx > startIdx) {
          const arrayStr = content.substring(startIdx, endIdx)
          try {
            const parsed = JSON.parse(arrayStr)
            if (Array.isArray(parsed)) {
              const validFlights = parsed.filter(f => this.isValidFlightObject(f))
              if (validFlights.length > 0) {
                flights.push(...validFlights as AirTiketaFlight[])
                break
              }
            }
          } catch {
            try {
              const cleanedStr = arrayStr
                .replace(/,\s*}/g, '}')
                .replace(/,\s*]/g, ']')
              const parsed = JSON.parse(cleanedStr)
              if (Array.isArray(parsed)) {
                const validFlights = parsed.filter(f => this.isValidFlightObject(f))
                if (validFlights.length > 0) {
                  flights.push(...validFlights as AirTiketaFlight[])
                  break
                }
              }
            } catch {
              // Continue to next array
            }
          }
        }
      }

      if (flights.length === 0) {
        const htmlFlights = this.parseFlightTable(content)
        if (htmlFlights.length > 0) {
          flights.push(...htmlFlights)
        }
      }
    } catch (error) {
      console.error(`[${this.id}] Response parsing error:`, error)
    }

    if (flights.length > 0) {
      return flights
    }

    // No flights found - this is valid (route may have no flights available)
    console.log(`[${this.id}] No flights found in response`)
    return []
  }

  private isValidFlightObject(obj: unknown): obj is AirTiketaFlight {
    if (!obj || typeof obj !== 'object') return false
    const flight = obj as Record<string, unknown>
    return (
      typeof flight.ab_datum === 'string'
      && typeof flight.ab_zeit === 'string'
      && typeof flight.von === 'string'
      && typeof flight.nach === 'string'
    )
  }

  private parseFlightTable(html: string): AirTiketaFlight[] {
    const flights: AirTiketaFlight[] = []
    const flightRowPattern = /<tr[^>]*class="[^"]*flugzeile[^"]*"[^>]*>([\s\S]*?)<\/tr>/gi

    let match
    while ((match = flightRowPattern.exec(html)) !== null) {
      const rowHtml = match[1]
      if (!rowHtml) continue

      const flight = this.parseFlightRowHtml(rowHtml)
      if (flight) {
        flights.push(flight)
      }
    }

    return flights
  }

  private parseFlightRowHtml(rowHtml: string): AirTiketaFlight | null {
    try {
      const timeMatches = rowHtml.match(/(\d{2}):(\d{2})/g)
      if (!timeMatches || timeMatches.length < 2) return null

      const dateMatch = rowHtml.match(/(\d{2})\.(\d{2})\.(\d{4})/)?.[0]
      const flightNumMatch = rowHtml.match(/([A-Z]{2}\s*\d{3,4})/)?.[0]?.replace(/\s/g, '')
      const airlineMatch = rowHtml.match(/(Eurowings|Wizz Air|Swiss|Lufthansa|Germania|Chair|Austrian|easyJet|Air Prishtina)/i)?.[0]
      const priceMatch = rowHtml.match(/(\d+[.,]?\d*)\s*[€EUR]/)?.[1]
      const airportMatches = rowHtml.match(/([A-Z]{3})/g)

      return {
        ab_datum: dateMatch ?? '',
        ab_zeit: timeMatches[0] ?? '',
        an_zeit: timeMatches[1] ?? '',
        carrier_flugnr: flightNumMatch ?? 'UNKNOWN',
        company_name: airlineMatch ?? 'Unknown',
        von: airportMatches?.[0] ?? '',
        nach: airportMatches?.[1] ?? '',
        preise: priceMatch
          ? {
              preise: [{
                typ: 'erw',
                preis_hs: [{ endpreis: Number(priceMatch), ohne_tax: 0, tax: 0 }, 1],
                preis_ns: [{ endpreis: Number(priceMatch), ohne_tax: 0, tax: 0 }, 1]
              }]
            }
          : undefined
      }
    } catch {
      return null
    }
  }

  // ==========================================================================
  // Data Normalization
  // ==========================================================================

  private normalizeAirport(apt: KosovaFlyAirport): Airport {
    return {
      id: `${this.id}-${apt.kuerzel}`,
      code: apt.kuerzel,
      name: apt.stadt,
      city: apt.stadt,
      country: 'Unknown'
    }
  }

  private normalizeAirTiketaFlight(flight: AirTiketaFlight, params: FlightSearchParams): Flight {
    const { basePrice, taxPrice, totalPrice } = this.extractPrice(flight)

    // Parse departure date
    const departureDate = this.parseDateString(flight.ab_datum)

    // Calculate duration from times
    const departureTime = this.formatTime(flight.ab_zeit)
    const arrivalTime = this.formatTime(flight.an_zeit)
    const duration = this.calculateDuration(flight.ab_zeit, flight.an_zeit)

    // Determine arrival date
    let arrivalDate = departureDate
    if (flight.an_datum) {
      arrivalDate = this.parseDateString(flight.an_datum)
    } else if (duration > 12 * 60) {
      // If flight is longer than 12 hours, likely arrives next day
      const nextDay = new Date(departureDate)
      nextDay.setDate(nextDay.getDate() + 1)
      arrivalDate = nextDay.toISOString().split('T')[0] ?? ''
    }

    const seatsAvailable = this.extractSeatsAvailable(flight)

    return {
      id: `${this.id}-${flight.carrier_flugnr}-${departureDate}`,
      providerId: this.id,
      flightNumber: flight.carrier_flugnr,
      legType: 'outbound' as const,
      origin: {
        id: `${this.id}-${flight.von}`,
        code: flight.von,
        name: flight.von_name || flight.von,
        country: 'Unknown'
      },
      destination: {
        id: `${this.id}-${flight.nach}`,
        code: flight.nach,
        name: flight.nach_name || flight.nach,
        country: 'Unknown'
      },
      departureDate,
      departureTime,
      arrivalDate,
      arrivalTime,
      duration,
      basePrice,
      taxPrice,
      totalPrice,
      currency: 'EUR',
      seatsAvailable,
      available: seatsAvailable > 0 && totalPrice > 0,
      operatingCarrier: flight.company_name,
      cabinClass: 'Economy',
      stops: 0,
      bookingUrl: this.generateBookingUrl(params),
      fetchedAt: new Date()
    }
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  private toAirTiketaDate(dateStr: string): string {
    // Convert "2025-01-15" to "15.01.2025"
    const [year, month, day] = dateStr.split('-')
    return `${day}.${month}.${year}`
  }

  private parseDateString(dateStr: string): string {
    if (!dateStr) {
      console.warn(`[${this.id}] Could not parse date: ${dateStr}`)
      return new Date().toISOString().split('T')[0] ?? ''
    }
    if (dateStr.includes('-')) {
      const isoMatch = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/)
      if (isoMatch && isoMatch[1] && isoMatch[2] && isoMatch[3]) {
        return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`
      }
    }

    // Parse "Mi 15.01.2025" or "15.01.2025" to "2025-01-15"
    const dateMatch = dateStr.match(/(\d{2})\.(\d{2})\.(\d{4})/)
    if (!dateMatch || !dateMatch[1] || !dateMatch[2] || !dateMatch[3]) {
      console.warn(`[${this.id}] Could not parse date: ${dateStr}`)
      return new Date().toISOString().split('T')[0] ?? ''
    }
    const [, day, month, year] = dateMatch
    return `${year}-${month}-${day}`
  }

  private extractPrice(flight: AirTiketaFlight): { basePrice: number, taxPrice: number, totalPrice: number } {
    let basePrice = 0
    let taxPrice = 0
    let totalPrice = 0

    const items = flight.preise?.preise || []
    if (items.length > 0) {
      const adultPrice = items.find(p => p.typ === 'erw') || items[0]
      if (adultPrice) {
        const priceData = flight.saison === 'neben' ? adultPrice.preis_ns : adultPrice.preis_hs
        if (priceData?.[0]) {
          basePrice = this.toNumber(priceData[0].ohne_tax) || 0
          taxPrice = this.toNumber(priceData[0].tax) || 0
          totalPrice = this.toNumber(priceData[0].endpreis) || (basePrice + taxPrice)
        }
      }
    }

    if (totalPrice === 0) {
      const baseCandidates = [
        flight.stufe_1,
        flight.stufe_2,
        flight.stufe_3,
        flight.stufe_4,
        flight.stufe_5,
        flight.preis_b_platz,
        flight.fremd_preis
      ]
      for (const candidate of baseCandidates) {
        const value = this.toNumber(candidate)
        if (value > 0) {
          basePrice = value
          break
        }
      }
      taxPrice = this.toNumber(flight.tax)
      totalPrice = basePrice > 0 ? basePrice + taxPrice : 0
    }

    return { basePrice, taxPrice, totalPrice }
  }

  private extractSeatsAvailable(flight: AirTiketaFlight): number {
    if (Array.isArray(flight.verbotenWeil) && flight.verbotenWeil.length > 0) {
      return 0
    }
    if (typeof flight.del === 'number' ? flight.del !== 0 : flight.del === '1') {
      return 0
    }
    if (typeof flight.aktiv === 'string' && flight.aktiv !== 'pub') {
      return 0
    }

    const plaetzeAnz = this.parseSeatValue(flight.plaetze_anz)
    if (plaetzeAnz.hasValue) {
      return plaetzeAnz.isNumeric ? plaetzeAnz.value : 9
    }
    const plaetzeErw = this.parseSeatValue(flight.plaetze_erw_chd)
    if (plaetzeErw.hasValue) {
      return plaetzeErw.isNumeric ? plaetzeErw.value : 9
    }
    const bestErw = this.parseSeatValue(flight.best_erw_chd)
    if (bestErw.hasValue) {
      return bestErw.isNumeric ? bestErw.value : 9
    }
    if (typeof flight.a_buchbar === 'number' && typeof flight.a_geb === 'number') {
      return Math.max(0, flight.a_buchbar - flight.a_geb)
    }
    if (typeof flight.a_buchbar === 'number') {
      return flight.a_buchbar
    }

    const candidates = [flight.available, flight.ec, flight.pec]
    for (const candidate of candidates) {
      const value = this.toNumber(candidate)
      if (value > 0) {
        return value
      }
    }

    return 0
  }

  private parseSeatValue(value: unknown): { value: number, hasValue: boolean, isNumeric: boolean } {
    if (value === null || value === undefined) {
      return { value: 0, hasValue: false, isNumeric: false }
    }
    if (typeof value === 'number') {
      return { value, hasValue: true, isNumeric: true }
    }
    if (typeof value === 'string') {
      const trimmed = value.trim()
      if (trimmed === '') {
        return { value: 0, hasValue: false, isNumeric: false }
      }
      const normalized = trimmed.replace(',', '.')
      const parsed = Number(normalized)
      if (Number.isFinite(parsed)) {
        return { value: parsed, hasValue: true, isNumeric: true }
      }
      return { value: 0, hasValue: true, isNumeric: false }
    }
    return { value: 0, hasValue: false, isNumeric: false }
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
    const searchParams = new URLSearchParams({
      von: params.origin,
      nach: params.destination,
      ab_datum: this.toAirTiketaDate(params.departureDate),
      typ: params.returnDate ? '2' : '1',
      erw: (params.adults || params.passengers || 1).toString(),
      chd: (params.children || 0).toString(),
      inf: (params.infants || 0).toString()
    })

    if (params.returnDate) {
      searchParams.set('ab_datum_r', this.toAirTiketaDate(params.returnDate))
    }

    return `${this.baseUrl}/?${searchParams.toString()}`
  }
}
