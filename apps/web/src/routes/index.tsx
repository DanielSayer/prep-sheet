import { createFileRoute } from "@tanstack/react-router";
import { Hero } from "@/components/home/hero";
import { HowItWorks } from "@/components/home/how-it-works";
import { RecipeComposer } from "@/components/home/recipe-composer";

export const Route = createFileRoute("/")({ ssr: false, component: Home });

function Home() {
  return (
    <main id="main-content" className="home-page">
      <Hero />
      <RecipeComposer />
      <HowItWorks />
      <footer className="home-footer">
        <span>Your recipes, ready to cook.</span>
        <span>A little kitchen magic.</span>
      </footer>
    </main>
  );
}
