/**
 * Simple in-memory rate limiting
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of store) {
    if (entry.resetAt < now) {
      store.delete(key)
    }
  }
}, 5 * 60 * 1000)

/**
 * Check rate limit for a given key (usually IP address)
 * @returns true if allowed, false if rate limited
 */
export function checkRateLimit(
  key: string,
  maxRequests: number = 30,
  windowMs: number = 60 * 1000
): boolean {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || entry.resetAt < now) {
    // First request or window expired
    store.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (entry.count >= maxRequests) {
    return false
  }

  entry.count++
  return true
}

/**
 * Get client IP from event
 */
export function getClientIP(event: Parameters<typeof getHeader>[0]): string {
  // Check common proxy headers
  const forwarded = getHeader(event, 'x-forwarded-for')
  if (forwarded) {
    const firstIP = forwarded.split(',')[0]
    if (firstIP) return firstIP.trim()
  }

  const realIP = getHeader(event, 'x-real-ip')
  if (realIP) {
    return realIP
  }

  // Fallback to remote address - cast to access node internals
  const nodeEvent = event as { node?: { req?: { socket?: { remoteAddress?: string } } } }
  return nodeEvent.node?.req?.socket?.remoteAddress || 'unknown'
}

/**
 * Check if origin is allowed
 */
export function isAllowedOrigin(event: Parameters<typeof getHeader>[0]): boolean {
  const origin = getHeader(event, 'origin')
  const referer = getHeader(event, 'referer')

  // Allow if no origin (e.g., direct API calls, WhatsApp links)
  if (!origin && !referer) {
    return true
  }

  const allowedOrigins = [
    'https://krahaso.co',
    'https://www.krahaso.co',
    'https://krahaso-v2.vercel.app',
    'https://autopika.al',
    'https://www.autopika.al',
    'https://aviopika.al',
    'https://www.aviopika.al',
    'https://aviopika.vercel.app',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000'
  ]

  // Check origin header
  if (origin && allowedOrigins.some(allowed => origin.startsWith(allowed))) {
    return true
  }

  // Check referer header
  if (referer && allowedOrigins.some(allowed => referer.startsWith(allowed))) {
    return true
  }

  return false
}
