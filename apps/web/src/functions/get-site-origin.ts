import { createServerFn } from "@tanstack/react-start";
import { getRequestUrl } from "@tanstack/react-start/server";

// Resolve on the server so social crawlers receive an absolute image URL
// in the initial HTML on both local and deployed hosts.
export const getSiteOrigin = createServerFn({ method: "GET" }).handler(
  () => getRequestUrl().origin,
);
