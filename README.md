# Bookseller’s Synonyms — Serverless Deploy (Server-side Answer Check)

- `/api/story.js`: serverless generator for prose + colophons (no secrets in client).
- `/api/check.js`: server-side answer validator; never reveals the correct answer.
- `/public/index.html`: static UI that fetches the story and posts guesses to `/api/check`.
- `/vercel.json`: route root to the static HTML.

## Deploy on Vercel
1. Create a new repo with these files.
2. Import into Vercel and Deploy.
3. Open the URL; use `?seed=` to test various editions.

### Local dev
- `npx vercel dev` to run both static and API routes locally.
