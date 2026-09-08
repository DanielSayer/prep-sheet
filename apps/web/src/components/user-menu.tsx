import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@prep-sheet/ui/components/dropdown-menu";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useRouter } from "@tanstack/react-router";
import { ChevronDown, LogIn, LogOut, Settings, UserRound } from "lucide-react";
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
      <DropdownMenu>
        <DropdownMenuTrigger
          className="account account-trigger"
          aria-label="Account menu"
        >
          <span className="avatar">
            <UserRound size={18} />
          </span>
          <ChevronDown size={14} aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent className="collection-select-menu" align="end">
          <DropdownMenuItem
            className="collection-select-manage"
            render={<Link to="/login" />}
          >
            <LogIn size={16} /> Sign in
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
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
    <DropdownMenu>
      <DropdownMenuTrigger
        className="account account-trigger"
        aria-label="Account menu"
      >
        <span className="avatar">
          {session.user.name.slice(0, 1).toUpperCase()}
        </span>

        <span className="account-name">{session.user.name}</span>
        <ChevronDown size={14} aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="collection-select-menu"
        align="end"
        sideOffset={8}
      >
        <DropdownMenuItem
          className="collection-select-manage"
          render={<Link to="/settings" />}
        >
          <Settings size={16} /> Settings
        </DropdownMenuItem>
        <DropdownMenuItem
          className="collection-select-manage"
          onClick={signOut}
        >
          <LogOut size={16} /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
