import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Pencil, Puzzle, Tag, Tags, Trash2 } from "lucide-react";
import { useState } from "react";
import { ConnectedExtensions } from "@/components/connected-extensions";
import { ErrorNotice, LoadingState } from "@/components/feedback";
import { ApplyTagDialog } from "@/components/recipes/bulk-tag-dialog";
import { useTRPC } from "@/utils/trpc";

export const Route = createFileRoute("/_auth/settings")({
  ssr: false,
  component: Settings,
});

function Settings() {
  const trpc = useTRPC();
  const client = useQueryClient();
  const tags = useQuery(trpc.tags.list.queryOptions());
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  type TagDetails = Pick<
    NonNullable<typeof tags.data>[number],
    "id" | "name" | "description"
  >;
  const [editing, setEditing] = useState<TagDetails>();
  const [applyTag, setApplyTag] = useState<TagDetails>();
  const [createdTag, setCreatedTag] = useState<TagDetails>();
  const refresh = async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: trpc.tags.list.queryKey() }),
      client.invalidateQueries({ queryKey: trpc.recipes.pathKey() }),
    ]);
  };
  const create = useMutation(
    trpc.tags.create.mutationOptions({
      onSuccess: async (saved) => {
        setName("");
        setDescription("");
        setCreatedTag(saved);
        await refresh();
      },
    }),
  );
  const update = useMutation(
    trpc.tags.update.mutationOptions({
      onSuccess: async (saved) => {
        if (createdTag?.id === saved.id) setCreatedTag(saved);
        setEditing(undefined);
        await refresh();
      },
    }),
  );
  const remove = useMutation(
    trpc.tags.delete.mutationOptions({
      onSuccess: async (_result, variables) => {
        if (createdTag?.id === variables.id) setCreatedTag(undefined);
        await refresh();
      },
    }),
  );
  return (
    <main id="main-content" className="page-width settings-page">
      <div className="page-heading">
        <div>
          <h1>
            Settings<span className="title-dot">.</span>
          </h1>
          <p>A few things to make your collection your own.</p>
        </div>
      </div>
      <div className="settings-layout">
        <nav aria-label="Settings">
          <a href="#tags-heading">
            <Tag size={17} /> Tags
          </a>
          <a href="#extensions-heading">
            <Puzzle size={17} /> Extensions
          </a>
        </nav>
        <div>
          <section aria-labelledby="tags-heading">
            <h2 id="tags-heading">Your tags</h2>
            <p className="settings-intro">
              New recipes are tagged automatically using these choices. Tags and
              favourites are personal, including in group collections. You can
              adjust tags on any recipe.
            </p>
            <form
              className="tag-form"
              onSubmit={(event) => {
                event.preventDefault();
                create.mutate({ name, description });
              }}
            >
              <label>
                Tag name
                <input
                  required
                  maxLength={40}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="e.g. Lunchbox"
                />
              </label>
              <label>
                When to use it <span className="muted">optional</span>
                <input
                  maxLength={300}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="e.g. Easy to pack and eat cold"
                />
              </label>
              <button
                className="button button-primary"
                type="submit"
                disabled={create.isPending || !name.trim()}
              >
                {create.isPending ? "Adding..." : "Add tag"}
              </button>
            </form>
            {createdTag && (
              <div className="tag-created-callout" role="status">
                <div>
                  <strong>{createdTag.name} created.</strong>
                  <p>Add it to recipes you already have.</p>
                </div>
                <div className="tag-row-actions">
                  <button
                    type="button"
                    className="button button-small button-primary"
                    onClick={() => setApplyTag(createdTag)}
                  >
                    <Tags size={16} aria-hidden="true" /> Add to recipes
                  </button>
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => setCreatedTag(undefined)}
                  >
                    Not now
                  </button>
                </div>
              </div>
            )}
            <ErrorNotice
              message={create.error?.message || remove.error?.message}
            />
            <LoadingState pending={tags.isPending}>
              <ErrorNotice
                message={tags.error?.message}
                retry={() => void tags.refetch()}
              />
              <ul className="settings-tags">
                {tags.data?.map((tag) => (
                  <li key={tag.id}>
                    {editing?.id === tag.id ? (
                      <form
                        className="tag-edit-form"
                        onSubmit={(event) => {
                          event.preventDefault();
                          update.mutate(editing);
                        }}
                      >
                        <label>
                          Tag name
                          <input
                            required
                            maxLength={40}
                            value={editing.name}
                            disabled={update.isPending}
                            onChange={(event) =>
                              setEditing({
                                ...editing,
                                name: event.target.value,
                              })
                            }
                          />
                        </label>
                        <label>
                          <span>
                            When to use it{" "}
                            <span className="muted">optional</span>
                          </span>
                          <input
                            maxLength={300}
                            value={editing.description}
                            disabled={update.isPending}
                            onChange={(event) =>
                              setEditing({
                                ...editing,
                                description: event.target.value,
                              })
                            }
                          />
                        </label>
                        <ErrorNotice message={update.error?.message} />
                        <div className="tag-row-actions">
                          <button
                            type="submit"
                            className="button button-small button-primary"
                            disabled={update.isPending || !editing.name.trim()}
                          >
                            {update.isPending ? "Saving..." : "Save changes"}
                          </button>
                          <button
                            type="button"
                            className="text-button"
                            disabled={update.isPending}
                            onClick={() => {
                              update.reset();
                              setEditing(undefined);
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : (
                      <>
                        <div>
                          <strong>{tag.name}</strong>
                          <p>{tag.description}</p>
                        </div>
                        <div className="tag-row-actions">
                          <button
                            type="button"
                            className="text-button"
                            onClick={() => setApplyTag(tag)}
                          >
                            <Tags size={16} aria-hidden="true" /> Add to recipes
                          </button>
                          {tag.userId ? (
                            <>
                              <button
                                type="button"
                                className="icon-button"
                                aria-label={`Edit ${tag.name} tag`}
                                disabled={editing !== undefined}
                                onClick={() => {
                                  update.reset();
                                  setEditing({
                                    id: tag.id,
                                    name: tag.name,
                                    description: tag.description,
                                  });
                                }}
                              >
                                <Pencil size={17} />
                              </button>
                              <button
                                type="button"
                                className="icon-button"
                                aria-label={`Delete ${tag.name} tag`}
                                disabled={remove.isPending}
                                onClick={() => remove.mutate({ id: tag.id })}
                              >
                                <Trash2 size={17} />
                              </button>
                            </>
                          ) : (
                            <span className="built-in">Built in</span>
                          )}
                        </div>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </LoadingState>
            <p className="muted">
              Deleting a custom tag removes it from your recipes. Existing
              recipes keep their tags when you add new choices.
            </p>
          </section>
          <ConnectedExtensions />
        </div>
      </div>
      {applyTag && (
        <ApplyTagDialog
          tag={applyTag}
          onClose={() => setApplyTag(undefined)}
          onApplied={() => {
            if (createdTag?.id === applyTag.id) setCreatedTag(undefined);
          }}
        />
      )}
    </main>
  );
}
