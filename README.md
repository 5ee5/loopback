# Webring

An independent webring connecting personal websites. See `docs/architecture.md` for design decisions.

## Commands

- `npm run dev`: dev server at http://localhost:3000
- `npm run build` / `npm start`: production build and serve
- `npm run lint`, `npm run typecheck`
- `npm run test:run`: unit tests (Vitest); `npm test` for watch mode
- `npm run test:integration`: tests against a real SQLite file (constraints, repository, API)
- `npm run db:migrate`, `npm run db:generate`: apply / generate Drizzle migrations
- `npm run admin:create`: create the admin account (`-- --force` replaces it)
- `npm run db:seed`: load the fictional dev members (never in production)
- `npm run test:e2e`: end-to-end tests (Playwright; needs Chromium and its system libraries)

## Widget

The embeddable widget lives in `widget/` (see `docs/architecture.md`). `npm run build:widget` copies it to `public/widget/v1.js`; `dev` and `build` do this automatically. Install instructions are served at `/widget`.

For sites that can't run scripts there is also a one-line iframe: `<iframe src="https://YOUR-RING/embed?url=https://your-site.com" width="320" height="70"></iframe>` (optional `fgcolor` and `bgcolor`, hex without `#`).

## Database and members

Copy `.env.example` to `.env.local`, then `npm run db:migrate` (and `npm run db:seed` for fictional dev data). The database is a SQLite file in `data/`.

Add a real member with SQL (the schema rejects invalid rows; the `PRAGMA` turns on foreign-key checks, which `sqlite3` skips by default):

```sh
sqlite3 data/webring.db "PRAGMA foreign_keys = ON;
INSERT INTO members (ring_id, display_name, url, description, status, tags)
VALUES ('main', 'Your Name', 'https://example.com', 'A short description.', 'active', '[\"blog\"]');
SELECT id FROM members WHERE url = 'https://example.com';"
```

Change a status with `UPDATE members SET status = 'suspended' WHERE id = '...'`. Changes appear on the site within a couple of minutes (cached reads).

## Admin

1. In `.env.local` set `BETTER_AUTH_SECRET` (`openssl rand -base64 32`) and `ADMIN_EMAIL` (the address you will sign in with).
2. `npm run db:migrate`, then `npm run admin:create` and type a password (12+ characters).
3. Sign in at `/admin/login`. There you approve or reject applications (you see the applicant's email there, and only there) and mark members live. Approving makes the member "setting up"; **Mark live** puts them in the ring. Email the applicant their member ID yourself.

From the admin you can also edit members, change their status (suspending needs a private reason), remove them (you must type their name), and read the audit log of everything you did (`/admin/log`, append-only).

There is no sign-up and no public auth endpoint. Forgot the password? `npm run admin:create -- --force`.

After you have replied to applicants you can delete their emails: `sqlite3 data/webring.db "UPDATE applications SET contact_email = NULL WHERE status <> 'pending';"`.
