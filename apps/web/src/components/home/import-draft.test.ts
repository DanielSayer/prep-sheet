// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  importDraftKey,
  readPendingImport,
  writePendingImport,
} from "./import-draft";

describe("import recovery storage", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });
  it("recovers the same ID, input and destination and isolates accounts", () => {
    const pending = {
      id: crypto.randomUUID(),
      input: "Make pasta",
      groupId: crypto.randomUUID(),
    };
    expect(writePendingImport(importDraftKey("one"), pending)).toBe(true);
    expect(readPendingImport(importDraftKey("one"))).toEqual(pending);
    expect(readPendingImport(importDraftKey("two"))).toBeNull();
    writePendingImport(importDraftKey("one"), null);
    expect(readPendingImport(importDraftKey("one"))).toBeNull();
  });
  it("rejects corrupt recovery data and reports unavailable storage", () => {
    sessionStorage.setItem("bad", '{"id":"wrong"}');
    expect(readPendingImport("bad")).toBeNull();
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(
      writePendingImport("key", {
        id: crypto.randomUUID(),
        input: "Make pasta",
        groupId: null,
      }),
    ).toBe(false);
  });
});
