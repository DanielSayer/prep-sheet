import { createFileRoute } from "@tanstack/react-router";
import { Hero } from "@/components/home/hero";
import { RecipeComposer } from "@/components/home/recipe-composer";
import { RecipeSheetPreview } from "@/components/home/recipe-sheet-preview";

export const Route = createFileRoute("/")({ ssr: false, component: Home });

function Home() {
  return (
    <main id="main-content" className="home-page">
      <div className="home-entry">
        <Hero />
        <RecipeComposer />
      </div>
      <RecipeSheetPreview />
    </main>
  );
}
