// @vitest-environment jsdom

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { createElement } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { KeepAwake } from "./keep-awake";
import { RecipeBody } from "./recipe-body";

function sentinel() {
  const lock = new EventTarget() as EventTarget & {
    released: boolean;
    release: ReturnType<typeof vi.fn<() => Promise<void>>>;
  };
  lock.released = false;
  lock.release = vi.fn(async () => {
    lock.released = true;
    lock.dispatchEvent(new Event("release"));
  });
  return lock;
}
beforeEach(() => {
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    value: "visible",
  });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it("checks ingredients independently and resets them", () => {
  render(
    createElement(RecipeBody, {
      content: {
        title: "Soup",
        description: "",
        servings: "2",
        prepMinutes: 5,
        cookMinutes: 10,
        totalMinutes: 15,
        ingredients: ["1 onion", "1 onion"],
        steps: ["Chop.", "Cook."],
        notes: "",
      },
    }),
  );
  const inputs = screen.getAllByRole("checkbox") as HTMLInputElement[];
  fireEvent.click(inputs[0]);
  expect(inputs.map((input) => input.checked)).toEqual([true, false]);
  expect(screen.getByText("1 of 2 checked")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Reset" }));
  expect(inputs.every((input) => !input.checked)).toBe(true);
  expect(screen.getByText("Cook.").closest("ol")).toBeTruthy();
});

it("acquires only on request, resumes after visibility changes and releases on exit", async () => {
  const first = sentinel();
  const second = sentinel();
  const request = vi
    .fn()
    .mockResolvedValueOnce(first)
    .mockResolvedValueOnce(second);
  Object.defineProperty(navigator, "wakeLock", {
    configurable: true,
    value: { request },
  });
  const view = render(createElement(KeepAwake));
  expect(request).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button"));
  await waitFor(() =>
    expect(screen.getByRole("status").textContent).toContain(
      "Screen will stay awake",
    ),
  );
  await act(async () => {
    await first.release();
  });
  fireEvent(document, new Event("visibilitychange"));
  await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
  view.unmount();
  expect(second.release).toHaveBeenCalledOnce();
});

it("releases a pending request if switched off before it resolves", async () => {
  const lock = sentinel();
  let resolve!: (value: unknown) => void;
  const request = vi.fn(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  Object.defineProperty(navigator, "wakeLock", {
    configurable: true,
    value: { request },
  });
  render(createElement(KeepAwake));
  fireEvent.click(screen.getByRole("button"));
  fireEvent.click(screen.getByRole("button"));
  await act(async () => {
    resolve(lock);
  });
  expect(lock.release).toHaveBeenCalledOnce();
  expect(screen.getByRole("button").getAttribute("aria-pressed")).toBe("false");
});

it("reports a denied request and allows retry", async () => {
  const request = vi.fn().mockRejectedValue(new Error("denied"));
  Object.defineProperty(navigator, "wakeLock", {
    configurable: true,
    value: { request },
  });
  render(createElement(KeepAwake));
  fireEvent.click(screen.getByRole("button"));
  await waitFor(() =>
    expect(screen.getByRole("status").textContent).toContain("Couldn't"),
  );
  expect(screen.getByRole("button").getAttribute("aria-pressed")).toBe("false");
});

it("explains when keep awake is unsupported", () => {
  Reflect.deleteProperty(navigator, "wakeLock");
  render(createElement(KeepAwake));
  expect((screen.getByRole("button") as HTMLButtonElement).disabled).toBe(true);
  expect(screen.getByRole("status").textContent).toContain("isn't available");
});
