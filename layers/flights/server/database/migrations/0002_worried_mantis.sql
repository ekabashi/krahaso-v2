CREATE TABLE `bot_sessions` (
	`phone_hash` text PRIMARY KEY NOT NULL,
	`conversation_state` text,
	`preferred_language` text,
	`rate_limit_minute` integer DEFAULT 0,
	`rate_limit_day` integer DEFAULT 0,
	`rate_limit_minute_reset` integer,
	`rate_limit_day_reset` integer,
	`is_known_user` integer DEFAULT false,
	`last_message_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000),
	`updated_at` integer DEFAULT (unixepoch() * 1000)
);
--> statement-breakpoint
CREATE INDEX `idx_bot_sessions_last_message` ON `bot_sessions` (`last_message_at`);