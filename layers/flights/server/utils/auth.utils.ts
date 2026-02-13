import type { H3Event } from 'h3'
import { getFlightsLogger } from './logger'
import { getAuthSession } from './auth-session'
import type { Session } from './auth'

export async function requireFlightsAdminAuth(event: H3Event) {
  const log = getFlightsLogger(event)
  const session = await getAuthSession(event)

  if (!session) {
    log.warn('Unauthorized access attempt - no session')
    throw createError({
      statusCode: 401,
      statusMessage: 'Authentication required'
    })
  }

  const userWithRole = session.user as Session['user'] & { role?: string }
  if (userWithRole.role !== 'admin') {
    log.warn('Unauthorized access attempt - insufficient role', {
      userId: session.user.id,
      email: session.user.email,
      role: userWithRole.role ?? 'none'
    })
    throw createError({
      statusCode: 403,
      statusMessage: 'Admin role required'
    })
  }

  log.info('Admin authenticated', {
    userId: session.user.id,
    email: session.user.email
  })

  return {
    user: session.user,
    session
  }
}

export async function getFlightsAdminUser(event: H3Event) {
  const session = await getAuthSession(event)
  if (!session) {
    return null
  }

  const userWithRole = session.user as Session['user'] & { role?: string }
  if (userWithRole.role !== 'admin') {
    return null
  }

  return session.user
}

export const requireFlightsSuperadminAuth = requireFlightsAdminAuth
export const getFlightsSuperadminUser = getFlightsAdminUser
