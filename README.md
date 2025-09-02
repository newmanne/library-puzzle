# Bookseller’s Synonyms — Serverless Deploy

## Deploy on Vercel
1. Create a new repo with this folder.
2. Import into Vercel (or `vercel deploy`).
3. Open the URL; the UI calls `/api/story?seed=SEED` to render paragraphs server-side.

- `api/story.js`: serverless function with deterministic generator.
- `public/index.html`: static UI fetching story HTML.
- `vercel.json`: route root to the static HTML.

## Local test (optional)
- `npx vercel dev` then open http://localhost:3000
# library-puzzle
