CREATE TABLE `members` (
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
	CONSTRAINT "members_id_format" CHECK(length("members"."id") BETWEEN 1 AND 64 AND "members"."id" NOT GLOB '*[^A-Za-z0-9_-]*'),
	CONSTRAINT "members_url_http" CHECK(("members"."url" LIKE 'http://_%' OR "members"."url" LIKE 'https://_%') AND length("members"."url") <= 2048 AND instr("members"."url", ' ') = 0 AND instr("members"."url", char(9)) = 0 AND instr("members"."url", char(10)) = 0 AND instr("members"."url", char(13)) = 0),
	CONSTRAINT "members_name_length" CHECK(length(trim("members"."display_name")) BETWEEN 1 AND 60),
	CONSTRAINT "members_description_length" CHECK(length("members"."description") <= 160),
	CONSTRAINT "members_joined_at" CHECK("members"."joined_at" GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]' AND coalesce(date("members"."joined_at") = "members"."joined_at", 0)),
	CONSTRAINT "members_status_valid" CHECK("members"."status" IN ('active', 'inactive', 'suspended')),
	CONSTRAINT "members_tags" CHECK(json_valid("members"."tags") AND json_type("members"."tags") = 'array' AND json_array_length("members"."tags") <= 5),
	CONSTRAINT "members_accent_hex" CHECK("members"."accent_color" IS NULL OR (length("members"."accent_color") = 7 AND "members"."accent_color" GLOB '#[0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f]')),
	CONSTRAINT "members_avatar_https" CHECK("members"."avatar_url" IS NULL OR ("members"."avatar_url" LIKE 'https://_%' AND length("members"."avatar_url") <= 2048 AND instr("members"."avatar_url", ' ') = 0))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `members_ring_url_unique` ON `members` (`ring_id`,`url`);--> statement-breakpoint
CREATE INDEX `members_ring_order` ON `members` (`ring_id`,`status`,`joined_at`,`id`);--> statement-breakpoint
CREATE TABLE `rings` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	CONSTRAINT "rings_id_format" CHECK(length("rings"."id") BETWEEN 1 AND 32 AND "rings"."id" NOT GLOB '*[^a-z0-9-]*')
);
