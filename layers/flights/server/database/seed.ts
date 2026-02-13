/**
 * Seed flights providers into Turso database.
 */

import { eq } from 'drizzle-orm'
import { db } from './client'
import { providers } from './schema'

const PROVIDERS = [
  { id: 'airprishtina', name: 'AirPrishtina', enabled: true, priority: 1 },
  { id: 'kosovafly', name: 'Kosova Fly', enabled: true, priority: 2 },
  { id: 'dituria', name: 'Dituria', enabled: true, priority: 3 },
  { id: 'erifly', name: 'EriFly', enabled: true, priority: 4 },
  { id: 'airtiketa', name: 'AirTiketa', enabled: true, priority: 5 }
]

async function seed() {
  try {
    console.log('[db:seed] Seeding providers...')

    for (const provider of PROVIDERS) {
      const existing = await db
        .select()
        .from(providers)
        .where(eq(providers.id, provider.id))
        .get()

      if (existing) {
        await db
          .update(providers)
          .set({
            name: provider.name,
            enabled: provider.enabled,
            priority: provider.priority,
            updatedAt: new Date().toISOString()
          })
          .where(eq(providers.id, provider.id))

        console.log(`[db:seed] Updated ${provider.id}`)
      } else {
        await db.insert(providers).values({
          ...provider,
          config: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })

        console.log(`[db:seed] Inserted ${provider.id}`)
      }
    }

    const allProviders = await db.select().from(providers)
    console.log(`[db:seed] Done (${allProviders.length} providers in database)`)
  } catch (error) {
    console.error('[db:seed] Failed:', error)
    process.exit(1)
  }
}

seed()
