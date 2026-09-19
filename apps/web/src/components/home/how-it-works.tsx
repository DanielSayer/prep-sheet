import { BookOpen, FileText, WandSparkles } from "lucide-react";

const steps = [
  {
    icon: WandSparkles,
    title: "Add a recipe",
    text: "Paste text, a link or a meal idea.",
    colour: "orange",
  },
  {
    icon: BookOpen,
    title: "Save it",
    text: "Keep ingredients and steps together.",
    colour: "green",
  },
  {
    icon: FileText,
    title: "Start cooking",
    text: "Follow the recipe or print a PDF.",
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
