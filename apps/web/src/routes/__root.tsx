import type { AppRouter } from "@prep-sheet/api/routers/index";
import { Toaster } from "@prep-sheet/ui/components/sonner";
import type { QueryClient } from "@tanstack/react-query";
import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  Scripts,
} from "@tanstack/react-router";
import type { TRPCOptionsProxy } from "@trpc/tanstack-react-query";

import Header from "../components/header";

import appCss from "../index.css?url";

interface RouterAppContext {
  trpc: TRPCOptionsProxy<AppRouter>;
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterAppContext>()({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "Prep Sheet · Good recipes, all together",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),

  component: RootDocument,
});

function RootDocument() {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>

      <body>
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>

        <div className="app-shell">
          <Header />
          <Outlet />
        </div>

        <Toaster richColors theme="light" />
        <Scripts />
      </body>
    </html>
  );
}
