import { describe, expect, it } from "vitest";
import { recipeTimeSummary, sortableRecipeMinutes } from "./recipe-time";

describe("recipeTimeSummary", () => {
  it("labels a known cooking time without hiding unknown prep", () => {
    expect(
      recipeTimeSummary({
        prepMinutes: null,
        cookMinutes: 20,
        totalMinutes: null,
      }),
    ).toBe("20 min cooking · prep unknown");
  });

  it("distinguishes active and elapsed time when a recipe includes waiting", () => {
    expect(
      recipeTimeSummary({
        prepMinutes: 10,
        cookMinutes: 20,
        totalMinutes: 90,
      }),
    ).toBe("30 min active · 1 hr 30 min elapsed");
  });

  it("shows elapsed time without pretending unknown work is known", () => {
    expect(
      recipeTimeSummary({
        prepMinutes: null,
        cookMinutes: null,
        totalMinutes: 60,
      }),
    ).toBe("Prep and cooking unknown · 1 hr elapsed");
  });

  it("does not repeat elapsed time when it matches active time", () => {
    expect(
      recipeTimeSummary({
        prepMinutes: 10,
        cookMinutes: 20,
        totalMinutes: 30,
      }),
    ).toBe("30 min active");
  });

  it("supports saved recipes from before elapsed time was stored", () => {
    expect(recipeTimeSummary({ prepMinutes: 10, cookMinutes: 20 })).toBe(
      "30 min active",
    );
  });
});

describe("sortableRecipeMinutes", () => {
  it("uses elapsed time ahead of active time", () => {
    expect(
      sortableRecipeMinutes({
        prepMinutes: 10,
        cookMinutes: 20,
        totalMinutes: 90,
      }),
    ).toBe(90);
  });

  it("keeps a partial time unknown", () => {
    expect(
      sortableRecipeMinutes({
        prepMinutes: null,
        cookMinutes: 20,
        totalMinutes: null,
      }),
    ).toBeNull();
  });
});
