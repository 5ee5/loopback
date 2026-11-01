-- The single ring that exists today. Production needs this row (members reference
-- it), so it lives in a migration rather than in the dev-only seed.
INSERT OR IGNORE INTO `rings` (`id`, `name`) VALUES ('main', 'Webring');
