import { env } from "#/env";
import { permissions, type Permission, type Privileges } from "./permissions";
import * as fs from "node:fs/promises";
import { FileFinder } from "@ff-labs/fff-bun";

function transformPath(path: string) {
  if (path.startsWith("/")) {
    path = path.slice(1);
  }
  return `${env.paths.fs}/${path}`;
}

const finder = FileFinder.create({ basePath: transformPath("") });
if (!finder.ok) throw new Error("Failed to create FileFinder: " + finder.error);

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

  async search(privileges: Privileges, query: string) {
    if (!(await finder.value.waitForScan())) return null;

    const pathResults = finder.value.mixedSearch(query);
    if (!pathResults.ok) {
      throw pathResults.error;
    }

    const contentResults = finder.value.grep(query, {
      mode: "fuzzy",
      beforeContext: 3,
      afterContext: 3,
    });
    if (!contentResults.ok) {
      throw contentResults.error;
    }

    return {
      path: pathResults.value.items
        .filter((item) =>
          permissions.read(item.item.relativePath).check(privileges),
        )
        .map((item) => ({
          path: item.item.relativePath,
        })),
      content: contentResults.value.items
        .filter((item) => permissions.read(item.relativePath).check(privileges))
        .map((item) => ({
          path: item.relativePath,
          line: item.lineNumber,
          content: item.lineContent,
          context: [
            ...(item.contextBefore ?? []),
            item.lineContent,
            ...(item.contextAfter ?? []),
          ].join("\n"),
        })),
    };
  },

  /**
   * Finds a directory with the given name inside of a parent directory, searching recursively up the directory tree,
   * similar to how ".git" or "node_modules" directories may be found in (recursively) parent directories.
   */
  /* async findNearestDirectoryInsideParentRecursively(
    privileges: Privileges,
    origin: string,
    query: string,
  ) {
    assertPermission(privileges, permissions.read(origin));
    let currentParent = origin.split("/");
    while (currentParent.length > 0) {
      currentParent.pop();
      const currentParentPath = currentParent.join("/");
      assertPermission(privileges, permissions.read(currentParentPath));
      for (const entry of await fs.readdir(transformPath(currentParentPath), {
        withFileTypes: true,
      })) {
        if (entry.isDirectory() && entry.name === query) {
          return `${currentParentPath}/${entry.name}`;
        }
      }
    }
    return null;
  }, */
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
