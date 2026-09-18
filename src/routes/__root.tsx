import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
} from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "../styles.css";
import { ThemeProvider } from "#/components/theme-provider";
import { Toaster } from "#/components/ui/toast";
import { ClientConfigProvider } from "#/client/clientConfig";
import { ORPCClientProvider } from "#/client/orpc";

export const Route = createRootRoute({
  ssr: false,
  head: () => ({
    meta: [
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Flies" },
    ],
    links: [{ rel: "icon", href: "/flies-logo.svg" }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

const queryClient = new QueryClient();

function RootComponent() {
  return (
    <QueryClientProvider client={queryClient}>
      <ClientConfigProvider>
        <ORPCClientProvider>
          <ThemeProvider>
            <Outlet />
            <Toaster />
          </ThemeProvider>
        </ORPCClientProvider>
      </ClientConfigProvider>
    </QueryClientProvider>
  );
}
