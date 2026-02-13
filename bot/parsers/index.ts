/**
 * Parser Module with ChatGPT + Regex Fallback
 */

import { parseWithChatGPT, isQueryComplete as isQueryCompleteChatGPT, getMissingFields as getMissingFieldsChatGPT } from './chatgpt'
import type { ParsedQuery } from './chatgpt'

// Re-export types
export type { ParsedQuery }

// Parser statistics
let stats = {
  chatgpt: { success: 0, fail: 0, totalMs: 0 }
}

/**
 * Parse message with ChatGPT, fallback to regex on error
 */
export async function parseMessage(
  text: string,
  conversationHistory?: Array<{ role: 'user' | 'assistant', content: string }>,
  onRetry?: (attempt: number, delayMs: number) => void
): Promise<ParsedQuery> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('Missing OPENAI_API_KEY')
  }

  const start = Date.now()
  try {
    const result = await parseWithChatGPT(text, conversationHistory, onRetry)
    const duration = Date.now() - start

    stats.chatgpt.success++
    stats.chatgpt.totalMs += duration

    console.log(`[Parser] ChatGPT success (${duration}ms)`)
    return {
      ...result,
      parserMeta: { llmFailed: false, usedFallback: false }
    }
  } catch (error) {
    const duration = Date.now() - start
    stats.chatgpt.fail++
    stats.chatgpt.totalMs += duration

    console.error(`[Parser] ChatGPT failed (${duration}ms)`, error)
    throw error
  }
}

/**
 * Check if query is complete
 */
export function isQueryComplete(query: ParsedQuery): boolean {
  return isQueryCompleteChatGPT(query)
}

/**
 * Get missing fields
 */
export function getMissingFields(query: ParsedQuery): string[] {
  return getMissingFieldsChatGPT(query)
}

/**
 * Validation error types
 */
export interface ValidationError {
  field: 'date' | 'route' | 'passengers'
  code: 'invalid_date' | 'same_origin_destination' | 'no_adult'
  message: Record<'de' | 'en' | 'sq', string>
}

/**
 * Check if a date string is valid (e.g., 31.02 is invalid)
 */
function isValidDate(dateStr: string): boolean {
  if (!dateStr) return true // No date = no validation needed

  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return false

  // Check if the date components match (catches invalid dates like Feb 31)
  const [year, month, day] = dateStr.split('-').map(Number)
  return (
    date.getFullYear() === year
    && date.getMonth() + 1 === month
    && date.getDate() === day
  )
}

/**
 * Validate query for logical errors
 * Returns array of validation errors (empty if valid)
 */
export function validateQuery(query: ParsedQuery): ValidationError[] {
  const errors: ValidationError[] = []

  // EC-007: Check for invalid dates (e.g., 31.02)
  if (query.outboundDate && !isValidDate(query.outboundDate)) {
    errors.push({
      field: 'date',
      code: 'invalid_date',
      message: {
        de: `Das Datum "${query.outboundDate}" ist ungültig. Bitte gib ein korrektes Datum an.`,
        en: `The date "${query.outboundDate}" is invalid. Please provide a valid date.`,
        sq: `Data "${query.outboundDate}" është e pavlefshme. Ju lutem jepni një datë të saktë.`
      }
    })
  }
  if (query.returnDate && !isValidDate(query.returnDate)) {
    errors.push({
      field: 'date',
      code: 'invalid_date',
      message: {
        de: `Das Rückflugdatum "${query.returnDate}" ist ungültig. Bitte gib ein korrektes Datum an.`,
        en: `The return date "${query.returnDate}" is invalid. Please provide a valid date.`,
        sq: `Data e kthimit "${query.returnDate}" është e pavlefshme. Ju lutem jepni një datë të saktë.`
      }
    })
  }

  // EC-011: Check for same origin and destination
  if (query.from && query.to && query.from.toUpperCase() === query.to.toUpperCase()) {
    errors.push({
      field: 'route',
      code: 'same_origin_destination',
      message: {
        de: `Abflug und Ziel können nicht gleich sein (${query.from}). Wohin möchtest du fliegen?`,
        en: `Origin and destination cannot be the same (${query.from}). Where would you like to fly?`,
        sq: `Nisja dhe destinacioni nuk mund të jenë të njëjta (${query.from}). Ku dëshiron të fluturosh?`
      }
    })
  }

  // EC-016: Check that there's at least 1 adult when there are children/infants
  if (query.passengers) {
    const { adults, children, infants } = query.passengers
    if ((children > 0 || infants > 0) && adults === 0) {
      errors.push({
        field: 'passengers',
        code: 'no_adult',
        message: {
          de: 'Kinder und Babys benötigen mindestens einen begleitenden Erwachsenen.',
          en: 'Children and infants require at least one accompanying adult.',
          sq: 'Fëmijët dhe bebet kërkojnë të paktën një të rritur shoqërues.'
        }
      })
    }
  }

  return errors
}

/**
 * Get parser statistics
 */
export function getParserStats() {
  return {
    ...stats,
    chatgpt: {
      ...stats.chatgpt,
      avgMs: stats.chatgpt.success > 0
        ? Math.round(stats.chatgpt.totalMs / stats.chatgpt.success)
        : 0
    }
  }
}

/**
 * Reset statistics
 */
export function resetParserStats() {
  stats = {
    chatgpt: { success: 0, fail: 0, totalMs: 0 }
  }
}
