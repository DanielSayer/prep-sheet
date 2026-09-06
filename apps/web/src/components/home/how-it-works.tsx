import { BookOpen, FileText, WandSparkles } from "lucide-react";

const steps = [
  {
    icon: WandSparkles,
    title: "Throw in an idea",
    text: "Paste a recipe, a link, or your dinner wish.",
    colour: "orange",
  },
  {
    icon: BookOpen,
    title: "Keep the good ones",
    text: "Ingredients and steps, all in your collection.",
    colour: "green",
  },
  {
    icon: FileText,
    title: "Take it to the kitchen",
    text: "Open a tidy PDF. Print it. Get cooking.",
    colour: "purple",
  },
];

export function HowItWorks() {
  return (
    <section className="how-it-works" aria-label="How Prep Sheet works">
      {steps.map(({ icon: Icon, title, text, colour }, index) => (
        <div className="how-step" key={title}>
          <span className={`step-icon ${colour}`}>
            <Icon size={23} />
          </span>

          <div>
            <span className="step-number">0{index + 1}</span>
            <h2>{title}</h2>
            <p>{text}</p>
          </div>
        </div>
      ))}
    </section>
  );
}
