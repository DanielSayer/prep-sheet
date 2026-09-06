import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@prep-sheet/ui/components/dropdown-menu";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ChevronDown, Users } from "lucide-react";
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useId,
  useState,
} from "react";
import { authClient } from "@/lib/auth-client";
import { useTRPC } from "@/utils/trpc";

const CollectionContext = createContext<{
  groupId: string | null;
  selectGroup: (id: string | null) => void;
}>({ groupId: null, selectGroup: () => {} });

export function CollectionProvider({ children }: { children: ReactNode }) {
  const { data: session } = authClient.useSession();
  return (
    <Selection key={session?.user.id ?? "guest"} userId={session?.user.id}>
      {children}
    </Selection>
  );
}

function Selection({
  children,
  userId,
}: {
  children: ReactNode;
  userId?: string;
}) {
  const [groupId, setGroupId] = useState<string | null>(null);
  useEffect(() => {
    if (!userId) return;
    try {
      const saved = sessionStorage.getItem(`prep-sheet-collection:${userId}`);
      if (saved && /^[a-f0-9-]{36}$/i.test(saved)) setGroupId(saved);
    } catch {
      /* Browsing with storage disabled still supports collection switching. */
    }
  }, [userId]);
  function selectGroup(id: string | null) {
    setGroupId(id);
    if (!userId) return;
    try {
      if (id) sessionStorage.setItem(`prep-sheet-collection:${userId}`, id);
      else sessionStorage.removeItem(`prep-sheet-collection:${userId}`);
    } catch {
      /* The selection remains available for this page session. */
    }
  }
  return (
    <CollectionContext value={{ groupId, selectGroup }}>
      {children}
    </CollectionContext>
  );
}

export function useCollection() {
  const selection = useContext(CollectionContext);
  const trpc = useTRPC();
  const { data: session } = authClient.useSession();
  const groups = useQuery(
    trpc.groups.list.queryOptions(undefined, {
      enabled: !!session,
      refetchOnWindowFocus: "always",
    }),
  );
  const selected = groups.data?.find((group) => group.id === selection.groupId);
  return {
    ...selection,
    groups,
    name: selection.groupId
      ? (selected?.name ?? "Unavailable group")
      : "Personal collection",
    available: !selection.groupId || !!selected,
  };
}

export function CollectionSelect({
  disabled = false,
  label = "Collection",
}: {
  disabled?: boolean;
  label?: string;
}) {
  const { groupId, selectGroup, groups, available, name } = useCollection();
  const labelId = useId();
  const valueId = useId();
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
          <span id={valueId}>{name}</span>
          <ChevronDown size={18} aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent className="collection-select-menu" sideOffset={8}>
          <DropdownMenuRadioGroup
            value={groupId ?? ""}
            onValueChange={(value) => selectGroup(value || null)}
          >
            <DropdownMenuRadioItem
              className="collection-select-option"
              value=""
            >
              Personal collection
            </DropdownMenuRadioItem>
            {!available && groupId && (
              <DropdownMenuRadioItem
                className="collection-select-option"
                value={groupId}
              >
                Unavailable group
              </DropdownMenuRadioItem>
            )}
            {groups.data?.map((group) => (
              <DropdownMenuRadioItem
                className="collection-select-option"
                key={group.id}
                value={group.id}
              >
                {group.name}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator className="collection-select-divider" />
          <DropdownMenuItem
            className="collection-select-manage"
            render={<Link to="/groups" />}
          >
            <Users size={16} aria-hidden="true" />
            Manage groups
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {groups.error && (
        <span role="alert">
          Couldn't load groups.{" "}
          <button
            type="button"
            className="text-button"
            onClick={() => void groups.refetch()}
          >
            Retry
          </button>
        </span>
      )}
    </div>
  );
}
