import { handleExtensionRequest } from "@prep-sheet/auth/extension-handler";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/extensions/$")({
  server: {
    handlers: {
      POST: ({ request }) => handleExtensionRequest(request),
      OPTIONS: ({ request }) => handleExtensionRequest(request),
    },
  },
});
