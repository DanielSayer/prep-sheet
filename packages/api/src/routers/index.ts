import { publicProcedure, router } from "../index";
import { groupsRouter } from "./groups";
import { recipesRouter } from "./recipes";
import { tagsRouter } from "./tags";

export const appRouter = router({
  recipes: recipesRouter,
  tags: tagsRouter,
  groups: groupsRouter,
  healthCheck: publicProcedure.query(() => {
    return "OK";
  }),
});

export type AppRouter = typeof appRouter;
