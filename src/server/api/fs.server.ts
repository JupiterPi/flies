import { ORPCError, os } from "@orpc/server";
import * as z from "zod";
import "@orpc/openapi/extensions/route";
import { openapi } from "@orpc/openapi";
import * as fs from "node:fs/promises";
import type { ResponseHeadersHandlerPluginContext } from "@orpc/server/plugins";
import { env } from "#/env";
import { auth } from "./users.server";
import {
  type UserPermissions,
  hasReadPermission,
  hasWritePermission,
} from "../permissions";

export const fsRootDir = `${env.DATA_DIR}/fs`;

function assertPermissions(
  permissions: UserPermissions,
  requiredPermission: "read" | "write",
  path: string,
) {
  if (requiredPermission === "read" && !hasReadPermission(permissions, path)) {
    throw new ORPCError("FORBIDDEN", {
      message: `You do not have permission to read this path: ${path}`,
    });
  }
  if (
    requiredPermission === "write" &&
    !hasWritePermission(permissions, path)
  ) {
    throw new ORPCError("FORBIDDEN", {
      message: `You do not have permission to write to this path: ${path}`,
    });
  }
}

export const fsRoutes = os.meta(openapi({ prefix: "/fs" })).router({
  getInfo: os
    .route({ method: "GET", path: "/info/{+path}" })
    .use(auth)
    .input(z.object({ path: z.string() }))
    .handler(async ({ context, input }) => {
      assertPermissions(context.permissions, "read", input.path);
      const path = fsRootDir + "/" + input.path;
      if (await fs.exists(path)) {
        const stat = await fs.stat(path);
        return stat.isDirectory()
          ? { type: "directory" as const }
          : { type: "file" as const };
      } else {
        return { type: "not_found" as const };
      }
    }),
  listDir: os
    .route({ method: "GET", path: "/list/{+path}" })
    .use(auth)
    .input(z.object({ path: z.string() }))
    .handler(async ({ context, input }) => {
      assertPermissions(context.permissions, "read", input.path);
      const path = fsRootDir + "/" + input.path;
      const entries = await fs.readdir(path, { withFileTypes: true });
      return entries.map((entry) => ({
        type: entry.isDirectory() ? ("directory" as const) : ("file" as const),
        name: entry.name,
        path: `${input.path}/${entry.name}`,
      }));
    }),
  createEmptyFile: os
    .route({ method: "POST", path: "/create-empty-file/{+path}" })
    .use(auth)
    .input(z.object({ path: z.string() }))
    .handler(async ({ context, input }) => {
      assertPermissions(context.permissions, "write", input.path);
      const path = fsRootDir + "/" + input.path;
      await Bun.file(path).write("");
    }),
  uploadFile: os
    .route({ method: "POST", path: "/upload-file/{+path}" })
    .use(auth)
    .input(z.object({ path: z.string(), file: z.file() }))
    .handler(async ({ context, input }) => {
      assertPermissions(context.permissions, "write", input.path);
      const path = fsRootDir + "/" + input.path;
      await Bun.file(path).write(await input.file.bytes());
    }),
  delete: os
    .route({ method: "DELETE", path: "/delete/{+path}" })
    .use(auth)
    .input(z.object({ path: z.string() }))
    .handler(async ({ context, input }) => {
      assertPermissions(context.permissions, "write", input.path);
      const path = fsRootDir + "/" + input.path;
      await fs.rm(path, { recursive: true, force: true });
    }),
  createDirectory: os
    .route({ method: "POST", path: "/create-directory/{+path}" })
    .use(auth)
    .input(z.object({ path: z.string() }))
    .handler(async ({ context, input }) => {
      assertPermissions(context.permissions, "write", input.path);
      const path = fsRootDir + "/" + input.path;
      await fs.mkdir(path, { recursive: true });
    }),
  downloadFile: os
    .$context<ResponseHeadersHandlerPluginContext>()
    .route({ method: "GET", path: "/download/{+path}" })
    .use(auth)
    .input(z.object({ path: z.string() }))
    .output(z.instanceof(ReadableStream<Uint8Array<ArrayBuffer>>))
    .handler(async ({ context, input }) => {
      assertPermissions(context.permissions, "read", input.path);
      const path = fsRootDir + "/" + input.path;
      context.resHeaders?.set("Content-Type", Bun.file(path).type);
      return Bun.file(path).stream();
    }),
  move: os
    .route({ method: "POST", path: "/move/{+oldPath}" })
    .use(auth)
    .input(z.object({ oldPath: z.string(), newPath: z.string() }))
    .handler(async ({ context, input }) => {
      assertPermissions(context.permissions, "write", input.oldPath);
      assertPermissions(context.permissions, "write", input.newPath);
      const oldPath = fsRootDir + "/" + input.oldPath;
      const newPath = fsRootDir + "/" + input.newPath;
      await fs.rename(oldPath, newPath);
    }),
  // todo some things here were written rather quickly
});
