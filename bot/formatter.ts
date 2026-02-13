/**
 * WhatsApp Response Formatter - Minimal Emoji Version
 * Formats flight search results for WhatsApp messages
 */

import type { ParsedQuery } from './parsers/index'

type Language = ParsedQuery['language']

// Website URL for links and tracking (defined early to avoid hoisting issues)
const websiteUrl = process.env.KRAHASO_URL || process.env.Krahaso_URL || 'https://krahaso.co'

// Flight type matching the API response
interface Flight {
  id: string
  providerId: string
  flightNumber: string
  legType: 'outbound' | 'return'
  origin: { code: string, name: string, city?: string }
  destination: { code: string, name: string, city?: string }
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
  stops: number
}

interface SearchResult {
  outboundFlights: Flight[]
  returnFlights?: Flight[]
  meta: {
    origin: string
    destination: string
    departureDate: string
    returnDate?: string
  }
}

// Provider display names
const providerNames: Record<string, string> = {
  airprishtina: 'AirPrishtina',
  kosovafly: 'KosovaFly',
  dituria: 'Dituria',
  erifly: 'EriFly',
  airtiketa: 'AirTiketa',
  prishtinaticket: 'PrishtinaTicket',
  flyksa: 'FlyKSA'
}

// Provider contact information
interface ProviderContact {
  name: string
  website: string
  phone?: string
  email?: string
}

const providerContacts: Record<string, ProviderContact> = {
  airprishtina: {
    name: 'AirPrishtina',
    website: 'https://airprishtina.com',
    phone: '+383 38 548 777',
    email: 'info@airprishtina.com'
  },
  kosovafly: {
    name: 'KosovaFly',
    website: 'https://kosova-fly.de',
    phone: '+49 211 17929649'
  },
  dituria: {
    name: 'Dituria Travel',
    website: 'https://www.dituria.net',
    phone: '+49 211 8632969'
  },
  erifly: {
    name: 'EriFly',
    website: 'https://erifly.com',
    phone: '+383 49 702 702'
  },
  airtiketa: {
    name: 'AirTiketa',
    website: 'https://airtiketa.com',
    phone: '+49 211 1796 9600'
  },
  prishtinaticket: {
    name: 'PrishtinaTicket',
    website: 'https://www.prishtinaticket.net'
  },
  flyksa: {
    name: 'FlyKSA',
    website: 'https://flyksa.com'
  }
}

// City names for airports
const airportCities: Record<string, string> = {
  PRN: 'Pristina',
  DUS: 'Düsseldorf',
  FRA: 'Frankfurt',
  MUC: 'München',
  STR: 'Stuttgart',
  BER: 'Berlin',
  HAM: 'Hamburg',
  CGN: 'Köln',
  HAJ: 'Hannover',
  NUE: 'Nürnberg',
  ZRH: 'Zürich',
  BSL: 'Basel',
  GVA: 'Genf',
  VIE: 'Wien',
  SZG: 'Salzburg',
  TIA: 'Tirana',
  SKP: 'Skopje'
}

/**
 * Format duration in minutes to human readable
 */
function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours}h ${mins}m`
}

const copy = {
  de: {
    firstContact: '*Willkommen bei Krahaso!* ✈️\n\nIch finde die günstigsten Flüge nach Kosovo für dich.\n\n*So geht\'s:*\n• "Düsseldorf Pristina morgen"\n• "DUS PRN 15.03-22.03" (Hin & Zurück)\n• "DUS PRN 15.03 flexibel" (±3 Tage)\n\nWohin soll\'s gehen?',
    disclaimer: '_Krahaso ist ein unabhängiger Preisvergleich. Wir verkaufen keine Flugtickets. Alle Preise ohne Gewähr. Weiterleitung zur Anbieter-Website._',
    badgeBestPrice: 'Bester Preis',
    badgeFastest: 'Schnellste',
    greeting: 'Hey! Sag mir Abflug, Ziel und Datum.\nBeispiel: "DUS PRN 15.03" oder "flexibel"',
    needMoreInfo: 'Ich brauche noch mehr Infos:\n\n',
    originMissingTitle: '*Abflugort fehlt*',
    originMissingHint: 'z.B. DUS, Frankfurt, Zürich',
    destinationMissingTitle: '*Zielort fehlt*',
    destinationMissingHint: 'z.B. PRN, Pristina',
    dateMissingTitle: '*Datum fehlt*',
    dateMissingHint: 'z.B. 15.03, 15. März',
    example: 'Beispiel: "DUS PRN 15.03"',
    helpPrompt: 'Schreibe "hilfe" für mehr Infos.',
    processing: 'Einen Moment...',
    connectionIssue: '⚠️ Wir können deine Anfrage gerade nicht verarbeiten. Bitte versuche es später erneut oder nutze unsere Webseite: {website}',
    searching: 'Suche Flüge {origin} → {destination} am {date}...',
    searchingRoundtrip: 'Suche Flüge {origin} ⇄ {destination} ({outDate} - {retDate})...',
    noResultsTitle: 'Keine Flüge gefunden für:',
    noResultsFor: '{origin} → {destination} am {date}',
    reasonsTitle: 'Mögliche Gründe:',
    reasonNoFlights: '• Keine Flüge an diesem Tag',
    reasonSoldOut: '• Alle Flüge ausverkauft',
    reasonFuture: '• Datum liegt zu weit in der Zukunft',
    tryTitle: 'Versuche:',
    tryOtherDate: '• Anderes Datum: "{from} {to} morgen"',
    tryCheapest: '• Flexibler: "billigster {from} {to}"',
    bookNow: 'Jetzt buchen',
    carRental: 'Mietwagen in Kosovo? autopika.al',
    bestCombination: 'Beste Kombination',
    outboundLabel: 'Hinflug',
    returnLabel: 'Rückflug',
    seatsLeft: 'Nur noch {count} Plätze!',
    seatLeft: 'Nur noch 1 Platz!',
    soldOut: 'Ausverkauft',
    unknown: 'Unbekannt',
    alarmActivatedTitle: '*Preisalarm aktiviert*',
    alarmNotify: 'Benachrichtigung wenn unter {price}€',
    alarmFooter: 'Wir melden uns, sobald ein günstiger Flug verfügbar ist!\n\n_Zum Deaktivieren: "stopp alarm"_',
    viewAllResults: 'Alle Ergebnisse auf krahaso.co',
    whatCanIAsk: '\n\n*Was kann ich noch fragen?*\n• Kontakt zu einem Anbieter\n• Webseite für Buchung\n• Telefonnummer für Rückfragen\n\nBeispiel: "Kontakt zu {provider}" oder "Webseite von {provider}"',
    moreFlights: '+ {count} weitere Flüge',
    moreFlight: '+ 1 weiterer Flug',
    stop: '1 Stopp',
    stops: '{count} Stopps'
  },
  en: {
    firstContact: '*Welcome to Krahaso!* ✈️\n\nI find the cheapest flights to Kosovo for you.\n\n*How it works:*\n• "Düsseldorf Pristina tomorrow"\n• "DUS PRN 15.03-22.03" (Roundtrip)\n• "DUS PRN 15.03 flexible" (±3 days)\n\nWhere would you like to go?',
    disclaimer: '_Krahaso is an independent price comparison. We do not sell flight tickets. All prices subject to change. Redirect to provider website._',
    badgeBestPrice: 'Best Price',
    badgeFastest: 'Fastest',
    greeting: 'Hey! Tell me origin, destination, and date.\nExample: "DUS PRN 15.03" or "flexible"',
    needMoreInfo: 'I need a bit more info:\n\n',
    originMissingTitle: '*Origin missing*',
    originMissingHint: 'e.g. DUS, Frankfurt, Zurich',
    destinationMissingTitle: '*Destination missing*',
    destinationMissingHint: 'e.g. PRN, Pristina',
    dateMissingTitle: '*Date missing*',
    dateMissingHint: 'e.g. 15.03, March 15',
    example: 'Example: "DUS PRN 15.03"',
    helpPrompt: 'Type "help" for more info.',
    processing: 'One moment...',
    connectionIssue: '⚠️ We cannot process your request right now. Please try later or use: {website}',
    searching: 'Searching flights {origin} → {destination} on {date}...',
    searchingRoundtrip: 'Searching flights {origin} ⇄ {destination} ({outDate} - {retDate})...',
    noResultsTitle: 'No flights found for:',
    noResultsFor: '{origin} → {destination} on {date}',
    reasonsTitle: 'Possible reasons:',
    reasonNoFlights: '• No flights on that day',
    reasonSoldOut: '• All flights sold out',
    reasonFuture: '• Date is too far in the future',
    tryTitle: 'Try:',
    tryOtherDate: '• Another date: "{from} {to} tomorrow"',
    tryCheapest: '• Flexible: "cheapest {from} {to}"',
    bookNow: 'Book now',
    carRental: 'Car rental in Kosovo? autopika.al',
    bestCombination: 'Best combination',
    outboundLabel: 'Outbound',
    returnLabel: 'Return',
    seatsLeft: 'Only {count} seats left!',
    seatLeft: 'Only 1 seat left!',
    soldOut: 'Sold out',
    unknown: 'Unknown',
    alarmActivatedTitle: '*Price alert activated*',
    alarmNotify: 'Notify me when below {price}€',
    alarmFooter: 'We will message you as soon as a cheaper flight is available!\n\n_To disable: "stop alarm"_',
    viewAllResults: 'View all results on krahaso.co',
    whatCanIAsk: '\n\n*What else can I ask?*\n• Contact to a provider\n• Website for booking\n• Phone number for questions\n\nExample: "Contact to {provider}" or "Website of {provider}"',
    moreFlights: '+ {count} more flights',
    moreFlight: '+ 1 more flight',
    stop: '1 stop',
    stops: '{count} stops'
  },
  sq: {
    firstContact: '*Mirë se vini në Krahaso!* ✈️\n\nGjej fluturimet më të lira për në Kosovë për ty.\n\n*Si funksionon:*\n• "Düsseldorf Pristina nesër"\n• "DUS PRN 15.03-22.03" (Vajtje-ardhje)\n• "DUS PRN 15.03 fleksibel" (±3 ditë)\n\nKu dëshiron të shkosh?',
    disclaimer: '_Krahaso është një krahasim i pavarur çmimesh. Nuk shesim bileta fluturimi. Të gjitha çmimet pa garanci. Ridrejtim në faqen e ofruesit._',
    badgeBestPrice: 'Çmimi më i mirë',
    badgeFastest: 'Më e shpejta',
    greeting: 'Përshëndetje! Më thuaj nisjen, destinacionin dhe datën.\nShembull: "DUS PRN 15.03" ose "fleksibel"',
    needMoreInfo: 'Më duhen edhe disa informacione:\n\n',
    originMissingTitle: '*Mungon aeroporti i nisjes*',
    originMissingHint: 'p.sh. DUS, Frankfurt, Zurich',
    destinationMissingTitle: '*Mungon destinacioni*',
    destinationMissingHint: 'p.sh. PRN, Pristina',
    dateMissingTitle: '*Mungon data*',
    dateMissingHint: 'p.sh. 15.03, 15 Mars',
    example: 'Shembull: "DUS PRN 15.03"',
    helpPrompt: 'Shkruaj "ndihmë" për më shumë info.',
    processing: 'Një moment...',
    connectionIssue: '⚠️ Nuk mund ta përpunojmë kërkesën tënde tani. Provo më vonë ose përdor: {website}',
    searching: 'Po kërkoj fluturime {origin} → {destination} më {date}...',
    searchingRoundtrip: 'Po kërkoj fluturime {origin} ⇄ {destination} ({outDate} - {retDate})...',
    noResultsTitle: 'Nuk u gjetën fluturime për:',
    noResultsFor: '{origin} → {destination} më {date}',
    reasonsTitle: 'Arsye të mundshme:',
    reasonNoFlights: '• Nuk ka fluturime atë ditë',
    reasonSoldOut: '• Të gjitha fluturimet janë të shitura',
    reasonFuture: '• Data është shumë larg në të ardhmen',
    tryTitle: 'Provo:',
    tryOtherDate: '• Datë tjetër: "{from} {to} nesër"',
    tryCheapest: '• Më fleksibël: "lirë {from} {to}"',
    bookNow: 'Rezervo tani',
    carRental: 'Makina me qira në Kosovë? autopika.al',
    bestCombination: 'Kombinimi më i mirë',
    outboundLabel: 'Nisja',
    returnLabel: 'Kthimi',
    seatsLeft: 'Vetëm {count} vende të lira!',
    seatLeft: 'Vetëm 1 vend i lirë!',
    soldOut: 'E shitur',
    unknown: 'E panjohur',
    alarmActivatedTitle: '*Alarmi i çmimit u aktivizua*',
    alarmNotify: 'Njofto kur bie nën {price}€',
    alarmFooter: 'Do të të njoftojmë sapo të ketë një çmim më të lirë!\n\n_Për ta çaktivizuar: "ndalo alarm"_',
    viewAllResults: 'Shiko të gjitha rezultatet në krahaso.co',
    whatCanIAsk: '\n\n*Çfarë tjetër mund të pyes?*\n• Kontakt me një ofrues\n• Webfaqe për rezervim\n• Numër telefoni për pyetje\n\nShembull: "Kontakt me {provider}" ose "Webfaqe e {provider}"',
    moreFlights: '+ {count} fluturime të tjera',
    moreFlight: '+ 1 fluturim tjetër',
    stop: '1 ndalesë',
    stops: '{count} ndalesa'
  }
} as const

const localeMap: Record<Language, string> = {
  de: 'de-DE',
  en: 'en-GB',
  sq: 'sq-AL'
}

function getCopy(language: Language) {
  return copy[language] || copy.de
}

/**
 * Format date to localized format
 */
function _formatDate(isoDate: string, language: Language): string {
  const date = new Date(isoDate)
  return date.toLocaleDateString(localeMap[language] || 'de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

/**
 * Format date to nice localized format
 */
function formatDateNice(isoDate: string, language: Language): string {
  const date = new Date(isoDate)
  return date.toLocaleDateString(localeMap[language] || 'de-DE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

/**
 * Get airport city name or code fallback
 */
function getAirportCity(code: string): string {
  return airportCities[code] || code
}

/**
 * Generate deep link to search results on website with tracking parameters
 */
function generateSearchLink(query: ParsedQuery, websiteUrl: string, phoneNumber?: string): string {
  const params = new URLSearchParams()

  // Search parameters
  if (query.from) params.set('from', query.from)
  if (query.to) params.set('to', query.to)
  if (query.outboundDate) params.set('date', query.outboundDate)
  if (query.returnDate) params.set('returnDate', query.returnDate)
  if (query.passengers) {
    params.set('adults', query.passengers.adults.toString())
    if (query.passengers.children > 0) params.set('children', query.passengers.children.toString())
    if (query.passengers.infants > 0) params.set('infants', query.passengers.infants.toString())
  }

  // Tracking parameters for deeplink attribution
  params.set('ref', 'wa') // Kompakt: wa = WhatsApp Bot

  // Generate unique deeplink ID for tracking
  const deeplinkId = crypto.randomUUID().slice(0, 8) // Nur 8 Zeichen
  params.set('dl', deeplinkId)

  // Session hash for user correlation (privacy-safe, compact)
  if (phoneNumber) {
    const sessionHash = Math.abs(phoneNumber.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0)
      return a & a
    }, 0)).toString(36).slice(0, 6)
    params.set('s', sessionHash)
  }

  return `${websiteUrl}/flights?${params.toString()}`
}

/**
 * Determine badges for flights
 */
function determineBadges(flights: Flight[]): Map<string, string[]> {
  const badges = new Map<string, string[]>()

  if (flights.length === 0) return badges

  // Find best price (lowest total price among available flights)
  const availableFlights = flights.filter(f => f.available)
  const flightsToCheck = availableFlights.length > 0 ? availableFlights : flights

  const sortedByPrice = [...flightsToCheck].sort((a, b) => a.totalPrice - b.totalPrice)
  const sortedByDuration = [...flightsToCheck].sort((a, b) => a.duration - b.duration)

  const bestPriceId = sortedByPrice[0]?.id
  const fastestId = sortedByDuration[0]?.id

  // Assign badges (avoid duplicate badges on same flight)
  if (bestPriceId) {
    badges.set(bestPriceId, ['bestPrice'])
  }
  if (fastestId && fastestId !== bestPriceId) {
    badges.set(fastestId, ['fastest'])
  }

  return badges
}

/**
 * Format badge string
 */
function formatBadge(badgeType: string, language: Language): string {
  const strings = getCopy(language)
  switch (badgeType) {
    case 'bestPrice':
      return `⭐ ${strings.badgeBestPrice}`
    case 'fastest':
      return `🚀 ${strings.badgeFastest}`
    default:
      return ''
  }
}

/**
 * Format flight message line
 */
function formatFlight(flight: Flight, language: Language, badges?: string[]): string {
  const strings = getCopy(language)
  const provider = providerNames[flight.providerId] || flight.providerId
  const duration = formatDuration(flight.duration)
  const stopsText = flight.stops > 0
    ? ` (${flight.stops === 1 ? strings.stop : strings.stops.replace('{count}', flight.stops.toString())})`
    : ''

  // Check if flight is sold out (unavailable OR 0-price)
  const isSoldOut = !flight.available || flight.totalPrice <= 0

  // Badge line (only for bookable flights)
  const badgeStr = !isSoldOut
    ? badges?.map(b => formatBadge(b, language)).filter(Boolean).join(' ') || ''
    : ''

  // Price display: show "Ausverkauft" instead of 0.00€
  const priceDisplay = isSoldOut ? `_${strings.soldOut}_` : `${flight.totalPrice.toFixed(2)} ${flight.currency}`

  let message = `*${provider}* - ${priceDisplay}`
  if (badgeStr) {
    message += `  ${badgeStr}`
  }
  message += '\n'
  message += `${flight.departureTime} → ${flight.arrivalTime} (${duration})${stopsText}\n`

  // Show seats left only for bookable flights
  if (!isSoldOut && flight.seatsAvailable <= 5 && flight.seatsAvailable > 0) {
    message += flight.seatsAvailable === 1
      ? strings.seatLeft
      : strings.seatsLeft.replace('{count}', flight.seatsAvailable.toString())
  }

  return message
}

/**
 * Check if a flight is bookable (available AND has valid price)
 */
function isBookableFlight(flight: Flight): boolean {
  return flight.available && flight.totalPrice > 0
}

/**
 * Get availability stats from search results (for analytics)
 */
export function getAvailabilityStats(result: { outboundFlights: Flight[], returnFlights?: Flight[] }): {
  totalFlights: number
  bookableFlights: number
  soldOutFlights: number
  hasAvailability: boolean
} {
  const allFlights = [...result.outboundFlights, ...(result.returnFlights || [])]
  const bookable = allFlights.filter(isBookableFlight)
  const soldOut = allFlights.filter(f => !isBookableFlight(f))

  return {
    totalFlights: allFlights.length,
    bookableFlights: bookable.length,
    soldOutFlights: soldOut.length,
    hasAvailability: bookable.length > 0
  }
}

/**
 * Format one-way flight results
 */
export function formatOneWayResults(result: SearchResult, query: ParsedQuery, websiteUrl: string, phoneNumber?: string): string {
  const language = query.language || 'de'
  const strings = getCopy(language)

  const from = getAirportCity(result.meta.origin)
  const to = getAirportCity(result.meta.destination)
  const date = formatDateNice(result.meta.departureDate, language)

  let message = `*${from} → ${to}*\n${date}\n`
  message += '---\n'

  if (result.outboundFlights.length === 0) {
    return formatNoResults(query)
  }

  // Sort: bookable flights first (by price), then sold-out flights
  const bookableFlights = result.outboundFlights.filter(isBookableFlight)
  const soldOutFlights = result.outboundFlights.filter(f => !isBookableFlight(f))

  const sortedFlights = [
    ...bookableFlights.sort((a, b) => a.totalPrice - b.totalPrice),
    ...soldOutFlights
  ].slice(0, 3)

  // Determine badges only for bookable flights
  const badges = determineBadges(bookableFlights)

  sortedFlights.forEach((flight, index) => {
    const flightBadges = badges.get(flight.id)
    message += `${index + 1}. ${formatFlight(flight, language, flightBadges)}\n`
  })

  if (result.outboundFlights.length > 3) {
    const remaining = result.outboundFlights.length - 3
    const moreText = remaining === 1
      ? strings.moreFlight
      : strings.moreFlights.replace('{count}', remaining.toString())
    message += `_${moreText}_\n`
  }

  message += '---\n'

  // Deep link to search results on website (with tracking)
  const searchLink = generateSearchLink(query, websiteUrl, phoneNumber)
  message += `${strings.viewAllResults}:\n${searchLink}\n`
  message += '---\n'

  // Hint about what user can ask for
  const firstProvider = sortedFlights[0] ? providerNames[sortedFlights[0].providerId] || sortedFlights[0].providerId : 'AirPrishtina'
  message += strings.whatCanIAsk.replace(/{provider}/g, firstProvider).trim()

  // Legal disclaimer
  message += `\n---\n${strings.disclaimer}`

  return message
}

/**
 * Format roundtrip flight results
 */
export function formatRoundtripResults(result: SearchResult, query: ParsedQuery, websiteUrl: string, phoneNumber?: string): string {
  const language = query.language || 'de'
  const strings = getCopy(language)

  const from = getAirportCity(result.meta.origin)
  const to = getAirportCity(result.meta.destination)
  const outDate = formatDateNice(result.meta.departureDate, language)
  const retDate = result.meta.returnDate ? formatDateNice(result.meta.returnDate, language) : ''

  let message = `*${from} ⇄ ${to}*\n`
  message += `${outDate} - ${retDate}\n`
  message += '---\n'

  if (result.outboundFlights.length === 0 || (result.returnFlights || []).length === 0) {
    return formatNoResults(query)
  }

  // Find best combinations - prefer bookable, fallback to any
  const bookableOutbound = result.outboundFlights.filter(isBookableFlight)
  const bookableReturn = (result.returnFlights || []).filter(isBookableFlight)

  // Try bookable first, then fallback to all flights
  const outbound = bookableOutbound.sort((a, b) => a.totalPrice - b.totalPrice)[0]
    || result.outboundFlights[0]
  const returnFlight = bookableReturn.sort((a, b) => a.totalPrice - b.totalPrice)[0]
    || (result.returnFlights || [])[0]

  if (!outbound || !returnFlight) {
    return formatNoResults(query)
  }

  // Check if combination is bookable
  const hasBookableCombination = isBookableFlight(outbound) && isBookableFlight(returnFlight)
  const totalPrice = outbound.totalPrice + returnFlight.totalPrice

  // Determine badges (only for bookable flights)
  const outboundBadges = determineBadges(bookableOutbound)
  const returnBadges = determineBadges(bookableReturn)

  if (hasBookableCombination) {
    message += `*${strings.bestCombination}* - ${totalPrice.toFixed(2)} ${outbound.currency}  ⭐ ${strings.badgeBestPrice}\n`
  } else {
    message += `*${strings.bestCombination}* - _${strings.soldOut}_\n`
  }
  message += `${strings.outboundLabel}:\n${formatFlight(outbound, language, outboundBadges.get(outbound.id))}`
  message += `${strings.returnLabel}:\n${formatFlight(returnFlight, language, returnBadges.get(returnFlight.id))}`
  message += '---\n'

  // Deep link to search results on website (with tracking)
  const searchLink = generateSearchLink(query, websiteUrl, phoneNumber)
  message += `${strings.viewAllResults}:\n${searchLink}\n`
  message += '---\n'

  // Hint about what user can ask for
  const firstProvider = providerNames[outbound.providerId] || outbound.providerId
  message += strings.whatCanIAsk.replace(/{provider}/g, firstProvider).trim()

  // Legal disclaimer
  message += `\n---\n${strings.disclaimer}`

  return message
}

/**
 * Format help message
 */
export function formatHelpMessage(language: Language): string {
  const strings = getCopy(language)

  if (language === 'en') {
    return `*Krahaso Flight Search*

Search flights to Kosovo:
"DUS PRN 15.03" - One-way
"DUS PRN 15.03-22.03" - Roundtrip
"DUS PRN 15.03 flexible" - Cheapest day (±3 days)

Supported airports:
Germany: DUS, FRA, MUC, STR, BER, CGN, HAM, HAJ, NUE
Switzerland: ZRH, BSL, GVA
Austria: VIE, SZG
Kosovo: PRN

${strings.example}
${websiteUrl || 'https://krahaso.co'}`
  }

  if (language === 'sq') {
    return `*Krahaso Kërkim Fluturimi*

Kërko fluturime për në Kosovë:
"DUS PRN 15.03" - Një drejtim
"DUS PRN 15.03-22.03" - Vajtje-ardhje
"DUS PRN 15.03 fleksibel" - Dita më e lirë (±3 ditë)

Aeroportet e mbështetura:
Gjermani: DUS, FRA, MUC, STR, BER, CGN, HAM, HAJ, NUE
Zvicër: ZRH, BSL, GVA
Austri: VIE, SZG
Kosovë: PRN

${strings.example}
${websiteUrl || 'https://krahaso.co'}`
  }

  // German (default)
  return `*Krahaso Flugsuche*

Flüge nach Kosovo suchen:
"DUS PRN 15.03" - Einfacher Flug
"DUS PRN 15.03-22.03" - Hin-Rückflug
"DUS PRN 15.03 flexibel" - Günstigster Tag (±3 Tage)

Unterstützte Flughäfen:
Deutschland: DUS, FRA, MUC, STR, BER, CGN, HAM, HAJ, NUE
Schweiz: ZRH, BSL, GVA
Österreich: VIE, SZG
Kosovo: PRN

${strings.example}
${websiteUrl || 'https://krahaso.co'}`
}

/**
 * Format incomplete query message with contextual guidance
 */
export function formatIncompleteQuery(query: ParsedQuery, missing: string[]): string {
  const strings = getCopy(query.language || 'de')

  // Show what we already have
  const hasInfo: string[] = []
  if (query.from) hasInfo.push(query.language === 'de' ? `Von: ${getAirportCity(query.from)}` : query.language === 'en' ? `From: ${getAirportCity(query.from)}` : `Nga: ${getAirportCity(query.from)}`)
  if (query.to) hasInfo.push(query.language === 'de' ? `Nach: ${getAirportCity(query.to)}` : query.language === 'en' ? `To: ${getAirportCity(query.to)}` : `Në: ${getAirportCity(query.to)}`)
  if (query.outboundDate) hasInfo.push(query.language === 'de' ? `Datum: ${formatDateNice(query.outboundDate, query.language)}` : query.language === 'en' ? `Date: ${formatDateNice(query.outboundDate, query.language)}` : `Data: ${formatDateNice(query.outboundDate, query.language)}`)

  let message = ''

  if (hasInfo.length > 0) {
    message += hasInfo.join('\n') + '\n\n'
  }

  message += strings.needMoreInfo

  // Context-aware suggestions
  if (missing.includes('origin')) {
    message += `${strings.originMissingTitle}\n   ${strings.originMissingHint}\n\n`
  }

  if (missing.includes('destination')) {
    message += `${strings.destinationMissingTitle}\n   ${strings.destinationMissingHint}\n\n`
  }

  if (missing.includes('date')) {
    message += `${strings.dateMissingTitle}\n   ${strings.dateMissingHint}\n\n`

    // Add smart suggestions based on what's missing
    if (!missing.includes('origin') && !missing.includes('destination')) {
      const shortcuts = query.language === 'de'
        ? 'Oder sag einfach: "morgen", "nächste Woche", "15.03"'
        : query.language === 'en'
          ? 'Or just say: "tomorrow", "next week", "15.03"'
          : 'Ose thjesht thuaj: "nesër", "javën e ardhshme", "15.03"'
      message += `_${shortcuts}_\n\n`
    }
  }

  return message.trim()
}

/**
 * Format searching message
 */
export function formatSearchingMessage(query: ParsedQuery): string {
  const language = query.language || 'de'
  const strings = getCopy(language)
  const from = query.from ? getAirportCity(query.from) : ''
  const to = query.to ? getAirportCity(query.to) : ''
  const outDate = query.outboundDate ? formatDateNice(query.outboundDate, language) : ''
  const retDate = query.returnDate ? formatDateNice(query.returnDate, language) : ''

  // Use roundtrip format if return date exists
  if (query.returnDate) {
    return strings.searchingRoundtrip
      .replace('{origin}', from)
      .replace('{destination}', to)
      .replace('{outDate}', outDate)
      .replace('{retDate}', retDate)
  }

  return strings.searching
    .replace('{origin}', from)
    .replace('{destination}', to)
    .replace('{date}', outDate)
}

/**
 * Format error message
 */
export function formatErrorMessage(language: Language): string {
  if (language === 'en') {
    return 'Sorry, something went wrong. Please try again.'
  }
  if (language === 'sq') {
    return 'Na vjen keq, diçka shkoi keq. Ju lutem provoni përsëri.'
  }
  return 'Entschuldigung, etwas ist schiefgelaufen. Bitte versuche es erneut.'
}

/**
 * Format no results message
 */
export function formatNoResults(query: ParsedQuery): string {
  const strings = getCopy(query.language || 'de')
  const from = query.from ? getAirportCity(query.from) : query.from || ''
  const to = query.to ? getAirportCity(query.to) : query.to || ''
  const date = query.outboundDate ? formatDateNice(query.outboundDate, query.language || 'de') : ''

  let message = `${strings.noResultsTitle}\n`
  message += strings.noResultsFor
    .replace('{origin}', from)
    .replace('{destination}', to)
    .replace('{date}', date) + '\n\n'

  message += `${strings.reasonsTitle}\n`
  message += `${strings.reasonNoFlights}\n`
  message += `${strings.reasonSoldOut}\n`
  message += `${strings.reasonFuture}\n\n`

  message += `${strings.tryTitle}\n`
  message += strings.tryOtherDate.replace('{from}', from).replace('{to}', to)

  return message
}

/**
 * Format first contact message (new users)
 */
export function formatFirstContactMessage(language: Language): string {
  const strings = getCopy(language)
  return strings.firstContact
}

/**
 * Format greeting message (returning users)
 */
export function formatGreetingMessage(language: Language): string {
  const strings = getCopy(language)
  return strings.greeting
}

/**
 * Format processing message
 */
export function formatProcessingMessage(language: Language): string {
  const strings = getCopy(language)
  return strings.processing
}

export function formatConnectionIssueMessage(language: Language, websiteUrl: string): string {
  const strings = getCopy(language)
  return strings.connectionIssue.replace('{website}', websiteUrl)
}

/**
 * Format confirmation message before search
 */
export function formatConfirmationMessage(query: ParsedQuery): string {
  const language = query.language || 'de'
  const from = query.from ? `${getAirportCity(query.from)} (${query.from})` : ''
  const to = query.to ? `${getAirportCity(query.to)} (${query.to})` : ''
  const outDate = query.outboundDate ? formatDateNice(query.outboundDate, language) : ''
  const retDate = query.returnDate ? formatDateNice(query.returnDate, language) : ''

  // Format passengers
  const adults = query.passengers?.adults || 1
  const children = query.passengers?.children || 0
  const infants = query.passengers?.infants || 0

  const passengerParts: string[] = []

  if (language === 'de') {
    if (adults === 1) passengerParts.push('1 Erwachsener')
    else if (adults > 1) passengerParts.push(`${adults} Erwachsene`)

    if (children === 1) passengerParts.push('1 Kind')
    else if (children > 1) passengerParts.push(`${children} Kinder`)

    if (infants === 1) passengerParts.push('1 Baby')
    else if (infants > 1) passengerParts.push(`${infants} Babys`)
  } else if (language === 'en') {
    if (adults === 1) passengerParts.push('1 adult')
    else if (adults > 1) passengerParts.push(`${adults} adults`)

    if (children === 1) passengerParts.push('1 child')
    else if (children > 1) passengerParts.push(`${children} children`)

    if (infants === 1) passengerParts.push('1 infant')
    else if (infants > 1) passengerParts.push(`${infants} infants`)
  } else {
    // Albanian
    if (adults === 1) passengerParts.push('1 i rritur')
    else if (adults > 1) passengerParts.push(`${adults} të rritur`)

    if (children === 1) passengerParts.push('1 fëmijë')
    else if (children > 1) passengerParts.push(`${children} fëmijë`)

    if (infants === 1) passengerParts.push('1 bebe')
    else if (infants > 1) passengerParts.push(`${infants} bebe`)
  }

  const passengersText = passengerParts.join(', ')

  // Build message based on language
  if (language === 'de') {
    let message = `Okay, ich fasse zusammen: Du möchtest von *${from}* nach *${to}*`
    if (retDate) {
      message += ` am *${outDate}* fliegen und am *${retDate}* zurück`
    } else {
      message += ` am *${outDate}* fliegen`
    }
    message += ` (${passengersText}).`
    message += `\n\nStimmt das? Soll ich so suchen?`
    return message
  }

  if (language === 'en') {
    let message = `Okay, let me summarize: You want to fly from *${from}* to *${to}*`
    if (retDate) {
      message += ` on *${outDate}* and return on *${retDate}*`
    } else {
      message += ` on *${outDate}*`
    }
    message += ` (${passengersText}).`
    message += `\n\nIs that correct? Should I search?`
    return message
  }

  // Albanian
  let message = `Në rregull, po përmbledh: Ti dëshiron të fluturosh nga *${from}* në *${to}*`
  if (retDate) {
    message += ` më *${outDate}* dhe të kthehesh më *${retDate}*`
  } else {
    message += ` më *${outDate}*`
  }
  message += ` (${passengersText}).`
  message += `\n\nA është në rregull? Të kërkoj?`
  return message
}

/**
 * Generate tracking URL for provider contact
 */
function generateContactTrackingUrl(providerId: string, contactType: 'web' | 'phone', sessionHash?: string): string {
  const baseUrl = websiteUrl
  const params = new URLSearchParams()
  params.set('t', contactType)
  if (sessionHash) {
    params.set('s', sessionHash)
  }
  return `${baseUrl}/api/go/${providerId}?${params.toString()}`
}

/**
 * Format provider contact information with tracking URLs
 */
export function formatProviderContact(providerId: string, language: Language = 'de', phoneNumber?: string): string | null {
  const provider = providerContacts[providerId.toLowerCase()]

  if (!provider) {
    return null
  }

  // Generate session hash for tracking correlation
  let sessionHash: string | undefined
  if (phoneNumber) {
    sessionHash = Math.abs(phoneNumber.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0)
      return a & a
    }, 0)).toString(36).slice(0, 6)
  }

  const webUrl = generateContactTrackingUrl(providerId.toLowerCase(), 'web', sessionHash)
  const phoneUrl = provider.phone ? generateContactTrackingUrl(providerId.toLowerCase(), 'phone', sessionHash) : null

  let message = `*${provider.name}*\n\n`

  if (language === 'de') {
    message += `🌐 Webseite: ${webUrl}\n`
    if (phoneUrl) message += `📱 Telefon: ${phoneUrl}\n`
    if (provider.email) message += `📧 E-Mail: ${provider.email}\n`
  } else if (language === 'en') {
    message += `🌐 Website: ${webUrl}\n`
    if (phoneUrl) message += `📱 Phone: ${phoneUrl}\n`
    if (provider.email) message += `📧 Email: ${provider.email}\n`
  } else if (language === 'sq') {
    message += `🌐 Webfaqe: ${webUrl}\n`
    if (phoneUrl) message += `📱 Telefon: ${phoneUrl}\n`
    if (provider.email) message += `📧 Email: ${provider.email}\n`
  }

  return message.trim()
}

/**
 * Get list of all providers with contact info
 */
export function getAllProviders(): string[] {
  return Object.keys(providerContacts)
}

/**
 * Flexible date price info from API
 */
interface DatePriceInfo {
  date: string
  minPrice: number | null
  flightCount: number
  currency: string
}

/**
 * Flexible search result structure
 */
interface FlexibleSearchResult {
  outbound: {
    dates: DatePriceInfo[]
    cheapestDate: string | null
  }
  return?: {
    dates: DatePriceInfo[]
    cheapestDate: string | null
  }
  meta: {
    origin: string
    destination: string
    centerDepartureDate: string
    centerReturnDate?: string
    dateRange: number
  }
}

/**
 * Format flexible search results showing cheapest dates
 */
export function formatFlexibleResults(
  result: FlexibleSearchResult,
  query: ParsedQuery,
  websiteUrl: string
): string {
  const lang = query.language || 'de'
  const origin = getAirportCity(result.meta.origin) || result.meta.origin
  const destination = getAirportCity(result.meta.destination) || result.meta.destination

  const headers = {
    de: `*${origin} → ${destination}*\n📅 Flexible Datumssuche (±3 Tage)\n`,
    en: `*${origin} → ${destination}*\nFlexible date search (±3 days)\n`,
    sq: `*${origin} → ${destination}*\nKërkim fleksibël i datës (±3 ditë)\n`
  }

  let message = headers[lang]

  // Find cheapest date
  const cheapestDate = result.outbound.cheapestDate
  const cheapestInfo = result.outbound.dates.find(d => d.date === cheapestDate)

  if (cheapestInfo && cheapestInfo.minPrice) {
    const dateFormatted = formatDateShort(cheapestInfo.date, lang)
    const cheapestLabels = {
      de: `\n🏆 *Günstigster Tag: ${dateFormatted}*\nab *${cheapestInfo.minPrice}€*\n`,
      en: `\n🏆 *Cheapest day: ${dateFormatted}*\nfrom *${cheapestInfo.minPrice}€*\n`,
      sq: `\n🏆 *Dita më e lirë: ${dateFormatted}*\nnga *${cheapestInfo.minPrice}€*\n`
    }
    message += cheapestLabels[lang]
  }

  // Show other dates with availability
  const otherDatesLabels = {
    de: '\nAndere Optionen:',
    en: '\nOther options:',
    sq: '\nOpsione të tjera:'
  }
  message += otherDatesLabels[lang]

  const availableDates = result.outbound.dates
    .filter(d => d.date !== cheapestDate && d.flightCount > 0)
    .sort((a, b) => (a.minPrice || 999) - (b.minPrice || 999))
    .slice(0, 4) // Show max 4 alternatives

  for (const dateInfo of availableDates) {
    const dateFormatted = formatDateShort(dateInfo.date, lang)
    if (dateInfo.minPrice) {
      message += `\n• ${dateFormatted}: ${dateInfo.minPrice}€`
    }
  }

  // Show sold out dates
  const soldOutDates = result.outbound.dates
    .filter(d => d.flightCount === 0 || d.minPrice === null)

  if (soldOutDates.length > 0) {
    const soldOutLabels = {
      de: ' (ausverkauft)',
      en: ' (sold out)',
      sq: ' (shitur)'
    }
    const soldOutDateStrs = soldOutDates
      .slice(0, 2)
      .map(d => formatDateShort(d.date, lang))
      .join(', ')
    message += `\n• ${soldOutDateStrs}${soldOutLabels[lang]}`
  }

  // Add booking link
  const bookingLinks = {
    de: `\n\n🔗 Direkt buchen:`,
    en: `\n\n🔗 Book directly:`,
    sq: `\n\n🔗 Rezervo direkt:`
  }
  message += bookingLinks[lang]

  if (cheapestDate) {
    message += `\n${websiteUrl}/flights?from=${result.meta.origin}&to=${result.meta.destination}&date=${cheapestDate}`
  }

  return message
}

/**
 * Format sold-out fallback message with flexible date suggestion
 */
export function formatSoldOutWithAlternatives(
  originalDate: string,
  flexibleResult: FlexibleSearchResult,
  query: ParsedQuery
): string {
  const lang = query.language || 'de'
  const origin = getAirportCity(flexibleResult.meta.origin) || flexibleResult.meta.origin
  const destination = getAirportCity(flexibleResult.meta.destination) || flexibleResult.meta.destination
  const originalDateFormatted = formatDateShort(originalDate, lang)

  const soldOutHeaders = {
    de: `*${origin} → ${destination}*\n${originalDateFormatted}\n\n❌ Leider ausverkauft für diesen Tag.`,
    en: `*${origin} → ${destination}*\n${originalDateFormatted}\n\n❌ Unfortunately sold out for this day.`,
    sq: `*${origin} → ${destination}*\n${originalDateFormatted}\n\n❌ Fatkeqësisht e shitur për këtë ditë.`
  }

  let message = soldOutHeaders[lang]

  // Find cheapest available date
  const cheapestDate = flexibleResult.outbound.cheapestDate
  const cheapestInfo = flexibleResult.outbound.dates.find(d => d.date === cheapestDate)

  if (cheapestInfo && cheapestInfo.minPrice) {
    const dateFormatted = formatDateShort(cheapestInfo.date, lang)
    const alternativeLabels = {
      de: `\n\n✅ Aber am *${dateFormatted}* gibt es noch Plätze ab *${cheapestInfo.minPrice}€*!`,
      en: `\n\n✅ But on *${dateFormatted}* there are still seats from *${cheapestInfo.minPrice}€*!`,
      sq: `\n\n✅ Por më *${dateFormatted}* ka ende vende nga *${cheapestInfo.minPrice}€*!`
    }
    message += alternativeLabels[lang]

    // Show a few more alternatives
    const otherAvailable = flexibleResult.outbound.dates
      .filter(d => d.date !== cheapestDate && d.flightCount > 0 && d.minPrice)
      .sort((a, b) => (a.minPrice || 999) - (b.minPrice || 999))
      .slice(0, 3)

    if (otherAvailable.length > 0) {
      const moreOptionsLabels = {
        de: '\n\nWeitere verfügbare Tage:',
        en: '\n\nMore available days:',
        sq: '\n\nDitë të tjera në dispozicion:'
      }
      message += moreOptionsLabels[lang]

      for (const dateInfo of otherAvailable) {
        const dateStr = formatDateShort(dateInfo.date, lang)
        message += `\n• ${dateStr}: ${dateInfo.minPrice}€`
      }
    }
  } else {
    // No alternatives found
    const noAlternativesLabels = {
      de: '\n\nAuch in den nächsten Tagen (±3) keine Verfügbarkeit gefunden.',
      en: '\n\nNo availability found in the next days (±3) either.',
      sq: '\n\nAsnjë disponueshmëri nuk u gjet as në ditët e ardhshme (±3).'
    }
    message += noAlternativesLabels[lang]
  }

  return message
}

/**
 * Format date as short string (e.g., "15. März" or "Mar 15")
 */
function formatDateShort(dateStr: string, lang: Language): string {
  const date = new Date(dateStr)
  const day = date.getDate()

  const monthNames = {
    de: ['Jan', 'Feb', 'März', 'Apr', 'Mai', 'Juni', 'Juli', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'],
    en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    sq: ['Jan', 'Shk', 'Mar', 'Pri', 'Maj', 'Qer', 'Kor', 'Gus', 'Sht', 'Tet', 'Nën', 'Dhj']
  }

  const month = monthNames[lang][date.getMonth()]

  if (lang === 'de') {
    return `${day}. ${month}`
  }
  return `${month} ${day}`
}

