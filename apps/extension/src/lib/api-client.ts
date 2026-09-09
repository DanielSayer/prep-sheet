import type { AppRouter } from "@prep-sheet/api/routers/index";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { prepSheetOrigin } from "./config";

// Auth headers will be added with the account connection flow in part 2.
// Constructing this client does not issue requests or copy website cookies.
export const apiClient = createTRPCClient<AppRouter>({
  links: [httpBatchLink({ url: `${prepSheetOrigin}/api/trpc` })],
});
