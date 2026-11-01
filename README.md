# Webring

An independent webring connecting personal websites. See `docs/architecture.md` for design decisions.

## Commands

- `npm run dev`: dev server at http://localhost:3000
- `npm run build` / `npm start`: production build and serve
- `npm run lint`, `npm run typecheck`
- `npm run test:run`: unit tests (Vitest); `npm test` for watch mode
- `npm run test:e2e`: end-to-end tests (Playwright; needs Chromium and its system libraries)

## Widget

The embeddable widget lives in `widget/` (see `docs/architecture.md`). `npm run build:widget` copies it to `public/widget/v1.js`; `dev` and `build` do this automatically. Install instructions are served at `/widget`.
