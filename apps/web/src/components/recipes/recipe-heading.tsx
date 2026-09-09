import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@prep-sheet/ui/components/dropdown-menu";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";

export function RecipeHeading({
  recipe,
  editing,
  onEdit,
  onDelete,
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
