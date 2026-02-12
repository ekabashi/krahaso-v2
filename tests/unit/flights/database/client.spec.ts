import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { isBuildPhase } from '../../../../layers/flights/server/database/client'

describe('flights/server/database/client', () => {
  const origUrl = process.env.TURSO_DATABASE_URL
  const origToken = process.env.TURSO_AUTH_TOKEN

  afterEach(() => {
    process.env.TURSO_DATABASE_URL = origUrl
    process.env.TURSO_AUTH_TOKEN = origToken
  })

  describe('isBuildPhase', () => {
    it('returns true when TURSO_DATABASE_URL is missing', () => {
      delete process.env.TURSO_DATABASE_URL
      process.env.TURSO_AUTH_TOKEN = 'token'
      expect(isBuildPhase()).toBe(true)
    })

    it('returns true when TURSO_AUTH_TOKEN is missing', () => {
      process.env.TURSO_DATABASE_URL = 'file:local.db'
      delete process.env.TURSO_AUTH_TOKEN
      expect(isBuildPhase()).toBe(true)
    })

    it('returns true when both missing', () => {
      delete process.env.TURSO_DATABASE_URL
      delete process.env.TURSO_AUTH_TOKEN
      expect(isBuildPhase()).toBe(true)
    })

    it('returns false when both set', () => {
      process.env.TURSO_DATABASE_URL = 'https://example.db'
      process.env.TURSO_AUTH_TOKEN = 'secret'
      expect(isBuildPhase()).toBe(false)
    })
  })
})
