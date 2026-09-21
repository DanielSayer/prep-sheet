import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AuthGate } from "@/components/auth-gate";

export const Route = createFileRoute("/_auth")({
  ssr: false,
  component: AuthLayout,
});

function AuthLayout() {
  return (
    <AuthGate>
      <Outlet />
    </AuthGate>
  );
}
