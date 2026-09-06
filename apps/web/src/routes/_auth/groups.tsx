import { createFileRoute } from "@tanstack/react-router";
import { Groups } from "@/components/groups/groups";

export const Route = createFileRoute("/_auth/groups")({ component: Groups });
