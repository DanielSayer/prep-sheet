# Prep Sheet

A recipe keeper with private personal collections and shared group collections. Paste a recipe, import a public recipe link, or describe a dish. The app saves a structured recipe and opens a printable PDF when you select it from your collection.

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

Recipe favourites are personal to each user, including in shared collections. Star recipes from the collection or recipe page, then use the Favourites filter alongside search. Run `pnpm db:push` for existing databases to add the `recipe_favourite` table before running the updated app. Apply the schema separately in other environments.

## Implementation

- TanStack Start, React, tRPC and TanStack Query.
- Better Auth with Discord. Recipe operations and PDF downloads check personal ownership or current group membership on the server.
- PostgreSQL JSONB stores the recipe, with separate creator/group/title/source/timestamp columns. Zod validates generation and edits.
- Vercel AI SDK and OpenAI structured output. One submission creates one recipe, without a chat transcript. Missing credentials, inaccessible pages and provider failures leave the input available to retry.
- Link imports fetch HTML, prefer Recipe JSON-LD, then fall back to article text. Private network addresses and unsafe redirects are rejected. Requests are bounded by time and response size. No browser automation or paywall support.
- React PDF Renderer generates A4 PDFs on demand. React PDF/PDF.js previews them with a locally bundled worker. No PDF files are stored in the database or object storage.
- Small feature components and shared loading/error wrappers. Styles are grouped by screen, with Nunito fonts served locally. The preset's shared UI primitives remain available for future controls.

The collection supports title search, editing and deletion. Saves use a request ID to avoid duplicate records on retries. There is a simple limit of 50 saved recipes per account in a rolling 24-hour window; this is an MVP limit, not full abuse protection.

## Personal and group collections

Choose **Manage groups** beside the collection picker to create a group for friends, family or flatmates. An account can belong to multiple groups. Use the picker on Collections to browse a collection, or **Save to** on the home page to choose where a new recipe goes. Opening a recipe also lets you copy it to another collection you can access. Copies can be edited independently.

- Existing recipes stay in their owners' personal collections. Creating or joining a group never shares them automatically.
- All group members can read, add, edit, delete and print group recipes.
- The owner can rename the group, create or revoke invitation links and remove members. Other members can leave. Under **Ownership and deletion**, the owner can transfer ownership to another member before leaving, or permanently delete the group by entering its name. Deleting a group removes its shared recipes; personal recipes and independent copies remain.
- Send invitation links yourself. There is no email delivery service. A link admits one signed-in account, expires after seven days and can be revoked before use. Anyone holding an unused link can accept it, so share it privately. Existing members opening a link do not consume it.
- The invitation token is random, stored as a SHA-256 hash and placed in the URL fragment. The join screen preserves it through Discord sign-in and asks the recipient to explicitly join.
- Leaving or being removed ends server access, including PDF downloads. Contributions stay in the group. Deleting a contributor's account also preserves shared recipes. The database prevents deleting a group owner's account while they own a group.

For an existing local database, run `pnpm db:push` before starting the updated app. This adds `group`, `group_member`, `group_invite`, and nullable `recipe.group_id` tables/columns and changes the creator reference to allow deleted contributors. No recipe backfill is needed: a null group ID denotes a personal collection. The local database was upgraded during implementation. Apply the schema separately to other environments using your deployment process.

## Checks

```sh
pnpm test
pnpm check-types
pnpm build
pnpm check
```

`pnpm test` needs the local database with the schema pushed. Integration tests create unique test users, exercise real database operations and remove those users afterwards. OpenAI calls are mocked in that suite. PDF fixtures are written under ignored `tmp/pdfs` for visual inspection.

Group integration coverage includes private/group isolation, shared editing, unauthorised imports and copies, owner permissions, removal and leaving, expired/revoked invites, concurrent invite acceptance, membership changes during recipe generation and preserving contributions after account deletion.

If the build or Vitest reports missing files inside `node_modules`, repair the installed dependencies without changing their locked versions:

```sh
pnpm install --frozen-lockfile --force --no-optimistic-repeat-install
```

The workspace uses the ignored `.pnpm-store/repair` cache. This replaced a damaged cache that restored incomplete packages even during a forced reinstall. If a repair still restores missing files, use a new empty directory with `--store-dir` and update `storeDir` in `pnpm-workspace.yaml` to match. The `--no-optimistic-repeat-install` flag prevents pnpm from skipping the repair as already up to date.

To opt into live OpenAI generation/extraction checks in PowerShell:

```powershell
$env:LIVE_AI_TEST = '1'
pnpm test:live
Remove-Item Env:LIVE_AI_TEST
```

Live checks use API credits. The regular test suite never makes paid AI requests.

## Before deployment

Use a Supabase PostgreSQL connection, check the PostgreSQL version and pooling settings, and create the initial migration. Add the deployed Discord callback URL and update `BETTER_AUTH_URL`. Review sign-up and generation limits before making the app publicly reachable. Local Docker data does not automatically sync to Supabase.

If localhost shows an older app after sign-in, an existing service worker from another project may be serving cached content at that port. Clear that localhost site's service worker/cache in your browser, or use a fresh query URL such as `http://localhost:3001/?prep-sheet=1` while diagnosing it.
