import type { FliesRoot } from "#/data/configuration";
import { createClient, type FileStat, type WebDAVClient } from "webdav";

// generic interface

export interface RemoteFileSystem {
  getRoot(): FliesRoot;

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

  writeFile(path: string, content: ArrayBuffer | string): Promise<void>;

  getFileDownloadLink(path: string): string;
}

// webdav client implementation

export class WebDAVClientFS implements RemoteFileSystem {
  client: WebDAVClient;

  constructor(private root: FliesRoot) {
    this.client = createClient(root.webdavEndpoint, root.webdavCredentials);
  }

  getRoot() {
    return this.root;
  }

  async getFileOrDirectoryInfo(path: string) {
    const stat = await (async () => {
      try {
        return (await this.client.stat(path)) as unknown as FileStat;
      } catch (e) {
        if (e instanceof Error && e.message.includes("404")) {
          return null;
        }
        throw e;
      }
    })();
    if (stat === null) {
      return null;
    }

    if (stat.type === "directory") {
      return {
        type: "directory" as const,
      };
    } else {
      return {
        type: "file" as const,
        downloadLink: this.client.getFileDownloadLink(path),
      };
    }
  }

  async listDirectory(path: string) {
    const children = await this.client.getDirectoryContents(path);
    return children.map((child) => ({
      type: child.type,
      name: child.filename.split("/").slice(-1)[0],
      path: child.filename,
    }));
  }

  async createFile(path: string) {
    await this.client.putFileContents(path, "");
  }

  async deleteFile(path: string) {
    await this.client.deleteFile(path);
  }

  async createDirectory(path: string) {
    await this.client.createDirectory(path);
  }

  async readFile(path: string) {
    const content = await this.client.getFileContents(path);
    return content as unknown as ArrayBuffer | string; // todo?
  }

  async writeFile(path: string, content: ArrayBuffer | string) {
    await this.client.putFileContents(path, content);
  }

  getFileDownloadLink(path: string) {
    return this.client.getFileDownloadLink(path);
  }
}
