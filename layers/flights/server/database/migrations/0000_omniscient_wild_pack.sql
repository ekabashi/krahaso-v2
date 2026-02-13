CREATE TABLE `airports` (
	`id` text PRIMARY KEY NOT NULL,
	`provider_id` text NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`city` text,
	`country` text NOT NULL,
	`latitude` real,
	`longitude` real,
	`timezone` text,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE INDEX `idx_airports_code` ON `airports` (`code`);--> statement-breakpoint
CREATE INDEX `idx_airports_provider` ON `airports` (`provider_id`);--> statement-breakpoint
CREATE INDEX `idx_airports_country` ON `airports` (`country`);--> statement-breakpoint
CREATE UNIQUE INDEX `airports_provider_id_code_unique` ON `airports` (`provider_id`,`code`);--> statement-breakpoint
CREATE TABLE `analytics_conversions` (
	`id` text PRIMARY KEY NOT NULL,
	`date` text NOT NULL,
	`total_searches` integer DEFAULT 0,
	`web_searches` integer DEFAULT 0,
	`whatsapp_searches` integer DEFAULT 0,
	`total_results_loaded` integer DEFAULT 0,
	`avg_results_per_search` real,
	`avg_load_time` real,
	`total_clicks` integer DEFAULT 0,
	`clicks_per_search` real,
	`total_redirects` integer DEFAULT 0,
	`conversion_rate` real,
	`provider_stats` text,
	`estimated_revenue` real,
	`confirmed_revenue` real,
	`created_at` integer DEFAULT (unixepoch() * 1000)
);
--> statement-breakpoint
CREATE INDEX `idx_conversions_date` ON `analytics_conversions` (`date`);--> statement-breakpoint
CREATE UNIQUE INDEX `analytics_conversions_date_unique` ON `analytics_conversions` (`date`);--> statement-breakpoint
CREATE TABLE `analytics_events` (
	`id` text PRIMARY KEY NOT NULL,
	`event_type` text NOT NULL,
	`timestamp` integer NOT NULL,
	`session_id` text NOT NULL,
	`user_id` text,
	`channel` text NOT NULL,
	`language` text,
	`data` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000)
);
--> statement-breakpoint
CREATE INDEX `idx_events_type` ON `analytics_events` (`event_type`);--> statement-breakpoint
CREATE INDEX `idx_events_session` ON `analytics_events` (`session_id`);--> statement-breakpoint
CREATE INDEX `idx_events_timestamp` ON `analytics_events` (`timestamp`);--> statement-breakpoint
CREATE INDEX `idx_events_channel` ON `analytics_events` (`channel`);--> statement-breakpoint
CREATE INDEX `idx_events_user` ON `analytics_events` (`user_id`);--> statement-breakpoint
CREATE TABLE `analytics_provider_performance` (
	`id` text PRIMARY KEY NOT NULL,
	`date` text NOT NULL,
	`provider_id` text NOT NULL,
	`total_searches` integer DEFAULT 0,
	`total_results` integer DEFAULT 0,
	`avg_results_count` real,
	`avg_load_time` real,
	`error_count` integer DEFAULT 0,
	`error_rate` real,
	`avg_price` real,
	`min_price` real,
	`max_price` real,
	`total_clicks` integer DEFAULT 0,
	`ctr` real,
	`total_redirects` integer DEFAULT 0,
	`conversion_rate` real,
	`estimated_commission` real,
	`created_at` integer DEFAULT (unixepoch() * 1000)
);
--> statement-breakpoint
CREATE INDEX `idx_provider_perf_date` ON `analytics_provider_performance` (`date`);--> statement-breakpoint
CREATE INDEX `idx_provider_perf_provider` ON `analytics_provider_performance` (`provider_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `analytics_provider_performance_date_provider_id_unique` ON `analytics_provider_performance` (`date`,`provider_id`);--> statement-breakpoint
CREATE TABLE `analytics_route_performance` (
	`id` text PRIMARY KEY NOT NULL,
	`date` text NOT NULL,
	`origin_code` text NOT NULL,
	`destination_code` text NOT NULL,
	`search_count` integer DEFAULT 0,
	`avg_results_count` real,
	`avg_lowest_price` real,
	`click_count` integer DEFAULT 0,
	`redirect_count` integer DEFAULT 0,
	`estimated_revenue` real,
	`created_at` integer DEFAULT (unixepoch() * 1000)
);
--> statement-breakpoint
CREATE INDEX `idx_route_perf_date` ON `analytics_route_performance` (`date`);--> statement-breakpoint
CREATE INDEX `idx_route_perf_route` ON `analytics_route_performance` (`origin_code`,`destination_code`);--> statement-breakpoint
CREATE UNIQUE INDEX `analytics_route_performance_date_origin_code_destination_code_unique` ON `analytics_route_performance` (`date`,`origin_code`,`destination_code`);--> statement-breakpoint
CREATE TABLE `currency_rates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`base_currency` text NOT NULL,
	`target_currency` text NOT NULL,
	`rate` real NOT NULL,
	`updated_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `currency_rates_base_currency_target_currency_unique` ON `currency_rates` (`base_currency`,`target_currency`);--> statement-breakpoint
CREATE TABLE `flights` (
	`id` text PRIMARY KEY NOT NULL,
	`provider_id` text NOT NULL,
	`flight_number` text NOT NULL,
	`origin_code` text NOT NULL,
	`destination_code` text NOT NULL,
	`departure_date` text NOT NULL,
	`departure_time` text NOT NULL,
	`arrival_date` text NOT NULL,
	`arrival_time` text NOT NULL,
	`duration_minutes` integer,
	`base_price` real NOT NULL,
	`tax_price` real NOT NULL,
	`total_price` real NOT NULL,
	`currency` text NOT NULL,
	`seats_available` integer,
	`operating_carrier` text NOT NULL,
	`marketing_carrier` text,
	`cabin_class` text NOT NULL,
	`aircraft` text,
	`stops` integer DEFAULT 0,
	`booking_url` text,
	`fetched_at` text NOT NULL,
	`expires_at` text NOT NULL,
	`search_hash` text NOT NULL,
	`created_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE INDEX `idx_flights_search` ON `flights` (`origin_code`,`destination_code`,`departure_date`);--> statement-breakpoint
CREATE INDEX `idx_flights_provider` ON `flights` (`provider_id`);--> statement-breakpoint
CREATE INDEX `idx_flights_hash` ON `flights` (`search_hash`);--> statement-breakpoint
CREATE INDEX `idx_flights_expires` ON `flights` (`expires_at`);--> statement-breakpoint
CREATE INDEX `idx_flights_price` ON `flights` (`total_price`);--> statement-breakpoint
CREATE TABLE `price_history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`flight_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`flight_number` text NOT NULL,
	`departure_date` text NOT NULL,
	`total_price` real NOT NULL,
	`currency` text NOT NULL,
	`seats_available` integer,
	`recorded_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE INDEX `idx_price_history_flight` ON `price_history` (`flight_id`);--> statement-breakpoint
CREATE INDEX `idx_price_history_date` ON `price_history` (`departure_date`,`recorded_at`);--> statement-breakpoint
CREATE TABLE `providers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`enabled` integer DEFAULT true,
	`priority` integer DEFAULT 100,
	`config` text,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE TABLE `routes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`provider_id` text NOT NULL,
	`origin_code` text NOT NULL,
	`destination_code` text NOT NULL,
	`is_active` integer DEFAULT true,
	`created_at` text DEFAULT (datetime('now')),
	`updated_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE INDEX `idx_routes_origin` ON `routes` (`origin_code`);--> statement-breakpoint
CREATE INDEX `idx_routes_destination` ON `routes` (`destination_code`);--> statement-breakpoint
CREATE INDEX `idx_routes_provider` ON `routes` (`provider_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `routes_provider_id_origin_code_destination_code_unique` ON `routes` (`provider_id`,`origin_code`,`destination_code`);--> statement-breakpoint
CREATE TABLE `search_history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`origin_code` text NOT NULL,
	`destination_code` text NOT NULL,
	`departure_date` text NOT NULL,
	`return_date` text,
	`passengers` integer NOT NULL,
	`cabin_class` text,
	`results_count` integer,
	`lowest_price` real,
	`currency` text,
	`searched_at` text DEFAULT (datetime('now')),
	`user_session` text
);
--> statement-breakpoint
CREATE INDEX `idx_search_history_route` ON `search_history` (`origin_code`,`destination_code`);--> statement-breakpoint
CREATE INDEX `idx_search_history_date` ON `search_history` (`searched_at`);--> statement-breakpoint
CREATE TABLE `sync_status` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`provider_id` text NOT NULL,
	`sync_type` text NOT NULL,
	`status` text NOT NULL,
	`started_at` text,
	`completed_at` text,
	`error_message` text,
	`items_processed` integer DEFAULT 0,
	`created_at` text DEFAULT (datetime('now'))
);
--> statement-breakpoint
CREATE INDEX `idx_sync_status_provider` ON `sync_status` (`provider_id`,`sync_type`);