import { BaseFlightProvider } from './base.provider'
import type {
  Airport,
  FlightRoute,
  Flight,
  FlightSearchParams,
  KosovaFlyAirport,
  KosovaFlySearchForm
} from '../types/provider'

/**
 * EriFly flight object structure (WEBKOS system - same as KosovaFly)
 */
interface EriflyFlight {
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
  preise?: {
    preise: EriflyPriceItem[]
  }
}

interface EriflyPriceItem {
  typ: 'erw' | 'chd' | 'inf' // Passenger type
  preis_hs: [EriflyPrice, number] // High season [price, count]
  preis_ns: [EriflyPrice, number] // Low season [price, count]
}

interface EriflyPrice {
  endpreis: number
  ohne_tax: number
  tax: number
  provision?: number
}

/**
 * EriFly flight provider
 * Fetches flight data from erifly.eu via web scraping
 * Uses the WEBKOS i-booking system (same as KosovaFly/Dituria)
 */
export class EriflyProvider extends BaseFlightProvider {
  readonly id = 'erifly'
  readonly name = 'EriFly'
  readonly priority = 4

  private readonly baseUrl = 'https://www.erifly.eu'
  private sessionCookie: string | null = null
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

  // ==========================================================================
  // Session Management
  // ==========================================================================

  /**
   * Initialize session by fetching homepage and extracting AJAX URL
   */
  private async initSession(): Promise<void> {
    if (this.sessionCookie && this.ajaxUrl) {
      return // Session already initialized
    }

    console.log(`[${this.id}] Initializing session...`)

    try {
      const response = await fetch(this.baseUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'de-DE,de;q=0.9'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      // Extract session cookie (try various WEBKOS patterns)
      const setCookie = response.headers.get('set-cookie')
      if (setCookie) {
        const cookiePatterns = [
          /WEBKOS_BOOK_ERIFLY=([^;]+)/,
          /WEBKOS_BOOK_ERIFLY_EU=([^;]+)/,
          /WEBKOS[^=]*=([^;]+)/,
          /PHPSESSID=([^;]+)/
        ]
        for (const pattern of cookiePatterns) {
          const cookieMatch = setCookie.match(pattern)
          if (cookieMatch) {
            this.sessionCookie = cookieMatch[0]
            break
          }
        }
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

      console.log(`[${this.id}] Session initialized: cookie=${!!this.sessionCookie}, ajaxUrl=${this.ajaxUrl?.substring(0, 80)}...`)
    } catch (error) {
      console.error(`[${this.id}] Session init failed:`, error)
      throw error
    }
  }

  // ==========================================================================
  // Fetch Methods (Abstract implementations)
  // ==========================================================================

  protected async fetchAirports(): Promise<Airport[]> {
    // Return static airport list from embedded JavaScript config
    return EriflyProvider.AIRPORTS.map(apt => this.normalizeAirport(apt))
  }

  protected async fetchRoutes(): Promise<FlightRoute[]> {
    // Generate routes based on Kosovo/Balkan airports connecting to European destinations
    const routes: FlightRoute[] = []
    const europeAirports = EriflyProvider.AIRPORTS
      .map(a => a.kuerzel)
      .filter(code => !EriflyProvider.BALKAN_AIRPORTS.includes(code))

    // Routes FROM Kosovo to Europe
    for (const kosovoAirport of EriflyProvider.KOSOVO_AIRPORTS) {
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
    await this.initSession()

    if (!this.ajaxUrl || !this.sessionCookie) {
      console.warn(`[${this.id}] Session not properly initialized: ajaxUrl=${!!this.ajaxUrl}, cookie=${!!this.sessionCookie}`)
      return []
    }

    try {
      // Build form data
      const formData = this.buildFormData(params)

      console.log(`[${this.id}] Searching: ${params.origin} → ${params.destination} on ${params.departureDate}`)

      // Submit search form to AJAX endpoint
      const response = await fetch(this.ajaxUrl, {
        method: 'POST',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Content-Type': 'application/x-www-form-urlencoded',
          'Cookie': this.sessionCookie,
          'Referer': this.baseUrl,
          'Accept': 'application/json, text/javascript, */*; q=0.01',
          'X-Requested-With': 'XMLHttpRequest',
          'Origin': this.baseUrl
        },
        body: formData
      })

      if (!response.ok) {
        console.warn(`[${this.id}] Search request failed: HTTP ${response.status}`)
        return []
      }

      const responseText = await response.text()

      // Parse flight data from response (JSON with embedded JS or HTML)
      const eriflyFlights = this.parseFlightResponse(responseText)

      // Normalize to Flight objects
      const allFlights = eriflyFlights.map(ef => this.normalizeEriflyFlight(ef, params))

      // Filter to requested date only
      const targetDate = params.departureDate
      const filteredFlights = allFlights.filter(flight => flight.departureDate === targetDate)

      return filteredFlights
    } catch (error) {
      console.error(`[${this.id}] fetchFlights error:`, error)
      return []
    }
  }

  // ==========================================================================
  // Form Building
  // ==========================================================================

  private buildFormData(params: FlightSearchParams): string {
    const formFields: KosovaFlySearchForm = {
      VON: params.origin,
      NACH: params.destination,
      DATUM_HIN: this.toEriflyDate(params.departureDate),
      FLGART: params.returnDate ? 'rt' : 'ow',
      ANZERW: params.adults || params.passengers,
      ANZCHD: params.children || 0,
      ANZINF: params.infants || 0
    }

    if (params.returnDate) {
      formFields.DATUM_RUK = this.toEriflyDate(params.returnDate)
    }

    if (this.formHidden) {
      formFields.form_hidden = this.formHidden
    }

    // URL-encode the form data
    const encodedFields = Object.entries(formFields)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
      .join('&')

    return encodedFields
  }

  /**
   * Convert ISO date (YYYY-MM-DD) to EriFly format (DD.MM.YYYY)
   */
  private toEriflyDate(isoDate: string): string {
    const [year, month, day] = isoDate.split('-')
    return `${day}.${month}.${year}`
  }

  // ==========================================================================
  // Response Parsing
  // ==========================================================================

  /**
   * Parse flight data from response
   * EriFly returns JSON with embedded JavaScript that contains flight arrays
   * Format: { "json": "...JavaScript code with setFluege(fluege, ...)..." }
   */
  private parseFlightResponse(responseText: string): EriflyFlight[] {
    const flights: EriflyFlight[] = []

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

      // Strategy 0: Look for "hin":[ or "ruk":[ patterns (most reliable for WEBKOS)
      // The flight data is embedded as {"hin":[...], "ruk":[...]} in the response
      const hinRukPattern = /"(hin|ruk)"\s*:\s*\[/g
      let hinRukMatch
      while ((hinRukMatch = hinRukPattern.exec(content)) !== null) {
        const startIdx = content.indexOf('[', hinRukMatch.index)
        if (startIdx === -1) continue

        // Find matching closing bracket
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
                flights.push(...parsed as EriflyFlight[])
              }
            }
          } catch {
            // Failed to parse this array, continue to next
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
                flights.push(...validFlights as EriflyFlight[])
                break
              }
            }
          } catch {
            // Try with cleaned string
            try {
              const cleanedStr = arrayStr
                .replace(/,\s*}/g, '}')
                .replace(/,\s*]/g, ']')
              const parsed = JSON.parse(cleanedStr)
              if (Array.isArray(parsed)) {
                const validFlights = parsed.filter(f => this.isValidFlightObject(f))
                if (validFlights.length > 0) {
                  flights.push(...validFlights as EriflyFlight[])
                  break
                }
              }
            } catch {
              // Continue to next array
            }
          }
        }
      }
    } catch (error) {
      console.error(`[${this.id}] Response parsing error:`, error)
    }

    return flights
  }

  /**
   * Validate that an object has the required flight properties
   */
  private isValidFlightObject(obj: unknown): obj is EriflyFlight {
    if (!obj || typeof obj !== 'object') return false
    const flight = obj as Record<string, unknown>
    return (
      typeof flight.ab_datum === 'string'
      && typeof flight.ab_zeit === 'string'
      && typeof flight.von === 'string'
      && typeof flight.nach === 'string'
    )
  }

  // ==========================================================================
  // Data Normalization
  // ==========================================================================

  private normalizeAirport(apt: KosovaFlyAirport): Airport {
    const country = this.getCountryFromCode(apt.kuerzel)

    return {
      id: `${this.id}-${apt.kuerzel}`,
      code: apt.kuerzel,
      name: this.normalizeCityName(apt.stadt),
      city: this.normalizeCityName(apt.stadt),
      country
    }
  }

  /**
   * Normalize EriFly flight object to standard Flight interface
   */
  private normalizeEriflyFlight(ef: EriflyFlight, params: FlightSearchParams): Flight {
    const departureTime = ef.ab_zeit_f || ef.ab_zeit
    const arrivalTime = ef.an_zeit_f || ef.an_zeit
    const duration = this.calculateDuration(departureTime, arrivalTime)

    // Prefer ab_datum_zeit (ISO format) over ab_datum (DD.MM.YYYY format)
    const departureDate = ef.ab_datum_zeit
      ? this.fromEriflyDate(ef.ab_datum_zeit)
      : this.fromEriflyDate(ef.ab_datum) || params.departureDate

    const arrivalDate = ef.an_datum_zeit
      ? this.fromEriflyDate(ef.an_datum_zeit)
      : ef.an_datum ? this.fromEriflyDate(ef.an_datum) : departureDate

    // Extract price from preise structure
    const { basePrice, taxPrice, totalPrice } = this.extractPrice(ef, params)

    // Calculate available seats
    const seatsAvailable = ef.a_buchbar && ef.a_geb
      ? Math.max(0, ef.a_buchbar - ef.a_geb)
      : (totalPrice > 0 ? 9 : 0)

    // Flight is available if it has seats and a valid price
    const available = seatsAvailable > 0 && totalPrice > 0

    return {
      id: `${this.id}-${ef.carrier_flugnr}-${departureDate}-${departureTime}`,
      providerId: this.id,
      flightNumber: ef.carrier_flugnr,
      legType: 'outbound' as const,
      origin: {
        id: `${this.id}-${ef.von}`,
        code: ef.von,
        name: ef.von_name || this.getAirportName(ef.von),
        country: this.getCountryFromCode(ef.von)
      },
      destination: {
        id: `${this.id}-${ef.nach}`,
        code: ef.nach,
        name: ef.nach_name || this.getAirportName(ef.nach),
        country: this.getCountryFromCode(ef.nach)
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
      available,
      operatingCarrier: ef.company_name,
      cabinClass: 'Economy',
      stops: 0,
      bookingUrl: this.generateBookingUrl(params),
      fetchedAt: new Date()
    }
  }

  /**
   * Extract price from EriFly price structure
   */
  private extractPrice(ef: EriflyFlight, _params: FlightSearchParams): { basePrice: number, taxPrice: number, totalPrice: number } {
    let basePrice = 0
    let taxPrice = 0
    let totalPrice = 0

    if (ef.preise?.preise && ef.preise.preise.length > 0) {
      const adultPrice = ef.preise.preise.find(p => p.typ === 'erw')
      if (adultPrice) {
        const priceData = ef.saison === 'neben' ? adultPrice.preis_ns : adultPrice.preis_hs
        if (priceData?.[0]) {
          basePrice = this.toNumber(priceData[0].ohne_tax) || 0
          taxPrice = this.toNumber(priceData[0].tax) || 0
          totalPrice = this.toNumber(priceData[0].endpreis) || (basePrice + taxPrice)
        }
      }
    }

    return { basePrice, taxPrice, totalPrice }
  }

  /**
   * Safely convert a value to number
   */
  private toNumber(value: unknown): number {
    if (typeof value === 'number') return value
    if (typeof value === 'string') return parseFloat(value) || 0
    return 0
  }

  /**
   * Convert EriFly date to ISO format (YYYY-MM-DD)
   */
  private fromEriflyDate(eriflyDate: string): string {
    if (!eriflyDate) return ''

    // Check if it's already ISO format
    const isoMatch = eriflyDate.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (isoMatch) {
      return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`
    }

    // Extract DD.MM.YYYY from format like "Mi 31.12.2025" or "31.12.2025"
    const dateMatch = eriflyDate.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/)
    if (dateMatch && dateMatch[1] && dateMatch[2] && dateMatch[3]) {
      const [, day, month, year] = dateMatch
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
    }

    return ''
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  private normalizeCityName(name: string): string {
    return name
      .replace(/\//g, ' / ')
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
  }

  private getAirportName(code: string): string {
    const airport = EriflyProvider.AIRPORTS.find(a => a.kuerzel === code)
    return airport ? this.normalizeCityName(airport.stadt) : code
  }

  private getCountryFromCode(code: string): string {
    const countryMap: Record<string, string> = {
      // Germany
      DUS: 'Germany', BER: 'Germany', CGN: 'Germany', DTM: 'Germany',
      FRA: 'Germany', HAM: 'Germany', HAJ: 'Germany', MUC: 'Germany',
      NUE: 'Germany', STR: 'Germany', FMM: 'Germany', FDH: 'Germany',
      HHN: 'Germany', PAD: 'Germany', FMO: 'Germany', BRE: 'Germany',
      // Switzerland
      ZRH: 'Switzerland', BSL: 'Switzerland', GVA: 'Switzerland', MLH: 'Switzerland',
      // Austria
      VIE: 'Austria', SZG: 'Austria',
      // Kosovo
      PRN: 'Kosovo', KFZ: 'Kosovo',
      // Albania
      TIA: 'Albania',
      // North Macedonia
      SKP: 'North Macedonia', OHD: 'North Macedonia',
      // Montenegro
      TGD: 'Montenegro', FGD: 'Montenegro',
      // Greece
      SKG: 'Greece',
      // Italy
      MXP: 'Italy', BGY: 'Italy', FCO: 'Italy', VCE: 'Italy', VRN: 'Italy',
      // Belgium
      BRU: 'Belgium',
      // Netherlands
      AMS: 'Netherlands', MST: 'Netherlands',
      // France
      CDG: 'France', BVA: 'France', LYS: 'France',
      // UK
      LTN: 'United Kingdom', STN: 'United Kingdom',
      // Turkey
      IST: 'Turkey', SAW: 'Turkey', AYT: 'Turkey', ADA: 'Turkey',
      ADB: 'Turkey', BJV: 'Turkey', SZF: 'Turkey',
      // Other
      ARN: 'Sweden', GOT: 'Sweden', MMX: 'Sweden', HAD: 'Sweden', VXO: 'Sweden',
      CPH: 'Denmark', TRF: 'Norway', HEL: 'Finland',
      LUX: 'Luxembourg', BUD: 'Hungary', SOF: 'Bulgaria', BOJ: 'Bulgaria',
      BUH: 'Romania', OTP: 'Romania', KBP: 'Ukraine', LJU: 'Slovenia',
      PUY: 'Croatia', ALC: 'Spain', MAD: 'Spain', IAD: 'USA'
    }
    return countryMap[code] || 'Unknown'
  }

  private generateBookingUrl(params: FlightSearchParams): string {
    const searchParams = new URLSearchParams({
      VON: params.origin,
      NACH: params.destination,
      DATUM_HIN: this.toEriflyDate(params.departureDate),
      FLGART: params.returnDate ? 'rt' : 'ow',
      ANZERW: String(params.adults || params.passengers),
      ANZCHD: String(params.children || 0),
      ANZINF: String(params.infants || 0)
    })

    if (params.returnDate) {
      searchParams.set('DATUM_RUK', this.toEriflyDate(params.returnDate))
    }

    return `${this.baseUrl}/?${searchParams.toString()}`
  }
}
