/**
 * POST /api/admin/bot/lookup
 *
 * Looks up a bot session by phone/LID input.
 */

import { createHash } from 'node:crypto'
import { desc, eq } from 'drizzle-orm'
import { db } from '../../../database/client'
import { botSessions, chatLogs } from '../../../database/schema'
import { requireFlightsAdminAuth } from '../../../utils/auth.utils'
import { getFlightsLogger } from '../../../utils/logger'

function hashPhone(phone: string): string {
  return createHash('sha256').update(phone).digest('hex').substring(0, 16)
}

export default defineEventHandler(async (event) => {
  await requireFlightsAdminAuth(event)
  const log = getFlightsLogger(event)

  const body = await readBody(event)
  const phoneInput = typeof body?.phoneNumber === 'string' ? body.phoneNumber.trim() : ''

  if (!phoneInput) {
    throw createError({
      statusCode: 400,
      statusMessage: 'phoneNumber is required'
    })
  }

  log.info('Flights bot lookup requested', { inputLength: phoneInput.length })

  const digitsOnly = phoneInput.replace(/\D/g, '')
  const germanConverted = digitsOnly.startsWith('0') ? `49${digitsOnly.slice(1)}` : digitsOnly
  const kosovoConverted = digitsOnly.startsWith('04') ? `383${digitsOnly.slice(1)}` : digitsOnly

  const uniqueFormats = [...new Set([
    digitsOnly,
    germanConverted,
    kosovoConverted,
    phoneInput
  ])].filter(Boolean)

  try {
    for (const format of uniqueFormats) {
      const hash = hashPhone(format)

      const [session] = await db
        .select()
        .from(botSessions)
        .where(eq(botSessions.phoneHash, hash))
        .limit(1)

      if (!session) continue

      const recentLogs = await db
        .select()
        .from(chatLogs)
        .where(eq(chatLogs.phoneHash, hash))
        .orderBy(desc(chatLogs.id))
        .limit(50)

      log.info('Flights bot lookup matched session', { phoneHash: hash, logs: recentLogs.length })

      return {
        found: true,
        matchedFormat: format,
        phoneHash: hash,
        session: {
          phoneHash: session.phoneHash,
          preferredLanguage: session.preferredLanguage,
          isKnownUser: session.isKnownUser,
          lastMessageAt: session.lastMessageAt?.toISOString() ?? null,
          createdAt: session.createdAt?.toISOString() ?? null,
          hasConversationState: !!session.conversationState,
          postSearchPhase: (session.conversationState as { postSearchPhase?: string } | null)?.postSearchPhase ?? null
        },
        logsCount: recentLogs.length,
        logs: recentLogs.map(logEntry => ({
          id: logEntry.id,
          direction: logEntry.direction,
          messageType: logEntry.messageType,
          content: logEntry.content,
          language: logEntry.language,
          timestamp: logEntry.timestamp?.toISOString() ?? null
        }))
      }
    }

    log.info('Flights bot lookup found no match', { tried: uniqueFormats.length })

    return {
      found: false,
      triedFormats: uniqueFormats.map(format => ({ format, hash: hashPhone(format) }))
    }
  } catch (error) {
    log.error('Flights bot lookup failed', error as Error)
    throw error
  }
})


