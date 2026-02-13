/**
 * Bot Helper Functions
 *
 * Extracted utility functions for message classification and pattern detection
 */

// Airport codes commonly used in search queries
const AIRPORT_CODES = ['PRN', 'DUS', 'STR', 'MUC', 'FRA', 'ZRH', 'VIE', 'HAM', 'CGN', 'BER', 'TXL', 'SXF', 'TIA', 'NUE', 'HAJ', 'DTM', 'BSL', 'GVA', 'SZG']

// Date format patterns (e.g., 15.01, 15/01/2025, 15-01-25)
const DATE_FORMAT_PATTERN = /\d{1,2}[\.\/-]\d{1,2}(?:[\.\/-]\d{2,4})?/

// Month names in all supported languages
const MONTH_PATTERN = /\b(januar|februar|märz|april|mai|juni|juli|august|september|oktober|november|dezember|january|february|march|may|june|july|august|october|december|janar|shkurt|mars|prill|maj|qershor|korrik|gusht|shtator|tetor|nëntor|dhjetor)\b/i

// Flight route patterns (e.g., "von X nach Y", "from X to Y")
const ROUTE_PATTERN_DE = /\bvon\s+\w+\s+nach\b/i
const ROUTE_PATTERN_EN = /\bfrom\s+\w+\s+to\b/i
const ROUTE_PATTERN_SQ = /\bnga\s+\w+\s+për\b/i

/**
 * Check if text looks like a flight search query
 * Used to bypass post-search phase handling when user starts a new search
 */
export function looksLikeSearch(text: string): boolean {
  // Check for airport codes
  const hasAirportCode = new RegExp(`\\b(${AIRPORT_CODES.join('|')})\\b`, 'i').test(text)
  if (hasAirportCode) return true

  // Check for date formats
  if (DATE_FORMAT_PATTERN.test(text)) return true

  // Check for month names
  if (MONTH_PATTERN.test(text)) return true

  // Check for route patterns
  if (ROUTE_PATTERN_DE.test(text)) return true
  if (ROUTE_PATTERN_EN.test(text)) return true
  if (ROUTE_PATTERN_SQ.test(text)) return true

  return false
}

// Simple negative responses (start of message)
const SIMPLE_NEGATIVE_PATTERN = /^(nein|no|nuk|jo|ne|nope|nicht|niemals)\b/i

// Simple positive responses (start of message)
const SIMPLE_POSITIVE_PATTERN = /^(ja|yes|po|ok|okay|jep|jup|jawohl|genau|perfekt|super|danke|thx|thanks)\b/i

/**
 * Check if text is a simple "no" response
 */
export function isSimpleNo(text: string): boolean {
  return SIMPLE_NEGATIVE_PATTERN.test(text.trim())
}

/**
 * Check if text is a simple "yes" response
 */
export function isSimpleYes(text: string): boolean {
  return SIMPLE_POSITIVE_PATTERN.test(text.trim())
}

// Pattern to detect "reverse search" intent (swap from/to)
const REVERSE_PATTERN = /\b(anders\s*rum|andersrum|umgekehrt|andere\s*richtung|reverse|other\s*way|rückflug|zurück\s*fliegen|retour)\b/i

/**
 * Check if user wants to reverse the last search direction
 */
export function wantsReverseSearch(text: string): boolean {
  return REVERSE_PATTERN.test(text)
}

// Pattern for return flight requests
const RETURN_FLIGHT_PATTERN = /r[üu]ck(flug|reise)?|return\s*(flight)?|zur[üu]ck|back|kthim|fluturim.*kthim/i

/**
 * Check if user is asking for a return flight
 */
export function isReturnFlightRequest(text: string): boolean {
  return RETURN_FLIGHT_PATTERN.test(text)
}

// Thank-you pattern
const THANK_YOU_PATTERN = /^(danke|thanks|thank you|thx|faleminderit|falemnderit|merci|grazie|👍|🙏|dankeschön|vielen dank|danke schön|danke sehr)$/i

/**
 * Check if text is a thank-you message
 */
export function isThankYou(text: string): boolean {
  return THANK_YOU_PATTERN.test(text.trim())
}

// Reset/cancel command pattern
const RESET_PATTERN = /\b(neu|neue suche|neuer flug|reset|abbrechen|cancel|restart|start over|neuanfang|nochmal)\b/i

/**
 * Check if text is a reset/cancel command
 */
export function isResetCommand(text: string): boolean {
  return RESET_PATTERN.test(text.trim().toLowerCase())
}

// Greeting pattern
const GREETING_PATTERN = /^(hi|hallo|hey|servus|moin|hello|hola|ciao|yo|na\s*du|pershendetje|përshëndetje|tungjatjeta|p\.?sh\.?)\b/i

/**
 * Check if text is a greeting (only short messages)
 */
export function isGreeting(text: string): boolean {
  const trimmed = text.trim()
  return GREETING_PATTERN.test(trimmed) && trimmed.length <= 30
}

// Explicit help request pattern
const HELP_PATTERN = /^(hilfe|help|ndihmë|info|\?+|start)$/i

/**
 * Check if text is an explicit help request
 */
export function isExplicitHelpRequest(text: string): boolean {
  return HELP_PATTERN.test(text.trim())
}

// Flight intent patterns (keywords suggesting flight search)
const FLIGHT_INTENT_PATTERN = /\b(flug|flight|hinflug|rückflug|oneway|roundtrip|return|cheapest|billig|günstig|preis|price|search|buchung|buchen|airport|airline|airprishtina|kosovafly|dituria|erifly)\b/i
const RELATIVE_DATE_PATTERN = /\b(morgen|heute|übermorgen|nächste woche|next week|tomorrow|nesër|sot|pasnesër)\b/i
const AIRPORT_HINT_PATTERN = /\b(DUS|FRA|MUC|STR|BER|HAM|CGN|HAJ|NUE|DTM|ZRH|BSL|GVA|VIE|SZG|PRN|TIA)\b/i
const CITY_HINT_PATTERN = /\b(düsseldorf|duesseldorf|frankfurt|münchen|muenchen|stuttgart|berlin|hamburg|köln|koeln|hannover|nürnberg|nuernberg|pristina|prishtina|tirana|zurich|zürich|basel|genf|vienna|wien|salzburg)\b/i

/**
 * Check if text shows flight search intent
 */
export function isFlightIntent(text: string): boolean {
  const trimmed = text.trim()
  return (
    FLIGHT_INTENT_PATTERN.test(trimmed)
    || DATE_FORMAT_PATTERN.test(trimmed)
    || RELATIVE_DATE_PATTERN.test(trimmed)
    || AIRPORT_HINT_PATTERN.test(trimmed)
    || CITY_HINT_PATTERN.test(trimmed)
  )
}

// Language detection patterns
const LANG_ALBANIAN_PATTERN = /^(1|sq|shqip|albanian|albanisch|🇦🇱|🇽🇰)$/i
const LANG_ENGLISH_PATTERN = /^(2|en|english|englisch|🇬🇧|🇺🇸)$/i
const LANG_GERMAN_PATTERN = /^(3|de|deutsch|german|🇩🇪)$/i

/**
 * Detect language choice from user input (for first contact flow)
 */
export function detectLanguageChoice(text: string): 'de' | 'en' | 'sq' | null {
  const lower = text.toLowerCase().trim()

  // Albanian (1)
  if (LANG_ALBANIAN_PATTERN.test(lower) || lower.includes('shqip') || lower.includes('albanisch')) {
    return 'sq'
  }
  // English (2)
  if (LANG_ENGLISH_PATTERN.test(lower) || lower.includes('english') || lower.includes('englisch')) {
    return 'en'
  }
  // German (3)
  if (LANG_GERMAN_PATTERN.test(lower) || lower.includes('deutsch')) {
    return 'de'
  }

  return null
}
