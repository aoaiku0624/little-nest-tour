CREATE TABLE `game_records` (
	`id` text PRIMARY KEY NOT NULL,
	`state_json` text NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`agent_status` text DEFAULT 'offline' NOT NULL,
	`active_session_id` text,
	`agent_id` text,
	`session_opened_at` integer,
	`processed_requests_json` text DEFAULT '[]' NOT NULL,
	`updated_at` integer NOT NULL
);
