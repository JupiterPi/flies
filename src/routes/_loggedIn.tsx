import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ErrorPage } from "./_loggedIn/$";
import { useServer } from "#/client/orpc";
import { useClientConfig } from "#/client/config";

export const Route = createFileRoute("/_loggedIn")({
  ssr: false, // because window.prompt is used
  component: RouteComponent,
});

function RouteComponent() {
  const [clientConfig, setClientConfig] = useClientConfig();
  const { client } = useServer();

  const [error, setError] = useState<Error | null>(null);
  useEffect(() => {
    let cancelled = false;
    if (clientConfig.savedCredentials) {
      client.user
        .createSession()
        .then(() => setError(null))
        .catch((err) => {
          if (!cancelled) {
            setError(err);
          }
        });
    }
    return () => {
      cancelled = true;
    };
  }, []);
  if (error) {
    return <ErrorPage>Error logging in: {String(error)}</ErrorPage>;
  }

  if (!clientConfig.savedCredentials) {
    const username = window.prompt("Enter your username:");
    const password = window.prompt("Enter your password:");
    if (username && password) {
      setClientConfig((clientConfig) => ({
        ...clientConfig,
        savedCredentials: { username, password },
      }));
    } else {
      setError(
        new Error("Username and password are required. Reload the page"),
      );
    }
  }
  // todo: login ui

  return <Outlet />;
}
