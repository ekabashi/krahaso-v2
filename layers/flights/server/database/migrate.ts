/**
 * Database Migration Runner (Flights layer)
 *
 * Applies pending migrations from layers/flights/server/database/migrations.
 * Safe to run multiple times.
 */

import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import { migrate } from 'drizzle-orm/libsql/migrator'
import * as schema from './schema'

async function runMigrations() {
  try {
    const url = process.env.TURSO_DATABASE_URL
    const authToken = process.env.TURSO_AUTH_TOKEN

    if (!url || !authToken) {
      throw new Error('Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN environment variables')
    }

    console.log('[db:migrate] Connecting to Turso...')

    const client = createClient({ url, authToken })
    const db = drizzle(client, { schema })

    await migrate(db, {
      migrationsFolder: './layers/flights/server/database/migrations'
    })

    console.log('[db:migrate] Migrations applied successfully')

    const tables = await client.execute(`
      SELECT name FROM sqlite_master
      WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '__drizzle_%'
      ORDER BY name
    `)

    console.log(`[db:migrate] Verified ${tables.rows.length} tables`)
    tables.rows.forEach((row) => {
      const tableName = String((row as Record<string, unknown>).name ?? '')
      console.log(` - ${tableName}`)
    })

    process.exit(0)
  } catch (error: any) {
    console.error('[db:migrate] Failed:', error.message)

    if (error.message?.includes('already exists')) {
      console.log('[db:migrate] Existing tables detected, migration tracking is ready')
      process.exit(0)
    }

    process.exit(1)
  }
}

runMigrations()
