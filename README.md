# Prep Sheet

A personal recipe keeper. Paste a recipe, import a public recipe link, or describe a dish. The app saves a structured recipe and opens a printable PDF when you select it from your collection.

## Run locally

```sh
pnpm install
pnpm db:start
```

Copy `apps/web/.env.example` to `apps/web/.env` and fill in the credentials. Keep this file ignored.

- `DATABASE_URL`: local Docker PostgreSQL connection.
- `BETTER_AUTH_SECRET`: a random secret of at least 32 characters.
- `BETTER_AUTH_URL`: `http://localhost:3001`.
- `DISCORD_CLIENT_ID` and `DISCORD_CLIENT_SECRET`: from your Discord application.
- `OPENAI_API_KEY`: an API key with available API credits.
- `OPENAI_MODEL`: defaults to `gpt-5.6-luna`.

Register `http://localhost:3001/api/auth/callback/discord` in the Discord Developer Portal under OAuth2 redirects. Use the same hostname for the app and callback.

```sh
pnpm db:push
pnpm dev
```

Open http://localhost:3001. This MVP uses Drizzle push; no migrations are generated yet.

## Implementation

- TanStack Start, React, tRPC and TanStack Query.
- Better Auth with Discord. Each API operation checks the session and recipe owner.
- PostgreSQL JSONB stores the recipe, with separate owner/title/source/timestamp columns. Zod validates generation and edits.
- Vercel AI SDK and OpenAI structured output. One submission creates one recipe, without a chat transcript. Missing credentials, inaccessible pages and provider failures leave the input available to retry.
- Link imports fetch HTML, prefer Recipe JSON-LD, then fall back to article text. Private network addresses and unsafe redirects are rejected. Requests are bounded by time and response size. No browser automation or paywall support.
- React PDF Renderer generates A4 PDFs on demand. React PDF/PDF.js previews them with a locally bundled worker. No PDF files are stored in the database or object storage.
- Small feature components and shared loading/error wrappers. Styles are grouped by screen, with Nunito fonts served locally. The preset's shared UI primitives remain available for future controls.

The collection supports title search, editing and deletion. Saves use a request ID to avoid duplicate records on retries. There is a simple limit of 50 saved recipes per account in a rolling 24-hour window; this is an MVP limit, not full abuse protection.

## Checks

```sh
pnpm test
pnpm check-types
pnpm build
pnpm check
```

`pnpm test` needs the local database with the schema pushed. Integration tests create unique test users, exercise real database operations and remove those users afterwards. OpenAI calls are mocked in that suite. PDF fixtures are written under ignored `tmp/pdfs` for visual inspection.

To opt into live OpenAI generation/extraction checks in PowerShell:

```powershell
$env:LIVE_AI_TEST = '1'
pnpm test:live
Remove-Item Env:LIVE_AI_TEST
```

Live checks use API credits. The regular test suite never makes paid AI requests.

## Before deployment

Use a Supabase PostgreSQL connection, check the PostgreSQL version and pooling settings, and create the initial migration. Add the deployed Discord callback URL and update `BETTER_AUTH_URL`. Restrict access to household Discord accounts before making the app publicly reachable. Local Docker data does not automatically sync to Supabase.

If localhost shows an older app after sign-in, an existing service worker from another project may be serving cached content at that port. Clear that localhost site's service worker/cache in your browser, or use a fresh query URL such as `http://localhost:3001/?prep-sheet=1` while diagnosing it.
