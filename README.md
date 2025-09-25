# Bookseller’s Synonyms — Vercel (CommonJS functions)

This version fixes 404s on API routes by using **CommonJS exports** for serverless functions.

- `/api/story.js` — serverless generator (CommonJS `module.exports = ...`)
- `/api/check.js` — server-side answer validator
- `/public/library.html` — static UI fetching `/api/story` and posting to `/api/check`
 - `/public/clicker.html` — Library Clicker (clues via server API)
- `/public/maze.html` — Maze adventure (final answer checked server-side)

## Deploy
1. Create a new repo with these files.
2. Import into Vercel (framework = **Other**). No build step required.
3. Open your URL and try `/api/story?seed=23` and `/api/check` with a POST body.
4. Static pages:
   - `/` or `/library` serves `public/library.html`
   - `/clicker` serves `public/clicker.html`
   - `/maze` serves `public/maze.html`

## Notes on secrets
- Clicker special clue texts are served by `/api/clicker-event` and not embedded in HTML.
- Maze final answer is validated by `/api/maze?op=check`.

## Local test
- `npx vercel dev` then open http://localhost:3000
