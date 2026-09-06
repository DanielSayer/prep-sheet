import { load } from "cheerio";

function findRecipe(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(findRecipe).find(Boolean);
  if (!value || typeof value !== "object") return;
  const object = value as Record<string, unknown>;
  const types = [object["@type"]].flat();
  if (types.includes("Recipe")) return object;
  return Object.values(object).map(findRecipe).find(Boolean);
}

export function extractPage(html: string) {
  const $ = load(html);
  for (const script of $('script[type="application/ld+json"]').toArray()) {
    try {
      const recipe = findRecipe(JSON.parse($(script).text()));
      if (recipe) return JSON.stringify(recipe).slice(0, 40000);
    } catch {
      /* A page can contain unrelated or malformed metadata. */
    }
  }
  $("script, style, nav, footer, header, aside, noscript, form").remove();
  const article = $("article, main").first();
  return (article.length ? article : $("body"))
    .text()
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 40000);
}
