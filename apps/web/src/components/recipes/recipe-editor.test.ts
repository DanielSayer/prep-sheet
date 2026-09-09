// @vitest-environment jsdom

import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { createElement } from "react";
import { afterEach, expect, it, vi } from "vitest";
import {
  readRecipeDraft,
  recipeDraftKey,
  recipeFields,
  writeRecipeDraft,
} from "./recipe-draft";
import { RecipeEditor } from "./recipe-editor";

const content = {
  title: "Soup",
  description: "",
  servings: "2",
  prepMinutes: null,
  cookMinutes: 10,
  totalMinutes: null,
  ingredients: ["1 onion"],
  steps: ["Cook."],
  notes: "",
};
const key = recipeDraftKey("user-a", "recipe-a");
async function mount(
  options: {
    draftKey?: string;
    onCancel?: () => void;
    onSave?: () => void;
    error?: string;
  } = {},
) {
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  const root = createRootRoute({
    component: () =>
      createElement(RecipeEditor, {
        content,
        pending: false,
        onSave: options.onSave ?? (() => {}),
        onCancel: options.onCancel ?? (() => {}),
        draftKey: options.draftKey ?? key,
        error: options.error,
      }),
  });
  const router = createRouter({
    routeTree: root,
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  render(createElement(RouterProvider, { router }));
  await screen.findByLabelText("Recipe name");
  return router;
}
afterEach(() => {
  cleanup();
  sessionStorage.clear();
  vi.restoreAllMocks();
});

it("restores incomplete text and blank lines after remounting", async () => {
  await mount();
  fireEvent.change(screen.getByLabelText("Recipe name"), {
    target: { value: "" },
  });
  fireEvent.change(screen.getByLabelText(/Ingredients/), {
    target: { value: "  1 onion\n\nunfinished " },
  });
  cleanup();
  await mount();
  expect(screen.getByLabelText("Recipe name")).toHaveProperty("value", "");
  expect(screen.getByLabelText(/Ingredients/)).toHaveProperty(
    "value",
    "  1 onion\n\nunfinished ",
  );
});

it("keeps drafts separate by recipe and user", async () => {
  writeRecipeDraft(key, { ...recipeFields(content), title: "Private draft" });
  await mount({ draftKey: recipeDraftKey("user-b", "recipe-a") });
  expect(screen.getByLabelText("Recipe name")).toHaveProperty("value", "Soup");
  expect(readRecipeDraft(recipeDraftKey("user-a", "recipe-b"))).toBeNull();
});

it("only discards on confirmed revert or cancel", async () => {
  const cancel = vi.fn();
  const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
  await mount({ onCancel: cancel });
  fireEvent.change(screen.getByLabelText("Recipe name"), {
    target: { value: "Changed" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(cancel).not.toHaveBeenCalled();
  expect(readRecipeDraft(key)?.title).toBe("Changed");
  confirm.mockReturnValue(true);
  fireEvent.click(screen.getByRole("button", { name: "Revert changes" }));
  expect(screen.getByLabelText("Recipe name")).toHaveProperty("value", "Soup");
  expect(readRecipeDraft(key)).toBeNull();
  fireEvent.change(screen.getByLabelText("Recipe name"), {
    target: { value: "Again" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(cancel).toHaveBeenCalledOnce();
  expect(readRecipeDraft(key)).toBeNull();
});

it("retains a submitted draft when saving fails", async () => {
  const save = vi.fn();
  await mount({ onSave: save, error: "Save failed" });
  fireEvent.change(screen.getByLabelText("Recipe name"), {
    target: { value: "Changed" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  expect(save).toHaveBeenCalledOnce();
  expect(readRecipeDraft(key)?.title).toBe("Changed");
  expect(screen.getByText("Save failed")).toBeTruthy();
});

it("handles malformed drafts and retires successfully saved drafts", async () => {
  sessionStorage.setItem(key, '{"title":3}');
  await mount();
  expect(screen.getByLabelText("Recipe name")).toHaveProperty("value", "Soup");
  writeRecipeDraft(key, recipeFields(content));
  expect(writeRecipeDraft(key, null)).toBe(true);
  expect(readRecipeDraft(key)).toBeNull();
});

it("warns before unload when storage fails", async () => {
  await mount();
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("Storage blocked");
  });
  fireEvent.change(screen.getByLabelText("Recipe name"), {
    target: { value: "Keep me" },
  });
  await waitFor(() =>
    expect(screen.getByRole("status").textContent).toContain(
      "could not be saved",
    ),
  );
  const event = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(event);
  expect(event.defaultPrevented).toBe(true);
  expect(screen.getByLabelText("Recipe name")).toHaveProperty(
    "value",
    "Keep me",
  );
});
