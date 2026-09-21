// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { authClient } from "../lib/auth-client";
import { AuthGate } from "./auth-gate";

vi.mock("../lib/auth-client", () => ({
  authClient: { useSession: vi.fn() },
}));
vi.mock("@tanstack/react-router", () => ({
  Navigate: ({ to }: { to: string }) =>
    createElement("a", { href: to }, "Sign in"),
}));

const refetch = vi.fn();
const session = {
  user: {
    id: "viewer",
    name: "Viewer",
    email: "viewer@example.com",
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  session: {
    id: "session",
    userId: "viewer",
    token: "test-token",
    expiresAt: new Date(Date.now() + 60_000),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function showGate() {
  return render(createElement(AuthGate, { children: "Private page" }));
}

it("waits for the initial session without mounting private content", () => {
  vi.mocked(authClient.useSession).mockReturnValue({
    data: null,
    isPending: true,
    isRefetching: false,
    error: null,
    refetch,
  });
  showGate();
  expect(screen.getByRole("status")).toBeTruthy();
  expect(screen.queryByText("Private page")).toBeNull();
  expect(screen.queryByRole("link")).toBeNull();
});

it("renders immediately with a shared session, including during background refresh", () => {
  vi.mocked(authClient.useSession).mockReturnValue({
    data: session,
    isPending: false,
    isRefetching: true,
    error: null,
    refetch,
  });
  showGate();
  expect(screen.getByText("Private page")).toBeTruthy();
  expect(screen.queryByRole("status")).toBeNull();
  expect(refetch).not.toHaveBeenCalled();
});

it("removes private content when the shared session expires", () => {
  vi.mocked(authClient.useSession).mockReturnValue({
    data: session,
    isPending: false,
    isRefetching: false,
    error: null,
    refetch,
  });
  const view = showGate();
  vi.mocked(authClient.useSession).mockReturnValue({
    data: null,
    isPending: false,
    isRefetching: false,
    error: null,
    refetch,
  });
  view.rerender(createElement(AuthGate, { children: "Private page" }));
  expect(screen.queryByText("Private page")).toBeNull();
  expect(screen.getByRole("link").getAttribute("href")).toBe("/login");
});

it("offers retry after a session request failure without exposing private content", () => {
  vi.mocked(authClient.useSession).mockReturnValue({
    data: null,
    isPending: false,
    isRefetching: false,
    error: {
      name: "BetterFetchError",
      error: {},
      status: 500,
      statusText: "Server error",
      message: "Unavailable",
    },
    refetch,
  });
  showGate();
  expect(screen.getByRole("alert")).toBeTruthy();
  expect(screen.queryByText("Private page")).toBeNull();
  fireEvent.click(screen.getByRole("button"));
  expect(refetch).toHaveBeenCalledOnce();
});
