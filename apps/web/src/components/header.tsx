import { Link } from "@tanstack/react-router";
import {
  BookOpen,
  CalendarDays,
  CookingPot,
  Plus,
  ShoppingBasket,
} from "lucide-react";
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
          aria-label="Add a recipe"
        >
          <Plus size={20} aria-hidden="true" />
          <span className="nav-desktop-label">Add a recipe</span>
          <span className="nav-mobile-label">Add</span>
        </Link>

        <Link
          to="/recipes"
          activeProps={{ className: "active" }}
          aria-label="Collections"
        >
          <BookOpen size={20} aria-hidden="true" />
          <span className="nav-desktop-label">Collections</span>
          <span className="nav-mobile-label">Recipes</span>
        </Link>
        <Link
          to="/shopping"
          activeProps={{ className: "active" }}
          aria-label="Shopping list"
        >
          <ShoppingBasket size={20} aria-hidden="true" />
          <span className="nav-desktop-label">Shopping list</span>
          <span className="nav-mobile-label">Shop</span>
        </Link>
        <Link
          to="/planner"
          activeProps={{ className: "active" }}
          aria-label="Meal planner"
        >
          <CalendarDays size={20} aria-hidden="true" />
          <span className="nav-desktop-label">Meal planner</span>
          <span className="nav-mobile-label">Plan</span>
        </Link>
        <div className="nav-account">
          <UserMenu />
        </div>
      </nav>
    </header>
  );
}
