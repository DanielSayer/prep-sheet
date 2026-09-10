import {
  collectionsSchema,
  importInputSchema,
  importStatusSchema,
} from "@prep-sheet/api/import-contract";
import {
  type Connection,
  connectionSchema,
  credentialSchema,
} from "@prep-sheet/auth/extension-contract";
import { browser } from "wxt/browser";
import { defineBackground } from "wxt/utils/define-background";
import { z } from "zod";
import { captureResultSchema } from "../lib/capture-contract";
import { prepSheetOrigin } from "../lib/config";
import { extractRecipe } from "../lib/extract-recipe";

const commandSchema = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.enum([
      "status",
      "connect",
      "disconnect",
      "capture",
      "recover-capture",
      "collections",
      "recover-import",
      "reset-import",
    ]),
  }),
  z.strictObject({
    kind: z.literal("save-import"),
    input: importInputSchema.omit({ id: true }),
  }),
]);
const storedCredentialSchema = credentialSchema.extend({
  origin: z.literal(prepSheetOrigin),
});
const encode = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
const random = () => encode(crypto.getRandomValues(new Uint8Array(32)));

export default defineBackground(() => {
  // Content scripts cannot read either store. Only the worker handles tokens.
  const ready = Promise.all([
    browser.storage.local.setAccessLevel({ accessLevel: "TRUSTED_CONTEXTS" }),
    browser.storage.session.setAccessLevel({ accessLevel: "TRUSTED_CONTEXTS" }),
  ]);
  let connecting = false;
  let message = "";
  let saving: Promise<unknown> | undefined;

  async function importCommand(command: z.infer<typeof commandSchema>) {
    await ready;
    const stored = storedCredentialSchema.parse(
      (await browser.storage.local.get("credential")).credential,
    );
    const key = `import:${prepSheetOrigin}:${stored.account.id}`;
    async function call(action: string, body: unknown) {
      const response = await api(action, body, stored.token);
      const value: unknown = await response.json();
      if (!response.ok) {
        const error = z.object({ error: z.string() }).safeParse(value);
        throw new Error(
          error.success
            ? error.data.error
            : "Couldn't reach Prep Sheet. Try again.",
        );
      }
      return value;
    }
    if (command.kind === "collections")
      return collectionsSchema.parse(await call("collections", {}));
    const pending = importInputSchema.safeParse(
      (await browser.storage.local.get(key))[key],
    );
    if (command.kind === "reset-import") {
      if (pending.success) {
        // Server tombstones unknown IDs so late network requests cannot create duplicates.
        z.object({ ok: z.literal(true) }).parse(
          await call("discard-import", pending.data),
        );
      }
      await browser.storage.local.remove(key);
      return null;
    }
    if (command.kind === "recover-import") {
      if (!pending.success) return null;
      // Re-submit the persisted request after a lost HTTP response or worker suspension.
      return importStatusSchema.parse(await call("import", pending.data));
    }
    if (command.kind !== "save-import")
      throw new Error("Invalid import command");
    if (pending.success) {
      const status = importStatusSchema.parse(
        await call("import", pending.data),
      );
      const same =
        pending.data.content === command.input.content &&
        pending.data.sourceUrl === command.input.sourceUrl &&
        pending.data.groupId === command.input.groupId;
      if (same || status.kind === "queued" || status.kind === "processing")
        return status;
    }
    const input = importInputSchema.parse({
      ...command.input,
      id: crypto.randomUUID(),
    });
    // Persist before the first network request. The popup never needs to keep work alive.
    await browser.storage.local.set({ [key]: input });
    return importStatusSchema.parse(await call("import", input));
  }

  async function api(action: string, body: unknown, token?: string) {
    return fetch(`${prepSheetOrigin}/api/extensions/${action}`, {
      method: "POST",
      credentials: "omit",
      cache: "no-store",
      redirect: "error",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    });
  }
  async function status(): Promise<Connection> {
    if (connecting) return { kind: "connecting" };
    const stored = storedCredentialSchema.safeParse(
      (await browser.storage.local.get("credential")).credential,
    );
    if (!stored.success) return { kind: "disconnected", message };
    if (Date.parse(stored.data.expiresAt) <= Date.now()) {
      await browser.storage.local.remove("credential");
      return {
        kind: "disconnected",
        message: "Your connection expired. Please connect again.",
      };
    }
    const response = await api("me", {}, stored.data.token);
    if (response.status === 401 || response.status === 403) {
      await browser.storage.local.remove("credential");
      return {
        kind: "disconnected",
        message: "Your access has ended. Please connect again.",
      };
    }
    if (!response.ok)
      throw new Error("Couldn't check your connection. Please try again.");
    const account = credentialSchema
      .omit({ token: true })
      .parse(await response.json());
    return { kind: "connected", ...account };
  }
  async function connect() {
    connecting = true;
    message = "";
    try {
      const verifier = random();
      const state = random();
      const challenge = encode(
        new Uint8Array(
          await crypto.subtle.digest(
            "SHA-256",
            new TextEncoder().encode(verifier),
          ),
        ),
      );
      const redirectUri = browser.identity.getRedirectURL("prep-sheet");
      const input = {
        extensionId: browser.runtime.id,
        redirectUri,
        state,
        challenge,
      };
      const url = new URL("/connect-extension", prepSheetOrigin);
      url.search = new URLSearchParams(input).toString();
      const result = await browser.identity.launchWebAuthFlow({
        url: url.href,
        interactive: true,
      });
      if (!result) throw new Error("Cancelled");
      const callback = new URL(result);
      const expected = new URL(redirectUri);
      if (
        callback.origin !== expected.origin ||
        callback.pathname !== expected.pathname ||
        callback.hash ||
        callback.searchParams.getAll("state").length !== 1 ||
        callback.searchParams.get("state") !== state ||
        callback.searchParams.getAll("code").length !== 1
      )
        throw new Error("Invalid callback");
      const response = await api("token", {
        ...input,
        code: callback.searchParams.get("code"),
        verifier,
      });
      if (!response.ok) throw new Error("Exchange failed");
      const credential = credentialSchema.parse(await response.json());
      await browser.storage.local.set({
        credential: { ...credential, origin: prepSheetOrigin },
      });
    } catch {
      message =
        "Connection didn't finish. Please try again from the extension.";
    } finally {
      connecting = false;
    }
  }
  browser.runtime.onMessage.addListener((value: unknown, sender, respond) => {
    // Same-extension content scripts are also rejected. Never expose a general fetch proxy.
    if (
      sender.id !== browser.runtime.id ||
      sender.tab ||
      sender.url !== browser.runtime.getURL("/popup.html")
    )
      return false;
    const command = commandSchema.safeParse(value);
    if (!command.success) return false;
    if (
      ["collections", "recover-import", "save-import", "reset-import"].includes(
        command.data.kind,
      )
    ) {
      const run = (saving ?? Promise.resolve())
        .catch(() => {})
        .then(() => importCommand(command.data));
      saving = run;
      void run
        .then((data) => respond({ ok: true, data }))
        .catch((error: unknown) =>
          respond({
            ok: false,
            error:
              error instanceof Error
                ? error.message
                : "Couldn't import. Try again.",
          }),
        );
      return true;
    }
    if (command.data.kind === "recover-capture") {
      void ready
        .then(() => browser.storage.local.get("capture"))
        .then((stored) => respond(stored.capture ?? null));
      return true;
    }
    if (command.data.kind === "capture") {
      void (async () => {
        await ready;
        const [tab] = await browser.tabs.query({
          active: true,
          currentWindow: true,
        });
        if (
          tab?.id === undefined ||
          !tab.url ||
          !/^https?:\/\//.test(tab.url)
        ) {
          return { kind: "error", code: "unsupported" };
        }
        const [injection] = await browser.scripting.executeScript({
          target: { tabId: tab.id, frameIds: [0] },
          world: "ISOLATED",
          func: extractRecipe,
        });
        const result = captureResultSchema.parse(injection?.result);
        if (result.kind === "captured")
          await browser.storage.local.set({ capture: result });
        return result;
      })()
        .then(respond)
        .catch(() => respond({ kind: "error", code: "unavailable" }));
      return true;
    }
    void (async () => {
      await ready;
      if (command.data.kind === "connect") {
        if (!connecting) void connect();
        return { kind: "connecting" } satisfies Connection;
      }
      if (command.data.kind === "disconnect") {
        if (connecting) return { kind: "connecting" } satisfies Connection;
        const stored = storedCredentialSchema.safeParse(
          (await browser.storage.local.get("credential")).credential,
        );
        if (stored.success) {
          const response = await api("disconnect", {}, stored.data.token);
          if (
            !response.ok &&
            response.status !== 401 &&
            response.status !== 403
          )
            throw new Error("Couldn't revoke access. Please try again.");
        }
        await browser.storage.local.remove("credential");
        message = "";
      }
      return status();
    })()
      .then((state) =>
        respond({ ok: true, state: connectionSchema.parse(state) }),
      )
      .catch(() =>
        respond({
          ok: false,
          error:
            "Couldn't reach Prep Sheet. Check the website is available and try again.",
        }),
      );
    return true;
  });
});
