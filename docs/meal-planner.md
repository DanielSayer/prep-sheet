# Personal meal planner

`/planner` shows a Monday-to-Sunday week, with stacked days on small screens. Each account owns its meals and one active shopping trip. Shared-collection recipes can be scheduled, but the planner is private.

Add recipes, linked leftovers or eating-out entries. Recipes have original servings, servings to cook and servings to eat now. The difference is available for leftovers. Each cooking session counts separately, even when the same recipe appears more than once. Leftovers refer to a previous date; missing sessions and over-allocated portions are flagged and block shopping generation for affected dates. Editing the meal date moves it. Duplicate creates a separate session. Unfinished meal forms are stored locally per account; Cancel discards the draft and closing the dialog retains it.

Plan shop chooses a shopping date and an inclusive range of meal dates, up to 32 days. The preview shows included meals, ingredient changes and uncertain quantities. Starting another trip explicitly replaces recipe ingredients, including bought recipe items, while keeping other groceries. Editing the current trip preserves unchanged items, manual groceries and bought/owned quantities. Quantity increases add only the extra amount required. Removed meals keep bought/owned ingredients as surplus and remove their unbought ingredients.

Recipe ingredients and titles are copied when scheduled. Subsequent recipe edits or deletion do not silently rewrite planned meals. Original serving counts must be confirmed when a yield is ambiguous. Leading numeric quantities, fractions and mixed fractions can be scaled; ranges and unspecified quantities receive a visible check-quantity note. This is quantity scaling, not unit conversion or pantry inventory.

Only ingredient-affecting changes make a trip stale. Moving a meal within its coverage, changing the eating-out description or changing the portions eaten without changing cooking quantities does not. Moving a recipe into/out of coverage, changing recipes or changing its cooking scale does. Review changes appears on the planner and shopping screens, and stale meal trips cannot be regenerated or checked off through the older shopping actions.

Planner writes use account-scoped locks and revisions. Applying a preview checks a server-computed token against both planner state and current shopping rows. A concurrent meal edit, purchase or grocery edit requires another preview. No change is applied before that check passes.

## Database setup

Run `pnpm db:push` from the repository workflow, or run `drizzle-kit push` from `packages/db`, before deploying this feature. The new `meal_planner` table has account ownership, revision, JSON meal entries and the active trip snapshot. Existing recipe and shopping tables are unchanged. Resetting the shopping list also clears the active planner-trip link, while retaining planned meals.

## Verification

```sh
node node_modules/vitest/vitest.mjs run
node node_modules/typescript/bin/tsc --noEmit -p apps/web/tsconfig.json
```

The planner integration suite uses isolated PostgreSQL accounts and cleans them up. It covers authentication, recipe access, privacy, competing edits, repeated cooking sessions, leftover validation, stale previews, preserving groceries and purchased portions, removing covered meals, empty trips and resetting the active-trip link.
