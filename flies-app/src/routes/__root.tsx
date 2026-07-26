import { HeadContent, Outlet, createRootRoute } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { TanStackDevtools } from "@tanstack/react-devtools";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import "../styles.css";
import { ThemeProvider } from "#/components/theme-provider";
import Navbar from "#/components/navbar";
import { Toaster } from "#/components/ui/toast";

export const Route = createRootRoute({
  head: () => ({
    meta: [{ title: "Flies" }],
    links: [{ rel: "icon", href: "/flies-logo.svg" }],
  }),
  component: RootComponent,
});

const queryClient = new QueryClient();

function RootComponent() {
  return (
    <>
      <HeadContent />
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <Navbar />
          <Outlet />
          <Toaster />
        </ThemeProvider>
      </QueryClientProvider>
      <TanStackDevtools
        config={{
          position: "bottom-right",
        }}
        plugins={[
          {
            name: "TanStack Router",
            render: <TanStackRouterDevtoolsPanel />,
          },
        ]}
      />
    </>
  );
}
