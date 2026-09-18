import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@prep-sheet/ui/components/dropdown-menu";
import { Link } from "@tanstack/react-router";
import {
  CalendarDays,
  Download,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import type { ReactNode } from "react";
import { AddRecipesButton } from "../shopping/add-recipes";

export function RecipeHeading({
  recipe,
  editing,
  onEdit,
  onDelete,
  shoppingExtras,
  menuItems,
}: {
  recipe: {
    id: string;
    title: string;
    origin: string;
    sourceUrl: string | null;
    isFavourite: boolean;
  };
  editing: boolean;
  onEdit: () => void;
  onDelete: () => void;
  shoppingExtras?: ReactNode;
  menuItems?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <h1>{recipe.title}</h1>
        <p>
          {recipe.origin === "generated"
            ? "AI-generated recipe. Give it a read before you cook."
            : recipe.origin === "manual"
              ? "Entered manually."
              : "Saved from a recipe you found."}

          {recipe.sourceUrl && (
            <>
              {" "}
              <a
                href={recipe.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="text-button"
              >
                Original recipe ↗
              </a>
            </>
          )}
        </p>
        {!editing && (
          <div className="recipe-shopping-action">
            <AddRecipesButton recipeIds={[recipe.id]} />
            <Link
              className="button button-small button-outline"
              to="/planner"
              search={{ recipeId: recipe.id }}
            >
              <CalendarDays size={17} />
              Add to meal plan
            </Link>
            {shoppingExtras}
          </div>
        )}
      </div>

      {!editing && (
        <div className="detail-actions">
          <DropdownMenu>
            <DropdownMenuTrigger
              className="icon-button"
              aria-label="Recipe actions"
            >
              <MoreHorizontal size={22} />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="collection-select-menu recipe-actions-menu"
              align="end"
            >
              {menuItems}
              <DropdownMenuItem
                className="collection-select-manage"
                render={
                  <a
                    href={`/api/recipes/${recipe.id}/pdf`}
                    download={`${recipe.title.replace(/[^a-z0-9 -]/gi, "").slice(0, 80) || "recipe"}.pdf`}
                  />
                }
              >
                <Download size={17} /> Download PDF
              </DropdownMenuItem>
              <DropdownMenuItem
                className="collection-select-manage"
                onClick={onEdit}
              >
                <Pencil size={17} /> Edit recipe
              </DropdownMenuItem>
              <DropdownMenuItem
                className="collection-select-manage"
                onClick={onDelete}
              >
                <Trash2 size={17} /> Delete recipe
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
}
