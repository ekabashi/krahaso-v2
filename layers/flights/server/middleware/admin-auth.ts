import { auth } from '../utils/auth'

export default defineEventHandler(async (event) => {
  if (!event.path.startsWith('/api/admin')) {
    return
  }

  try {
    const session = await auth.api.getSession({
      headers: event.node.req.headers as Record<string, string>
    })

    if (!session) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Unauthorized - Please log in'
      })
    }

    const userWithRole = session.user as { role?: string }
    if (userWithRole.role !== 'admin') {
      throw createError({
        statusCode: 403,
        statusMessage: 'Forbidden - Admin access required'
      })
    }

    event.context.session = session
  } catch (error) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    })
  }
})
