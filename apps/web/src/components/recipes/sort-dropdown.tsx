import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@prep-sheet/ui/components/dropdown-menu";
import { ChevronDown } from "lucide-react";
import { useId, useRef } from "react";
import type { RecipeSort } from "./recipe-list";

const options: { label: string; value: RecipeSort }[] = [
  { label: "Newest", value: "newest" },
  { label: "Highest rated", value: "highest-rated" },
  { label: "Name", value: "name" },
  { label: "Cooking time", value: "cooking-time" },
];

export function SortDropdown({
  onValueChange,
  value,
}: {
  onValueChange: (value: RecipeSort) => void;
  value: RecipeSort;
}) {
  const container = useRef<HTMLDivElement>(null);
  const labelId = useId();
  const valueId = useId();
  const selected = options.find((option) => option.value === value);

  return (
    <div className="sort-control" ref={container}>
      <span id={labelId}>Sort</span>
      <DropdownMenu>
        <DropdownMenuTrigger
          className="sort-trigger"
          aria-labelledby={`${labelId} ${valueId}`}
        >
          <span id={valueId}>{selected?.label}</span>
          <ChevronDown size={17} aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          container={container}
          className="collection-select-menu sort-menu"
          align="end"
          sideOffset={8}
        >
          <DropdownMenuRadioGroup
            value={value}
            onValueChange={(next) => onValueChange(next as RecipeSort)}
          >
            {options.map((option) => (
              <DropdownMenuRadioItem
                className="collection-select-option"
                key={option.value}
                value={option.value}
              >
                {option.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
