# Extension account access

## Credential design

Better Auth owns website sessions and Discord login. Extension access uses a separate opaque bearer token. Website cookies are never copied or accepted by extension endpoints. Tokens grant `account:read collections:read recipes:import`. Collection endpoints enforce `collections:read`; import and status endpoints enforce `recipes:import`. Existing website tRPC and Better Auth endpoints do not accept extension credentials.

A token lasts 30 days. There is no refresh token or silent renewal. Expired or revoked access requires another explicit connection. Disconnect revokes on the server before deleting local storage. A network failure preserves the token so revocation can be retried. Website Settings lists active connections and revokes them individually. Revocation is checked on each extension request.

PostgreSQL tables `extension_grant` and `extension_credential` store SHA-256 hashes of random 256-bit codes and tokens. They reference the Better Auth user with cascading deletion. Expired grants are removed when issuing a new grant. Revoked credentials remain as records but are excluded from the active list.

## Connection protocol

1. The popup asks the background worker to connect. The worker creates random state and a PKCE verifier and derives an S256 challenge.
2. `identity.launchWebAuthFlow` opens `/connect-extension` with state, challenge, extension ID and exact callback. No token or verifier is included in this URL.
3. The website validates the request before enabling login or consent. Discord login returns to this page through Better Auth. A signed-in user explicitly approves access for the displayed account.
4. A same-origin, cookie-authenticated POST issues a two-minute code bound to the account, extension, callback, state and challenge. Only this temporary code and state travel in the callback URL.
5. The worker validates the callback and state, then exchanges the code and verifier through a POST body. Atomic deletion inside a database transaction allows only one exchange, including concurrent requests.
6. The server returns the token in a non-cacheable response. The worker stores it in `storage.local`, bound to the configured website origin. Both local and session storage are restricted to `TRUSTED_CONTEXTS` before use. The worker accepts only the popup sender and returns account/status information without tokens. Content scripts are rejected even when they belong to this extension.

State and the verifier live only in the worker. Closing the popup does not cancel the identity flow. Browser shutdown or interruption before token storage requires reconnecting. Chromium 116 is the minimum version because interactive identity flows can keep the service worker alive. An interrupted exchange can leave an unused credential visible in Settings; revoke it there if needed.

## Server configuration

From `packages/db`, start PostgreSQL with `docker compose up -d` and apply the schema with `pnpm exec drizzle-kit push`.

On a non-production localhost website, the development ID `kjmnecmcpdklkaaiklbfoialfdiamabj` is trusted by default. For deployment, set `EXTENSION_IDS` in the website environment to comma-separated Chrome and Edge store IDs. An explicit list overrides the development default. No IDs are implicitly trusted on a deployed site or in production mode.

Each callback must equal `https://<id>.chromiumapp.org/prep-sheet` exactly. Wildcards, extra query parameters, fragments and alternate paths are rejected. Discord continues to use the website's existing `/api/auth/callback/discord` redirect.

The dedicated `/api/extensions` endpoints allow only exact `chrome-extension://<allowed-id>` origins for token exchange, account checks and disconnect. Website validation, approval, listing and revocation require the exact `BETTER_AUTH_URL` origin. All except request validation also require a Better Auth session. No extension origins are added to Better Auth's trusted origins, and no credentialed cross-origin cookie access is enabled. Account JSON bodies are limited to 4 KiB, including streamed bodies. The API package handles collection, import and status requests with the same exact origin and credential boundary; import bodies allow 200,000 bytes with a separate 32,000-character content limit. Token-bearing fetches omit cookies and reject redirects.

## Verification

PostgreSQL tests cover a real Better Auth test session, consent, concurrent replay, PKCE/state mismatch, callback validation, expiration, account isolation, revocation, origins, body limits and CORS. Worker tests simulate browser APIs to check storage restrictions, sender validation, account-only popup responses, network-failure recovery, website-origin binding and callback state rejection.

Run `node node_modules/vitest/vitest.mjs run packages/auth/src/extensions.test.ts apps/extension/src/lib/background.test.ts` from the root. Tests create and remove their own database users and credentials.

Website and extension type checks, the website production build, and both browser ZIP packages pass. At the end of part 2, the full test suite had 66 passing and 7 skipped tests, including 12 new server/worker tests. Website approval and Settings have been inspected at desktop and mobile widths. The built popup was previewed at 320px and 360px with simulated signed-out/connected responses. Actual unpacked Chrome/Edge installation, Discord round-trip login, popup closure during identity login and browser restart still need manual end-to-end verification. That part-2 verification predates capture and importing; current verification is in README.md.

Browser API references: [identity](https://developer.chrome.com/docs/extensions/reference/api/identity), [storage access](https://developer.chrome.com/docs/extensions/reference/api/storage), [service worker lifetime](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle).

## Durable import access

POST `/api/extensions/collections` returns the personal collection and groups the account belongs to. POST `/api/extensions/import` accepts `{ id, content, sourceUrl, groupId }` and returns queued, processing, saved or failed status. POST `/api/extensions/import-status` accepts `{ id }`. POST `/api/extensions/discard-import` accepts the original import input and refuses active jobs; a missing ID is retained as a discarded attempt. All import operations require `recipes:import`, and status is account-private. A saved group recipe link also requires current membership. Preflight permits only configured extension origins, POST and the content/authorization headers. Responses are non-cacheable and never include captured content or tokens.

The API only commits durable work; it does not run AI in a request handler. The separately supervised worker processes accepted jobs even after the authorising credential expires or is revoked. Group membership is checked at admission, before generation and under the existing group lock immediately before insertion. Personal imports always belong to the authenticated account. Existing website tRPC still uses only Better Auth sessions.

Imports reserve the shared daily allowance and have per-account database-backed admission and request limits. UUIDs are bound to an account and a SHA-256 fingerprint of content, source and destination. Concurrent replays share one job. Completed and failed IDs are retained, including after recipe deletion. See README for worker startup, interrupted-call behaviour and local/server retention.

The popup and worker exchange only fixed validated commands. The worker writes a pending request before its first network call and binds it to account and website origin in trusted local storage. Recovering a request cannot select another account's pending work. Reset uses `discard-import` before clearing an uncertain attempt. Under the account lock, the server rejects an active job or records a missing ID as a terminal failed job. Late submissions therefore cannot revive an abandoned request. No page script receives the credential or import/status operations.

## Popup recovery and preferences

Collection preferences and cached collection labels are keyed by website origin and account ID in trusted local storage. The worker validates preferences against a fresh server list before returning them to the popup. Cached labels are display context only; the server checks write access. Pending work keeps its original destination even after membership changes. Popup import commands include the displayed account ID, and the worker rejects commands if that account no longer matches the credential.

An import response with HTTP 401 exposes only a reconnect flag and a recovery message. It preserves local pending work. Reconnecting to the same account recovers the original request; another account gets its own state. Pending title and collection labels never enter the server import body, and credentials never enter popup responses. Starting another import always uses the race-safe discard flow, including when the proposed content differs from a terminal attempt.
