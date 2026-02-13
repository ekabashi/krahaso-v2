/**
 * WhatsApp Message Parser
 * Parses flight search queries from natural language
 */

export interface ParsedQuery {
  type: 'search' | 'roundtrip' | 'alarm' | 'cheapest' | 'help' | 'unknown'
  from?: string // IATA code
  to?: string // IATA code
  outboundDate?: string // YYYY-MM-DD
  returnDate?: string // YYYY-MM-DD
  maxPrice?: number
  month?: string
  intent?: 'new_search' | 'continue' | 'unknown'
  language: 'de' | 'en' | 'sq'
  raw: string
  parserMeta?: {
    llmFailed?: boolean
    usedFallback?: boolean
    regexFailed?: boolean
  }
}

// Valid IATA codes (only these will be recognized)
const validIataCodes = new Set([
  // Deutschland
  'DUS', 'FRA', 'MUC', 'STR', 'BER', 'HAM', 'CGN', 'HAJ', 'DTM', 'NUE',
  'LEJ', 'BRE', 'DRS', 'FMO', 'PAD', 'FKB', 'FMM', 'FDH',
  // Schweiz
  'ZRH', 'BSL', 'GVA', 'BRN',
  // Österreich
  'VIE', 'SZG', 'INN', 'GRZ', 'LNZ', 'KLU',
  // Kosovo & Balkan
  'PRN', 'TIA', 'SKP',
  // Europa
  'LHR', 'CDG', 'AMS', 'BRU', 'MXP', 'FCO', 'BCN', 'MAD', 'IST'
])

// Airport aliases mapping cities/names to IATA codes
const airportAliases: Record<string, string> = {
  // Deutschland
  düsseldorf: 'DUS', duesseldorf: 'DUS', dus: 'DUS', dusseldorf: 'DUS',
  frankfurt: 'FRA', fra: 'FRA',
  münchen: 'MUC', munich: 'MUC', muenchen: 'MUC', muc: 'MUC',
  stuttgart: 'STR', str: 'STR',
  berlin: 'BER', ber: 'BER',
  hamburg: 'HAM', ham: 'HAM',
  köln: 'CGN', koeln: 'CGN', cologne: 'CGN', cgn: 'CGN',
  hannover: 'HAJ', haj: 'HAJ',
  dortmund: 'DTM', dtm: 'DTM',
  nürnberg: 'NUE', nuernberg: 'NUE', nue: 'NUE', nuremberg: 'NUE',
  leipzig: 'LEJ', lej: 'LEJ',
  bremen: 'BRE', bre: 'BRE',
  dresden: 'DRS', drs: 'DRS',
  münster: 'FMO', muenster: 'FMO', fmo: 'FMO',
  paderborn: 'PAD', pad: 'PAD',
  karlsruhe: 'FKB', fkb: 'FKB', baden: 'FKB',
  memmingen: 'FMM', fmm: 'FMM',
  friedrichshafen: 'FDH', fdh: 'FDH',

  // Schweiz
  zürich: 'ZRH', zurich: 'ZRH', zrh: 'ZRH', zuerich: 'ZRH',
  basel: 'BSL', bsl: 'BSL', euroairport: 'BSL',
  genf: 'GVA', geneva: 'GVA', gva: 'GVA', geneve: 'GVA',
  bern: 'BRN', brn: 'BRN',

  // Österreich
  wien: 'VIE', vienna: 'VIE', vie: 'VIE',
  salzburg: 'SZG', szg: 'SZG',
  innsbruck: 'INN', inn: 'INN',
  graz: 'GRZ', grz: 'GRZ',
  linz: 'LNZ', lnz: 'LNZ',
  klagenfurt: 'KLU', klu: 'KLU',

  // Kosovo
  pristina: 'PRN', prishtina: 'PRN', prishtinë: 'PRN', prn: 'PRN',
  prishtine: 'PRN', kosova: 'PRN', kosovo: 'PRN',

  // Albanien
  tirana: 'TIA', tiranë: 'TIA', tia: 'TIA', tirane: 'TIA',

  // Nordmazedonien
  skopje: 'SKP', skp: 'SKP', shkup: 'SKP',

  // Weitere beliebte
  london: 'LHR', lhr: 'LHR',
  paris: 'CDG', cdg: 'CDG',
  amsterdam: 'AMS', ams: 'AMS',
  brüssel: 'BRU', bruessel: 'BRU', brussels: 'BRU', bru: 'BRU',
  mailand: 'MXP', milan: 'MXP', mxp: 'MXP',
  rom: 'FCO', rome: 'FCO', fco: 'FCO',
  barcelona: 'BCN', bcn: 'BCN',
  madrid: 'MAD', mad: 'MAD',
  istanbul: 'IST', ist: 'IST'
}

// Month names in different languages
const monthNames: Record<string, number> = {
  // German
  januar: 1, jan: 1, jänner: 1,
  februar: 2, feb: 2,
  märz: 3, maerz: 3, mar: 3,
  april: 4, apr: 4,
  mai: 5,
  juni: 6, jun: 6,
  juli: 7, jul: 7,
  august: 8, aug: 8,
  september: 9, sep: 9, sept: 9,
  oktober: 10, okt: 10, oct: 10,
  november: 11, nov: 11,
  dezember: 12, dez: 12, dec: 12,
  // English
  january: 1, february: 2, march: 3, may: 5,
  june: 6, july: 7, october: 10, december: 12,
  // Albanian
  janar: 1, shkurt: 2, mars: 3, prill: 4,
  qershor: 6, korrik: 7, gusht: 8,
  shtator: 9, tetor: 10, nëntor: 11, dhjetor: 12
}

/**
 * Detect language from message
 */
function detectLanguage(text: string): 'de' | 'en' | 'sq' {
  const lowerText = text.toLowerCase()

  // Albanian indicators
  if (/\b(fluturim|kërko|çmim|për|nga|në|ditë|pershendetje|përshëndetje|tungjatjeta)\b/i.test(lowerText)) {
    return 'sq'
  }

  // German indicators
  if (/\b(flug|suche|nach|von|preis|günstig|billig)\b/i.test(lowerText)) {
    return 'de'
  }

  // Default to German (primary target audience)
  return 'de'
}

/**
 * Resolve airport code from text
 */
function resolveAirport(text: string): string | null {
  const lower = text.toLowerCase().trim()

  // Direct IATA code (3 letters) - only if in valid set
  if (/^[a-z]{3}$/.test(lower)) {
    const upper = lower.toUpperCase()
    if (validIataCodes.has(upper)) {
      return upper
    }
  }

  // Check aliases
  if (airportAliases[lower]) {
    return airportAliases[lower]
  }

  // Partial match (only for longer words to avoid false positives)
  if (lower.length >= 4) {
    for (const [alias, code] of Object.entries(airportAliases)) {
      if (alias.includes(lower) || lower.includes(alias)) {
        return code
      }
    }
  }

  return null
}

/**
 * Parse date from various formats
 * Supports: DD.MM, DD.MM.YYYY, DD/MM, DD-MM-YYYY, "15. März", etc.
 */
function parseDate(text: string): string | null {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  // DD.MM.YYYY or DD.MM.YY
  let match = text.match(/(\d{1,2})\.(\d{1,2})\.?(\d{2,4})?/)
  if (match) {
    const day = parseInt(match[1])
    const month = parseInt(match[2])
    let year = match[3] ? parseInt(match[3]) : currentYear

    // Handle 2-digit year
    if (year < 100) year += 2000

    // If date is in the past, assume next year
    if (year === currentYear && (month < currentMonth || (month === currentMonth && day < now.getDate()))) {
      year++
    }

    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  // DD/MM/YYYY
  match = text.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/)
  if (match) {
    const day = parseInt(match[1])
    const month = parseInt(match[2])
    let year = parseInt(match[3])
    if (year < 100) year += 2000
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  // "15. März" or "15 März" or "15 march"
  match = text.match(/(\d{1,2})\.?\s*([a-zäöüß]+)/i)
  if (match) {
    const day = parseInt(match[1])
    const monthName = match[2].toLowerCase()
    const month = monthNames[monthName]

    if (month) {
      let year = currentYear
      if (month < currentMonth || (month === currentMonth && day < now.getDate())) {
        year++
      }
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    }
  }

  return null
}

/**
 * Extract date range for roundtrip (e.g., "15.03-22.03" or "15.03 bis 22.03")
 */
function parseDateRange(text: string): { outbound: string | null, return: string | null } {
  // Pattern: DD.MM-DD.MM or DD.MM.YYYY-DD.MM.YYYY
  const rangeMatch = text.match(/(\d{1,2}\.\d{1,2}\.?\d{0,4})\s*[-–bis]+\s*(\d{1,2}\.\d{1,2}\.?\d{0,4})/i)

  if (rangeMatch) {
    return {
      outbound: parseDate(rangeMatch[1]),
      return: parseDate(rangeMatch[2])
    }
  }

  // Single date
  const singleDate = parseDate(text)
  return {
    outbound: singleDate,
    return: null
  }
}

/**
 * Extract price limit from alarm messages
 */
function extractPriceLimit(text: string): number | null {
  // "unter 80€" or "< 80" or "max 80" or "80€"
  const match = text.match(/(?:unter|below|<|max\.?|nën)\s*(\d+)\s*€?/i)
  if (match) {
    return parseInt(match[1])
  }

  // Just a number with € at the end
  const priceMatch = text.match(/(\d+)\s*€/)
  if (priceMatch) {
    return parseInt(priceMatch[1])
  }

  return null
}

/**
 * Extract airports from message
 */
function extractAirports(text: string): { from: string | null, to: string | null } {
  const words = text.toLowerCase().split(/[\s,]+/)
  const airports: string[] = []

  for (const word of words) {
    const airport = resolveAirport(word)
    if (airport && !airports.includes(airport)) {
      airports.push(airport)
    }
  }

  // If we found exactly 2 airports, assume first is origin, second is destination
  if (airports.length >= 2) {
    return { from: airports[0], to: airports[1] }
  }

  // If only one, try to guess (if it's PRN, probably destination)
  if (airports.length === 1) {
    if (airports[0] === 'PRN') {
      return { from: null, to: 'PRN' }
    }
    return { from: airports[0], to: null }
  }

  return { from: null, to: null }
}

/**
 * Determine query type from message
 */
function determineQueryType(text: string): ParsedQuery['type'] {
  const lower = text.toLowerCase()

  // Help commands
  if (/^(hilfe|help|ndihmë|info|\?|hi|hallo|hello|start|merhaba)$/i.test(lower.trim())) {
    return 'help'
  }

  // Alarm/Alert
  if (/\b(alarm|alert|benachricht|njofto|notify|watch)\b/i.test(lower)) {
    return 'alarm'
  }

  // Cheapest/Best day
  if (/\b(günstigst|billigst|cheapest|best|lirë)\b/i.test(lower)) {
    return 'cheapest'
  }

  // Check for date range (roundtrip indicator)
  if (/-|bis|to|deri|until/.test(lower) && /\d{1,2}\.\d{1,2}/.test(lower)) {
    return 'roundtrip'
  }

  // Default: simple search
  return 'search'
}

/**
 * Main parser function
 */
export function parseMessage(text: string): ParsedQuery {
  const language = detectLanguage(text)
  const type = determineQueryType(text)
  const airports = extractAirports(text)

  if (type === 'help') {
    return { type, language, raw: text, intent: 'unknown' }
  }

  if (type === 'unknown' || (!airports.from && !airports.to)) {
    // Try to extract at least something
    const hasAnyAirport = Object.keys(airportAliases).some(alias =>
      text.toLowerCase().includes(alias)
    ) || /[A-Z]{3}/.test(text)

    if (!hasAnyAirport) {
      return { type: 'help', language, raw: text }
    }
  }

  const dates = parseDateRange(text)

  const result: ParsedQuery = {
    type: dates.return ? 'roundtrip' : type,
    from: airports.from || undefined,
    to: airports.to || undefined,
    outboundDate: dates.outbound || undefined,
    returnDate: dates.return || undefined,
    intent: 'unknown',
    language,
    raw: text
  }

  // Extract price for alarms
  if (type === 'alarm') {
    result.maxPrice = extractPriceLimit(text) || undefined
  }

  return result
}

/**
 * Validate if query is complete enough for a search
 */
export function isQueryComplete(query: ParsedQuery): boolean {
  if (query.type === 'help') return true

  // Need at least origin, destination, and date for search
  if (query.type === 'search' || query.type === 'roundtrip') {
    return !!(query.from && query.to && query.outboundDate)
  }

  // Alarm needs airports and price
  if (query.type === 'alarm') {
    return !!(query.from && query.to && query.maxPrice)
  }

  return false
}

/**
 * Get missing fields for a query
 */
export function getMissingFields(query: ParsedQuery): string[] {
  const missing: string[] = []

  if (!query.from) missing.push('origin')
  if (!query.to) missing.push('destination')
  if (!query.outboundDate && query.type !== 'alarm') missing.push('date')
  if (query.type === 'alarm' && !query.maxPrice) missing.push('price')

  return missing
}
