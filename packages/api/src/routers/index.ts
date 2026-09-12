import { publicProcedure, router } from "../index";
import { groupsRouter } from "./groups";
import { recipesRouter } from "./recipes";
import { shoppingRouter } from "./shopping";
import { tagsRouter } from "./tags";

export const appRouter = router({
  recipes: recipesRouter,
  tags: tagsRouter,
  shopping: shoppingRouter,
  groups: groupsRouter,
  healthCheck: publicProcedure.query(() => {
    return "OK";
  }),
});

export type AppRouter = typeof appRouter;
