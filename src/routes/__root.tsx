import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
  useNavigate,
} from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "../styles.css";
import { ThemeProvider } from "#/components/theme-provider";
import { Toaster } from "#/components/ui/toast";
import { ClientConfigProvider, useClientConfig } from "#/client/clientConfig";
import { ORPCClientProvider } from "#/client/orpc";
import z from "zod";
import { zodValidator } from "@tanstack/zod-adapter";
import { useEffect } from "react";

const ShareTokenSearchSchema = z.object({
  share: z.string().optional(),
});

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
  validateSearch: zodValidator(ShareTokenSearchSchema),
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
          <DetectShareTokenQueryParam />
          <ThemeProvider>
            <Outlet />
            <Toaster />
          </ThemeProvider>
        </ORPCClientProvider>
      </ClientConfigProvider>
    </QueryClientProvider>
  );
}

function DetectShareTokenQueryParam() {
  const { share } = Route.useSearch();
  const [clientConfig, setClientConfig] = useClientConfig();
  const navigate = useNavigate();
  useEffect(() => {
    if (share) {
      if (!clientConfig.savedShareTokens.includes(share)) {
        setClientConfig((prev) => ({
          ...prev,
          savedShareTokens: [...prev.savedShareTokens, share],
        }));
      }
    }
    navigate({
      to: ".",
      search: (prev) => {
        const { share, ...rest } = prev;
        return { ...rest, share: undefined };
      },
    });
  }, [share, setClientConfig]);
  return <></>;
}
