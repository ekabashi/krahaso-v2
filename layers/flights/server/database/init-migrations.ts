/**
 * Initialize Drizzle migration tracking for an existing flights database.
 */

import { createClient } from '@libsql/client'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

async function initMigrations() {
  try {
    const url = process.env.TURSO_DATABASE_URL
    const authToken = process.env.TURSO_AUTH_TOKEN

    if (!url || !authToken) {
      throw new Error('Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN')
    }

    const client = createClient({ url, authToken })

    const tableCheck = await client.execute(`
      SELECT name FROM sqlite_master
      WHERE type = 'table' AND name = '__drizzle_migrations'
    `)

    if (tableCheck.rows.length === 0) {
      await client.execute(`
        CREATE TABLE __drizzle_migrations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          hash TEXT NOT NULL UNIQUE,
          created_at INTEGER
        )
      `)
      console.log('[db:init] Created __drizzle_migrations table')
    } else {
      const applied = await client.execute('SELECT * FROM __drizzle_migrations ORDER BY created_at')
      if (applied.rows.length > 0) {
        console.log(`[db:init] Already initialized (${applied.rows.length} migrations tracked)`)
        process.exit(0)
      }
    }

    const migrationsDir = join(process.cwd(), 'layers/flights/server/database/migrations/meta')
    const snapshotFiles = readdirSync(migrationsDir).filter(file => file.endsWith('.json')).sort()

    if (snapshotFiles.length === 0) {
      throw new Error('No migration metadata found in flights migrations meta folder')
    }

    const baselineSnapshot = snapshotFiles[0] as string
    const snapshotPath = join(migrationsDir, baselineSnapshot)
    const metadata = JSON.parse(readFileSync(snapshotPath, 'utf-8')) as { version?: string }

    if (!metadata.version) {
      throw new Error(`Invalid metadata in ${baselineSnapshot}: missing version`)
    }

    await client.execute({
      sql: 'INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)',
      args: [metadata.version, Date.now()]
    })

    console.log(`[db:init] Baseline tracked: ${baselineSnapshot}`)
    process.exit(0)
  } catch (error: any) {
    console.error('[db:init] Failed:', error.message)
    process.exit(1)
  }
}

initMigrations()
