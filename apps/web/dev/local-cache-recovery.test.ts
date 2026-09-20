import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";
import { recoverLocalCache, retiringWorker } from "./local-cache-recovery";

describe("local cache recovery", () => {
  it.each([true, false])(
    "unregisters stale workers and only reloads a controlled page: %s",
    async (controlled) => {
      const unregister = vi.fn(async () => true);
      const reload = vi.fn();
      const deleteCache = vi.fn(async () => true);
      await runInNewContext(recoverLocalCache, {
        navigator: {
          serviceWorker: {
            controller: controlled ? {} : null,
            getRegistrations: async () => [{ unregister }],
          },
        },
        caches: {
          keys: async () => [
            "workbox-precache-v2-http://localhost:3001/",
            "other",
          ],
          delete: deleteCache,
        },
        location: { reload },
        console,
      });
      expect(unregister).toHaveBeenCalledOnce();
      expect(deleteCache.mock.calls).toEqual([
        ["workbox-precache-v2-http://localhost:3001/"],
      ]);
      expect(reload).toHaveBeenCalledTimes(controlled ? 1 : 0);
    },
  );

  it("does nothing on later visits with no registrations", async () => {
    const reload = vi.fn();
    const keys = vi.fn();
    await runInNewContext(recoverLocalCache, {
      navigator: {
        serviceWorker: { controller: null, getRegistrations: async () => [] },
      },
      location: { reload },
      caches: { keys },
      console,
    });
    expect(reload).not.toHaveBeenCalled();
    expect(keys).not.toHaveBeenCalled();
  });

  it("retires an old worker and reloads its controlled tabs at their original URLs", async () => {
    const handlers = new Map<
      string,
      (event: { waitUntil: (work: Promise<void>) => void }) => void
    >();
    const unregister = vi.fn(async () => true);
    const navigate = vi.fn(async () => undefined);
    const skipWaiting = vi.fn();
    runInNewContext(retiringWorker, {
      self: {
        addEventListener: (
          name: string,
          handler: (event: {
            waitUntil: (work: Promise<void>) => void;
          }) => void,
        ) => handlers.set(name, handler),
        skipWaiting,
        registration: { unregister },
        clients: {
          matchAll: async () => [{ url: "http://localhost:3001/", navigate }],
        },
      },
      caches: { keys: async () => [], delete: vi.fn() },
    });
    let activation: Promise<void> | undefined;
    const event = {
      waitUntil: (work: Promise<void>) => {
        activation = work;
      },
    };
    handlers.get("install")?.(event);
    handlers.get("activate")?.(event);
    await activation;
    expect(skipWaiting).toHaveBeenCalledOnce();
    expect(unregister).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledWith("http://localhost:3001/");
    expect(unregister.mock.invocationCallOrder[0]).toBeLessThan(
      navigate.mock.invocationCallOrder[0] ?? 0,
    );
  });
});
