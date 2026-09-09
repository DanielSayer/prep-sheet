# Extension account access

## Credential design

Better Auth owns website sessions and Discord login. Extension access uses a separate opaque bearer token. Website cookies are never copied or accepted by extension endpoints. Tokens grant `account:read collections:read recipes:import`. Currently only account checks and disconnect are implemented. Part 4 must enforce these scopes on its separate collection/import endpoints. Existing website tRPC and Better Auth endpoints do not accept extension credentials.

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

The dedicated `/api/extensions` endpoints allow only exact `chrome-extension://<allowed-id>` origins for token exchange, account checks and disconnect. Website validation, approval, listing and revocation require the exact `BETTER_AUTH_URL` origin. All except request validation also require a Better Auth session. No extension origins are added to Better Auth's trusted origins, and no credentialed cross-origin cookie access is enabled. JSON bodies are limited to 4 KiB, including streamed bodies. Token-bearing fetches omit cookies and reject redirects.

## Verification

PostgreSQL tests cover a real Better Auth test session, consent, concurrent replay, PKCE/state mismatch, callback validation, expiration, account isolation, revocation, origins, body limits and CORS. Worker tests simulate browser APIs to check storage restrictions, sender validation, account-only popup responses, network-failure recovery, website-origin binding and callback state rejection.

Run `node node_modules/vitest/vitest.mjs run packages/auth/src/extensions.test.ts apps/extension/src/lib/background.test.ts` from the root. Tests create and remove their own database users and credentials.

Website and extension type checks, the website production build, and both browser ZIP packages pass. The full test suite has 66 passing and 7 skipped tests, including 12 new server/worker tests. Website approval and Settings have been inspected at desktop and mobile widths. The built popup was previewed at 320px and 360px with simulated signed-out/connected responses. Actual unpacked Chrome/Edge installation, Discord round-trip login, popup closure during identity login and browser restart still need manual end-to-end verification. Recipe capture and saving are not implemented by this step.

Browser API references: [identity](https://developer.chrome.com/docs/extensions/reference/api/identity), [storage access](https://developer.chrome.com/docs/extensions/reference/api/storage), [service worker lifetime](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle).
