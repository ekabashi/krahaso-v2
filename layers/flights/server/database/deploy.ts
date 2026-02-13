/**
 * Database Deployment Script (Flights layer)
 *
 * Workflow:
 * 1) apply migrations
 * 2) seed providers (optional)
 * 3) verify schema
 */

import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import { migrate } from 'drizzle-orm/libsql/migrator'
import { providers } from './schema'
import * as schema from './schema'

const args = process.argv.slice(2)
const skipSeed = args.includes('--no-seed')

const expectedTables = [
  'account',
  'airports',
  'analytics_conversions',
  'analytics_events',
  'analytics_provider_performance',
  'analytics_route_performance',
  'bot_sessions',
  'chat_logs',
  'currency_rates',
  'flights',
  'price_history',
  'providers',
  'routes',
  'search_history',
  'session',
  'sync_status',
  'user',
  'verification'
]

async function deploy() {
  try {
    const url = process.env.TURSO_DATABASE_URL
    const authToken = process.env.TURSO_AUTH_TOKEN

    if (!url || !authToken) {
      throw new Error('Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN')
    }

    console.log('[db:deploy] Connecting to Turso...')

    const client = createClient({ url, authToken })
    const db = drizzle(client, { schema })

    console.log('[db:deploy] Applying migrations...')

    try {
      await migrate(db, {
        migrationsFolder: './layers/flights/server/database/migrations'
      })
      console.log('[db:deploy] Migrations applied')
    } catch (error: any) {
      if (error.message?.includes('already exists')) {
        console.log('[db:deploy] Existing baseline detected, continuing')
      } else {
        throw error
      }
    }

    if (!skipSeed) {
      console.log('[db:deploy] Checking provider seed data...')
      const existingProviders = await db.select().from(providers)

      if (existingProviders.length === 0) {
        const providersToSeed = [
          { id: 'airprishtina', name: 'AirPrishtina', enabled: true, priority: 100 },
          { id: 'kosovafly', name: 'Kosova Fly', enabled: true, priority: 90 },
          { id: 'dituria', name: 'Dituria', enabled: true, priority: 80 },
          { id: 'erifly', name: 'EriFly', enabled: true, priority: 70 },
          { id: 'airtiketa', name: 'AirTiketa', enabled: true, priority: 60 }
        ]

        for (const provider of providersToSeed) {
          await db.insert(providers).values(provider).onConflictDoNothing()
        }

        console.log(`[db:deploy] Seeded ${providersToSeed.length} providers`)
      } else {
        console.log(`[db:deploy] Providers already seeded (${existingProviders.length})`)
      }
    } else {
      console.log('[db:deploy] Provider seeding skipped')
    }

    const tables = await client.execute(`
      SELECT name FROM sqlite_master
      WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '__drizzle_%'
      ORDER BY name
    `)

    const actualTables = tables.rows.map((row: any) => String(row.name))
    const missingTables = expectedTables.filter(name => !actualTables.includes(name))

    console.log(`[db:deploy] Found ${actualTables.length} tables`)
    if (missingTables.length > 0) {
      console.log(`[db:deploy] Warning: missing tables -> ${missingTables.join(', ')}`)
    }

    console.log('[db:deploy] Done')
    process.exit(0)
  } catch (error: any) {
    console.error('[db:deploy] Failed:', error.message)
    process.exit(1)
  }
}

deploy()
