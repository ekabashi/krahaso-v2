/**
 * GET /api/admin/bot/stats
 *
 * Returns bot statistics overview.
 */

import { count, gte } from 'drizzle-orm'
import { db } from '../../../database/client'
import { botSessions, chatLogs } from '../../../database/schema'
import { requireFlightsAdminAuth } from '../../../utils/auth.utils'
import { getFlightsLogger } from '../../../utils/logger'

export default defineEventHandler(async (event) => {
  await requireFlightsAdminAuth(event)
  const log = getFlightsLogger(event)

  log.info('Flights bot stats requested')

  try {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    const [totalSessions] = await db
      .select({ count: count() })
      .from(botSessions)

    const [activeSessions] = await db
      .select({ count: count() })
      .from(botSessions)
      .where(gte(botSessions.lastMessageAt, last24h))

    const [totalMessages] = await db
      .select({ count: count() })
      .from(chatLogs)

    const [messagesToday] = await db
      .select({ count: count() })
      .from(chatLogs)
      .where(gte(chatLogs.timestamp, today))

    const [messagesLast7d] = await db
      .select({ count: count() })
      .from(chatLogs)
      .where(gte(chatLogs.timestamp, last7d))

    const languageStats = await db
      .select({
        language: botSessions.preferredLanguage,
        count: count()
      })
      .from(botSessions)
      .groupBy(botSessions.preferredLanguage)

    const response = {
      sessions: {
        total: totalSessions?.count ?? 0,
        activeToday: activeSessions?.count ?? 0
      },
      messages: {
        total: totalMessages?.count ?? 0,
        today: messagesToday?.count ?? 0,
        last7d: messagesLast7d?.count ?? 0
      },
      languages: languageStats.reduce((acc, { language, count }) => {
        acc[language || 'unknown'] = count
        return acc
      }, {} as Record<string, number>)
    }

    log.info('Flights bot stats loaded', {
      sessions: response.sessions.total,
      messages: response.messages.total
    })

    return response
  } catch (error) {
    log.error('Failed to load flights bot stats', error as Error)
    throw error
  }
})


