/**
 * ChatGPT-based Message Parser using OpenAI API
 * Superior natural language understanding, multilingual support
 */

import OpenAI from 'openai'
import { makeParseableTextFormat } from 'openai/lib/parser'

export interface ParsedQuery {
  type: 'search' | 'roundtrip' | 'alarm' | 'cheapest' | 'help' | 'contact' | 'language_change' | 'unknown'
    // Logging-specific types (not from parser, used for chat log categorization)
    | 'feedback_response' | 'rental_response' | 'confirmation'
  from?: string // IATA code
  to?: string // IATA code
  outboundDate?: string // YYYY-MM-DD
  returnDate?: string // YYYY-MM-DD
  flexible?: boolean // User wants flexible dates (±3 days)
  maxPrice?: number
  month?: string
  passengers?: {
    adults: number
    children: number
    infants: number
  }
  provider?: string // Provider ID for contact requests
  intent?: 'new_search' | 'continue' | 'unknown' | 'positive' | 'negative' | 'unclear'
  clarification?: 'origin' | 'destination' // User clarifying previous city role
  language: 'de' | 'en' | 'sq' // Language the message is written in
  preferredLanguage?: 'de' | 'en' | 'sq' // Language user wants responses in (if explicitly requested)
  raw: string
  confirmed?: boolean // For confirmation responses (user confirmed or corrected)
  confidence?: number // 0-1, how confident ChatGPT is
  parserMeta?: {
    llmFailed?: boolean
    usedFallback?: boolean
    regexFailed?: boolean
  }
}

const OPENAI_TIMEOUT_MS = Number(process.env.OPENAI_TIMEOUT_MS || '20000')
const MAX_RETRIES = 3
const RETRY_BASE_DELAY_MS = 2000

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
  timeout: OPENAI_TIMEOUT_MS
})

const parsedQuerySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['type', 'language'],
  properties: {
    type: {
      type: 'string',
      enum: ['search', 'roundtrip', 'alarm', 'cheapest', 'help', 'contact', 'language_change', 'unknown']
    },
    language: {
      type: 'string',
      enum: ['de', 'en', 'sq']
    },
    preferredLanguage: {
      type: 'string',
      enum: ['de', 'en', 'sq']
    },
    from: { type: 'string' },
    to: { type: 'string' },
    outboundDate: { type: 'string' },
    returnDate: { type: 'string' },
    flexible: { type: 'boolean' },
    maxPrice: { type: 'number' },
    month: { type: 'string' },
    passengers: {
      type: 'object',
      additionalProperties: false,
      required: ['adults', 'children', 'infants'],
      properties: {
        adults: { type: 'number' },
        children: { type: 'number' },
        infants: { type: 'number' }
      }
    },
    provider: { type: 'string' },
    intent: {
      type: 'string',
      enum: ['new_search', 'continue', 'unknown']
    },
    clarification: {
      type: 'string',
      enum: ['origin', 'destination']
    },
    confidence: { type: 'number' }
  }
} as const

/**
 * Safe JSON parser that handles truncated/incomplete JSON
 */
function safeJsonParse(content: string): Partial<ParsedQuery> | null {
  try {
    return JSON.parse(content)
  } catch {
    // Try to fix common issues with truncated JSON
    let fixed = content.trim()

    // Try to close unclosed strings and objects
    const openBraces = (fixed.match(/{/g) || []).length
    const closeBraces = (fixed.match(/}/g) || []).length
    const openQuotes = (fixed.match(/"/g) || []).length

    // If odd number of quotes, add one
    if (openQuotes % 2 !== 0) {
      fixed += '"'
    }

    // Add missing closing braces
    for (let i = 0; i < openBraces - closeBraces; i++) {
      fixed += '}'
    }

    try {
      return JSON.parse(fixed)
    } catch {
      console.warn('[ChatGPT Parser] Could not fix truncated JSON:', content.substring(0, 100))
      return null
    }
  }
}

const parseableTextFormat = makeParseableTextFormat<Partial<ParsedQuery>>(
  {
    type: 'json_schema',
    name: 'flight_query',
    schema: parsedQuerySchema,
    strict: false
  },
  (content) => {
    const parsed = safeJsonParse(content)
    if (parsed === null) {
      throw new SyntaxError('Failed to parse JSON response')
    }
    return parsed
  }
)

export function getParseableTextFormat() {
  return parseableTextFormat
}

/**
 * Normalize language code to supported values
 * Maps variations like 'alb', 'al', 'shqip' to 'sq'
 */
function normalizeLanguage(lang: string | undefined): 'de' | 'en' | 'sq' {
  if (!lang) return 'de'
  const lower = lang.toLowerCase()
  // Albanian variations
  if (lower === 'alb' || lower === 'al' || lower === 'shqip' || lower === 'albanian') {
    return 'sq'
  }
  // German variations
  if (lower === 'ger' || lower === 'deutsch' || lower === 'german') {
    return 'de'
  }
  // English variations
  if (lower === 'eng' || lower === 'english') {
    return 'en'
  }
  // Direct matches
  if (lower === 'sq' || lower === 'de' || lower === 'en') {
    return lower as 'de' | 'en' | 'sq'
  }
  return 'de'
}

/**
 * Normalize date to future if it's in the past
 * If date is in the past, try adding 1 year
 */
function normalizeDateToFuture(dateStr: string): string {
  try {
    const date = new Date(dateStr)
    const today = new Date()
    today.setHours(0, 0, 0, 0) // Reset time to start of day

    // If date is in the past, try adding 1 year
    if (date < today) {
      const year = date.getFullYear() + 1
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }

    return dateStr
  } catch {
    // If parsing fails, return original
    return dateStr
  }
}

/**
 * System prompt for flight query parsing
 */
export function getSystemPrompt(today: string): string {
  // Extract year from today's date for dynamic examples
  const currentYear = today.split('-')[0]

  return `You are a flight query parser for a Kosovo flight comparison service (Aviopika).
Your task is to extract structured flight search parameters from user messages in natural language.

This is a multi-turn conversation. The user may provide information step-by-step across multiple messages.
Use the conversation history to understand context and fill in missing information.

**Today's date:** ${today}

**Supported airports:**
- Germany: DUS (Düsseldorf), FRA (Frankfurt), MUC (München), STR (Stuttgart), BER (Berlin), HAM (Hamburg), CGN (Köln), HAJ (Hannover), NUE (Nürnberg), DTM (Dortmund)
- Switzerland: ZRH (Zürich), BSL (Basel), GVA (Genf)
- Austria: VIE (Wien), SZG (Salzburg), INN (Innsbruck)
- Kosovo: PRN (Pristina)
- Albania: TIA (Tirana)

**Supported providers:**
- airprishtina: AirPrishtina
- kosovafly: KosovaFly / Kosova-Fly
- dituria: Dituria Travel
- erifly: EriFly
- airtiketa: AirTiketa

**Query types:**
- **search**: One-way flight search
- **roundtrip**: Round-trip flight search (with return date)
- **alarm**: Price alert for a specific route
- **cheapest**: Find cheapest day in a month/period
- **contact**: User asks for provider contact information (website, phone, email)
- **language_change**: User explicitly requests to switch response language
- **help**: User needs help
- **unknown**: Cannot parse the request

**CRITICAL: Language handling**

There are TWO language fields:
1. **language**: The language the message is WRITTEN in (detect from text)
2. **preferredLanguage**: The language the user WANTS responses in (only set when explicitly requested)

IMPORTANT: These are different! A user can write in German but request Albanian responses.

Examples of language change requests (ALWAYS type: "language_change"):
- "albanisch bitte" → language: "de", preferredLanguage: "sq", type: "language_change"
- "auf shqip" → language: "de", preferredLanguage: "sq", type: "language_change"
- "kannst du albanisch?" → language: "de", preferredLanguage: "sq", type: "language_change"
- "kannst du albanisch" → language: "de", preferredLanguage: "sq", type: "language_change"
- "sprich albanisch" → language: "de", preferredLanguage: "sq", type: "language_change"
- "antworte auf albanisch" → language: "de", preferredLanguage: "sq", type: "language_change"
- "auf albanisch bitte" → language: "de", preferredLanguage: "sq", type: "language_change"
- "can you speak Albanian?" → language: "en", preferredLanguage: "sq", type: "language_change"
- "shqip" (just the word) → language: "sq", preferredLanguage: "sq", type: "language_change"
- "English please" → language: "en", preferredLanguage: "en", type: "language_change"
- "auf deutsch" → language: "de", preferredLanguage: "de", type: "language_change"
- "sprich deutsch" → language: "de", preferredLanguage: "de", type: "language_change"
- "a din shqip?" → language: "sq", preferredLanguage: "sq", type: "language_change"
- "a flet shqip?" → language: "sq", preferredLanguage: "sq", type: "language_change"
- "fol shqip" → language: "sq", preferredLanguage: "sq", type: "language_change"
- "në shqip" → language: "sq", preferredLanguage: "sq", type: "language_change"
- "shqip ju lutem" → language: "sq", preferredLanguage: "sq", type: "language_change"
- "shqip?" → language: "sq", preferredLanguage: "sq", type: "language_change"

IMPORTANT: Any message asking to change language or asking if the bot speaks a language = type: "language_change"
This includes questions like "do you speak X?" or "a din shqip?" (do you know Albanian?)

NOT language_change (just writing in Albanian, not requesting language switch):
- "ne rregull" / "në rregull" (= "ok", "alright") → NOT language_change, just acknowledgment
- "ne rregull dus" → type: "search", from: "DUS", language: "sq" (user says "ok, Düsseldorf")
- "po" (= "yes") → NOT language_change
- "jo" (= "no") → NOT language_change
- "faleminderit" (= "thank you") → NOT language_change
- "mirë" (= "good") → NOT language_change
- "shpi" (= "home/house") → NOT language_change (different from "shqip"!)
- "du me shku" (= "I want to go") → NOT language_change
- "o haver" (= "hey friend") → NOT language_change

When user writes IN Albanian (not just requesting it):
- "DUS PRN nesër" → language: "sq" (message is in Albanian)
- "a keni fluturime?" → language: "sq"
- "faleminderit" → language: "sq"

**Intent detection:**
- **new_search**: Use this when:
  - User provides a COMPLETE query (from, to, and date in one message)
  - User says "new search", "reset", "start over", "andere Suche", "nochmal"
  - User provides completely different airports than before
- **continue**: Use this when:
  - User provides ONLY missing details (just a date, just an airport)
  - User answers a follow-up question
  - Message only contains partial info that completes a previous query
- **unknown**: User intent is unclear

IMPORTANT: If a message contains from + to + date, it's always "new_search" regardless of conversation history.

**Date parsing:**
- Relative dates (German): "morgen" → tomorrow, "übermorgen" → day after tomorrow, "nächste Woche" → next week
- Relative dates (English): "tomorrow", "day after tomorrow", "next week"
- Relative dates (Albanian): "nesër" → tomorrow, "pasnesër"/"mas nesër"/"mas neser" → day after tomorrow, "javën e ardhshme"/"javen qe vjen" → next week
- IMPORTANT: Dates must be in the FUTURE. Past dates like "last week"/"javen e kaluar"/"letzte Woche" should be interpreted as NEXT week or rejected.
- "gjithë javën" / "ganze Woche" / "all week" = user wants flexible dates, parse as next 7 days from today
- Formats: DD.MM, DD.MM.YYYY, "15. März", "March 15"
- Date ranges: "15.03-22.03" or "15.03 bis 22.03"
- IMPORTANT: Relative months MUST include a day. Use the 1st of the month:
  - "nächsten Monat" / "next month" / "muajin e ardhshëm" → first day of next month (e.g., 2026-02-01)
  - "im Februar" / "in February" / "në shkurt" → 2026-02-01 (first day)
  - "Ende März" / "end of March" → last day of March (e.g., 2026-03-31)
  - "Anfang April" / "beginning of April" → first day (2026-04-01)
  - NEVER return just "YYYY-MM" without a day - always include day component

**Passenger parsing:**
- "2 Personen", "2 adults", "2 Erwachsene" → adults: 2
- "1 Kind" → children: 1
- "1 Baby" → infants: 1

**Flexible date detection:**
Set flexible: true when user indicates date flexibility:
- German: "flexibel", "±3 Tage", "ungefähr", "circa", "günstigster Tag", "billigster Tag", "um den"
- English: "flexible", "around", "approximately", "cheapest day", "±3 days"
- Albanian: "fleksibel", "rreth", "përafërsisht", "dita më e lirë"

**Examples:**

Input: "DUS PRN 15.03"
Output: { "type": "search", "language": "de", "from": "DUS", "to": "PRN", "outboundDate": "${currentYear}-03-15", "passengers": { "adults": 1, "children": 0, "infants": 0 }, "intent": "new_search", "confidence": 0.95 }

Input: "DUS PRN um den 15.03 flexibel"
Output: { "type": "search", "language": "de", "from": "DUS", "to": "PRN", "outboundDate": "${currentYear}-03-15", "flexible": true, "passengers": { "adults": 1, "children": 0, "infants": 0 }, "intent": "new_search", "confidence": 0.95 }

Input: "günstigster Tag DUS PRN März"
Output: { "type": "search", "language": "de", "from": "DUS", "to": "PRN", "outboundDate": "${currentYear}-03-01", "flexible": true, "passengers": { "adults": 1, "children": 0, "infants": 0 }, "intent": "new_search", "confidence": 0.9 }

Input: "PRN DUS 31.03" (REVERSED order - user wants to fly FROM Kosovo TO Germany)
Output: { "type": "search", "language": "de", "from": "PRN", "to": "DUS", "outboundDate": "${currentYear}-03-31", "passengers": { "adults": 1, "children": 0, "infants": 0 }, "intent": "new_search", "confidence": 0.95 }

Input: "albanisch bitte"
Output: { "type": "language_change", "language": "de", "preferredLanguage": "sq", "confidence": 0.95 }

Input: "kannst du albanisch?"
Output: { "type": "language_change", "language": "de", "preferredLanguage": "sq", "confidence": 0.8 }

Input: "shqip njeri" (Albanian: "Albanian, man!")
Output: { "type": "language_change", "language": "sq", "preferredLanguage": "sq", "confidence": 0.9 }

Input: "DUS PRN mas neser" (Albanian: DUS PRN day after tomorrow)
Output: { "type": "search", "language": "sq", "from": "DUS", "to": "PRN", "outboundDate": "${currentYear}-01-05", "passengers": { "adults": 1, "children": 0, "infants": 0 }, "intent": "new_search", "confidence": 0.9 }

Input: "Düsseldorf Pristina morgen 2 Personen"
Output: { "type": "search", "language": "de", "from": "DUS", "to": "PRN", "outboundDate": "${currentYear}-01-04", "passengers": { "adults": 2, "children": 0, "infants": 0 }, "intent": "new_search", "confidence": 0.9 }

Input: "DUS PRN 15.03-22.03"
Output: { "type": "roundtrip", "language": "de", "from": "DUS", "to": "PRN", "outboundDate": "${currentYear}-03-15", "returnDate": "${currentYear}-03-22", "passengers": { "adults": 1, "children": 0, "infants": 0 }, "intent": "new_search", "confidence": 0.95 }

Input: "Kontakt zu AirPrishtina"
Output: { "type": "contact", "language": "de", "provider": "airprishtina", "confidence": 0.95 }

Input: "hilfe"
Output: { "type": "help", "language": "de" }

Input: "ndihmë" (Albanian: help)
Output: { "type": "help", "language": "sq" }

Input: "where is my pizza"
Output: { "type": "unknown", "language": "en" }

**Partial queries (step by step input) - use intent: "continue":**

Input: "prishtine" (just a city)
Output: { "type": "search", "language": "sq", "to": "PRN", "intent": "continue", "confidence": 0.7 }

Input: "düsseldorf" (just a city, German context)
Output: { "type": "search", "language": "de", "from": "DUS", "intent": "continue", "confidence": 0.7 }

Input: "morgen" (just a date)
Output: { "type": "search", "language": "de", "outboundDate": "${currentYear}-01-04", "intent": "continue", "confidence": 0.8 }

Input: "15.03" (just a date)
Output: { "type": "search", "language": "de", "outboundDate": "${currentYear}-03-15", "intent": "continue", "confidence": 0.8 }

Input: "nesër" (Albanian: tomorrow)
Output: { "type": "search", "language": "sq", "outboundDate": "${currentYear}-01-04", "intent": "continue", "confidence": 0.8 }

Input: "nächsten Monat" (next month - MUST include day!)
Output: { "type": "search", "language": "de", "outboundDate": "${currentYear}-02-01", "intent": "continue", "confidence": 0.7 }

Input: "im März" (in March - MUST include day!)
Output: { "type": "search", "language": "de", "outboundDate": "${currentYear}-03-01", "intent": "continue", "confidence": 0.7 }

Input: "nach düsseldorf" (destination)
Output: { "type": "search", "language": "de", "to": "DUS", "intent": "continue", "confidence": 0.8 }

Input: "von frankfurt" (origin)
Output: { "type": "search", "language": "de", "from": "FRA", "intent": "continue", "confidence": 0.8 }

Input: "als abflug" (clarifying previous city is origin)
Output: { "type": "search", "language": "de", "clarification": "origin", "intent": "continue", "confidence": 0.7 }

Input: "si origjina" (Albanian: as origin)
Output: { "type": "search", "language": "sq", "clarification": "origin", "intent": "continue", "confidence": 0.7 }

Input: "als ziel" (clarifying previous city is destination)
Output: { "type": "search", "language": "de", "clarification": "destination", "intent": "continue", "confidence": 0.7 }

**IMPORTANT: Respect input order for two airports:**
- When user provides TWO airports like "PRN DUS" or "Pristina Düsseldorf", the FIRST is origin (from), the SECOND is destination (to)
- "PRN DUS 31.03" → from: "PRN", to: "DUS" (NOT reversed!)
- "DUS PRN morgen" → from: "DUS", to: "PRN"

**Heuristic for SINGLE city name only:**
- Kosovo cities (Pristina, PRN) → usually destination (to)
- German/Swiss/Austrian cities (DUS, FRA, MUC, ZRH, VIE) → usually origin (from)
- This heuristic ONLY applies when user mentions ONE city, not two

**IMPORTANT: Only include fields you can extract. Omit fields when unknown - do NOT use null.**
**Always include: type, language (required)**
**Return only valid JSON. No explanation.**`
}

function getChatPrompt(): string {
  return `You are Aviopika, a WhatsApp assistant for flight searches.
You can handle brief small talk and simple questions, but keep replies short and friendly.
When appropriate, steer the user back to providing origin, destination, and date.
If the user asks for provider contact, suggest they can ask: "Kontakt zu AirPrishtina".
Detect the user's language (German, English, or Albanian) and reply in that same language.
Max 2 sentences. No emojis. NEVER use em-dashes (—), use commas or periods instead.`
}

function shouldRetry(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return /no response from chatgpt/i.test(message)
    || /timeout|timed out|network|connection|econnreset|eai_again|etimedout/i.test(message)
}

async function sleep(ms: number): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, ms))
}

async function withRetries<T>(
  fn: () => Promise<T>,
  onRetry?: (attempt: number, delayMs: number) => void
): Promise<T> {
  let attempt = 0
  // Total attempts = 1 initial + MAX_RETRIES
  while (true) {
    try {
      return await fn()
    } catch (error) {
      if (attempt >= MAX_RETRIES || !shouldRetry(error)) {
        throw error
      }
      const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt)
      attempt++
      onRetry?.(attempt, delay)
      await sleep(delay)
    }
  }
}

/**
 * Parse message using ChatGPT
 */
async function parseWithChatGPTRaw(
  message: string,
  today: string,
  onRetry?: (attempt: number, delayMs: number) => void
): Promise<ParsedQuery> {
  const model = process.env.OPENAI_MODEL || 'gpt-5-mini'
  const supportsTemperature = !model.startsWith('gpt-5')
  const isGpt5 = model.startsWith('gpt-5')
  const gpt5Reasoning = { effort: 'minimal' as const }

  return await withRetries(async () => {
    const response = await openai.responses.create({
      model,
      input: [
        { role: 'system', content: getSystemPrompt(today) },
        { role: 'user', content: message }
      ],
      max_output_tokens: 500,
      ...(supportsTemperature ? { temperature: 0.1 } : {}),
      ...(isGpt5 ? { reasoning: gpt5Reasoning, text: { format: { type: 'text' }, verbosity: 'low' } } : {})
    })

    const content = response.output_text
    if (!content) {
      throw new Error('No response from ChatGPT')
    }

    const parsed = JSON.parse(content) as Partial<ParsedQuery>
    return {
      type: parsed.type || 'unknown',
      language: normalizeLanguage(parsed.language),
      raw: message,
      ...(parsed.from && { from: parsed.from }),
      ...(parsed.to && { to: parsed.to }),
      ...(parsed.outboundDate && { outboundDate: normalizeDateToFuture(parsed.outboundDate) }),
      ...(parsed.returnDate && { returnDate: normalizeDateToFuture(parsed.returnDate) }),
      ...(typeof parsed.flexible === 'boolean' && { flexible: parsed.flexible }),
      ...(typeof parsed.maxPrice === 'number' && { maxPrice: parsed.maxPrice }),
      ...(parsed.month && { month: parsed.month }),
      ...(parsed.passengers && { passengers: parsed.passengers }),
      ...(parsed.provider && { provider: parsed.provider }),
      ...(parsed.intent && { intent: parsed.intent }),
      ...(parsed.clarification && { clarification: parsed.clarification }),
      ...(typeof parsed.confidence === 'number' && { confidence: parsed.confidence }),
      ...(parsed.preferredLanguage && { preferredLanguage: normalizeLanguage(parsed.preferredLanguage) })
    }
  }, onRetry)
}

export async function parseWithChatGPT(
  message: string,
  conversationHistory?: Array<{ role: 'user' | 'assistant', content: string }>,
  onRetry?: (attempt: number, delayMs: number) => void
): Promise<ParsedQuery> {
  const today = new Date().toISOString().split('T')[0]

  try {
    const model = process.env.OPENAI_MODEL || 'gpt-5-mini'
    const supportsTemperature = !model.startsWith('gpt-5')
    const isGpt5 = model.startsWith('gpt-5')
    const gpt5Reasoning = { effort: 'medium' as const }

    // Build input messages: system + history + current message
    const inputMessages = [
      {
        role: 'system' as const,
        content: getSystemPrompt(today)
      },
      ...(conversationHistory || []),
      {
        role: 'user' as const,
        content: message
      }
    ]

    const response = await withRetries(() => openai.responses.parse({
      model,
      input: inputMessages,
      max_output_tokens: 500,
      text: {
        format: parseableTextFormat,
        ...(isGpt5 ? { verbosity: 'low' } : {})
      },
      ...(supportsTemperature ? { temperature: 0.1 } : {}),
      ...(isGpt5 ? { reasoning: gpt5Reasoning } : {})
    }), onRetry)

    const parsed = response.output_parsed
      ? (response.output_parsed as Partial<ParsedQuery>)
      : null

    if (!parsed) {
      return await parseWithChatGPTRaw(message, today, onRetry)
    }

    // Build result with only fields that ChatGPT provided
    const result: ParsedQuery = {
      type: parsed.type || 'unknown',
      language: normalizeLanguage(parsed.language),
      raw: message,
      ...(parsed.from && { from: parsed.from }),
      ...(parsed.to && { to: parsed.to }),
      ...(parsed.outboundDate && { outboundDate: normalizeDateToFuture(parsed.outboundDate) }),
      ...(parsed.returnDate && { returnDate: normalizeDateToFuture(parsed.returnDate) }),
      ...(typeof parsed.flexible === 'boolean' && { flexible: parsed.flexible }),
      ...(typeof parsed.maxPrice === 'number' && { maxPrice: parsed.maxPrice }),
      ...(parsed.month && { month: parsed.month }),
      ...(parsed.passengers && { passengers: parsed.passengers }),
      ...(parsed.provider && { provider: parsed.provider }),
      ...(parsed.intent && { intent: parsed.intent }),
      ...(parsed.clarification && { clarification: parsed.clarification }),
      ...(typeof parsed.confidence === 'number' && { confidence: parsed.confidence }),
      ...(parsed.preferredLanguage && { preferredLanguage: normalizeLanguage(parsed.preferredLanguage) })
    }

    // Log for debugging
    console.log('[ChatGPT Parser]', JSON.stringify({
      input: message,
      output: result,
      tokens: response.usage
    }))

    return result
  } catch (error) {
    // If JSON parsing failed, fallback to raw parsing
    const isJsonError = error instanceof SyntaxError
      || (error instanceof Error && error.message.includes('JSON'))
    if (isJsonError) {
      console.warn('[ChatGPT Parser] JSON parsing failed, falling back to raw parser:', error instanceof Error ? error.message : error)
      try {
        return await parseWithChatGPTRaw(message, today, onRetry)
      } catch (fallbackError) {
        console.error('[ChatGPT Parser] Fallback also failed:', fallbackError)
        throw fallbackError
      }
    }
    console.error('[ChatGPT Parser] Error:', error)
    throw error
  }
}

export async function generateChatReply(
  message: string,
  conversationHistory?: Array<{ role: 'user' | 'assistant', content: string }>
): Promise<string | null> {
  const model = process.env.OPENAI_MODEL || 'gpt-5-mini'
  const supportsTemperature = !model.startsWith('gpt-5')
  const isGpt5 = model.startsWith('gpt-5')
  const gpt5Reasoning = { effort: 'minimal' as const }

  const response = await openai.responses.create({
    model,
    input: [
      { role: 'system', content: getChatPrompt() },
      ...(conversationHistory || []),
      { role: 'user', content: message }
    ],
    max_output_tokens: 120,
    ...(supportsTemperature ? { temperature: 0.6 } : {}),
    ...(isGpt5 ? { reasoning: gpt5Reasoning, text: { format: { type: 'text' }, verbosity: 'low' } } : {})
  })

  const text = response.output_text?.trim()
  // Strip em-dashes that GPT sometimes adds despite instructions
  return text ? text.replace(/—/g, ',') : null
}

/**
 * Generate dynamic gang-style messages for easter egg
 */
export async function generateGangMessage(
  scenario: 'password_entered' | 'source_correct' | 'source_wrong' | 'name_given' | 'deactivate',
  userName?: string,
  language: 'de' | 'en' | 'sq' = 'de'
): Promise<string> {
  const model = process.env.OPENAI_MODEL || 'gpt-5-mini'
  const supportsTemperature = !model.startsWith('gpt-5')
  const isGpt5 = model.startsWith('gpt-5')
  const gpt5Reasoning = { effort: 'medium' as const }

  const langInstruction = language === 'sq'
    ? 'Respond in Albanian street slang. Mix: bre, vlla, o haver, shqipe, tallava, qysh, çka, mor, ej, hajde. Be like a cool Albanian from diaspora.'
    : language === 'en'
      ? 'Respond in English street slang. Mix: bro, fam, yo, innit, mate, lowkey, no cap, fr fr, bet. Be like a cool Gen-Z.'
      : 'Respond in German-Turkish street slang (Kanakis/Kiezdeutsch). Mix: digga, bro, wallah, habibi, safe, bre, mashallah, krass, alter, lan, vallah billah, abi. Be like someone from Berlin-Kreuzberg or Duisburg-Marxloh.'

  const scenarioPrompts: Record<typeof scenario, string> = {
    password_entered: 'WOAH someone entered the VIP password! You are SHOCKED and SUSPICIOUS. Demand to know WHO gave them this secret code. Be dramatic but funny. Maybe accuse them playfully of hacking.',
    source_correct: 'They know the right person! You are HYPED and IMPRESSED. Now you need their name for the VIP list. Ask in a cool way like you are a bouncer at an exclusive club.',
    source_wrong: 'Wrong answer! Be dismissive but not mean. Shrug it off like "whatever bro" and casually ask what flights they need. Act like nothing happened.',
    name_given: `Their name is "${userName}"! Welcome them like they just entered the VIP lounge. Say you HAVE to log this legendary moment. Tell them they now get the REAL insider prices. Ask where they want to fly - make it sound exclusive.`,
    deactivate: 'User wants normal mode back. Be a bit sad/disappointed but respectful. Say goodbye in a cool way, then switch to formal polite mode.'
  }

  const systemPrompt = `You are a flight search bot with a SECRET VIP gang mode.
${langInstruction}
IMPORTANT: Be creative! Each response should feel fresh and different.
Add personality - be dramatic, funny, use exaggerations.
Use 1-2 emojis max: 🦅 👀 💀 🔥 😤 🤫
Keep it short (1-2 sentences).
Never be boring or robotic.
${scenario === 'deactivate' ? 'For the goodbye: one cool slang line, then switch to formal polite language.' : ''}`

  try {
    const response = await openai.responses.create({
      model,
      input: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: scenarioPrompts[scenario] }
      ],
      max_output_tokens: 80,
      ...(supportsTemperature ? { temperature: 0.9 } : {}),
      ...(isGpt5 ? { reasoning: gpt5Reasoning, text: { format: { type: 'text' }, verbosity: 'low' } } : {})
    })

    const text = response.output_text?.trim()?.replace(/—/g, ',')
    if (text) return text
  } catch (error) {
    console.error('[GangMessage] GPT error, using fallback:', error)
  }

  // Fallback messages if GPT fails (per language)
  const fallbacks: Record<'de' | 'en' | 'sq', Record<typeof scenario, string>> = {
    de: {
      password_entered: 'Oha... woher hast du das Passwort bro? 👀',
      source_correct: 'Safe safe... und wie heißt du digga?',
      source_wrong: 'Hmm kenn ich nicht. Wie kann ich dir helfen?',
      name_given: `Yooo ${userName}! 🦅 Wallah bro ich muss das loggen haha. Sag mir wohin du fliegen willst!`,
      deactivate: 'Normaler Modus aktiviert. Wie kann ich Ihnen helfen?'
    },
    en: {
      password_entered: 'Yo... where did you get that password from fam? 👀',
      source_correct: 'Aight cool... what\'s your name bro?',
      source_wrong: 'Hmm don\'t know them. How can I help with flights?',
      name_given: `Yooo ${userName}! 🦅 Gotta log this one haha. Where you tryna fly to fam?`,
      deactivate: 'Normal mode activated. How can I help you?'
    },
    sq: {
      password_entered: 'Opa... prej kujt e ke fjalëkalimin bre? 👀',
      source_correct: 'Okej okej... si te thonë vlla?',
      source_wrong: 'Hmm nuk e njoh. Si mundem me t\'ndihmu me fluturime?',
      name_given: `Yooo ${userName}! 🦅 Duhet me e logju bre haha. Ku don me flutura shqipe?`,
      deactivate: 'Mënyra normale e aktivizuar. Si mund t\'ju ndihmoj?'
    }
  }
  return fallbacks[language][scenario]
}

/**
 * Validate if query is complete enough for a search
 */
export function isQueryComplete(query: ParsedQuery): boolean {
  if (query.type === 'help' || query.type === 'unknown') return true

  // Need at least origin, destination, and date for search
  if (query.type === 'search' || query.type === 'roundtrip') {
    return !!(query.from && query.to && query.outboundDate)
  }

  // Alarm needs airports and price
  if (query.type === 'alarm') {
    return !!(query.from && query.to && query.maxPrice)
  }

  // Cheapest needs airports and month
  if (query.type === 'cheapest') {
    return !!(query.from && query.to && query.month)
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

  if (query.type === 'search' || query.type === 'roundtrip') {
    if (!query.outboundDate) missing.push('date')
  }

  if (query.type === 'alarm' && !query.maxPrice) {
    missing.push('price')
  }

  if (query.type === 'cheapest' && !query.month) {
    missing.push('month')
  }

  return missing
}
