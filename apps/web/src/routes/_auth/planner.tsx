import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { MealPlanner } from "@/components/planner/meal-planner";
export const Route = createFileRoute("/_auth/planner")({
  ssr: false,
  validateSearch: z.object({ recipeId: z.uuid().optional().catch(undefined) }),
  component: PlannerRoute,
});
function PlannerRoute() {
  const { recipeId } = Route.useSearch();
  return <MealPlanner recipeId={recipeId} />;
}
