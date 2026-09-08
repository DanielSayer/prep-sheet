import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Tag, Trash2 } from "lucide-react";
import { useState } from "react";
import { ErrorNotice, LoadingState } from "@/components/feedback";
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
  const refresh = async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: trpc.tags.list.queryKey() }),
      client.invalidateQueries({ queryKey: trpc.recipes.pathKey() }),
    ]);
  };
  const create = useMutation(
    trpc.tags.create.mutationOptions({
      onSuccess: async () => {
        setName("");
        setDescription("");
        await refresh();
      },
    }),
  );
  const remove = useMutation(
    trpc.tags.delete.mutationOptions({ onSuccess: refresh }),
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
          <Link to="/settings" aria-current="page">
            <Tag size={17} /> Tags
          </Link>
        </nav>
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
                  <div>
                    <strong>{tag.name}</strong>
                    <p>{tag.description}</p>
                  </div>
                  {tag.userId ? (
                    <button
                      type="button"
                      className="icon-button"
                      aria-label={`Delete ${tag.name} tag`}
                      disabled={remove.isPending}
                      onClick={() => remove.mutate({ id: tag.id })}
                    >
                      <Trash2 size={17} />
                    </button>
                  ) : (
                    <span className="built-in">Built in</span>
                  )}
                </li>
              ))}
            </ul>
          </LoadingState>
          <p className="muted">
            Deleting a custom tag removes it from your recipes. Existing recipes
            keep their tags when you add new choices.
          </p>
        </section>
      </div>
    </main>
  );
}
