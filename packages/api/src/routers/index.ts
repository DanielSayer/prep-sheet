import { publicProcedure, router } from "../index";
import { recipesRouter } from "./recipes";

export const appRouter = router({
  recipes: recipesRouter,
  healthCheck: publicProcedure.query(() => {
    return "OK";
  }),
});

export type AppRouter = typeof appRouter;
