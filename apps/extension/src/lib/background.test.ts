import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

type Listener = (
  value: unknown,
  sender: { id?: string; url?: string; tab?: object },
  respond: (value: unknown) => void,
) => boolean;
const fake = vi.hoisted(() => ({
  addListener: vi.fn<(listener: Listener) => void>(),
  get: vi.fn<() => Promise<{ credential?: unknown }>>(),
  set: vi.fn<() => Promise<void>>(),
  remove: vi.fn<() => Promise<void>>(),
  setAccessLevel: vi.fn<() => Promise<void>>(),
  launch: vi.fn<() => Promise<string>>(),
  query: vi.fn(),
  executeScript: vi.fn(),
}));
vi.mock("wxt/browser", () => ({
  browser: {
    tabs: { query: fake.query },
    scripting: { executeScript: fake.executeScript },
    runtime: {
      id: "kjmnecmcpdklkaaiklbfoialfdiamabj",
      getURL: (path: string) =>
        `chrome-extension://kjmnecmcpdklkaaiklbfoialfdiamabj${path}`,
      onMessage: { addListener: fake.addListener },
    },
    storage: {
      local: {
        get: fake.get,
        set: fake.set,
        remove: fake.remove,
        setAccessLevel: fake.setAccessLevel,
      },
      session: { setAccessLevel: fake.setAccessLevel },
    },
    identity: {
      getRedirectURL: () =>
        "https://kjmnecmcpdklkaaiklbfoialfdiamabj.chromiumapp.org/prep-sheet",
      launchWebAuthFlow: fake.launch,
    },
  },
}));
vi.mock("./config", () => ({ prepSheetOrigin: "http://localhost:3001" }));

import background from "../entrypoints/background";

const sender = {
  id: "kjmnecmcpdklkaaiklbfoialfdiamabj",
  url: "chrome-extension://kjmnecmcpdklkaaiklbfoialfdiamabj/popup.html",
};
const credential = {
  token: `pse_${"a".repeat(43)}`,
  origin: "http://localhost:3001",
  expiresAt: new Date(Date.now() + 86400_000).toISOString(),
  account: { id: "test", name: "Test account", email: "test@example.test" },
};
const fetchMock = vi.fn<typeof fetch>();
function listener() {
  const call = fake.addListener.mock.lastCall;
  if (!call) throw new Error("Listener missing");
  return call[0];
}
const send = (kind: string) =>
  new Promise<unknown>((resolve) => listener()({ kind }, sender, resolve));

describe("extension worker credential isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fake.get.mockResolvedValue({});
    fake.set.mockResolvedValue();
    fake.remove.mockResolvedValue();
    fake.setAccessLevel.mockResolvedValue();
    vi.stubGlobal("fetch", fetchMock);
    background.main();
  });
  it("restricts storage before access and rejects content scripts and other senders", async () => {
    await send("status");
    expect(fake.setAccessLevel).toHaveBeenCalledWith({
      accessLevel: "TRUSTED_CONTEXTS",
    });
    expect(
      listener()({ kind: "status" }, { ...sender, tab: {} }, vi.fn()),
    ).toBe(false);
    expect(
      listener()(
        { kind: "status" },
        { ...sender, url: "https://example.test" },
        vi.fn(),
      ),
    ).toBe(false);
    expect(
      listener()({ kind: "status" }, { ...sender, id: "other" }, vi.fn()),
    ).toBe(false);
    expect(
      listener()({ kind: "fetch", token: "secret" }, sender, vi.fn()),
    ).toBe(false);
  });
  it("captures only the active top frame in the isolated world without accessing credentials or the API", async () => {
    fake.query.mockResolvedValue([
      { id: 42, url: "https://recipes.test/soup" },
    ]);
    const result = {
      kind: "captured",
      sourceUrl: "https://recipes.test/soup",
      recipes: [
        {
          title: "Soup",
          content: "Ingredients and instructions",
          format: "text",
        },
      ],
    };
    fake.executeScript.mockResolvedValue([{ result }]);
    expect(await send("capture")).toEqual(result);
    expect(fake.query).toHaveBeenCalledWith({
      active: true,
      currentWindow: true,
    });
    expect(fake.executeScript).toHaveBeenCalledWith(
      expect.objectContaining({
        target: { tabId: 42, frameIds: [0] },
        world: "ISOLATED",
        func: expect.any(Function),
      }),
    );
    expect(fake.get).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(
      listener()({ kind: "capture" }, { ...sender, tab: {} }, vi.fn()),
    ).toBe(false);
    expect(listener()({ kind: "capture", tabId: 123 }, sender, vi.fn())).toBe(
      false,
    );
  });
  it("handles restricted pages, injection failures and malformed capture results", async () => {
    fake.query.mockResolvedValue([{ id: 42, url: "chrome://settings" }]);
    expect(await send("capture")).toEqual({
      kind: "error",
      code: "unsupported",
    });
    expect(fake.executeScript).not.toHaveBeenCalled();
    fake.query.mockResolvedValue([
      { id: 42, url: "https://recipes.test/soup" },
    ]);
    fake.executeScript.mockRejectedValue(new Error("Permission denied"));
    expect(await send("capture")).toEqual({
      kind: "error",
      code: "unavailable",
    });
    fake.executeScript.mockResolvedValue([
      { result: { kind: "captured", recipes: [] } },
    ]);
    expect(await send("capture")).toEqual({
      kind: "error",
      code: "unavailable",
    });
  });
  it("returns only account information to the popup and omits website cookies", async () => {
    fake.get.mockResolvedValue({ credential });
    fetchMock.mockResolvedValue(
      Response.json({
        account: credential.account,
        expiresAt: credential.expiresAt,
      }),
    );
    const result = await send("status");
    expect(result).toEqual({
      ok: true,
      state: {
        kind: "connected",
        account: credential.account,
        expiresAt: credential.expiresAt,
      },
    });
    expect(JSON.stringify(result)).not.toContain(credential.token);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3001/api/extensions/me",
      expect.objectContaining({
        credentials: "omit",
        redirect: "error",
        headers: expect.objectContaining({
          Authorization: `Bearer ${credential.token}`,
        }),
      }),
    );
  });
  it("clears expired and revoked access, but preserves tokens on network failure", async () => {
    fake.get.mockResolvedValue({
      credential: { ...credential, expiresAt: "2000-01-01T00:00:00.000Z" },
    });
    expect(await send("status")).toMatchObject({
      ok: true,
      state: { kind: "disconnected" },
    });
    expect(fetchMock).not.toHaveBeenCalled();
    fake.get.mockResolvedValue({ credential });
    fetchMock.mockResolvedValue(new Response(null, { status: 401 }));
    await send("status");
    expect(fake.remove).toHaveBeenCalledTimes(2);
    fetchMock.mockRejectedValue(new Error("Network unavailable"));
    expect(await send("disconnect")).toMatchObject({ ok: false });
    expect(fake.remove).toHaveBeenCalledTimes(2);
  });
  it("does not send credentials to a different configured website", async () => {
    fake.get.mockResolvedValue({
      credential: { ...credential, origin: "https://different.test" },
    });
    expect(await send("status")).toMatchObject({
      ok: true,
      state: { kind: "disconnected" },
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("keeps connection work in the worker and rejects a mismatched callback state", async () => {
    let finish: (value: string) => void = () => {
      throw new Error("Flow not started");
    };
    fake.launch.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    expect(await send("connect")).toMatchObject({
      ok: true,
      state: { kind: "connecting" },
    });
    await vi.waitFor(() => expect(fake.launch).toHaveBeenCalled());
    expect(await send("status")).toMatchObject({
      ok: true,
      state: { kind: "connecting" },
    });
    finish(
      `https://kjmnecmcpdklkaaiklbfoialfdiamabj.chromiumapp.org/prep-sheet?state=wrong&code=${"a".repeat(43)}`,
    );
    await vi.waitFor(async () => {
      const result = z
        .object({ state: z.object({ kind: z.literal("disconnected") }) })
        .safeParse(await send("status"));
      expect(result.success).toBe(true);
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(fake.set).not.toHaveBeenCalled();
  });
});
