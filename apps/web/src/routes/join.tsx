import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ErrorNotice, LoadingState } from "@/components/feedback";
import { useCollection } from "@/components/groups/collection-context";
import { authClient } from "@/lib/auth-client";
import { useTRPC } from "@/utils/trpc";

export const Route = createFileRoute("/join")({
  component: JoinGroup,
  head: () => ({ meta: [{ name: "referrer", content: "no-referrer" }] }),
});

function JoinGroup() {
  const [token, setToken] = useState<string>();
  const [error, setError] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const { data: session, isPending } = authClient.useSession();
  const trpc = useTRPC();
  const client = useQueryClient();
  const navigate = useNavigate();
  const { selectGroup } = useCollection();
  useEffect(() => {
    setToken(window.location.hash.slice(1));
  }, []);
  const valid = !!token && /^[a-f0-9]{64}$/.test(token);
  const preview = useQuery(
    trpc.groups.previewInvite.queryOptions(
      { token: token ?? "" },
      { enabled: !!session && valid, retry: false },
    ),
  );
  const accept = useMutation(
    trpc.groups.acceptInvite.mutationOptions({
      onSuccess: async (result) => {
        await client.invalidateQueries({ queryKey: trpc.groups.pathKey() });
        selectGroup(result.groupId);
        await navigate({ to: "/recipes", replace: true });
      },
    }),
  );
  async function signIn() {
    setSigningIn(true);
    setError("");
    try {
      const result = await authClient.signIn.social({
        provider: "discord",
        callbackURL: `${window.location.origin}/join#${token}`,
      });
      if (result.error) throw new Error("Couldn't sign in. Please try again.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Couldn't sign in.");
      setSigningIn(false);
    }
  }
  return (
    <main id="main-content" className="login-page">
      <div className="login-card">
        <h1>Cook with your group.</h1>
        <LoadingState
          pending={isPending || token === undefined}
          label="Loading invitation..."
        >
          {!valid ? (
            <ErrorNotice message="This invitation link is incomplete. Ask for a new link." />
          ) : !session ? (
            <>
              <p>
                Sign in to see your invitation. Your personal recipes will stay
                private.
              </p>
              <button
                type="button"
                className="button button-discord"
                disabled={signingIn}
                onClick={() => void signIn()}
              >
                {signingIn ? "Connecting..." : "Continue with Discord"}
              </button>
            </>
          ) : (
            <LoadingState
              pending={preview.isPending}
              label="Loading invitation..."
            >
              {preview.data && (
                <>
                  <h2>Join {preview.data.name}</h2>
                  <p>
                    You'll be able to add, edit, delete and print recipes
                    together. Your personal collection stays private.
                  </p>
                  <button
                    type="button"
                    className="button button-primary"
                    disabled={accept.isPending}
                    onClick={() => accept.mutate({ token: token ?? "" })}
                  >
                    {accept.isPending ? "Joining..." : "Join group"}
                  </button>
                </>
              )}
              <ErrorNotice
                message={preview.error?.message ?? accept.error?.message}
              />
            </LoadingState>
          )}
          <ErrorNotice message={error} />
          <Link to="/recipes" className="text-button">
            Back to collections
          </Link>
        </LoadingState>
      </div>
    </main>
  );
}
