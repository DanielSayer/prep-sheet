# Prep Sheet extension

Chrome and Edge Manifest V3 app built with [WXT](https://wxt.dev/), React and TypeScript. WXT handles entrypoint bundling, development reloads, manifests and ZIP packaging. The workspace uses the repository's React and TypeScript catalog versions.

Parts 1 to 3 are implemented. The popup connects an account, displays it, supports disconnecting and captures recipes from the loaded tab. Processing and saving remain planned. See [TODO.md](./TODO.md) and [AUTH.md](./AUTH.md).

## Local development

Use the repository's pnpm version and Node 22 or newer. From the repository root:

```sh
pnpm install
pnpm dev:extension
```

In `chrome://extensions`, enable Developer mode, choose **Load unpacked**, and select `apps/extension/.output/chrome-mv3-dev`. Pin Prep Sheet to the toolbar and click it to open the popup. The browser is not launched automatically.

For Edge, run `pnpm --filter @prep-sheet/extension dev:edge` and load `apps/extension/.output/edge-mv3-dev` from `edge://extensions`.

Run the website separately with `pnpm dev:web` so **Open Prep Sheet** can reach it. The default website origin is `http://localhost:3001`; WXT's reload server uses a separate port. To change the website origin, put `WXT_PREP_SHEET_ORIGIN` in this app's `.env.development.local` and restart WXT. Use an origin only, without a path or query string.

## Build and verify

For account connection, start PostgreSQL and apply the schema from `packages/db` with `docker compose up -d` and `pnpm exec drizzle-kit push`. Restart the website after dependency or server environment changes, then reload the unpacked extension. Choose **Connect to Prep Sheet**, sign in if needed and approve access. Use website **Settings → Extensions** to revoke a connection.

From the repository root:

```sh
pnpm build:extension
pnpm --filter @prep-sheet/extension check-types
pnpm package:extension
```

The default build and package commands target the local website. Packaging builds both browsers and writes `*-chrome-dev.zip` and `*-edge-dev.zip` under `.output`. These are development packages, not store releases.

Stop the extension development server before building or packaging the same browser, since these commands write to the same output directory. After a static build, reload the unpacked extension in the browser. Generated `.output` and `.wxt` files are ignored by Git and Biome; Turbo caches build and package outputs.

## Stable identity and production configuration

The committed `config/development-identity.json` contains a public key, not a secret. Its fixed development ID is `kjmnecmcpdklkaaiklbfoialfdiamabj` in Chrome and Edge. Do not regenerate it during installs or builds. Its private key was not saved; this identity is for unpacked development only.

No production deployment is configured. When a store listing and deployed website are available, configure these public build settings in `.env.production.local` or CI:

```dotenv
WXT_PREP_SHEET_ORIGIN=https://your-deployed-domain
WXT_EXTENSION_PUBLIC_KEY=<base64 DER RSA public key from the store listing>
```

Then use:

```sh
pnpm --filter @prep-sheet/extension build:production
pnpm --filter @prep-sheet/extension package:production
```

Production mode requires both settings and rejects HTTP, loopback and `.example` origins. If Chrome and Edge listings have different identities, provide their respective keys in `.env.production.chrome.local` and `.env.production.edge.local`. Configure the store-issued IDs in the website EXTENSION_IDS allowlist as described in AUTH.md. The manifest key stabilises unpacked identity; it does not register a store listing or authenticate the extension.

Never add server secrets, database credentials or OpenAI keys to extension settings. Browser bundles and manifest values are public.

## Capture a loaded recipe

Open a recipe, finish any browser challenge, then click **Capture recipe** in the extension. Capture works locally even when signed out. If several recipes are found, choose one and expand **Preview captured recipe** to inspect it. Captured content stays in popup memory and is cleared when the popup closes. Nothing is uploaded or saved yet.

The worker accepts capture commands only from the extension popup and injects a self-contained function into the active tab's top frame in the isolated world. It does not download the source page, access cookies, read form values, or pass extension credentials into the tab. JSON-LD capture allows only recipe names, ingredients, instructions, yield and times. When metadata is missing or invalid, capture reads visible recipe cards or a main/article region with ingredients and instructions, skipping forms, hidden content, account widgets, navigation and comments. Pages without a suitable region produce an error.

Capture limits are 1,000,000 characters of JSON-LD input, 32,000 characters per recipe, ten recipes and 128,000 characters for the response, with traversal limits for deeply nested or unusually large pages. Oversized captures return an error instead of silently truncating ingredients or instructions. Both the worker and popup validate the response. Source links use the loaded HTTP(S) URL with query strings and fragments removed to avoid carrying account tokens or tracking parameters; sites whose recipe identity exists only in a query string are not fully supported yet. Page text remains untrusted and must be treated as recipe data, never instructions, by the future import API.

## Code layout

- `wxt.config.ts` and `config/`: build settings, public identity and manifest permissions.
- `src/entrypoints/popup/`: starter React popup and local fonts/styles.
- `src/entrypoints/background.ts`: account connection, protected credential storage and authenticated account requests.
- `src/lib/extract-recipe.ts`: self-contained DOM extractor injected with `scripting.executeScript` only after a capture click. There is no persistent content script or page-message listener.
- `src/lib/capture-contract.ts`: validated capture responses, size limits and recovery messages.
- `src/entrypoints/popup/Capture.tsx`: capture action, recipe choices and local text preview.
- `src/lib/api-client.ts`: reserved tRPC client with a type-only router dependency. It makes no requests until called. Extension tokens are accepted only by dedicated extension endpoints, not website tRPC.
- `src/lib/config.ts` and `origin.ts`: validated website origin used by the popup and API client.

Static builds request `activeTab`, `scripting`, `identity`, `storage` and the configured Prep Sheet host only. No content scripts are registered on all sites. WXT's live development server may add local reload permissions and content security policy entries; static packages do not need those additions.

## Verification so far

Type checking, local builds and Chrome/Edge ZIP packaging pass. Account authentication has automated server and worker tests. Capture tests cover metadata graphs, instruction sections, multiple recipes, visible-text fallback, privacy exclusions, challenge pages, size limits, unsupported pages, sender restrictions and invalid injection responses. The current extractor captured one Butter Chicken recipe from Kitchen Sanctuary's already-loaded DOM without refetching the page. Browser extension installation, real Chrome/Edge identity flows and recipe import still need end-to-end checks.

The popup was also checked in a browser preview with simulated worker responses at 360px and 320px, including capture progress, expanded preview, keyboard recipe selection, long titles and challenge recovery. A scrollbar-related horizontal overflow was fixed. These UI checks do not verify installed-extension injection or permissions.
