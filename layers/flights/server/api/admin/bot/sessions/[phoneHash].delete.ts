/**
 * DELETE /api/admin/bot/sessions/:phoneHash
 *
 * Deletes/resets a bot session by phone hash.
 */

import { eq } from 'drizzle-orm'
import { db } from '../../../../database/client'
import { botSessions } from '../../../../database/schema'
import { requireFlightsAdminAuth } from '../../../../utils/auth.utils'
import { getFlightsLogger } from '../../../../utils/logger'

export default defineEventHandler(async (event) => {
  await requireFlightsAdminAuth(event)
  const log = getFlightsLogger(event)

  const phoneHash = getRouterParam(event, 'phoneHash')

  if (!phoneHash) {
    throw createError({
      statusCode: 400,
      statusMessage: 'phoneHash is required'
    })
  }

  log.info('Flights bot session delete requested', { phoneHash })

  try {
    const result = await db
      .delete(botSessions)
      .where(eq(botSessions.phoneHash, phoneHash))
      .returning()

    if (result.length === 0) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Session not found'
      })
    }

    log.info('Flights bot session deleted', { phoneHash })
    return { success: true, deleted: phoneHash }
  } catch (error) {
    if ((error as { statusCode?: number })?.statusCode) {
      throw error
    }

    log.error('Failed to delete flights bot session', error as Error, { phoneHash })
    throw error
  }
})

