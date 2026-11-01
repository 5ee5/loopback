-- DEVELOPMENT / TEST DATA ONLY. All members are fictional (reserved example
-- domains). Never load this into a production database.
INSERT OR IGNORE INTO members (id, ring_id, display_name, url, description, joined_at, status, tags, accent_color) VALUES
  ('m_a1b2c3', 'main', 'Ada Fernsby',     'https://ada.example.com',   'Notes on small programs and old computers.',     '2026-01-12', 'active',    '["blog","programming"]',       '#a3b595'),
  ('m_d4e5f6', 'main', 'Tomas Lindqvist', 'https://tomas.example.org', 'Photography from long walks, mostly in fog.',    '2026-01-30', 'active',    '["photography"]',              '#8fa7b8'),
  ('m_g7h8j9', 'main', 'Mira Okonkwo',    'https://mira.example.net',  'A digital garden of half-finished essays.',      '2026-02-14', 'active',    '["digital garden","writing"]', '#b5a38f'),
  ('m_k1m2n3', 'main', 'Jun Park',        'https://jun.example.com',   'Illustration portfolio and sketchbook scans.',   '2026-03-03', 'active',    '["art","portfolio"]',          '#b88f9d'),
  ('m_p4q5r6', 'main', 'Elsie Marchetti', 'https://elsie.example.org', 'Recipes, bread and kitchen experiments.',        '2026-03-21', 'inactive',  '["food","blog"]',              NULL),
  ('m_s7t8u9', 'main', 'Noor Haddad',     'https://noor.example.net',  'Typography, lettering and the occasional rant.', '2026-04-09', 'active',    '["design","writing"]',         '#d9c58a'),
  ('m_v1w2x3', 'main', 'Rowan Pike',      'https://rowan.example.com', 'Field recordings and homemade synths.',          '2026-05-02', 'suspended', '["music"]',                    NULL),
  ('m_y4z5a6', 'main', 'Inés Valdivia',   'https://ines.example.org',  'Bike repair guides and route notes.',            '2026-05-27', 'active',    '["cycling","guides"]',         '#8fb8ac');

-- A member who has been approved and is still being set up (shown as a loading card).
INSERT OR IGNORE INTO members (id, ring_id, display_name, url, description, joined_at, status, tags, accent_color) VALUES
  ('m_z9y8x7w6', 'main', 'Leo Marsh', 'https://leo.example.net', 'Zines, stickers and a very small shop.', '2026-06-10', 'setup', '["zines"]', NULL);
