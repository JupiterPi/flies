import { createFileRoute, Outlet } from "@tanstack/react-router";
import { createContext, useContext, useEffect, useState } from "react";
import type { router } from "#/server/index.server";
import type { RouterClient } from "@orpc/server";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { ServerFS } from "#/fs/fs";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import {
  readUserKeyFromLocalStorage,
  writeUserKeyToLocalStorage,
} from "#/data/localStorage";
import { ErrorPage, LoadingPage } from "./_auth/$";

export const Route = createFileRoute("/_auth")({
  component: RouteComponent,
});

export const ORPCClientContext = createContext<RouterClient<router> | null>(
  null,
);
export function useServer() {
  const client = useContext(ORPCClientContext);
  if (!client) {
    throw new Error(
      "useServer must be used within a ORPCClientContext provider",
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

function RouteComponent() {
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
      origin: `${window.location.origin}/api`,
      url: "/rpc",
      headers: () => {
        console.log(
          "Providing headers for RPC request. Auth token:",
          authToken,
        );
        return {
          authorization: authToken ? `Bearer ${authToken}` : "",
        };
      },
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

  console.log("Rendering with outlet");
  return (
    <ORPCClientContext value={client}>
      {(() => {
        if (userKey && !authToken) {
          return <LoadingPage />;
        }
        if (error) {
          return <ErrorPage>Error logging in: {String(error)}</ErrorPage>;
        }
        if (authToken === null || authToken === undefined) {
          return <ErrorPage>Invalid user key: {userKey}</ErrorPage>;
        }
        return <Outlet />;
      })()}
    </ORPCClientContext>
  );
}
