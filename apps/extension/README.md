# Prep Sheet extension

Chrome and Edge Manifest V3 app built with [WXT](https://wxt.dev/), React and TypeScript. WXT handles entrypoint bundling, development reloads, manifests and ZIP packaging. The workspace uses the repository's React and TypeScript catalog versions.

Part 1 is implemented. The popup opens Prep Sheet; authentication and recipe saving are not implemented yet. See [TODO.md](./TODO.md).

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

Production mode requires both settings and rejects HTTP, loopback and `.example` origins. If Chrome and Edge listings have different identities, provide their respective keys in `.env.production.chrome.local` and `.env.production.edge.local`. Store-issued IDs and auth callback allowlists will be finalised in part 2. The manifest key stabilises unpacked identity; it does not register a store listing or authenticate the extension.

Never add server secrets, database credentials or OpenAI keys to extension settings. Browser bundles and manifest values are public.

## Code layout

- `wxt.config.ts` and `config/`: build settings, public identity and manifest permissions.
- `src/entrypoints/popup/`: starter React popup and local fonts/styles.
- `src/entrypoints/background.ts`: service-worker entrypoint reserved for connection and import coordination.
- `src/entrypoints/extract.ts`: separately bundled script reserved for user-triggered extraction. It is not automatically injected and currently does no work.
- `src/lib/api-client.ts`: existing tRPC client package with a type-only router dependency. It makes no requests until called; part 2 will add extension authentication.
- `src/lib/config.ts` and `origin.ts`: validated website origin used by the popup and API client.

Static builds request `activeTab`, `scripting` and the configured Prep Sheet host only. No content scripts are registered on all sites. WXT's live development server may add local reload permissions and content security policy entries; static packages do not need those additions.

## Verification so far

Type checking, local builds and Chrome/Edge ZIP packaging pass. The built popup was previewed at 360px and 320px with no horizontal overflow or browser console errors. Browser extension installation, service-worker behaviour inside Chrome/Edge, authentication and recipe import still need their later end-to-end checks.
