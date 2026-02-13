/**
 * Drizzle ORM Schema Definition
 *
 * Defines all database tables with TypeScript types
 * Run `npm run db:generate` to create migrations
 * Run `npm run db:migrate` to apply migrations
 */

import { sql } from 'drizzle-orm'
import { integer, real, sqliteTable, text, index, unique } from 'drizzle-orm/sqlite-core'

// =============================================================================
// Auth Tables (Better Auth)
// =============================================================================

export const user = sqliteTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: integer('email_verified', { mode: 'boolean' }).default(false),
  image: text('image'),
  role: text('role').default('user'), // 'user' | 'admin'
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).default(sql`(unixepoch() * 1000)`),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).default(sql`(unixepoch() * 1000)`)
})

export const session = sqliteTable('session', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).default(sql`(unixepoch() * 1000)`),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).default(sql`(unixepoch() * 1000)`)
}, table => ({
  userIdx: index('idx_session_user').on(table.userId),
  tokenIdx: index('idx_session_token').on(table.token)
}))

export const account = sqliteTable('account', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'), // For OAuth providers
  accessTokenExpiresAt: integer('access_token_expires_at', { mode: 'timestamp_ms' }),
  refreshTokenExpiresAt: integer('refresh_token_expires_at', { mode: 'timestamp_ms' }),
  scope: text('scope'),
  password: text('password'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).default(sql`(unixepoch() * 1000)`),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).default(sql`(unixepoch() * 1000)`)
}, table => ({
  userIdx: index('idx_account_user').on(table.userId),
  providerIdx: index('idx_account_provider').on(table.providerId, table.accountId)
}))

export const verification = sqliteTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).default(sql`(unixepoch() * 1000)`),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).default(sql`(unixepoch() * 1000)`)
})

// =============================================================================
// Core Tables (Existing)
// =============================================================================

export const providers = sqliteTable('providers', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  enabled: integer('enabled', { mode: 'boolean' }).default(true),
  priority: integer('priority').default(100),
  config: text('config'), // JSON
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`)
})

export const airports = sqliteTable('airports', {
  id: text('id').primaryKey(),
  providerId: text('provider_id').notNull(),
  code: text('code').notNull(),
  name: text('name').notNull(),
  city: text('city'),
  country: text('country').notNull(),
  latitude: real('latitude'),
  longitude: real('longitude'),
  timezone: text('timezone'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`)
}, table => ({
  providerCodeUnique: unique().on(table.providerId, table.code),
  codeIdx: index('idx_airports_code').on(table.code),
  providerIdx: index('idx_airports_provider').on(table.providerId),
  countryIdx: index('idx_airports_country').on(table.country)
}))

export const routes = sqliteTable('routes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  providerId: text('provider_id').notNull(),
  originCode: text('origin_code').notNull(),
  destinationCode: text('destination_code').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`)
}, table => ({
  providerRouteUnique: unique().on(table.providerId, table.originCode, table.destinationCode),
  originIdx: index('idx_routes_origin').on(table.originCode),
  destinationIdx: index('idx_routes_destination').on(table.destinationCode),
  providerIdx: index('idx_routes_provider').on(table.providerId)
}))

export const flights = sqliteTable('flights', {
  id: text('id').primaryKey(),
  providerId: text('provider_id').notNull(),
  flightNumber: text('flight_number').notNull(),
  originCode: text('origin_code').notNull(),
  destinationCode: text('destination_code').notNull(),
  departureDate: text('departure_date').notNull(),
  departureTime: text('departure_time').notNull(),
  arrivalDate: text('arrival_date').notNull(),
  arrivalTime: text('arrival_time').notNull(),
  durationMinutes: integer('duration_minutes'),
  basePrice: real('base_price').notNull(),
  taxPrice: real('tax_price').notNull(),
  totalPrice: real('total_price').notNull(),
  currency: text('currency').notNull(),
  seatsAvailable: integer('seats_available'),
  operatingCarrier: text('operating_carrier').notNull(),
  marketingCarrier: text('marketing_carrier'),
  cabinClass: text('cabin_class').notNull(),
  aircraft: text('aircraft'),
  stops: integer('stops').default(0),
  bookingUrl: text('booking_url'),
  fetchedAt: text('fetched_at').notNull(),
  expiresAt: text('expires_at').notNull(),
  searchHash: text('search_hash').notNull(),
  createdAt: text('created_at').default(sql`(datetime('now'))`)
}, table => ({
  searchIdx: index('idx_flights_search').on(table.originCode, table.destinationCode, table.departureDate),
  providerIdx: index('idx_flights_provider').on(table.providerId),
  hashIdx: index('idx_flights_hash').on(table.searchHash),
  expiresIdx: index('idx_flights_expires').on(table.expiresAt),
  priceIdx: index('idx_flights_price').on(table.totalPrice)
}))

export const priceHistory = sqliteTable('price_history', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  flightId: text('flight_id').notNull(),
  providerId: text('provider_id').notNull(),
  flightNumber: text('flight_number').notNull(),
  departureDate: text('departure_date').notNull(),
  totalPrice: real('total_price').notNull(),
  currency: text('currency').notNull(),
  seatsAvailable: integer('seats_available'),
  recordedAt: text('recorded_at').default(sql`(datetime('now'))`)
}, table => ({
  flightIdx: index('idx_price_history_flight').on(table.flightId),
  dateIdx: index('idx_price_history_date').on(table.departureDate, table.recordedAt)
}))

export const syncStatus = sqliteTable('sync_status', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  providerId: text('provider_id').notNull(),
  syncType: text('sync_type').notNull(),
  status: text('status').notNull(),
  startedAt: text('started_at'),
  completedAt: text('completed_at'),
  errorMessage: text('error_message'),
  itemsProcessed: integer('items_processed').default(0),
  createdAt: text('created_at').default(sql`(datetime('now'))`)
}, table => ({
  providerIdx: index('idx_sync_status_provider').on(table.providerId, table.syncType)
}))

export const searchHistory = sqliteTable('search_history', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  originCode: text('origin_code').notNull(),
  destinationCode: text('destination_code').notNull(),
  departureDate: text('departure_date').notNull(),
  returnDate: text('return_date'),
  passengers: integer('passengers').notNull(),
  cabinClass: text('cabin_class'),
  resultsCount: integer('results_count'),
  lowestPrice: real('lowest_price'),
  currency: text('currency'),
  searchedAt: text('searched_at').default(sql`(datetime('now'))`),
  userSession: text('user_session')
}, table => ({
  routeIdx: index('idx_search_history_route').on(table.originCode, table.destinationCode),
  dateIdx: index('idx_search_history_date').on(table.searchedAt)
}))

export const currencyRates = sqliteTable('currency_rates', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  baseCurrency: text('base_currency').notNull(),
  targetCurrency: text('target_currency').notNull(),
  rate: real('rate').notNull(),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`)
}, table => ({
  currencyPairUnique: unique().on(table.baseCurrency, table.targetCurrency)
}))

// =============================================================================
// WhatsApp Bot Chat Logs
// =============================================================================

export const chatLogs = sqliteTable('chat_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),

  // Conversation context
  sessionId: text('session_id').notNull(), // Phone number hash or session ID
  phoneHash: text('phone_hash').notNull(), // Hashed phone number for privacy

  // Message details
  direction: text('direction').notNull(), // 'inbound' | 'outbound'
  messageType: text('message_type').notNull(), // 'text' | 'search' | 'results' | 'help' | 'error'
  content: text('content').notNull(), // Message text

  // Parsed data (for inbound messages)
  parsedQuery: text('parsed_query', { mode: 'json' }), // Parsed query JSON

  // Metadata
  language: text('language'), // 'de' | 'en' | 'sq'
  confidence: real('confidence'), // Parser confidence
  responseTimeMs: integer('response_time_ms'), // How long the bot took to respond

  // Timestamps
  timestamp: integer('timestamp', { mode: 'timestamp_ms' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).default(sql`(unixepoch() * 1000)`)
}, table => ({
  sessionIdx: index('idx_chat_logs_session').on(table.sessionId),
  phoneIdx: index('idx_chat_logs_phone').on(table.phoneHash),
  timestampIdx: index('idx_chat_logs_timestamp').on(table.timestamp),
  directionIdx: index('idx_chat_logs_direction').on(table.direction),
  typeIdx: index('idx_chat_logs_type').on(table.messageType)
}))

// =============================================================================
// WhatsApp Bot Sessions (for persistent state)
// =============================================================================

export const botSessions = sqliteTable('bot_sessions', {
  // Phone hash as primary key (one session per user)
  phoneHash: text('phone_hash').primaryKey(),

  // Conversation state (JSON)
  conversationState: text('conversation_state', { mode: 'json' }),

  // Language preference
  preferredLanguage: text('preferred_language'), // 'de' | 'en' | 'sq'

  // Rate limiting
  rateLimitMinute: integer('rate_limit_minute').default(0),
  rateLimitDay: integer('rate_limit_day').default(0),
  rateLimitMinuteReset: integer('rate_limit_minute_reset', { mode: 'timestamp_ms' }),
  rateLimitDayReset: integer('rate_limit_day_reset', { mode: 'timestamp_ms' }),

  // User flags
  isKnownUser: integer('is_known_user', { mode: 'boolean' }).default(false),

  // Timestamps
  lastMessageAt: integer('last_message_at', { mode: 'timestamp_ms' }),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).default(sql`(unixepoch() * 1000)`),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).default(sql`(unixepoch() * 1000)`)
}, table => ({
  lastMessageIdx: index('idx_bot_sessions_last_message').on(table.lastMessageAt)
}))

// =============================================================================
// Analytics Tables (NEW)
// =============================================================================

export const analyticsEvents = sqliteTable('analytics_events', {
  id: text('id').primaryKey(),
  eventType: text('event_type').notNull(),
  timestamp: integer('timestamp', { mode: 'timestamp_ms' }).notNull(),
  sessionId: text('session_id').notNull(),

  // User Context
  userId: text('user_id'),
  channel: text('channel').notNull(), // 'web' | 'whatsapp'
  language: text('language'),

  // Event Data (JSON)
  data: text('data', { mode: 'json' }).notNull(),

  createdAt: integer('created_at', { mode: 'timestamp_ms' }).default(sql`(unixepoch() * 1000)`)
}, table => ({
  typeIdx: index('idx_events_type').on(table.eventType),
  sessionIdx: index('idx_events_session').on(table.sessionId),
  timestampIdx: index('idx_events_timestamp').on(table.timestamp),
  channelIdx: index('idx_events_channel').on(table.channel),
  userIdx: index('idx_events_user').on(table.userId)
}))

export const analyticsConversions = sqliteTable('analytics_conversions', {
  id: text('id').primaryKey(),
  date: text('date').notNull(), // YYYY-MM-DD

  // Search Metrics
  totalSearches: integer('total_searches').default(0),
  webSearches: integer('web_searches').default(0),
  whatsappSearches: integer('whatsapp_searches').default(0),

  // Results Metrics
  totalResultsLoaded: integer('total_results_loaded').default(0),
  avgResultsPerSearch: real('avg_results_per_search'),
  avgLoadTime: real('avg_load_time'),

  // Click Metrics
  totalClicks: integer('total_clicks').default(0),
  clicksPerSearch: real('clicks_per_search'),

  // Conversion Metrics
  totalRedirects: integer('total_redirects').default(0),
  conversionRate: real('conversion_rate'),

  // Provider Breakdown (JSON)
  providerStats: text('provider_stats', { mode: 'json' }),

  // Revenue
  estimatedRevenue: real('estimated_revenue'),
  confirmedRevenue: real('confirmed_revenue'),

  createdAt: integer('created_at', { mode: 'timestamp_ms' }).default(sql`(unixepoch() * 1000)`)
}, table => ({
  dateIdx: index('idx_conversions_date').on(table.date),
  dateUnique: unique().on(table.date)
}))

export const analyticsProviderPerformance = sqliteTable('analytics_provider_performance', {
  id: text('id').primaryKey(),
  date: text('date').notNull(),
  providerId: text('provider_id').notNull(),

  // Performance
  totalSearches: integer('total_searches').default(0),
  totalResults: integer('total_results').default(0),
  avgResultsCount: real('avg_results_count'),
  avgLoadTime: real('avg_load_time'),
  errorCount: integer('error_count').default(0),
  errorRate: real('error_rate'),

  // Pricing
  avgPrice: real('avg_price'),
  minPrice: real('min_price'),
  maxPrice: real('max_price'),

  // Engagement
  totalClicks: integer('total_clicks').default(0),
  ctr: real('ctr'), // Click-Through-Rate

  // Conversion
  totalRedirects: integer('total_redirects').default(0),
  conversionRate: real('conversion_rate'),

  // Revenue
  estimatedCommission: real('estimated_commission'),

  createdAt: integer('created_at', { mode: 'timestamp_ms' }).default(sql`(unixepoch() * 1000)`)
}, table => ({
  dateIdx: index('idx_provider_perf_date').on(table.date),
  providerIdx: index('idx_provider_perf_provider').on(table.providerId),
  dateProviderUnique: unique().on(table.date, table.providerId)
}))

export const analyticsRoutePerformance = sqliteTable('analytics_route_performance', {
  id: text('id').primaryKey(),
  date: text('date').notNull(),
  originCode: text('origin_code').notNull(),
  destinationCode: text('destination_code').notNull(),

  // Search Metrics
  searchCount: integer('search_count').default(0),

  // Results Metrics
  avgResultsCount: real('avg_results_count'),
  avgLowestPrice: real('avg_lowest_price'),

  // Engagement
  clickCount: integer('click_count').default(0),
  redirectCount: integer('redirect_count').default(0),

  // Revenue
  estimatedRevenue: real('estimated_revenue'),

  createdAt: integer('created_at', { mode: 'timestamp_ms' }).default(sql`(unixepoch() * 1000)`)
}, table => ({
  dateIdx: index('idx_route_perf_date').on(table.date),
  routeIdx: index('idx_route_perf_route').on(table.originCode, table.destinationCode),
  dateRouteUnique: unique().on(table.date, table.originCode, table.destinationCode)
}))

// =============================================================================
// TypeScript Types (Inferred from Schema)
// =============================================================================

export type Provider = typeof providers.$inferSelect
export type NewProvider = typeof providers.$inferInsert

export type Airport = typeof airports.$inferSelect
export type NewAirport = typeof airports.$inferInsert

export type Route = typeof routes.$inferSelect
export type NewRoute = typeof routes.$inferInsert

export type Flight = typeof flights.$inferSelect
export type NewFlight = typeof flights.$inferInsert

export type PriceHistory = typeof priceHistory.$inferSelect
export type NewPriceHistory = typeof priceHistory.$inferInsert

export type SyncStatus = typeof syncStatus.$inferSelect
export type NewSyncStatus = typeof syncStatus.$inferInsert

export type SearchHistory = typeof searchHistory.$inferSelect
export type NewSearchHistory = typeof searchHistory.$inferInsert

export type CurrencyRate = typeof currencyRates.$inferSelect
export type NewCurrencyRate = typeof currencyRates.$inferInsert

export type AnalyticsEvent = typeof analyticsEvents.$inferSelect
export type NewAnalyticsEvent = typeof analyticsEvents.$inferInsert

export type AnalyticsConversion = typeof analyticsConversions.$inferSelect
export type NewAnalyticsConversion = typeof analyticsConversions.$inferInsert

export type AnalyticsProviderPerformance = typeof analyticsProviderPerformance.$inferSelect
export type NewAnalyticsProviderPerformance = typeof analyticsProviderPerformance.$inferInsert

export type AnalyticsRoutePerformance = typeof analyticsRoutePerformance.$inferSelect
export type NewAnalyticsRoutePerformance = typeof analyticsRoutePerformance.$inferInsert

export type ChatLog = typeof chatLogs.$inferSelect
export type NewChatLog = typeof chatLogs.$inferInsert

export type BotSession = typeof botSessions.$inferSelect
export type NewBotSession = typeof botSessions.$inferInsert

// Auth Types
export type User = typeof user.$inferSelect
export type NewUser = typeof user.$inferInsert

export type Session = typeof session.$inferSelect
export type NewSession = typeof session.$inferInsert

export type Account = typeof account.$inferSelect
export type NewAccount = typeof account.$inferInsert

export type Verification = typeof verification.$inferSelect
export type NewVerification = typeof verification.$inferInsert
