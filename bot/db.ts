/**
 * Database client for WhatsApp Bot
 *
 * Uses Turso/libSQL via Drizzle ORM
 * Logs chat messages to the cloud database
 */

import { drizzle } from 'drizzle-orm/libsql'
import { createClient } from '@libsql/client'
import { createHash } from 'crypto'
import { chatLogs, type NewChatLog } from '../layers/flights/server/database/schema'
import type { ParsedQuery } from './parsers/index'

let client: ReturnType<typeof createClient> | null = null
let dbInstance: ReturnType<typeof drizzle> | null = null

/**
 * Get or create the Drizzle database client
 */
function getDb() {
  if (!dbInstance) {
    const url = process.env.TURSO_DATABASE_URL
    const authToken = process.env.TURSO_AUTH_TOKEN

    if (!url || !authToken) {
      console.warn('[DB] Missing TURSO credentials - chat logging disabled')
      return null
    }

    client = createClient({ url, authToken })
    dbInstance = drizzle(client)
  }

  return dbInstance
}

/**
 * Close the database connection
 * Should be called during graceful shutdown
 */
export function closeDb(): void {
  if (client) {
    client.close()
    client = null
    dbInstance = null
    console.log('[DB] Database connection closed')
  }
}

/**
 * Hash phone number for privacy (one-way hash)
 */
function hashPhone(phone: string): string {
  return createHash('sha256').update(phone).digest('hex').substring(0, 16)
}

/**
 * Generate session ID from phone (for grouping conversations)
 */
function getSessionId(phone: string): string {
  // Use first 8 chars of hash + date for daily sessions
  const hash = hashPhone(phone).substring(0, 8)
  const date = new Date().toISOString().split('T')[0]
  return `${hash}-${date}`
}

/**
 * Log an inbound message from user
 */
export async function logInboundMessage(
  phoneNumber: string,
  content: string,
  parsedQuery?: ParsedQuery
): Promise<void> {
  const db = getDb()
  if (!db) return

  try {
    const entry: NewChatLog = {
      sessionId: getSessionId(phoneNumber),
      phoneHash: hashPhone(phoneNumber),
      direction: 'inbound',
      messageType: parsedQuery?.type || 'text',
      content,
      parsedQuery: parsedQuery ? JSON.stringify(parsedQuery) : null,
      language: parsedQuery?.language,
      confidence: parsedQuery?.confidence,
      timestamp: new Date()
    }

    await db.insert(chatLogs).values(entry)
  } catch (error) {
    console.error('[DB] Failed to log inbound message:', error)
  }
}

/**
 * Log an outbound message from bot
 */
export async function logOutboundMessage(
  phoneNumber: string,
  content: string,
  messageType: string = 'text',
  language?: string,
  responseTimeMs?: number
): Promise<void> {
  const db = getDb()
  if (!db) return

  try {
    const entry: NewChatLog = {
      sessionId: getSessionId(phoneNumber),
      phoneHash: hashPhone(phoneNumber),
      direction: 'outbound',
      messageType,
      content,
      language,
      responseTimeMs,
      timestamp: new Date()
    }

    await db.insert(chatLogs).values(entry)
  } catch (error) {
    console.error('[DB] Failed to log outbound message:', error)
  }
}

/**
 * Log both inbound and outbound in one call (convenience)
 */
export async function logConversation(
  phoneNumber: string,
  userMessage: string,
  botResponse: string,
  parsedQuery?: ParsedQuery,
  responseTimeMs?: number
): Promise<void> {
  await logInboundMessage(phoneNumber, userMessage, parsedQuery)
  await logOutboundMessage(
    phoneNumber,
    botResponse,
    parsedQuery?.type || 'text',
    parsedQuery?.language,
    responseTimeMs
  )
}
