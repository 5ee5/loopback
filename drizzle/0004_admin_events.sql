CREATE TABLE `admin_events` (
	`id` text PRIMARY KEY DEFAULT ('e_' || lower(hex(randomblob(4)))) NOT NULL,
	`at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`admin_user_id` text NOT NULL,
	`admin_email` text NOT NULL,
	`action` text NOT NULL,
	`target_type` text NOT NULL,
	`target_id` text NOT NULL,
	`summary` text NOT NULL,
	`details` text DEFAULT '{}' NOT NULL,
	CONSTRAINT "admin_events_action_valid" CHECK("admin_events"."action" IN ('application.approved', 'application.rejected', 'member.live', 'member.updated', 'member.status_changed', 'member.removed', 'admin.password_changed')),
	CONSTRAINT "admin_events_target_type_valid" CHECK("admin_events"."target_type" IN ('application', 'member', 'admin')),
	CONSTRAINT "admin_events_summary_length" CHECK(length("admin_events"."summary") BETWEEN 1 AND 300),
	CONSTRAINT "admin_events_details" CHECK(json_valid("admin_events"."details") AND json_type("admin_events"."details") = 'object' AND length("admin_events"."details") <= 4000)
);
--> statement-breakpoint
CREATE INDEX `admin_events_order` ON `admin_events` (`at`,`id`);--> statement-breakpoint
CREATE INDEX `admin_events_target` ON `admin_events` (`target_type`,`target_id`);