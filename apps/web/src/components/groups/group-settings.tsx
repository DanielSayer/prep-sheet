import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { ErrorNotice } from "@/components/feedback";
import { useTRPC } from "@/utils/trpc";

export function GroupSettings({
  group,
  refresh,
  onDeleted,
}: {
  group: {
    id: string;
    name: string;
    ownerId: string;
    members: { id: string; name: string }[];
  };
  refresh: () => Promise<void>;
  onDeleted: () => void;
}) {
  const trpc = useTRPC();
  const [memberId, setMemberId] = useState("");
  const [confirmTransfer, setConfirmTransfer] = useState(false);
  const [deleteName, setDeleteName] = useState("");
  const transfer = useMutation(
    trpc.groups.transferOwnership.mutationOptions({ onSuccess: refresh }),
  );
  const remove = useMutation(
    trpc.groups.delete.mutationOptions({
      onSuccess: async () => {
        onDeleted();
        await refresh();
      },
    }),
  );
  const pending = transfer.isPending || remove.isPending;
  return (
    <details className="group-settings">
      <summary>Ownership and deletion</summary>
      <div className="group-confirm">
        <h3>Transfer ownership</h3>
        <p>
          Choose another member to manage the group. You'll stay a member and
          can then leave if you want.
        </p>
        <label>
          New owner
          <select
            value={memberId}
            disabled={pending}
            onChange={(event) => {
              setMemberId(event.target.value);
              setConfirmTransfer(false);
            }}
          >
            <option value="">Choose a member</option>
            {group.members
              .filter((member) => member.id !== group.ownerId)
              .map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
          </select>
        </label>
        {!confirmTransfer ? (
          <button
            type="button"
            className="button button-small button-outline"
            disabled={!memberId || pending}
            onClick={() => setConfirmTransfer(true)}
          >
            Transfer ownership
          </button>
        ) : (
          <div role="alert">
            <p>
              Make{" "}
              {group.members.find((member) => member.id === memberId)?.name} the
              owner? You'll lose access to member and invitation management.
            </p>
            <div className="group-actions">
              <button
                type="button"
                className="button button-small button-outline"
                disabled={pending}
                onClick={() =>
                  transfer.mutate({ groupId: group.id, userId: memberId })
                }
              >
                Confirm transfer
              </button>
              <button
                type="button"
                className="text-button"
                disabled={pending}
                onClick={() => setConfirmTransfer(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
      <form
        className="group-confirm"
        onSubmit={(event) => {
          event.preventDefault();
          if (deleteName === group.name && !pending)
            remove.mutate({ groupId: group.id, name: deleteName });
        }}
      >
        <h3>Delete group</h3>
        <p>
          This permanently deletes the group and all its shared recipes for
          everyone. Personal recipes and copies in other collections are kept.
        </p>
        <label>
          Type {group.name} to confirm
          <input
            autoComplete="off"
            value={deleteName}
            disabled={pending}
            onChange={(event) => setDeleteName(event.target.value)}
          />
        </label>
        <button
          type="submit"
          className="button button-small button-danger"
          disabled={deleteName !== group.name || pending}
        >
          {remove.isPending ? "Deleting..." : "Delete group permanently"}
        </button>
      </form>
      <ErrorNotice message={transfer.error?.message ?? remove.error?.message} />
    </details>
  );
}
