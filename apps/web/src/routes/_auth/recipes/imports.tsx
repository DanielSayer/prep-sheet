import { createFileRoute } from "@tanstack/react-router";
import { RecentImports } from "@/components/recipes/recent-imports";

export const Route = createFileRoute("/_auth/recipes/imports")({
  ssr: false,
  component: RecentImports,
});
