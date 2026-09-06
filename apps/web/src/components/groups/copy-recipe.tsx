import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ErrorNotice } from "@/components/feedback";
import { useTRPC } from "@/utils/trpc";
import { useCollection } from "./collection-context";

export function CopyRecipe({
  id,
  sourceGroupId,
}: {
  id: string;
  sourceGroupId: string | null;
}) {
  const { groups } = useCollection();
  const trpc = useTRPC();
  const client = useQueryClient();
  const [target, setTarget] = useState("");
  const copy = useMutation(
    trpc.recipes.copy.mutationOptions({
      onSuccess: async () => {
        await client.invalidateQueries({
          queryKey: trpc.recipes.list.queryKey(),
        });
        toast.success("Recipe copied. Each copy can be edited separately.");
      },
    }),
  );
  return (
    <div className="recipe-copy">
      <label>
        Copy to another collection
        <select
          value={target}
          disabled={copy.isPending}
          onChange={(event) => {
            setTarget(event.target.value);
            copy.reset();
          }}
        >
          <option value="">Choose a collection</option>
          {sourceGroupId && (
            <option value="personal">Personal collection</option>
          )}
          {groups.data
            ?.filter((group) => group.id !== sourceGroupId)
            .map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
        </select>
      </label>
      <button
        type="button"
        className="button button-small button-outline"
        disabled={!target || copy.isPending || copy.isSuccess}
        onClick={() =>
          copy.mutate({
            id,
            newId: crypto.randomUUID(),
            groupId: target === "personal" ? null : target,
          })
        }
      >
        {copy.isPending
          ? "Copying..."
          : copy.isSuccess
            ? "Copied"
            : "Copy recipe"}
      </button>
      <ErrorNotice message={copy.error?.message} />
    </div>
  );
}
