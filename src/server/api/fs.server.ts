import { os } from "@orpc/server";
import z from "zod";
import "@orpc/openapi/extensions/route";
import { openapi } from "@orpc/openapi";
import * as fs from "node:fs/promises";
import type { ResponseHeadersHandlerPluginContext } from "@orpc/server/plugins";
import { env } from "#/env";
import { assertPermission, auth } from "../auth.server";
import { permissions } from "../permissions";

export const fsRoutes = os.meta(openapi({ prefix: "/fs" })).router({
  getInfo: os
    .route({ method: "GET", path: "/info/{+path}" })
    .use(auth())
    .input(z.object({ path: z.string() }))
    .handler(async ({ context, input }) => {
      assertPermission(context.privileges, permissions.read(input.path));
      const path = env.paths.fs + "/" + input.path;
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
    .use(auth())
    .input(z.object({ path: z.string() }))
    .handler(async ({ context, input }) => {
      assertPermission(context.privileges, permissions.read(input.path));
      const path = env.paths.fs + "/" + input.path;
      const entries = await fs.readdir(path, { withFileTypes: true });
      return entries.map((entry) => ({
        type: entry.isDirectory() ? ("directory" as const) : ("file" as const),
        name: entry.name,
        path: `${input.path}/${entry.name}`,
      }));
    }),
  createEmptyFile: os
    .route({ method: "POST", path: "/create-empty-file/{+path}" })
    .use(auth())
    .input(z.object({ path: z.string() }))
    .handler(async ({ context, input }) => {
      assertPermission(context.privileges, permissions.write(input.path));
      const path = env.paths.fs + "/" + input.path;
      await Bun.file(path).write("");
    }),
  uploadFile: os
    .route({ method: "POST", path: "/upload-file/{+path}" })
    .use(auth())
    .input(z.object({ path: z.string(), file: z.file() }))
    .handler(async ({ context, input }) => {
      assertPermission(context.privileges, permissions.write(input.path));
      const path = env.paths.fs + "/" + input.path;
      await Bun.file(path).write(await input.file.bytes());
    }),
  delete: os
    .route({ method: "DELETE", path: "/delete/{+path}" })
    .use(auth())
    .input(z.object({ path: z.string() }))
    .handler(async ({ context, input }) => {
      assertPermission(context.privileges, permissions.write(input.path));
      const path = env.paths.fs + "/" + input.path;
      await fs.rm(path, { recursive: true, force: true });
    }),
  createDirectory: os
    .route({ method: "POST", path: "/create-directory/{+path}" })
    .use(auth())
    .input(z.object({ path: z.string() }))
    .handler(async ({ context, input }) => {
      assertPermission(context.privileges, permissions.write(input.path));
      const path = env.paths.fs + "/" + input.path;
      await fs.mkdir(path, { recursive: true });
    }),
  downloadFile: os
    .$context<ResponseHeadersHandlerPluginContext>()
    .route({ method: "GET", path: "/download/{+path}" })
    .use(auth())
    .input(z.object({ path: z.string() }))
    .output(z.instanceof(ReadableStream<Uint8Array<ArrayBuffer>>))
    .handler(async ({ context, input }) => {
      assertPermission(context.privileges, permissions.read(input.path));
      const path = env.paths.fs + "/" + input.path;
      context.resHeaders?.set("Content-Type", Bun.file(path).type);
      return Bun.file(path).stream();
    }),
  move: os
    .route({ method: "POST", path: "/move/{+oldPath}" })
    .use(auth())
    .input(z.object({ oldPath: z.string(), newPath: z.string() }))
    .handler(async ({ context, input }) => {
      assertPermission(context.privileges, permissions.write(input.oldPath));
      assertPermission(context.privileges, permissions.write(input.newPath));
      const oldPath = env.paths.fs + "/" + input.oldPath;
      const newPath = env.paths.fs + "/" + input.newPath;
      await fs.rename(oldPath, newPath);
    }),
  // todo some things here were written rather quickly
});
