import { z } from "zod";

export const originSchema = z.url().transform((value, ctx) => {
  const url = new URL(value);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    ctx.addIssue({
      code: "custom",
      message:
        "Use an HTTP(S) origin without credentials, path, query or fragment.",
    });
    return z.NEVER;
  }
  return url.origin;
});
