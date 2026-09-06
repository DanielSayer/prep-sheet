import { useQueryClient } from "@tanstack/react-query";
import { Link, useRouter } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";

export default function UserMenu() {
  const { data: session, isPending } = authClient.useSession();
  const queryClient = useQueryClient();
  const router = useRouter();

  if (isPending)
    return (
      <span
        className="account-placeholder"
        role="status"
        aria-label="Loading account"
      />
    );

  if (!session)
    return (
      <Link className="button button-small button-outline" to="/login">
        Sign in
      </Link>
    );

  async function signOut() {
    const result = await authClient.signOut();

    if (result.error) {
      toast.error("Couldn't sign out. Please try again.");

      return;
    }

    queryClient.clear();
    await router.invalidate();
    await router.navigate({ to: "/" });
  }

  return (
    <div className="account">
      <span className="avatar">
        {session.user.name.slice(0, 1).toUpperCase()}
      </span>

      <span className="account-name">{session.user.name}</span>
      <button
        type="button"
        className="icon-button"
        aria-label="Sign out"
        onClick={signOut}
      >
        <LogOut size={18} />
      </button>
    </div>
  );
}
