import { recipeContentSchema } from "@prep-sheet/db/recipe-content";
import { describe, expect, it } from "vitest";
import { extractPage } from "./extract-page";
import { fetchPage, isPublicAddress, recipeUrl } from "./fetch-page";
import { sampleRecipe } from "./fixtures";

describe("recipe extraction", () => {
  it("prefers Recipe JSON-LD within a graph over unrelated page text", () => {
    const data = {
      "@graph": [
        { "@type": "WebPage" },
        {
          "@type": ["Thing", "Recipe"],
          name: "Lemon pasta",
          recipeIngredient: ["200 g pasta"],
        },
      ],
    };
    expect(
      JSON.parse(
        extractPage(
          `<script type="application/ld+json">${JSON.stringify(data)}</script><main>Advertisements</main>`,
        ),
      ).name,
    ).toBe("Lemon pasta");
  });
  it("falls back to readable article text when metadata is broken", () => {
    expect(
      extractPage(
        '<script type="application/ld+json">{broken}</script><nav>Subscribe</nav><main>Mix flour &amp; water. <script>bad()</script>Bake.</main>',
      ),
    ).toBe("Mix flour & water. Bake.");
  });
  it("rejects incomplete stored recipes and negative times", () => {
    expect(
      recipeContentSchema.safeParse({ ...sampleRecipe, ingredients: [] })
        .success,
    ).toBe(false);
    expect(
      recipeContentSchema.safeParse({ ...sampleRecipe, prepMinutes: -1 })
        .success,
    ).toBe(false);
  });
});

describe("URL import boundaries", () => {
  it.each([
    "127.0.0.1",
    "10.0.0.1",
    "192.168.1.1",
    "169.254.169.254",
    "::1",
    "::ffff:127.0.0.1",
    "fc00::1",
    "0.0.0.0",
  ])("blocks non-public address %s", (address) =>
    expect(isPublicAddress(address)).toBe(false),
  );
  it("accepts public IPs", () => expect(isPublicAddress("8.8.8.8")).toBe(true));
  it.each([
    "file:///etc/passwd",
    "https://user:password@example.com",
    "http://example.com:8080",
  ])("rejects unsafe URL %s", (url) => expect(() => recipeUrl(url)).toThrow());
  it("rejects a loopback page before making a request", async () => {
    await expect(fetchPage("http://127.0.0.1/")).rejects.toThrow(
      "Paste the recipe text",
    );
  });
});
