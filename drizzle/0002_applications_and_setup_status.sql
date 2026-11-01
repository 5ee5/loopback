CREATE TABLE `applications` (
	`id` text PRIMARY KEY DEFAULT ('a_' || lower(hex(randomblob(4)))) NOT NULL,
	`ring_id` text NOT NULL,
	`display_name` text NOT NULL,
	`url` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`tags` text DEFAULT '[]' NOT NULL,
	`contact_email` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`submitted_at` integer DEFAULT (unixepoch()) NOT NULL,
	`decided_at` integer,
	`decided_by` text,
	`decision_note` text,
	`member_id` text,
	FOREIGN KEY (`ring_id`) REFERENCES `rings`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "applications_url_http" CHECK(("applications"."url" LIKE 'http://_%' OR "applications"."url" LIKE 'https://_%') AND length("applications"."url") <= 2048 AND instr("applications"."url", ' ') = 0 AND instr("applications"."url", char(9)) = 0 AND instr("applications"."url", char(10)) = 0 AND instr("applications"."url", char(13)) = 0),
	CONSTRAINT "applications_name_length" CHECK(length(trim("applications"."display_name")) BETWEEN 1 AND 60),
	CONSTRAINT "applications_description_length" CHECK(length("applications"."description") <= 160),
	CONSTRAINT "applications_tags" CHECK(json_valid("applications"."tags") AND json_type("applications"."tags") = 'array' AND json_array_length("applications"."tags") <= 5),
	CONSTRAINT "applications_status_valid" CHECK("applications"."status" IN ('pending', 'approved', 'rejected')),
	CONSTRAINT "applications_email" CHECK("applications"."contact_email" IS NULL OR (length("applications"."contact_email") BETWEEN 3 AND 254 AND instr("applications"."contact_email", ' ') = 0 AND instr("applications"."contact_email", '@') > 1 AND instr(substr("applications"."contact_email", instr("applications"."contact_email", '@') + 1), '@') = 0 AND instr(substr("applications"."contact_email", instr("applications"."contact_email", '@') + 1), '.') > 1)),
	CONSTRAINT "applications_pending_has_email" CHECK("applications"."status" <> 'pending' OR "applications"."contact_email" IS NOT NULL),
	CONSTRAINT "applications_decided_consistency" CHECK(("applications"."status" = 'pending' AND "applications"."decided_at" IS NULL) OR ("applications"."status" <> 'pending' AND "applications"."decided_at" IS NOT NULL))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `applications_one_pending_per_url` ON `applications` (`ring_id`,`url`) WHERE "applications"."status" = 'pending';--> statement-breakpoint
CREATE INDEX `applications_status_order` ON `applications` (`status`,`submitted_at`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_members` (
	`id` text PRIMARY KEY DEFAULT ('m_' || lower(hex(randomblob(4)))) NOT NULL,
	`ring_id` text NOT NULL,
	`display_name` text NOT NULL,
	`url` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`joined_at` text DEFAULT (date('now')) NOT NULL,
	`status` text NOT NULL,
	`tags` text DEFAULT '[]' NOT NULL,
	`accent_color` text,
	`avatar_url` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`ring_id`) REFERENCES `rings`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "members_id_format" CHECK(length("__new_members"."id") BETWEEN 1 AND 64 AND "__new_members"."id" NOT GLOB '*[^A-Za-z0-9_-]*'),
	CONSTRAINT "members_url_http" CHECK(("__new_members"."url" LIKE 'http://_%' OR "__new_members"."url" LIKE 'https://_%') AND length("__new_members"."url") <= 2048 AND instr("__new_members"."url", ' ') = 0 AND instr("__new_members"."url", char(9)) = 0 AND instr("__new_members"."url", char(10)) = 0 AND instr("__new_members"."url", char(13)) = 0),
	CONSTRAINT "members_name_length" CHECK(length(trim("__new_members"."display_name")) BETWEEN 1 AND 60),
	CONSTRAINT "members_description_length" CHECK(length("__new_members"."description") <= 160),
	CONSTRAINT "members_joined_at" CHECK("__new_members"."joined_at" GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]' AND coalesce(date("__new_members"."joined_at") = "__new_members"."joined_at", 0)),
	CONSTRAINT "members_status_valid" CHECK("__new_members"."status" IN ('active', 'setup', 'inactive', 'suspended')),
	CONSTRAINT "members_tags" CHECK(json_valid("__new_members"."tags") AND json_type("__new_members"."tags") = 'array' AND json_array_length("__new_members"."tags") <= 5),
	CONSTRAINT "members_accent_hex" CHECK("__new_members"."accent_color" IS NULL OR (length("__new_members"."accent_color") = 7 AND "__new_members"."accent_color" GLOB '#[0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f]')),
	CONSTRAINT "members_avatar_https" CHECK("__new_members"."avatar_url" IS NULL OR ("__new_members"."avatar_url" LIKE 'https://_%' AND length("__new_members"."avatar_url") <= 2048 AND instr("__new_members"."avatar_url", ' ') = 0))
);
--> statement-breakpoint
INSERT INTO `__new_members`("id", "ring_id", "display_name", "url", "description", "joined_at", "status", "tags", "accent_color", "avatar_url", "created_at") SELECT "id", "ring_id", "display_name", "url", "description", "joined_at", "status", "tags", "accent_color", "avatar_url", "created_at" FROM `members`;--> statement-breakpoint
DROP TABLE `members`;--> statement-breakpoint
ALTER TABLE `__new_members` RENAME TO `members`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `members_ring_url_unique` ON `members` (`ring_id`,`url`);--> statement-breakpoint
CREATE INDEX `members_ring_order` ON `members` (`ring_id`,`status`,`joined_at`,`id`);