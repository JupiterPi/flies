import { HeadContent, Outlet, createRootRoute } from "@tanstack/react-router";

import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { TanStackDevtools } from "@tanstack/react-devtools";

import "../styles.css";
import { ThemeProvider } from "#/components/theme-provider";
import Navbar from "#/components/navbar";

export const Route = createRootRoute({
  head: () => ({
    meta: [{ title: "Flies" }],
    links: [{ rel: "icon", href: "/src/flies-logo.ico" }],
  }),
  component: RootComponent,
});

function RootComponent() {
  return (
    <>
      <HeadContent />
      <ThemeProvider>
        <Navbar navigationData={[]} />
        <Outlet />
      </ThemeProvider>
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
