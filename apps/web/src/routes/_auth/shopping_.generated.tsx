import { createFileRoute } from "@tanstack/react-router";
import { GeneratedShoppingList } from "@/components/shopping/generated-list";

export const Route = createFileRoute("/_auth/shopping_/generated")({
  ssr: false,
  component: GeneratedShoppingList,
});
