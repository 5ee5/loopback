# Operations notes

How to run and look after a Loopback ring: the database, the admin area and the live deployment. (Moved out of the README; the design decisions are in `architecture.md`.)

## Database and members

Copy `.env.example` to `.env.local`, then `npm run db:migrate` (and `npm run db:seed` for fictional dev data). The database is a SQLite file in `data/`.

Add a real member with SQL (the schema rejects invalid rows; the `PRAGMA` turns on foreign-key checks, which `sqlite3` skips by default):

```sh
sqlite3 data/loopback.db "PRAGMA foreign_keys = ON;
INSERT INTO members (ring_id, display_name, url, description, status, tags)
VALUES ('main', 'Your Name', 'https://example.com', 'A short description.', 'active', '[\"blog\"]');
SELECT id FROM members WHERE url = 'https://example.com';"
```

Change a status with `UPDATE members SET status = 'suspended' WHERE id = '...'`. Changes appear on the site within a couple of minutes (cached reads).

## Admin

1. In `.env.local` set `BETTER_AUTH_SECRET` (`openssl rand -base64 32`) and `ADMIN_EMAIL` (the address you will sign in with).
2. `npm run db:migrate`, then `npm run admin:create` and type a password (8+ characters).
3. Sign in at `/admin/login`. There you approve or reject applications (you see the applicant's email there, and only there) and mark members live. Approving makes the member "setting up"; **Mark live** puts them in the ring. Email the applicant their member ID yourself.

From the admin you can also edit members, change their status (suspending needs a private reason), remove them (you must type their name), and read the audit log of everything you did (`/admin/log`, append-only).

There is no sign-up and no public auth endpoint. Forgot the password? `npm run admin:create -- --force`.

After you have replied to applicants you can delete their emails: `sqlite3 data/loopback.db "UPDATE applications SET contact_email = NULL WHERE status <> 'pending';"`.

## Running it live (one folder)

Development and the live ring share this folder but not their data or build output:

| | dev | live |
|---|---|---|
| settings | `.env.local` | `.env.live` (gitignored, never auto-loaded) |
| database | `data/loopback.db` | `data/live.db` |
| build | `.next` (and `.next/dev`) | `.next-live` (`NEXT_DIST_DIR`) |
| run | `npm run dev` | pm2 process `loopback`, `127.0.0.1:3200` |

`.env.live` needs `DATABASE_PATH=./data/live.db`, `SITE_URL` (https), `BETTER_AUTH_SECRET`, `ADMIN_EMAIL`, `TRUST_PROXY=true` (exactly one proxy in front), `NEXT_DIST_DIR=.next-live` and an empty `TRUSTED_ORIGINS=`.

- `npm run live:admin` creates (or with `-- --force` resets) the live admin account.
- `npm run live:deploy` migrates the live database, builds into `.next-live`, restarts pm2 and saves its list. It refuses uncommitted changes (`ALLOW_DIRTY=1` overrides), so what goes live is what is committed.
- The public address comes from a Cloudflare Tunnel ingress entry (`/etc/cloudflared/config.yml`) pointing at port 3200.
