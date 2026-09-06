import { Link } from "@tanstack/react-router";
import { BookOpen, CookingPot, Plus } from "lucide-react";
import UserMenu from "./user-menu";

export default function Header() {
  return (
    <header className="site-header">
      <Link to="/" className="brand" aria-label="Prep Sheet home">
        <span className="brand-icon">
          <CookingPot size={25} strokeWidth={2.5} />
        </span>
        prep<span>sheet</span>
        <span className="brand-dot">.</span>
      </Link>
      <nav aria-label="Main navigation">
        <Link
          to="/"
          activeProps={{ className: "active" }}
          activeOptions={{ exact: true }}
        >
          <Plus size={18} /> Add a recipe
        </Link>
        <Link to="/recipes" activeProps={{ className: "active" }}>
          <BookOpen size={18} /> My collection
        </Link>
      </nav>
      <UserMenu />
    </header>
  );
}
