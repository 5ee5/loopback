# Loopback

A small webring for personal websites: a loop of independent sites, each linking to the next, with no algorithms and no feeds. Live at **https://ring.5ee5.dev**.

Visitors follow the **Previous**, **Random** and **Next** links on a member's site and end up on another member's site. After the last site, the loop comes back to the first.

## Join

Apply at https://ring.5ee5.dev/join. Applications are reviewed by hand; the guidelines are at https://ring.5ee5.dev/guidelines. Once you're approved you get a member ID.

## Add it to your site

Paste one line where you want the links (no member ID needed; use your site's address exactly as you registered it):

```html
<iframe src="https://ring.5ee5.dev/embed?url=https://your-site.com" width="320" height="100" style="border:0" title="Loopback"></iframe>
```

It loads no scripts, images or cookies. Optional `fgcolor` and `bgcolor` parameters take hex colours without the `#`, and `name=off` shows the logo alone. Live previews and an 88×31 button are at https://ring.5ee5.dev/widget.

## Built with

Next.js, TypeScript, Tailwind and SQLite. The design decisions are written up in [`docs/architecture.md`](docs/architecture.md).

## Run it locally

```sh
npm install
cp .env.example .env.local   # then fill in the values
npm run db:migrate
npm run db:seed              # fictional dev members
npm run dev
```

`npm run test:run` runs the unit tests, `npm run test:integration` the database tests, `npm run lint` and `npm run typecheck` the static checks.
