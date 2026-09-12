import { createFileRoute } from "@tanstack/react-router";
import { ShoppingList } from "@/components/shopping/shopping-list";

export const Route = createFileRoute("/_auth/shopping")({
  ssr: false,
  component: ShoppingList,
});
