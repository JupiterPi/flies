import { env } from "#/env";
import { permissions, type Permission, type Privileges } from "./permissions";
import * as fs from "node:fs/promises";

function transformPath(path: string) {
  if (path.startsWith("/")) {
    path = path.slice(1);
  }
  return `${env.paths.fs}/${path}`;
}

export const vfs = {
  async exists(privileges: Privileges, path: string) {
    assertPermission(privileges, permissions.read(path));
    return await fs.exists(transformPath(path));
  },

  async getInfo(privileges: Privileges, path: string) {
    assertPermission(privileges, permissions.read(path));
    if (await fs.exists(transformPath(path))) {
      const stat = await fs.stat(transformPath(path));
      return stat.isDirectory()
        ? { type: "directory" as const }
        : { type: "file" as const, size: stat.size };
    } else {
      return { type: "not_found" as const };
    }
  },

  async listDir(privileges: Privileges, path: string) {
    assertPermission(privileges, permissions.read(path));
    const entries = await fs.readdir(transformPath(path), {
      withFileTypes: true,
    });
    return entries.map((entry) => ({
      type: entry.isDirectory() ? ("directory" as const) : ("file" as const),
      name: entry.name,
      path: `${path}/${entry.name}`,
    }));
  },

  async createEmptyFile(privileges: Privileges, path: string) {
    assertPermission(privileges, permissions.write(path));
    return await Bun.file(transformPath(path)).write("");
  },

  async uploadFile(privileges: Privileges, path: string, file: File) {
    assertPermission(privileges, permissions.write(path));
    await Bun.file(transformPath(path)).write(await file.bytes());
  },

  async writeTextFile(privileges: Privileges, path: string, content: string) {
    assertPermission(privileges, permissions.write(path));
    await Bun.file(transformPath(path)).write(content);
  },

  async delete(privileges: Privileges, path: string) {
    assertPermission(privileges, permissions.write(path));
    await fs.rm(transformPath(path), { recursive: true, force: true });
  },

  async createDirectory(privileges: Privileges, path: string) {
    assertPermission(privileges, permissions.write(path));
    await fs.mkdir(transformPath(path), { recursive: true });
  },

  getMimeType(privileges: Privileges, path: string) {
    assertPermission(privileges, permissions.read(path));
    return Bun.file(transformPath(path)).type;
  },

  async downloadFile(privileges: Privileges, path: string) {
    assertPermission(privileges, permissions.read(path));
    return Bun.file(transformPath(path)).stream();
  },

  async readTextFile(privileges: Privileges, path: string) {
    assertPermission(privileges, permissions.read(path));
    return await Bun.file(transformPath(path)).text();
  },

  async move(privileges: Privileges, oldPath: string, newPath: string) {
    assertPermission(
      privileges,
      permissions.write(oldPath),
      permissions.write(newPath),
    );
    await fs.rename(transformPath(oldPath), transformPath(newPath));
  },
} satisfies Record<string, (privileges: Privileges, ...args: any[]) => void>;
// all vfs functions need to check for permissions, which is enforced here

function assertPermission(
  privileges: Privileges,
  ...permissions: Permission[]
) {
  for (const p of permissions) {
    if (!p.check(privileges)) {
      throw new Error(`Missing permission: ${p.description}`);
    }
  }
}

// other Bun.file invocations

export const authStoreFile = Bun.file(`${env.paths.data}/auth.json`);
export const runningAppsFile = Bun.file(`${env.paths.data}/runningApps.json`);
