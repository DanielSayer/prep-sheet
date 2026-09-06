import { createFileRoute } from "@tanstack/react-router";
import { Collection } from "@/components/recipes/collection";

export const Route = createFileRoute("/_auth/recipes/")({
  ssr: false,
  component: Collection,
});
