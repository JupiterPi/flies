import {
  createFileRoute,
  Link,
  Outlet,
  useLocation,
} from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ErrorPage } from "./_loggedIn/$";
import { useServer } from "#/client/orpc";
import { useClientConfig } from "#/client/clientConfig";
import { cn } from "cn";
import { Field, FieldGroup, FieldLabel } from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import { Button } from "#/components/ui/button";
import { Checkbox } from "#/components/ui/checkbox";

export const Route = createFileRoute("/_loggedIn")({
  ssr: false, // todo: can this be removed now that window.prompt isn't used anymore?
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
    return (
      <LoginPage
        onLogin={(username, password) => {
          setClientConfig((clientConfig) => ({
            ...clientConfig,
            savedCredentials: { username, password },
          }));
        }}
      />
    );
  }

  return <Outlet />;
}

function LoginPage({
  onLogin,
}: {
  onLogin?: (username: string, password: string) => void;
}) {
  const { pathname } = useLocation();

  const [usernameInput, setUsernameInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const login = () => {
    if (onLogin) {
      onLogin(usernameInput, passwordInput);
    }
  };

  return (
    <div className="px-8 py-12 typeset flex flex-col items-center gap-8">
      <h1 className="text-4xl flex gap-4 items-center">
        <FliesHomeLogo className="size-12" /> Flies
      </h1>

      {pathname !== "/" && (
        <div className="opacity-80">
          This route (<span className="font-mono">{pathname}</span>) requires
          authentication.
        </div>
      )}

      <FieldGroup className="max-w-2xs">
        <Field>
          <FieldLabel>Username</FieldLabel>
          <Input
            type="text"
            value={usernameInput}
            onChange={(e) => setUsernameInput(e.target.value)}
          />
        </Field>
        <Field>
          <FieldLabel>Password</FieldLabel>
          <Input
            type="password"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
          />
        </Field>
        <Field orientation="horizontal">
          <Checkbox id="remember-me" checked={true} />
          <FieldLabel htmlFor="remember-me">Remember me</FieldLabel>
        </Field>
        <Button variant="default" onClick={login}>
          Login
        </Button>
        <div className="flex justify-center"></div>
      </FieldGroup>
    </div>
  );
}

export function FliesHomeLogo({ className }: { className?: string }) {
  return (
    <Link to="/">
      <img
        src="/flies-logo.svg"
        alt="Flies Logo"
        className={cn("m-0!", className)}
      />
    </Link>
  );
}
