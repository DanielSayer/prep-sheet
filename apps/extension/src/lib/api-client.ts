import type { AppRouter } from "@prep-sheet/api/routers/index";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { prepSheetOrigin } from "./config";

// Reserved for step 4. Website tRPC deliberately does not accept extension tokens.
// Authenticated extension calls currently live in the background worker.
export const apiClient = createTRPCClient<AppRouter>({
  links: [httpBatchLink({ url: `${prepSheetOrigin}/api/trpc` })],
});
