/**
 * GET /api/admin/bot/logs
 *
 * Returns chat logs, optionally filtered by phone hash.
 */

import { desc, eq } from 'drizzle-orm'
import { db } from '../../../database/client'
import { chatLogs } from '../../../database/schema'
import { requireFlightsAdminAuth } from '../../../utils/auth.utils'
import { getFlightsLogger } from '../../../utils/logger'

export default defineEventHandler(async (event) => {
  await requireFlightsAdminAuth(event)
  const log = getFlightsLogger(event)

  const query = getQuery(event)
  const phoneHash = typeof query.phoneHash === 'string' ? query.phoneHash : undefined

  const parsedLimit = Number(query.limit)
  const limit = Number.isFinite(parsedLimit) && parsedLimit > 0
    ? Math.min(Math.trunc(parsedLimit), 200)
    : 50

  log.info('Flights bot logs requested', {
    phoneHash: phoneHash ?? null,
    limit
  })

  try {
    const logs = phoneHash
      ? await db
          .select()
          .from(chatLogs)
          .where(eq(chatLogs.phoneHash, phoneHash))
          .orderBy(desc(chatLogs.id))
          .limit(limit)
      : await db
          .select()
          .from(chatLogs)
          .orderBy(desc(chatLogs.id))
          .limit(limit)

    const response = logs.map(logEntry => ({
      id: logEntry.id,
      phoneHash: logEntry.phoneHash,
      sessionId: logEntry.sessionId,
      direction: logEntry.direction,
      messageType: logEntry.messageType,
      content: logEntry.content,
      language: logEntry.language,
      timestamp: logEntry.timestamp?.toISOString() ?? null
    }))

    log.info('Flights bot logs loaded', { total: response.length })
    return response
  } catch (error) {
    log.error('Failed to load flights bot logs', error as Error, { phoneHash: phoneHash ?? null, limit })
    throw error
  }
})


