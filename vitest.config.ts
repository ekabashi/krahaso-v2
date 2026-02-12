import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      layers: path.resolve(__dirname, 'layers'),
      '#imports': path.resolve(__dirname, 'tests/helpers/nuxt-imports.ts'),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.spec.ts', 'tests/integration/**/*.spec.ts'],
    globals: true,
  },
})
