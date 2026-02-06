/**
 * Drizzle ORM Database Client
 *
 * Type-safe database access for Turso/libSQL
 * Import with: import { db } from '~/server/database/client'
 */

import { drizzle } from 'drizzle-orm/libsql'
import { createClient } from '@libsql/client'
import * as schema from './schema'

let client: ReturnType<typeof createClient> | null = null
let dbInstance: ReturnType<typeof drizzle> | null = null

/**
 * Check if we're in a prerender/build context without database access
 */
function isBuildPhase(): boolean {
  // During Vercel build, env vars may not be available for prerendering
  return !process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN
}

/**
 * Get or create the Drizzle database client
 * Returns the database instance, throws if not available
 */
export function getDb() {
  if (!dbInstance) {
    const url = process.env.TURSO_DATABASE_URL
    const authToken = process.env.TURSO_AUTH_TOKEN

    if (!url || !authToken) {
      throw new Error('Database not configured - TURSO_DATABASE_URL and TURSO_AUTH_TOKEN required')
    }

    client = createClient({ url, authToken })
    dbInstance = drizzle(client, { schema })
  }

  return dbInstance
}

/**
 * Lazy database getter - only initializes on first access
 * Use this instead of direct `db` import to avoid build-time initialization
 */
export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_, prop) {
    // Skip initialization during build phase
    if (isBuildPhase()) {
      throw new Error('Database not available during build phase')
    }
    return getDb()[prop as keyof ReturnType<typeof drizzle>]
  }
})

/**
 * Export schema for direct access
 */
export { schema }

/**
 * Helper: Get raw libSQL client for advanced operations
 */
export function getRawClient() {
  if (!client) {
    const url = process.env.TURSO_DATABASE_URL
    const authToken = process.env.TURSO_AUTH_TOKEN

    if (!url) throw new Error('Missing TURSO_DATABASE_URL')
    if (!authToken) throw new Error('Missing TURSO_AUTH_TOKEN')

    client = createClient({ url, authToken })
  }

  return client
}
