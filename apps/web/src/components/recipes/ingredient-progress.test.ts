// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { RecipeBody } from "./recipe-body";

const content = {
  title: "Soup",
  description: "",
  servings: "2",
  prepMinutes: 5,
  cookMinutes: 10,
  totalMinutes: 15,
  ingredients: ["1 onion", "1 onion", "Water"],
  steps: ["Cook."],
  notes: "",
};
const progressKey = "cooking-progress:alice:soup";
const body = (key = progressKey, ingredients = content.ingredients) =>
  createElement(RecipeBody, {
    content: { ...content, ingredients },
    progressKey: key,
  });
function checks() {
  return screen.getAllByRole("checkbox").map((element) => {
    if (!(element instanceof HTMLInputElement))
      throw new Error("Expected checkbox input");
    return element.checked;
  });
}
beforeEach(() => localStorage.clear());
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it("restores independent duplicate checks on remount and persists an explicit reset", () => {
  const first = render(body());
  fireEvent.click(screen.getAllByRole("checkbox")[1]);
  first.unmount();
  const second = render(body());
  expect(checks()).toEqual([false, true, false]);
  fireEvent.click(screen.getByRole("button", { name: "Reset" }));
  second.unmount();
  render(body());
  expect(checks()).toEqual([false, false, false]);
  expect(localStorage.getItem(progressKey)).toBeNull();
});

it("isolates users and recipes without losing the original account's progress", () => {
  const first = render(body());
  fireEvent.click(screen.getAllByRole("checkbox")[0]);
  first.rerender(body("cooking-progress:bob:soup"));
  expect(checks()).toEqual([false, false, false]);
  first.rerender(body("cooking-progress:alice:stew"));
  expect(checks()).toEqual([false, false, false]);
  first.rerender(body());
  expect(checks()).toEqual([true, false, false]);
});

it("keeps unchanged ingredients checked after reordering and leaves edited lines unchecked", () => {
  const first = render(body());
  fireEvent.click(screen.getAllByRole("checkbox")[2]);
  first.unmount();
  const second = render(body(progressKey, ["Water", "2 onions"]));
  expect(checks()).toEqual([true, false]);
  second.rerender(body(progressKey, ["Stock", "2 onions"]));
  expect(checks()).toEqual([false, false]);
  expect(screen.getByText("0 of 2 checked")).toBeTruthy();
});

it("ignores invalid stored checks without preventing cooking", () => {
  localStorage.setItem(progressKey, JSON.stringify({ checked: [0] }));
  render(body());
  expect(checks()).toEqual([false, false, false]);
  fireEvent.click(screen.getAllByRole("checkbox")[0]);
  expect(checks()).toEqual([true, false, false]);
});

it("keeps current checks usable and explains when storage is unavailable", () => {
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("storage full");
  });
  render(body());
  fireEvent.click(screen.getAllByRole("checkbox")[0]);
  expect(checks()).toEqual([true, false, false]);
  expect(screen.getByRole("status").textContent).toContain("cannot be saved");
  fireEvent.click(screen.getByRole("button", { name: "Reset" }));
  expect(checks()).toEqual([false, false, false]);
});
