import type { router } from "#/server/api/index.server";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { RouterClient } from "@orpc/server";
import { createContext, useContext, useMemo, useState } from "react";
import { useClientConfig } from "./clientConfig";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { RetryLinkPlugin } from "@orpc/client/plugins";
import { useLocation } from "@tanstack/react-router";
import { FliesHomeLogo } from "#/routes/_loggedIn";
import { Field, FieldGroup, FieldLabel } from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import { Button } from "#/components/ui/button";

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
          authorization:
            clientConfig.savedUserCredentials ||
            clientConfig.savedShareTokens.length > 0
              ? "Basic " +
                btoa(
                  [
                    clientConfig.savedUserCredentials,
                    ...clientConfig.savedShareTokens.map((token) => ({
                      username: "share",
                      password: token,
                    })),
                  ]
                    .filter((c) => c !== undefined)
                    .map((c) => `${c.username}:${c.password}`)
                    .join(","),
                )
              : undefined, // todo: actually authenticate via session
        };
      },
      plugins: [new RetryLinkPlugin()],
    });
    return createORPCClient(link);
  }, [clientConfig]);

  return (
    <ORPCClientContext.Provider value={{ client }}>
      {children}
    </ORPCClientContext.Provider>
  );
}

export function useIsLoggedInAsUser() {
  const [clientConfig, _] = useClientConfig();
  return useMemo(() => {
    return !!clientConfig.savedUserCredentials;
  }, [clientConfig]);
}

export function useAuthInvalidationKey() {
  const [clientConfig, _] = useClientConfig();
  return `${clientConfig.savedUserCredentials?.username || ""}; ${clientConfig.savedShareTokens.join(",")}`;
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

// login

export function LoginPage({
  justification,
  sharePath,
  requireUserLogin,
}: {
  justification?: React.ReactNode;
  sharePath?: string;
  requireUserLogin?: boolean;
}) {
  const { pathname } = useLocation();
  const [_, setClientConfig] = useClientConfig();

  const [usernameInput, setUsernameInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const loginWithUser = () => {
    setClientConfig((clientConfig) => ({
      ...clientConfig,
      savedUserCredentials: {
        username: usernameInput,
        password: passwordInput,
      },
    }));
  };

  const { client } = useServer();
  const [sharePasswordInput, setSharePasswordInput] = useState("");
  const loginWithShare = () => {
    if (!sharePath) throw new Error("Cannot login with share for this route");
    client.user
      .getShareTokenForPathOrParent({
        path: sharePath,
        sharePassword: sharePasswordInput,
      })
      .then((shareToken) => {
        if (!shareToken) {
          alert("Invalid share password");
          return;
        }
        setClientConfig((clientConfig) => ({
          ...clientConfig,
          savedShareTokens: [...clientConfig.savedShareTokens, shareToken],
        }));
      });
  };

  const [loginMethod, setLoginMethod] = useState<"user" | "share">(
    requireUserLogin ? "user" : "share",
  );
  const isLoggedInAsUser = useIsLoggedInAsUser();
  const otherMethodsButtons = (
    <>
      {loginMethod !== "user" && !isLoggedInAsUser && (
        <Button variant="outline" onClick={() => setLoginMethod("user")}>
          Login as user instead
        </Button>
      )}
      {loginMethod !== "share" && sharePath && (
        <Button variant="outline" onClick={() => setLoginMethod("share")}>
          Login with share instead
        </Button>
      )}
    </>
  );

  return (
    <div className="px-8 py-12 typeset flex flex-col items-center gap-8">
      <h1 className="text-4xl flex gap-4 items-center">
        <FliesHomeLogo className="size-12" /> Flies
      </h1>

      <div className="opacity-80 max-w-sm text-center">
        {justification || (
          <>
            This route (<span className="font-mono">{pathname}</span>) requires
            authentication.
          </>
        )}
      </div>

      {loginMethod === "user" && (
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
          <div className="flex flex-col gap-2">
            <Button
              variant="default"
              onClick={loginWithUser}
              disabled={!usernameInput || !passwordInput}
            >
              Login as {usernameInput || "user"}
            </Button>
            {!requireUserLogin && otherMethodsButtons}
          </div>
        </FieldGroup>
      )}

      {loginMethod === "share" && (
        <FieldGroup className="max-w-2xs">
          <Field>
            <FieldLabel>Share Password</FieldLabel>
            <Input
              type="password"
              value={sharePasswordInput}
              onChange={(e) => setSharePasswordInput(e.target.value)}
            />
          </Field>
          <div className="flex flex-col gap-2">
            <Button
              variant="default"
              onClick={loginWithShare}
              disabled={!sharePasswordInput}
            >
              Login with share
            </Button>
            {otherMethodsButtons}
          </div>
        </FieldGroup>
      )}
    </div>
  );
}

// fs

export interface RemoteFileSystem {
  getFileOrDirectoryInfo(
    path: string,
  ): Promise<
    | { type: "file"; downloadLink: string }
    | { type: "directory" }
    | { type: "not_authenticated" | "not_found" }
  >;

  listDirectory(
    path: string,
  ): Promise<{ type: "file" | "directory"; name: string; path: string }[]>;

  createFile(path: string): Promise<void>;

  deleteFile(path: string): Promise<void>;

  createDirectory(path: string): Promise<void>;

  readFile(path: string): Promise<ArrayBuffer | string>;

  getFileDownloadLink(path: string): string;

  writeFile(path: string, content: ArrayBuffer | string): Promise<void>;

  moveFileOrDirectory(oldPath: string, newPath: string): Promise<void>;
}

export class ServerFS implements RemoteFileSystem {
  private server: RouterClient<router>;

  constructor(client: RouterClient<router>) {
    this.server = client;
  }

  async getFileOrDirectoryInfo(path: string) {
    const info = await this.server.fs.getInfo({ path });
    if (info.type === "file") {
      return {
        type: "file" as const,
        downloadLink: this.getFileDownloadLink(path),
      };
    } else if (info.type === "directory") {
      return {
        type: "directory" as const,
      };
    } else {
      return { type: info.type };
    }
  }

  async listDirectory(path: string) {
    return await this.server.fs.listDir({ path });
  }

  async createFile(path: string) {
    await this.server.fs.createEmptyFile({ path });
  }

  async deleteFile(path: string) {
    await this.server.fs.delete({ path });
  }

  async createDirectory(path: string) {
    await this.server.fs.createDirectory({ path });
  }

  async readFile(path: string) {
    const file = await this.server.fs.downloadFile({ path });
    try {
      const content = await new Response(file).arrayBuffer();
      return content;
    } catch (e) {
      console.error("Error reading file:", e);
      throw e;
    }
  }

  getFileDownloadLink(path: string) {
    this.server.fs.downloadFile; // ensure that the downloadFile route is registered
    return `${window.location.origin}/api/fs/download/${encodeURIComponent(path)}`;
  }

  async writeFile(path: string, content: ArrayBuffer | string) {
    const contentArrayBuffer =
      typeof content === "string" ? new TextEncoder().encode(content) : content;
    await this.server.fs.uploadFile({
      path,
      file: new File([contentArrayBuffer], "file.blob", {
        type: "application/octet-stream",
      }),
    });
  }

  async moveFileOrDirectory(oldPath: string, newPath: string) {
    await this.server.fs.move({ oldPath, newPath });
  }
}
