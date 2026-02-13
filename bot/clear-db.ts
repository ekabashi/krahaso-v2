import { createClient } from '@libsql/client'

const client = createClient({
  url: process.env.TURSO_DATABASE_URL || '',
  authToken: process.env.TURSO_AUTH_TOKEN || ''
})

async function main() {
  const logs = await client.execute('DELETE FROM chat_logs')
  const sessions = await client.execute('DELETE FROM bot_sessions')
  console.log(`✓ chat_logs gelöscht (${logs.rowsAffected} rows)`)
  console.log(`✓ bot_sessions gelöscht (${sessions.rowsAffected} rows)`)
}

main().catch(console.error)
