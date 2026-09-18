import { createFileRoute } from "@tanstack/react-router";
import { RecentlyDeleted } from "@/components/recipes/recently-deleted";

export const Route = createFileRoute("/_auth/recipes/deleted")({
  ssr: false,
  component: RecentlyDeleted,
});
