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
// Core Tables
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

export const analyticsEvents = sqliteTable('analytics_events', {
  id: text('id').primaryKey(),
  eventType: text('event_type').notNull(),
  timestamp: integer('timestamp', { mode: 'timestamp_ms' }).notNull(),
  sessionId: text('session_id').notNull(),
  userId: text('user_id'),
  channel: text('channel').notNull(), // 'web' | 'whatsapp'
  language: text('language'),
  data: text('data', { mode: 'json' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).default(sql`(unixepoch() * 1000)`)
}, table => ({
  typeIdx: index('idx_events_type').on(table.eventType),
  sessionIdx: index('idx_events_session').on(table.sessionId),
  timestampIdx: index('idx_events_timestamp').on(table.timestamp),
  channelIdx: index('idx_events_channel').on(table.channel),
  userIdx: index('idx_events_user').on(table.userId)
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

export type AnalyticsEvent = typeof analyticsEvents.$inferSelect
export type NewAnalyticsEvent = typeof analyticsEvents.$inferInsert
