/**
 * Bot State Manager
 *
 * Persistent state storage using Turso/libSQL
 * Falls back to in-memory storage if database is not configured
 */

import { drizzle } from 'drizzle-orm/libsql'
import { createClient, type Client } from '@libsql/client'
import { eq } from 'drizzle-orm'
import { createHash } from 'crypto'
import { botSessions } from '../layers/flights/server/database/schema'
import { config } from './config'
import type { ParsedQuery } from './parsers/index'

// Default language for system messages when no preference is stored
// Albanian is the primary market (Kosovo) - must match index.ts DEFAULT_LANGUAGE
const DEFAULT_LANGUAGE: 'de' | 'en' | 'sq' = 'sq'

// Summary of last search results (lightweight, no full flight data)
export interface LastSearchSummary {
  from: string
  to: string
  date: string
  returnDate?: string
  flightCount: number
  cheapestPrice?: number
  providers: string[]
  searchedAt: number
}

// Conversation state stored in database
export interface ConversationState {
  query: ParsedQuery
  messages: Array<{ role: 'user' | 'assistant', content: string }>
  lastUpdated: number
  postSearchPhase?: 'awaiting_confirmation' | 'awaiting_feedback' | 'awaiting_rental' | 'awaiting_return_date' | null
  lastSearch?: LastSearchSummary | null // Preserved even after clearConversation
}

// Session data
export interface SessionData {
  phoneHash: string
  conversationState: ConversationState | null
  preferredLanguage: 'de' | 'en' | 'sq' | null
  isKnownUser: boolean
  rateLimitMinute: number
  rateLimitDay: number
  rateLimitMinuteReset: Date | null
  rateLimitDayReset: Date | null
  gangMode?: boolean // Easter egg mode (in-memory only for now)
}

// In-memory fallback storage
const memoryStore = new Map<string, SessionData>()

let client: Client | null = null
let db: ReturnType<typeof drizzle> | null = null
let useDatabase = false

/**
 * Initialize the state manager
 */
export async function initStateManager(): Promise<void> {
  if (config.database.url && config.database.authToken) {
    try {
      client = createClient({
        url: config.database.url,
        authToken: config.database.authToken
      })
      db = drizzle(client)
      useDatabase = true
      console.log('[State] Using Turso database for session storage')
    } catch (error) {
      console.warn('[State] Failed to connect to Turso, using in-memory fallback:', error)
      useDatabase = false
    }
  } else {
    console.warn('[State] No database configured, using in-memory storage (sessions will not persist)')
    useDatabase = false
  }
}

/**
 * Close the database connection
 */
export async function closeStateManager(): Promise<void> {
  if (client) {
    client.close()
    client = null
    db = null
  }
}

/**
 * Hash phone number for privacy
 */
export function hashPhone(phone: string): string {
  return createHash('sha256').update(phone).digest('hex').substring(0, 16)
}

/**
 * Get session data for a phone number
 */
export async function getSession(phoneNumber: string): Promise<SessionData | null> {
  const phoneHash = hashPhone(phoneNumber)

  if (useDatabase && db) {
    try {
      const result = await db
        .select()
        .from(botSessions)
        .where(eq(botSessions.phoneHash, phoneHash))
        .limit(1)

      if (result.length === 0) return null

      const row = result[0]

      // Check if conversation has expired
      const conversationState = row.conversationState as ConversationState | null
      if (conversationState && Date.now() - conversationState.lastUpdated > config.conversation.ttlMs) {
        // Expired - return session but without conversation
        return {
          phoneHash,
          conversationState: null,
          preferredLanguage: row.preferredLanguage as 'de' | 'en' | 'sq' | null,
          isKnownUser: row.isKnownUser ?? false,
          rateLimitMinute: row.rateLimitMinute ?? 0,
          rateLimitDay: row.rateLimitDay ?? 0,
          rateLimitMinuteReset: row.rateLimitMinuteReset,
          rateLimitDayReset: row.rateLimitDayReset
        }
      }

      return {
        phoneHash,
        conversationState,
        preferredLanguage: row.preferredLanguage as 'de' | 'en' | 'sq' | null,
        isKnownUser: row.isKnownUser ?? false,
        rateLimitMinute: row.rateLimitMinute ?? 0,
        rateLimitDay: row.rateLimitDay ?? 0,
        rateLimitMinuteReset: row.rateLimitMinuteReset,
        rateLimitDayReset: row.rateLimitDayReset
      }
    } catch (error) {
      console.error('[State] Failed to get session from database:', error)
      // Fallback to memory
      return memoryStore.get(phoneHash) || null
    }
  }

  // In-memory fallback
  const session = memoryStore.get(phoneHash)
  if (!session) return null

  // Check TTL
  if (session.conversationState
    && Date.now() - session.conversationState.lastUpdated > config.conversation.ttlMs) {
    session.conversationState = null
  }

  return session
}

/**
 * Save session data
 * Only updates fields that are explicitly provided in data
 */
export async function saveSession(phoneNumber: string, data: Partial<SessionData>): Promise<void> {
  const phoneHash = hashPhone(phoneNumber)
  const now = new Date()

  if (useDatabase && db) {
    try {
      // First, get existing session to merge with
      const existing = await getSession(phoneNumber)

      // Merge existing data with new data (new data takes precedence)
      const merged: SessionData = {
        phoneHash,
        conversationState: data.conversationState !== undefined ? data.conversationState : (existing?.conversationState ?? null),
        preferredLanguage: data.preferredLanguage !== undefined ? data.preferredLanguage : (existing?.preferredLanguage ?? null),
        isKnownUser: data.isKnownUser !== undefined ? data.isKnownUser : (existing?.isKnownUser ?? false),
        rateLimitMinute: data.rateLimitMinute !== undefined ? data.rateLimitMinute : (existing?.rateLimitMinute ?? 0),
        rateLimitDay: data.rateLimitDay !== undefined ? data.rateLimitDay : (existing?.rateLimitDay ?? 0),
        rateLimitMinuteReset: data.rateLimitMinuteReset !== undefined ? data.rateLimitMinuteReset : (existing?.rateLimitMinuteReset ?? null),
        rateLimitDayReset: data.rateLimitDayReset !== undefined ? data.rateLimitDayReset : (existing?.rateLimitDayReset ?? null)
      }

      // Upsert session with merged data
      await db
        .insert(botSessions)
        .values({
          phoneHash,
          conversationState: merged.conversationState,
          preferredLanguage: merged.preferredLanguage,
          isKnownUser: merged.isKnownUser,
          rateLimitMinute: merged.rateLimitMinute,
          rateLimitDay: merged.rateLimitDay,
          rateLimitMinuteReset: merged.rateLimitMinuteReset,
          rateLimitDayReset: merged.rateLimitDayReset,
          lastMessageAt: now,
          updatedAt: now
        })
        .onConflictDoUpdate({
          target: botSessions.phoneHash,
          set: {
            conversationState: merged.conversationState,
            preferredLanguage: merged.preferredLanguage,
            isKnownUser: merged.isKnownUser,
            rateLimitMinute: merged.rateLimitMinute,
            rateLimitDay: merged.rateLimitDay,
            rateLimitMinuteReset: merged.rateLimitMinuteReset,
            rateLimitDayReset: merged.rateLimitDayReset,
            lastMessageAt: now,
            updatedAt: now
          }
        })
    } catch (error) {
      console.error('[State] Failed to save session to database:', error)
      // Fallback to memory
      const existing = memoryStore.get(phoneHash)
      memoryStore.set(phoneHash, { ...existing, ...data, phoneHash } as SessionData)
    }
  } else {
    // In-memory storage
    const existing = memoryStore.get(phoneHash)
    memoryStore.set(phoneHash, { ...existing, ...data, phoneHash } as SessionData)
  }
}

/**
 * Delete conversation state (keep user preferences AND lastSearch for proactive suggestions)
 */
export async function clearConversation(phoneNumber: string): Promise<void> {
  const phoneHash = hashPhone(phoneNumber)

  // Get existing session to preserve lastSearch
  const existing = await getSession(phoneNumber)
  const lastSearch = existing?.conversationState?.lastSearch

  // Create minimal state that only preserves lastSearch
  const clearedState: ConversationState | null = lastSearch
    ? {
        query: { type: 'unknown', language: existing?.preferredLanguage || DEFAULT_LANGUAGE, raw: '' },
        messages: [],
        lastUpdated: Date.now(),
        postSearchPhase: null,
        lastSearch // Preserve lastSearch for proactive suggestions
      }
    : null

  if (useDatabase && db) {
    try {
      await db
        .update(botSessions)
        .set({
          conversationState: clearedState,
          updatedAt: new Date()
        })
        .where(eq(botSessions.phoneHash, phoneHash))
    } catch (error) {
      console.error('[State] Failed to clear conversation:', error)
    }
  }

  // Also update memory store
  const session = memoryStore.get(phoneHash)
  if (session) {
    session.conversationState = clearedState
  }
}

/**
 * Check and update rate limit
 * Returns true if request is allowed, false if rate limited
 */
export async function checkRateLimit(phoneNumber: string): Promise<boolean> {
  const session = await getSession(phoneNumber) || {
    phoneHash: hashPhone(phoneNumber),
    conversationState: null,
    preferredLanguage: null,
    isKnownUser: false,
    rateLimitMinute: 0,
    rateLimitDay: 0,
    rateLimitMinuteReset: null,
    rateLimitDayReset: null
  }

  const now = Date.now()
  const minuteWindow = 60 * 1000
  const dayWindow = 24 * 60 * 60 * 1000

  // Reset minute counter if window passed
  if (!session.rateLimitMinuteReset || now > session.rateLimitMinuteReset.getTime()) {
    session.rateLimitMinute = 0
    session.rateLimitMinuteReset = new Date(now + minuteWindow)
  }

  // Reset day counter if window passed
  if (!session.rateLimitDayReset || now > session.rateLimitDayReset.getTime()) {
    session.rateLimitDay = 0
    session.rateLimitDayReset = new Date(now + dayWindow)
  }

  // Check limits
  if (session.rateLimitMinute >= config.rateLimit.maxPerMinute
    || session.rateLimitDay >= config.rateLimit.maxPerDay) {
    return false
  }

  // Increment and save
  session.rateLimitMinute++
  session.rateLimitDay++

  await saveSession(phoneNumber, session)
  return true
}

/**
 * Update conversation state
 */
export async function updateConversation(
  phoneNumber: string,
  query: ParsedQuery,
  userMessage: string,
  botResponse: string,
  preferredLanguage?: 'de' | 'en' | 'sq',
  postSearchPhase?: 'awaiting_feedback' | 'awaiting_rental' | null
): Promise<void> {
  const session = await getSession(phoneNumber)
  const existingMessages = session?.conversationState?.messages || []

  // Add new messages
  const messages = [
    ...existingMessages,
    { role: 'user' as const, content: userMessage },
    { role: 'assistant' as const, content: botResponse }
  ].slice(-config.conversation.maxHistoryMessages)

  const conversationState: ConversationState = {
    query,
    messages,
    lastUpdated: Date.now(),
    postSearchPhase: postSearchPhase ?? session?.conversationState?.postSearchPhase ?? null
  }

  await saveSession(phoneNumber, {
    conversationState,
    preferredLanguage: preferredLanguage ?? session?.preferredLanguage ?? null,
    isKnownUser: true
  })
}

/**
 * Update only the postSearchPhase without changing other conversation state
 */
export async function setPostSearchPhase(
  phoneNumber: string,
  phase: 'awaiting_confirmation' | 'awaiting_feedback' | 'awaiting_rental' | 'awaiting_return_date' | null
): Promise<void> {
  const session = await getSession(phoneNumber)

  // Create minimal conversation state if none exists
  const conversationState: ConversationState = session?.conversationState
    ? {
        ...session.conversationState,
        postSearchPhase: phase,
        lastUpdated: Date.now()
      }
    : {
        query: { type: 'unknown', language: session?.preferredLanguage || DEFAULT_LANGUAGE, raw: '' },
        messages: [],
        lastUpdated: Date.now(),
        postSearchPhase: phase
      }

  // Preserve existing session data (especially preferredLanguage)
  await saveSession(phoneNumber, {
    conversationState,
    preferredLanguage: session?.preferredLanguage,
    isKnownUser: session?.isKnownUser ?? true,
    rateLimitMinute: session?.rateLimitMinute,
    rateLimitDay: session?.rateLimitDay,
    rateLimitMinuteReset: session?.rateLimitMinuteReset,
    rateLimitDayReset: session?.rateLimitDayReset
  })
}

/**
 * Get conversation state
 */
export async function getConversation(phoneNumber: string): Promise<{
  query: ParsedQuery
  messages: Array<{ role: 'user' | 'assistant', content: string }>
  preferredLanguage: 'de' | 'en' | 'sq' | null
  postSearchPhase?: 'awaiting_confirmation' | 'awaiting_feedback' | 'awaiting_rental' | 'awaiting_return_date' | null
  lastSearch?: LastSearchSummary | null
} | null> {
  const session = await getSession(phoneNumber)
  if (!session?.conversationState) return null

  return {
    query: session.conversationState.query,
    messages: session.conversationState.messages,
    preferredLanguage: session.preferredLanguage,
    postSearchPhase: session.conversationState.postSearchPhase,
    lastSearch: session.conversationState.lastSearch
  }
}

/**
 * Save last search results summary
 */
export async function saveLastSearch(
  phoneNumber: string,
  summary: LastSearchSummary
): Promise<void> {
  const session = await getSession(phoneNumber)

  const conversationState: ConversationState = session?.conversationState
    ? {
        ...session.conversationState,
        lastSearch: summary,
        lastUpdated: Date.now()
      }
    : {
        query: { type: 'unknown', language: session?.preferredLanguage || DEFAULT_LANGUAGE, raw: '' },
        messages: [],
        lastUpdated: Date.now(),
        postSearchPhase: null,
        lastSearch: summary
      }

  await saveSession(phoneNumber, {
    conversationState,
    preferredLanguage: session?.preferredLanguage,
    isKnownUser: session?.isKnownUser ?? true
  })
}

/**
 * Get last search summary for proactive suggestions
 * Returns null if no search or search is older than maxAgeDays
 */
export async function getLastSearch(
  phoneNumber: string,
  maxAgeDays: number = 7
): Promise<LastSearchSummary | null> {
  const session = await getSession(phoneNumber)
  const lastSearch = session?.conversationState?.lastSearch

  if (!lastSearch) return null

  // Check if search is within maxAgeDays
  const ageMs = Date.now() - lastSearch.searchedAt
  const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000

  if (ageMs > maxAgeMs) return null

  return lastSearch
}

/**
 * Check if user is known (has interacted before)
 */
export async function isKnownUser(phoneNumber: string): Promise<boolean> {
  const session = await getSession(phoneNumber)
  return session?.isKnownUser ?? false
}

/**
 * Mark user as known
 */
export async function markUserAsKnown(phoneNumber: string): Promise<void> {
  await saveSession(phoneNumber, { isKnownUser: true })
}

/**
 * Get preferred language for a user
 */
export async function getPreferredLanguage(phoneNumber: string): Promise<'de' | 'en' | 'sq' | null> {
  const session = await getSession(phoneNumber)
  return session?.preferredLanguage ?? null
}

/**
 * Set preferred language for a user
 */
export async function setPreferredLanguage(
  phoneNumber: string,
  language: 'de' | 'en' | 'sq'
): Promise<void> {
  await saveSession(phoneNumber, { preferredLanguage: language })
}

// In-memory gang mode storage (easter egg, doesn't need persistence)
const gangModeUsers = new Set<string>()

/**
 * Check if gang mode is active for a user
 */
export async function isGangMode(phoneNumber: string): Promise<boolean> {
  const phoneHash = hashPhone(phoneNumber)
  return gangModeUsers.has(phoneHash)
}

/**
 * Set gang mode for a user
 */
export async function setGangMode(phoneNumber: string, enabled: boolean): Promise<void> {
  const phoneHash = hashPhone(phoneNumber)
  if (enabled) {
    gangModeUsers.add(phoneHash)
  } else {
    gangModeUsers.delete(phoneHash)
  }
}
