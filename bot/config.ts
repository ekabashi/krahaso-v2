/**
 * Bot Configuration Module
 *
 * Centralized configuration with environment variable overrides
 */

function envInt(key: string, defaultValue: number): number {
  const value = process.env[key]
  if (!value) return defaultValue
  const parsed = parseInt(value, 10)
  return isNaN(parsed) ? defaultValue : parsed
}

function envString(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue
}

function envBool(key: string, defaultValue: boolean): boolean {
  const value = process.env[key]
  if (!value) return defaultValue
  return value.toLowerCase() === 'true' || value === '1'
}

function resolveWebsiteUrl(apiUrl: string): string {
  const explicit = process.env.KRAHASO_URL || process.env.AVIOPIKA_URL
  if (explicit) return explicit

  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(apiUrl)) {
    return 'http://localhost:3000'
  }

  const withoutApi = apiUrl.replace(/\/api\/?$/i, '')
  return withoutApi || 'https://krahaso.co'
}

// API Configuration
const apiUrl = envString('KRAHASO_API_URL', envString('AVIOPIKA_API_URL', 'http://localhost:3000'))

export const config = {
  // API
  api: {
    url: apiUrl,
    websiteUrl: resolveWebsiteUrl(apiUrl)
  },

  // OpenAI (supports gpt-4o-mini, gpt-4o, gpt-5-nano, gpt-5-mini, gpt-5)
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    model: envString('OPENAI_MODEL', 'gpt-5-mini'),
    timeoutMs: envInt('OPENAI_TIMEOUT_MS', 20000),
    maxRetries: envInt('OPENAI_MAX_RETRIES', 3),
    retryBaseDelayMs: envInt('OPENAI_RETRY_BASE_DELAY_MS', 2000)
  },

  // Rate Limiting
  rateLimit: {
    maxPerMinute: envInt('RATE_LIMIT_PER_MINUTE', 10),
    maxPerDay: envInt('RATE_LIMIT_PER_DAY', 100)
  },

  // Conversation
  conversation: {
    ttlMs: envInt('CONVERSATION_TTL_MS', 15 * 60 * 1000), // 15 minutes
    maxHistoryMessages: envInt('CONVERSATION_MAX_HISTORY', 10),
    processingNoticeDelayMs: envInt('PROCESSING_NOTICE_DELAY_MS', 10000) // 10 seconds
  },

  // Database (Turso) - used for sessions and chat logs
  database: {
    url: process.env.TURSO_DATABASE_URL || '',
    authToken: process.env.TURSO_AUTH_TOKEN || ''
  },

  // WhatsApp
  whatsapp: {
    authDataPath: envString('WHATSAPP_AUTH_PATH', '.wwebjs_auth'),
    headless: envBool('WHATSAPP_HEADLESS', true)
  },

  // Debug
  debug: {
    enabled: envBool('DEBUG', false),
    logParsedQueries: envBool('DEBUG_LOG_PARSED', true)
  }
} as const

export type Config = typeof config

/**
 * Validate required configuration
 */
export function validateConfig(): string[] {
  const errors: string[] = []

  if (!config.openai.apiKey) {
    errors.push('OPENAI_API_KEY is required')
  }

  return errors
}

/**
 * Log configuration (redacted)
 */
export function logConfig(): void {
  console.log('Bot Configuration:')
  console.log(`  API URL: ${config.api.url}`)
  console.log(`  Website URL: ${config.api.websiteUrl}`)
  console.log(`  OpenAI Model: ${config.openai.model}`)
  console.log(`  OpenAI Timeout: ${config.openai.timeoutMs}ms`)
  console.log(`  Rate Limit: ${config.rateLimit.maxPerMinute}/min, ${config.rateLimit.maxPerDay}/day`)
  console.log(`  Conversation TTL: ${config.conversation.ttlMs / 1000 / 60} min`)
  console.log(`  Database: ${config.database.url ? 'Turso configured' : 'not configured (in-memory fallback)'}`)
}
