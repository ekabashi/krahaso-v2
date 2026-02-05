import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const _dirname = dirname(fileURLToPath(import.meta.url))

export default defineNuxtConfig({
  alias: {
    '~/types': join(_dirname, 'app/types'),
  },
})
