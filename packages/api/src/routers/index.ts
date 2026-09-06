import { publicProcedure, router } from "../index";
import { groupsRouter } from "./groups";
import { recipesRouter } from "./recipes";

export const appRouter = router({
  recipes: recipesRouter,
  groups: groupsRouter,
  healthCheck: publicProcedure.query(() => {
    return "OK";
  }),
});

export type AppRouter = typeof appRouter;
