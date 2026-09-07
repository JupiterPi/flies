import { HeadContent, Outlet, createRootRoute } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { TanStackDevtools } from "@tanstack/react-devtools";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "../styles.css";
import { ThemeProvider } from "#/components/theme-provider";
import { Toaster } from "#/components/ui/toast";
import { createContext, useContext, useEffect, useState } from "react";
import type { router } from "flies-server";
import type { RouterClient } from "@orpc/server";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { ServerFS } from "#/fs/fs";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import {
  readUserKeyFromLocalStorage,
  writeUserKeyToLocalStorage,
} from "#/data/configuration";
import { ErrorPage, LoadingPage } from "./$";

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
          <Authenticate>
            <Outlet />
          </Authenticate>
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

const ORPCClientContext = createContext<RouterClient<router> | null>(null);
export function useServer() {
  const client = useContext(ORPCClientContext);
  if (!client) {
    console.error(client);
    throw new Error(
      "useServer must be used within a ORPCClientContext.Provider",
    );
  }
  return client;
}
export function useServerQueries() {
  const client = useServer();
  return createTanstackQueryUtils(client);
}

export function useFs() {
  const server = useServer();
  return new ServerFS(server);
}

export const serverUrl = "http://localhost:3000"; // todo: make this configurable

function Authenticate({ children }: { children: React.ReactNode }) {
  const [userKey, setUserKey] = useState<string | null>(null);
  useEffect(() => {
    const storedUserKey = readUserKeyFromLocalStorage();
    if (storedUserKey) {
      setUserKey(storedUserKey);
    } else {
      const newUserKey = window.prompt("Enter your user key:") || "";
      if (newUserKey) {
        setUserKey(newUserKey);
        writeUserKeyToLocalStorage(newUserKey);
      }
    }
  }, []);

  const [authToken, setAuthToken] = useState<string | null>(null);
  const client = createORPCClient(
    new RPCLink({
      origin: serverUrl,
      url: "/rpc",
      headers: () => ({
        authorization: authToken ? `Bearer ${authToken}` : "",
      }),
    }),
  ) as RouterClient<typeof router>;

  const [error, setError] = useState<Error | null>(null);
  useEffect(() => {
    let cancelled = false;
    if (userKey && !authToken) {
      client.user
        .login({ userKey })
        .then((token) => {
          if (!cancelled) {
            setAuthToken(token);
          }
        })
        .catch((err) => {
          if (!cancelled) {
            setError(err);
          }
        });
    }
    return () => {
      cancelled = true;
    };
  }, [userKey]);

  if (userKey && !authToken) {
    return <LoadingPage />;
  }
  if (error) {
    return <ErrorPage>Error logging in: {String(error)}</ErrorPage>;
  }
  if (authToken === null || authToken === undefined) {
    return <ErrorPage>Invalid user key: {userKey}</ErrorPage>;
  }

  return (
    <ORPCClientContext.Provider value={client}>
      {children}
    </ORPCClientContext.Provider>
  );
}
