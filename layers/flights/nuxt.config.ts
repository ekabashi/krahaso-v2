import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const _dirname = dirname(fileURLToPath(import.meta.url))

export default defineNuxtConfig({
  alias: {
    '~/types': join(_dirname, 'app/types'),
  },
  
  // Runtime Configuration
  runtimeConfig: {
    // Database (Turso) - REQUIRED
    tursoDatabaseUrl: process.env.TURSO_DATABASE_URL || '',
    tursoAuthToken: process.env.TURSO_AUTH_TOKEN || '',

    // Provider HTTP Client - OPTIONAL
    providerHttpTimeoutMs: Number(process.env.PROVIDER_HTTP_TIMEOUT_MS || '15000'),
    providerHttpMaxRetries: Number(process.env.PROVIDER_HTTP_MAX_RETRIES || '2'),
    providerHttpRetryDelayMs: Number(process.env.PROVIDER_HTTP_RETRY_DELAY_MS || '750'),

    // Public Configuration (available on client)
    public: {
      whatsappNumber: process.env.NUXT_PUBLIC_WHATSAPP_NUMBER || '+38349999408',
    }
  },
})
