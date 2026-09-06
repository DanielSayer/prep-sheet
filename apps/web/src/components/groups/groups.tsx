import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ErrorNotice, LoadingState } from "@/components/feedback";
import { authClient } from "@/lib/auth-client";
import { useTRPC } from "@/utils/trpc";
import { useCollection } from "./collection-context";
import { GroupSettings } from "./group-settings";

export function Groups() {
  const trpc = useTRPC();
  const client = useQueryClient();
  const { groups, selectGroup } = useCollection();
  const [name, setName] = useState("");
  const create = useMutation(
    trpc.groups.create.mutationOptions({
      onSuccess: async (group) => {
        await client.invalidateQueries({ queryKey: trpc.groups.pathKey() });
        selectGroup(group.id);
        setName("");
        toast.success("Group created.");
      },
    }),
  );
  return (
    <main id="main-content" className="page-width groups-page">
      <div className="page-heading">
        <div>
          <h1>
            Your groups<span className="title-dot">.</span>
          </h1>
          <p>
            A shared cookbook for friends, family or flatmates. Your personal
            collection stays private.
          </p>
        </div>
        <Link to="/recipes" className="button button-outline">
          Back to collections
        </Link>
      </div>
      <form
        className="group-panel group-create"
        onSubmit={(event) => {
          event.preventDefault();
          create.mutate({ name });
        }}
      >
        <label>
          New group name
          <input
            required
            maxLength={80}
            placeholder="e.g. Sunday dinner club"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <button
          className="button button-primary"
          disabled={create.isPending || !name.trim()}
          type="submit"
        >
          {create.isPending ? "Creating..." : "Create group"}
        </button>
        <ErrorNotice message={create.error?.message} />
      </form>
      <LoadingState pending={groups.isPending} label="Loading groups...">
        <ErrorNotice
          message={groups.error?.message}
          retry={() => void groups.refetch()}
        />
        {groups.data?.length === 0 && (
          <p className="group-panel">
            Create a group and send an invitation link to someone you'd like to
            cook with.
          </p>
        )}
        {groups.data?.map((group) => (
          <GroupPanel key={group.id} id={group.id} />
        ))}
      </LoadingState>
    </main>
  );
}

function GroupPanel({ id }: { id: string }) {
  const trpc = useTRPC();
  const client = useQueryClient();
  const { data: session } = authClient.useSession();
  const { selectGroup, groupId } = useCollection();
  const details = useQuery(trpc.groups.details.queryOptions({ groupId: id }));
  const [link, setLink] = useState("");
  const [rename, setRename] = useState(false);
  const [name, setName] = useState("");
  const [removing, setRemoving] = useState<{ id: string; name: string }>();
  const refresh = async () => {
    await client.invalidateQueries({ queryKey: trpc.groups.pathKey() });
    await client.invalidateQueries({ queryKey: trpc.recipes.pathKey() });
  };
  const invite = useMutation(
    trpc.groups.invite.mutationOptions({
      onSuccess: async (result) => {
        setLink(`${window.location.origin}/join#${result.token}`);
        await refresh();
      },
    }),
  );
  const revoke = useMutation(
    trpc.groups.revokeInvite.mutationOptions({
      onSuccess: async () => {
        setLink("");
        await refresh();
      },
    }),
  );
  const update = useMutation(
    trpc.groups.rename.mutationOptions({
      onSuccess: async () => {
        setRename(false);
        await refresh();
      },
    }),
  );
  const remove = useMutation(
    trpc.groups.removeMember.mutationOptions({
      onSuccess: async () => {
        if (removing?.id === session?.user.id && groupId === id)
          selectGroup(null);
        setRemoving(undefined);
        await refresh();
      },
    }),
  );
  const group = details.isError ? undefined : details.data;
  const owner = group?.ownerId === session?.user.id;
  return (
    <section className="group-panel">
      <LoadingState pending={details.isPending} label="Loading group...">
        <ErrorNotice
          message={details.error?.message}
          retry={() => void details.refetch()}
        />
        {group && (
          <>
            <div className="group-heading">
              <div>
                <h2>{group.name}</h2>
                <p>
                  {group.members.length}{" "}
                  {group.members.length === 1 ? "member" : "members"} ·{" "}
                  {owner ? "You own this group" : "Shared collection"}
                </p>
              </div>
              <Link
                to="/recipes"
                className="button button-small button-outline"
                onClick={() => selectGroup(id)}
              >
                Open collection
              </Link>
            </div>
            <p>
              Everyone can add, edit, delete and print recipes in this group.
            </p>
            {owner && (
              <div className="group-actions">
                <button
                  type="button"
                  className="text-button"
                  onClick={() => {
                    setName(group.name);
                    setRename(!rename);
                  }}
                >
                  Rename group
                </button>
                <button
                  type="button"
                  className="button button-small button-primary"
                  disabled={invite.isPending}
                  onClick={() => invite.mutate({ groupId: id })}
                >
                  {invite.isPending
                    ? "Creating link..."
                    : "Create invitation link"}
                </button>
              </div>
            )}
            {rename && (
              <form
                className="group-create"
                onSubmit={(event) => {
                  event.preventDefault();
                  update.mutate({ groupId: id, name });
                }}
              >
                <label>
                  Group name
                  <input
                    required
                    value={name}
                    maxLength={80}
                    onChange={(event) => setName(event.target.value)}
                  />
                </label>
                <button
                  type="submit"
                  className="button button-small button-outline"
                  disabled={update.isPending || !name.trim()}
                >
                  Save name
                </button>
              </form>
            )}
            {link && (
              <div className="invite-link">
                <label>
                  Invitation link
                  <input
                    readOnly
                    value={link}
                    onFocus={(event) => event.target.select()}
                  />
                </label>
                <button
                  type="button"
                  className="button button-small button-outline"
                  onClick={() => {
                    void navigator.clipboard.writeText(link).then(
                      () => toast.success("Invitation link copied."),
                      () =>
                        toast.error("Select the link and copy it manually."),
                    );
                  }}
                >
                  Copy link
                </button>
                <p>
                  Send this privately. Anyone with the link can join. Each link
                  works once and expires after 7 days.
                </p>
              </div>
            )}
            <ul className="group-members">
              {group.members.map((member) => (
                <li key={member.id}>
                  <span>
                    {member.name}
                    {member.id === session?.user.id ? " (you)" : ""}
                    {member.id === group.ownerId ? " · Owner" : ""}
                  </span>
                  {member.id !== group.ownerId &&
                    (owner || member.id === session?.user.id) && (
                      <button
                        type="button"
                        className="text-button"
                        onClick={() => setRemoving(member)}
                      >
                        {member.id === session?.user.id
                          ? "Leave group"
                          : "Remove"}
                      </button>
                    )}
                </li>
              ))}
            </ul>
            {removing && (
              <div className="group-confirm" role="alert">
                <p>
                  {removing.id === session?.user.id
                    ? "Leave this group?"
                    : `Remove ${removing.name}?`}{" "}
                  Access will end immediately. Recipes already added will stay
                  in the group.
                </p>
                <div className="group-actions">
                  <button
                    type="button"
                    className="button button-small button-danger"
                    disabled={remove.isPending}
                    onClick={() =>
                      remove.mutate({ groupId: id, userId: removing.id })
                    }
                  >
                    Confirm
                  </button>
                  <button
                    type="button"
                    className="text-button"
                    disabled={remove.isPending}
                    onClick={() => setRemoving(undefined)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
            {group.invites.length > 0 && (
              <div>
                <h3>Unused invitations</h3>
                <ul className="group-members">
                  {group.invites.map((invitation) => (
                    <li key={invitation.id}>
                      <span>
                        Expires{" "}
                        {new Date(invitation.expiresAt).toLocaleDateString()}
                      </span>
                      <button
                        type="button"
                        className="text-button"
                        disabled={revoke.isPending}
                        onClick={() =>
                          revoke.mutate({
                            groupId: id,
                            inviteId: invitation.id,
                          })
                        }
                      >
                        Revoke
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <ErrorNotice
              message={
                invite.error?.message ??
                revoke.error?.message ??
                update.error?.message ??
                remove.error?.message
              }
            />
            {owner && (
              <GroupSettings
                group={group}
                refresh={refresh}
                onDeleted={() => {
                  if (groupId === id) selectGroup(null);
                }}
              />
            )}
          </>
        )}
      </LoadingState>
    </section>
  );
}
