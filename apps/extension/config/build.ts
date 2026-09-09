import { createPublicKey } from "node:crypto";
import { loadEnv } from "vite";
import { originSchema } from "../src/lib/origin";
import developmentIdentity from "./development-identity.json";

export function getBuildSettings(mode: string) {
  const env = loadEnv(mode, process.cwd(), "WXT_");
  const development = mode === "development";
  if (!development && !env.WXT_PREP_SHEET_ORIGIN) {
    throw new Error(
      "Set WXT_PREP_SHEET_ORIGIN to the deployed HTTPS origin for production builds.",
    );
  }
  const origin = originSchema.parse(
    env.WXT_PREP_SHEET_ORIGIN ||
      (development ? "http://localhost:3001" : undefined),
  );
  const url = new URL(origin);
  if (
    !development &&
    (url.protocol !== "https:" ||
      ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
      url.hostname.endsWith(".example"))
  ) {
    throw new Error(
      "Set WXT_PREP_SHEET_ORIGIN to the deployed HTTPS origin for production builds.",
    );
  }
  const key =
    env.WXT_EXTENSION_PUBLIC_KEY ||
    (development ? developmentIdentity.key : undefined);
  if (!key)
    throw new Error(
      "Set WXT_EXTENSION_PUBLIC_KEY to the store listing public key for production builds.",
    );
  const publicKey = createPublicKey({
    key: Buffer.from(key, "base64"),
    format: "der",
    type: "spki",
  });
  if (publicKey.asymmetricKeyType !== "rsa")
    throw new Error("The extension public key must be RSA.");
  return { origin, key, development };
}
