import { Carrot, Sparkles, Utensils } from "lucide-react";

export function Hero() {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero-sticker sticker-carrot" aria-hidden="true">
        <Carrot size={46} strokeWidth={1.8} />
        <span>
          good stuff
          <br />
          starts here
        </span>
      </div>

      <h1 id="hero-title">
        Big ideas.
        <br />
        <span>Good dinners.</span>
      </h1>

      <p>
        A recipe you found. A dish you dreamed up.
        <br className="desktop-break" /> Add it here. We'll organise the
        ingredients and steps.
      </p>

      <div className="hero-sticker sticker-fork" aria-hidden="true">
        <Sparkles size={19} />
        <Utensils size={43} strokeWidth={1.8} />
      </div>
    </section>
  );
}
