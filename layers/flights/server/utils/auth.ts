/**
 * Better Auth Configuration for Flights
 */

import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { getDb } from '../database/client'

const FLIGHTS_AUTH_BASE_PATH = '/api/flights-auth'
const isProduction = process.env.NODE_ENV === 'production'

function getAuthSecret(): string {
  const secret = process.env.BETTER_AUTH_SECRET
  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('BETTER_AUTH_SECRET environment variable must be set in production')
  }
  return secret || 'dev-secret-not-for-production'
}

function getBaseURL(): string {
  if (process.env.BETTER_AUTH_URL) {
    return process.env.BETTER_AUTH_URL
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }

  return 'http://localhost:3000'
}

function getTrustedOrigins(): string[] {
  const origins = [getBaseURL()]

  if (process.env.NODE_ENV !== 'production') {
    const localOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000']
    for (const local of localOrigins) {
      if (!origins.includes(local)) {
        origins.push(local)
      }
    }
  }

  if (process.env.VERCEL_URL) {
    const vercelOrigin = `https://${process.env.VERCEL_URL}`
    if (!origins.includes(vercelOrigin)) {
      origins.push(vercelOrigin)
    }
  }

  if (process.env.VERCEL_BRANCH_URL) {
    const branchOrigin = `https://${process.env.VERCEL_BRANCH_URL}`
    if (!origins.includes(branchOrigin)) {
      origins.push(branchOrigin)
    }
  }

  const additionalOrigins = process.env.BETTER_AUTH_TRUSTED_ORIGINS
  if (additionalOrigins) {
    origins.push(...additionalOrigins.split(',').map(o => o.trim()).filter(Boolean))
  }

  return origins
}

let _auth: ReturnType<typeof betterAuth> | null = null

export function getAuth() {
  if (!_auth) {
    _auth = betterAuth({
      database: drizzleAdapter(getDb(), {
        provider: 'sqlite'
      }),
      baseURL: getBaseURL(),
      basePath: FLIGHTS_AUTH_BASE_PATH,
      secret: getAuthSecret(),
      trustedOrigins: getTrustedOrigins(),
      user: {
        additionalFields: {
          role: {
            type: 'string',
            required: false,
            defaultValue: 'user',
            input: false
          }
        }
      },
      emailAndPassword: {
        enabled: true,
        minPasswordLength: 8
      },
      session: {
        expiresIn: 60 * 60 * 24 * 7,
        updateAge: 60 * 60 * 24,
        cookieCache: {
          enabled: true,
          maxAge: 60 * 5
        }
      },
      rateLimit: {
        enabled: isProduction,
        window: 60,
        max: 60,
        customRules: {
          // Session checks are frequent in admin views and SSR middleware.
          '*/get-session': false,
          // Sign-out can be called from cross-auth cleanup flows.
          '*/sign-out': false,
          // Keep sign-in attempts tight to reduce brute force risk.
          '*/sign-in/*': {
            window: 60,
            max: 5
          }
        }
      },
      advanced: {
        useSecureCookies: isProduction,
        cookiePrefix: 'krahaso-flights-admin'
      }
    })
  }

  return _auth
}

export const auth = {
  get handler() { return getAuth().handler },
  get api() { return getAuth().api },
  get $Infer() { return getAuth().$Infer }
} as ReturnType<typeof betterAuth>

export type Session = ReturnType<typeof betterAuth>['$Infer']['Session']
export type User = Session['user']
