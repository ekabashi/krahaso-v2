/**
 * GET /api/go/:provider
 *
 * Redirect for provider contact links
 * Redirects to the actual destination (website or phone)
 *
 * Query params:
 *   t: type ('web' | 'phone')
 */

import { checkRateLimit, getClientIP } from '../../utils/rate-limit'

// Provider contact destinations
const providerDestinations: Record<string, { website: string, phone?: string }> = {
  airprishtina: {
    website: 'https://airprishtina.com',
    phone: '+38338548777'
  },
  kosovafly: {
    website: 'https://kosova-fly.de',
    phone: '+4921117929649'
  },
  dituria: {
    website: 'https://www.dituria.net',
    phone: '+492118632969'
  },
  erifly: {
    website: 'https://erifly.com',
    phone: '+38349702702'
  },
  airtiketa: {
    website: 'https://airtiketa.com',
    phone: '+49211179696600'
  }
}

export default defineEventHandler(async (event) => {
  // Rate limiting - max 10 requests per minute per IP
  const clientIP = getClientIP(event)
  if (!checkRateLimit(`go:${clientIP}`, 10, 60 * 1000)) {
    throw createError({
      statusCode: 429,
      message: 'Too many requests'
    })
  }

  const providerId = getRouterParam(event, 'provider')?.toLowerCase()
  const query = getQuery(event)
  const contactType = (query.t as string) || 'web'

  if (!providerId) {
    throw createError({
      statusCode: 400,
      message: 'Provider ID is required'
    })
  }

  const provider = providerDestinations[providerId]

  if (!provider) {
    throw createError({
      statusCode: 404,
      message: 'Provider not found'
    })
  }

  // Determine redirect URL
  let redirectUrl: string

  if (contactType === 'phone' && provider.phone) {
    redirectUrl = `tel:${provider.phone}`
  } else {
    redirectUrl = provider.website
  }

  // Redirect to actual destination
  return sendRedirect(event, redirectUrl, 302)
})
