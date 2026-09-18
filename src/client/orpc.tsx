import type { router } from "#/server/api/index.server";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { RouterClient } from "@orpc/server";
import { createContext, useContext, useMemo } from "react";
import { useClientConfig } from "./clientConfig";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";

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

// fs

export interface RemoteFileSystem {
  getFileOrDirectoryInfo(
    path: string,
  ): Promise<
    null | { type: "file"; downloadLink: string } | { type: "directory" }
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
    }
    return null;
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
