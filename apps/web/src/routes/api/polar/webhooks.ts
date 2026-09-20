import { handlePolarWebhook } from "@prep-sheet/api/billing/polar";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/polar/webhooks")({
  server: { handlers: { POST: ({ request }) => handlePolarWebhook(request) } },
});
