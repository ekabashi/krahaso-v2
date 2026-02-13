/**
 * GET /api/admin/bot/sessions
 *
 * Returns bot sessions with conversation state summary.
 */

import { desc } from 'drizzle-orm'
import { db } from '../../../database/client'
import { botSessions } from '../../../database/schema'
import { requireFlightsAdminAuth } from '../../../utils/auth.utils'
import { getFlightsLogger } from '../../../utils/logger'

interface ConversationState {
  query?: { type: string, from?: string, to?: string, date?: string, returnDate?: string }
  messages?: Array<{ role: string, content: string }>
  lastUpdated?: number
  postSearchPhase?: string | null
  lastSearch?: {
    from: string
    to: string
    date: string
    returnDate?: string
    flightCount: number
    cheapestPrice?: number
    providers: string[]
    searchedAt: number
  } | null
}

export default defineEventHandler(async (event) => {
  await requireFlightsAdminAuth(event)
  const log = getFlightsLogger(event)

  log.info('Flights bot sessions requested')

  try {
    const sessions = await db
      .select()
      .from(botSessions)
      .orderBy(desc(botSessions.lastMessageAt))
      .limit(100)

    const response = sessions.map((session) => {
      const state = session.conversationState as ConversationState | null

      return {
        phoneHash: session.phoneHash,
        preferredLanguage: session.preferredLanguage,
        isKnownUser: session.isKnownUser,
        lastMessageAt: session.lastMessageAt?.toISOString() ?? null,
        createdAt: session.createdAt?.toISOString() ?? null,
        hasConversationState: !!state,
        postSearchPhase: state?.postSearchPhase ?? null,
        currentQuery: state?.query
          ? {
              type: state.query.type,
              from: state.query.from,
              to: state.query.to,
              date: state.query.date,
              returnDate: state.query.returnDate
            }
          : null,
        lastSearch: state?.lastSearch
          ? {
              route: `${state.lastSearch.from} -> ${state.lastSearch.to}`,
              date: state.lastSearch.date,
              returnDate: state.lastSearch.returnDate,
              flightCount: state.lastSearch.flightCount,
              cheapestPrice: state.lastSearch.cheapestPrice,
              providers: state.lastSearch.providers,
              searchedAt: new Date(state.lastSearch.searchedAt).toISOString()
            }
          : null,
        messageCount: state?.messages?.length ?? 0
      }
    })

    log.info('Flights bot sessions loaded', { total: response.length })
    return response
  } catch (error) {
    log.error('Failed to load flights bot sessions', error as Error)
    throw error
  }
})


