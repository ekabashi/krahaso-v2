import type { H3Event } from 'h3'
import { auth, type Session } from './auth'

export async function getAuthSession(event: H3Event): Promise<Session | null> {
  const session = await auth.api.getSession({
    headers: event.node.req.headers as Record<string, string>
  })

  return session as Session | null
}

export async function requireAuth(event: H3Event): Promise<Session> {
  const session = await getAuthSession(event)

  if (!session) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    })
  }

  return session
}

export async function requireAdmin(event: H3Event): Promise<Session> {
  const session = await requireAuth(event)
  const userWithRole = session.user as { role?: string }

  if (userWithRole.role !== 'admin') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden - Admin access required'
    })
  }

  return session
}
