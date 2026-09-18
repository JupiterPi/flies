import type { router } from "#/server/api/index.server";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { RouterClient } from "@orpc/server";
import { createContext, useContext, useMemo } from "react";
import { useClientConfig } from "./config";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { ServerFS } from "#/fs/fs";

export const ORPCClientContext = createContext<{
  client: RouterClient<router>;
} | null>(null);

export function ORPCClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [clientConfig, _] = useClientConfig();

  const client: RouterClient<typeof router> = useMemo(() => {
    const link = new RPCLink({
      origin: `${window.location.origin}/api`,
      url: "/rpc",
      headers: () => {
        return {
          authorization: clientConfig.savedCredentials
            ? `Basic ${btoa(`${clientConfig.savedCredentials.username}:${clientConfig.savedCredentials.password}`)}`
            : "",
        };
      },
    });
    return createORPCClient(link);
  }, []);

  return (
    <ORPCClientContext.Provider value={{ client }}>
      {children}
    </ORPCClientContext.Provider>
  );
}

export function useServer() {
  const client = useContext(ORPCClientContext);
  if (!client) {
    throw new Error(
      "useORPCClient must be used within a ORPCClientContext provider",
    );
  }
  return {
    client: client.client,
    queries: createTanstackQueryUtils(client.client),
    fs: new ServerFS(client.client),
  };
}
