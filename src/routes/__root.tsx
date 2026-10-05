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
import { createContext, useContext, useEffect, useState } from "react";

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
  const [otherToaster, setOtherToaster] = useState(false);
  return (
    <QueryClientProvider client={queryClient}>
      <ClientConfigProvider>
        <ORPCClientProvider>
          <DetectShareTokenQueryParam />
          <ThemeProvider>
            <OtherToasterContext value={{ setOtherToaster }}>
              <Outlet />
              {!otherToaster && <Toaster />}
            </OtherToasterContext>
          </ThemeProvider>
        </ORPCClientProvider>
      </ClientConfigProvider>
    </QueryClientProvider>
  );
}

const OtherToasterContext = createContext<{
  setOtherToaster: (value: boolean) => void;
} | null>(null);
export function useOtherToaster(otherToaster: boolean) {
  const context = useContext(OtherToasterContext);
  if (!context) {
    throw new Error(
      "useOtherToaster must be used within a OtherToasterProvider",
    );
  }
  useEffect(() => {
    context.setOtherToaster(otherToaster);
    return () => context.setOtherToaster(false);
  }, [context, otherToaster]);
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
