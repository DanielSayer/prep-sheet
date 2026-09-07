import { useQuery } from "@tanstack/react-query";
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { authClient } from "@/lib/auth-client";
import { useTRPC } from "@/utils/trpc";
import { CollectionDropdown } from "./collection-dropdown";

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
  const { groupId, selectGroup, groups, available } = useCollection();
  return (
    <>
      <CollectionDropdown
        disabled={disabled}
        label={label}
        manageGroups
        value={groupId ?? ""}
        onValueChange={(value) => selectGroup(value || null)}
        options={[
          { label: "Personal collection", value: "" },
          ...(!available && groupId
            ? [{ label: "Unavailable group", value: groupId }]
            : []),
          ...(groups.data?.map((group) => ({
            label: group.name,
            value: group.id,
          })) ?? []),
        ]}
      />
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
    </>
  );
}
