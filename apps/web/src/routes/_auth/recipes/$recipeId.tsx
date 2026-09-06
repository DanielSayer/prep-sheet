import { createFileRoute } from "@tanstack/react-router";
import { RecipeDetail } from "@/components/recipes/recipe-detail";
export const Route = createFileRoute("/_auth/recipes/$recipeId")({
  ssr: false,
  component: Page,
});
function Page() {
  return <RecipeDetail id={Route.useParams().recipeId} />;
}
