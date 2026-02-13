import { createClient } from '@libsql/client'

const client = createClient({
  url: process.env.TURSO_DATABASE_URL || '',
  authToken: process.env.TURSO_AUTH_TOKEN || ''
})

async function main() {
  console.log('=== CHAT LOGS (letzte 20 mit Inhalt) ===')
  const logs = await client.execute('SELECT id, direction, message_type, content, language FROM chat_logs ORDER BY id DESC LIMIT 20')
  for (const row of logs.rows) {
    const content = String(row.content).substring(0, 70).replace(/\n/g, ' ')
    console.log(`[${row.id}] ${row.direction} (${row.message_type}) [${row.language || '?'}]: ${content}`)
  }

  console.log('\n=== BOT SESSIONS ===')
  const sessions = await client.execute('SELECT * FROM bot_sessions')
  if (sessions.rows.length === 0) {
    console.log('Keine Sessions vorhanden')
  }
  for (const row of sessions.rows) {
    const lastMsg = row.last_message_at ? new Date(Number(row.last_message_at)).toISOString() : 'null'
    const created = row.created_at ? new Date(Number(row.created_at)).toISOString() : 'null'
    console.log(`Phone: ${row.phone_hash}`)
    console.log(`  preferred_language: ${row.preferred_language}`)
    console.log(`  is_known_user:      ${row.is_known_user}`)
    console.log(`  last_message_at:    ${lastMsg}`)
    console.log(`  created_at:         ${created}`)
    console.log(`  conversation_state: ${row.conversation_state ? 'vorhanden' : 'null'}`)
  }
}

main().catch(console.error)
