import { os } from "@orpc/server";
import * as z from "zod";
import { env } from "./env";
import "@orpc/openapi/extensions/route";
import { openapi } from "@orpc/openapi";
import * as fs from "node:fs/promises";
import type { ResponseHeadersHandlerPluginContext } from "@orpc/server/plugins";

const fsRootDir = `${env.DATA_DIR}/fs`;

export const fsRoutes = os.meta(openapi({ prefix: "/fs" })).router({
  getInfo: os
    .route({ method: "GET", path: "/info/{+path}" })
    .input(z.object({ path: z.string() }))
    .handler(async ({ input }) => {
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
    .input(z.object({ path: z.string() }))
    .handler(async ({ input }) => {
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
    .input(z.object({ path: z.string() }))
    .handler(async ({ input }) => {
      const path = fsRootDir + "/" + input.path;
      await Bun.file(path).write("");
    }),
  uploadFile: os
    .route({ method: "POST", path: "/upload-file/{+path}" })
    .input(z.object({ path: z.string(), file: z.file() }))
    .handler(async ({ input }) => {
      const path = fsRootDir + "/" + input.path;
      await Bun.file(path).write(await input.file.bytes());
    }),
  delete: os
    .route({ method: "DELETE", path: "/delete/{+path}" })
    .input(z.object({ path: z.string() }))
    .handler(async ({ input }) => {
      const path = fsRootDir + "/" + input.path;
      await fs.rm(path, { recursive: true, force: true });
    }),
  createDirectory: os
    .route({ method: "POST", path: "/create-directory/{+path}" })
    .input(z.object({ path: z.string() }))
    .handler(async ({ input }) => {
      const path = fsRootDir + "/" + input.path;
      await fs.mkdir(path, { recursive: true });
    }),
  downloadFile: os
    .$context<ResponseHeadersHandlerPluginContext>()
    .route({ method: "GET", path: "/download/{+path}" })
    .input(z.object({ path: z.string() }))
    .output(z.instanceof(ReadableStream<Uint8Array<ArrayBuffer>>))
    .handler(async ({ context, input }) => {
      const path = fsRootDir + "/" + input.path;
      context.resHeaders?.set("Content-Type", Bun.file(path).type);
      return Bun.file(path).stream();
    }),
  move: os
    .route({ method: "POST", path: "/move/{+oldPath}" })
    .input(z.object({ oldPath: z.string(), newPath: z.string() }))
    .handler(async ({ input }) => {
      const oldPath = fsRootDir + "/" + input.oldPath;
      const newPath = fsRootDir + "/" + input.newPath;
      await fs.rename(oldPath, newPath);
    }),
  // todo some things here were written rather quickly
});
