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
import { type ComponentProps, createElement } from "react";
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
    onSave?: ComponentProps<typeof RecipeEditor>["onSave"];
    onSaveCopy?: ComponentProps<typeof RecipeEditor>["onSaveCopy"];
    error?: string;
    savedRevision?: number;
    loadLatest?: ComponentProps<typeof RecipeEditor>["loadLatest"];
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
        savedRevision: options.savedRevision,
        loadLatest: options.loadLatest,
        onSaveCopy: options.onSaveCopy,
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

it("combines separate edits after refreshing without asking for choices", async () => {
  const save = vi.fn();
  await mount({ savedRevision: 1, onSave: save });
  fireEvent.change(screen.getByLabelText("Recipe name"), {
    target: { value: "My soup" },
  });
  cleanup();
  await mount({
    savedRevision: 2,
    onSave: save,
    loadLatest: async () => ({
      content: { ...content, notes: "New note" },
      revision: 2,
    }),
  });
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  await waitFor(() =>
    expect(save).toHaveBeenCalledWith(
      { ...content, title: "My soup", notes: "New note" },
      2,
    ),
  );
  expect(screen.queryByText("Choose what to keep")).toBeNull();
});

it("asks only about competing edits and saves directly from the choices", async () => {
  const save = vi.fn();
  const base = recipeFields(content);
  writeRecipeDraft(
    key,
    { ...base, title: "My soup", notes: "My note" },
    1,
    base,
  );
  await mount({
    savedRevision: 2,
    onSave: save,
    loadLatest: async () => ({
      content: { ...content, title: "Their soup", servings: "4" },
      revision: 2,
    }),
  });
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  await screen.findByText("Choose what to keep");
  expect(screen.getAllByRole("radio")).toHaveLength(2);
  expect(save).not.toHaveBeenCalled();
  expect(screen.queryByLabelText("Kitchen notes")).toBeNull();
  fireEvent.click(screen.getByRole("radio", { name: "Saved Their soup" }));
  fireEvent.click(screen.getByRole("button", { name: "Save recipe" }));
  await waitFor(() =>
    expect(save).toHaveBeenCalledWith(
      { ...content, title: "Their soup", notes: "My note", servings: "4" },
      2,
    ),
  );
});

it("preserves the original draft when viewing the saved recipe and returning to edit", async () => {
  const base = recipeFields(content);
  writeRecipeDraft(key, { ...base, title: "My soup" }, 1, base);
  await mount({
    savedRevision: 2,
    loadLatest: async () => ({
      content: { ...content, title: "Their soup" },
      revision: 2,
    }),
  });
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  await screen.findByText("Choose what to keep");
  fireEvent.click(screen.getByRole("button", { name: "View saved recipe" }));
  expect(readRecipeDraft(key)?.title).toBe("My soup");
  fireEvent.click(screen.getByRole("button", { name: "Back to choices" }));
  fireEvent.click(screen.getByRole("button", { name: "Back to editing" }));
  expect(screen.getByLabelText("Recipe name")).toHaveProperty(
    "value",
    "My soup",
  );
});

it("keeps a legacy draft when loading fails and permits retry", async () => {
  const load = vi
    .fn()
    .mockRejectedValueOnce(new Error("Offline"))
    .mockResolvedValue({ content, revision: 2 });
  writeRecipeDraft(key, { ...recipeFields(content), title: "Old draft" });
  await mount({ savedRevision: 2, loadLatest: load });
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  await screen.findByText("Offline");
  expect(readRecipeDraft(key)?.title).toBe("Old draft");
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  await screen.findByText("Choose what to keep");
});

it("rechecks a racing save and asks about a new competing edit", async () => {
  const save = vi.fn().mockResolvedValue("conflict");
  const load = vi
    .fn()
    .mockResolvedValueOnce({ content, revision: 1 })
    .mockResolvedValue({
      content: { ...content, title: "New competing title" },
      revision: 2,
    });
  await mount({ savedRevision: 1, onSave: save, loadLatest: load });
  fireEvent.change(screen.getByLabelText("Recipe name"), {
    target: { value: "My soup" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  await screen.findByText("New competing title");
  expect(save).toHaveBeenCalledOnce();
  expect(readRecipeDraft(key)?.title).toBe("My soup");
});

it("checks for newer edits after choices, retaining the user's selected values", async () => {
  const base = recipeFields(content);
  writeRecipeDraft(key, { ...base, title: "My soup" }, 1, base);
  const load = vi
    .fn()
    .mockResolvedValueOnce({
      content: { ...content, title: "Their soup" },
      revision: 2,
    })
    .mockResolvedValue({
      content: { ...content, title: "Newest soup" },
      revision: 3,
    });
  const save = vi.fn();
  await mount({ savedRevision: 2, loadLatest: load, onSave: save });
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  await screen.findByText("Their soup");
  fireEvent.click(screen.getByRole("radio", { name: "Mine My soup" }));
  fireEvent.click(screen.getByRole("button", { name: "Save recipe" }));
  await screen.findByText("Newest soup");
  expect(save).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("radio", { name: "Saved Newest soup" }));
  fireEvent.click(screen.getByRole("button", { name: "Save recipe" }));
  await waitFor(() =>
    expect(save).toHaveBeenCalledWith({ ...content, title: "Newest soup" }, 3),
  );
});

it("saves the original draft as a copy without requiring choices", async () => {
  const base = recipeFields(content);
  writeRecipeDraft(key, { ...base, title: "My soup" }, 1, base);
  const copy = vi.fn().mockRejectedValueOnce(new Error("Copy failed"));
  const save = vi.fn();
  await mount({
    savedRevision: 2,
    onSave: save,
    onSaveCopy: copy,
    loadLatest: async () => ({
      content: { ...content, title: "Their soup" },
      revision: 2,
    }),
  });
  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
  await screen.findByText("Choose what to keep");
  fireEvent.click(
    screen.getByRole("button", { name: "Save my draft as a copy" }),
  );
  await screen.findByText("Copy failed");
  expect(copy).toHaveBeenCalledWith({ ...content, title: "My soup" });
  expect(save).not.toHaveBeenCalled();
  expect(readRecipeDraft(key)?.title).toBe("My soup");
});
