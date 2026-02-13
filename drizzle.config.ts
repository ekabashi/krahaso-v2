import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './layers/flights/server/database/schema.ts',
  out: './layers/flights/server/database/migrations',
  dialect: 'turso',
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!
  },
  verbose: true,
  strict: true
})
