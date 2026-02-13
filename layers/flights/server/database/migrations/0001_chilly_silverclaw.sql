CREATE TABLE `chat_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`session_id` text NOT NULL,
	`phone_hash` text NOT NULL,
	`direction` text NOT NULL,
	`message_type` text NOT NULL,
	`content` text NOT NULL,
	`parsed_query` text,
	`language` text,
	`confidence` real,
	`response_time_ms` integer,
	`timestamp` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000)
);
--> statement-breakpoint
CREATE INDEX `idx_chat_logs_session` ON `chat_logs` (`session_id`);--> statement-breakpoint
CREATE INDEX `idx_chat_logs_phone` ON `chat_logs` (`phone_hash`);--> statement-breakpoint
CREATE INDEX `idx_chat_logs_timestamp` ON `chat_logs` (`timestamp`);--> statement-breakpoint
CREATE INDEX `idx_chat_logs_direction` ON `chat_logs` (`direction`);--> statement-breakpoint
CREATE INDEX `idx_chat_logs_type` ON `chat_logs` (`message_type`);