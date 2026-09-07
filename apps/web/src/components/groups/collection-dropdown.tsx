import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@prep-sheet/ui/components/dropdown-menu";
import { Link } from "@tanstack/react-router";
import { ChevronDown, Users } from "lucide-react";
import { useId } from "react";

type CollectionOption = {
  label: string;
  value: string;
};

export function CollectionDropdown({
  disabled = false,
  label,
  manageGroups = false,
  onValueChange,
  options,
  placeholder = "Choose a collection",
  value,
}: {
  disabled?: boolean;
  label: string;
  manageGroups?: boolean;
  onValueChange: (value: string) => void;
  options: CollectionOption[];
  placeholder?: string;
  value: string;
}) {
  const labelId = useId();
  const valueId = useId();
  const selected = options.find((option) => option.value === value);

  return (
    <div className="collection-select">
      <span id={labelId} className="collection-select-label">
        {label}
      </span>
      <DropdownMenu>
        <DropdownMenuTrigger
          className="collection-select-trigger"
          disabled={disabled}
          aria-labelledby={`${labelId} ${valueId}`}
        >
          <span id={valueId}>{selected?.label ?? placeholder}</span>
          <ChevronDown size={18} aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent className="collection-select-menu" sideOffset={8}>
          <DropdownMenuRadioGroup value={value} onValueChange={onValueChange}>
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
          {manageGroups && (
            <>
              <DropdownMenuSeparator className="collection-select-divider" />
              <DropdownMenuItem
                className="collection-select-manage"
                render={<Link to="/groups" />}
              >
                <Users size={16} aria-hidden="true" />
                Manage groups
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
