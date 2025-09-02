# Bookseller’s Synonyms — Vercel (CommonJS functions)

This version fixes 404s on API routes by using **CommonJS exports** for serverless functions.

- `/api/story.js` — serverless generator (CommonJS `module.exports = ...`)
- `/api/check.js` — server-side answer validator
- `/public/index.html` — static UI fetching `/api/story` and posting to `/api/check`

## Deploy
1. Create a new repo with these files.
2. Import into Vercel (framework = **Other**). No build step required.
3. Open your URL and try `/api/story?seed=23` and `/api/check` with a POST body.

## Local test
- `npx vercel dev` then open http://localhost:3000
