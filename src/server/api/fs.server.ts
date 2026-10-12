import { os } from "@orpc/server";
import z from "zod";
import "@orpc/openapi/extensions/route";
import { openapi } from "@orpc/openapi";
import type { ResponseHeadersHandlerPluginContext } from "@orpc/server/plugins";
import { assertPermission, auth } from "../auth.server";
import { permissions } from "../permissions";
import { vfs } from "../vfs.server";

export const fsRoutes = os.meta(openapi({ prefix: "/fs" })).router({
  getInfo: os
    .route({ method: "GET", path: "/info/{+path}" })
    .use(auth())
    .input(z.object({ path: z.string() }))
    .handler(
      async ({
        context,
        input,
      }): Promise<
        | { type: "not_authenticated" | "not_found" }
        | { type: "directory" | "file"; readonly: boolean }
      > => {
        const permitted = permissions
          .read(input.path)
          .check(context.privileges);
        if (!permitted) {
          return { type: "not_authenticated" };
        }
        const mayWrite = permissions
          .write(input.path)
          .check(context.privileges);
        const info = await vfs.getInfo(context.privileges, input.path);
        if (info.type === "not_found") {
          return { type: "not_found" };
        } else {
          return {
            type: info.type,
            readonly: !mayWrite,
          };
        }
      },
    ),
  listDir: os
    .route({ method: "GET", path: "/list/{+path}" })
    .use(auth())
    .input(z.object({ path: z.string() }))
    .handler(async ({ context, input }) => {
      assertPermission(context.privileges, permissions.read(input.path));
      return await vfs.listDir(context.privileges, input.path);
    }),
  createEmptyFile: os
    .route({ method: "POST", path: "/create-empty-file/{+path}" })
    .use(auth())
    .input(z.object({ path: z.string() }))
    .handler(async ({ context, input }) => {
      assertPermission(context.privileges, permissions.write(input.path));
      return await vfs.createEmptyFile(context.privileges, input.path);
    }),
  uploadFile: os
    .route({ method: "POST", path: "/upload-file/{+path}" })
    .use(auth())
    .input(z.object({ path: z.string(), file: z.file() }))
    .handler(async ({ context, input }) => {
      assertPermission(context.privileges, permissions.write(input.path));
      await vfs.uploadFile(context.privileges, input.path, input.file);
    }),
  delete: os
    .route({ method: "DELETE", path: "/delete/{+path}" })
    .use(auth())
    .input(z.object({ path: z.string() }))
    .handler(async ({ context, input }) => {
      assertPermission(context.privileges, permissions.write(input.path));
      await vfs.delete(context.privileges, input.path);
    }),
  createDirectory: os
    .route({ method: "POST", path: "/create-directory/{+path}" })
    .use(auth())
    .input(z.object({ path: z.string() }))
    .handler(async ({ context, input }) => {
      assertPermission(context.privileges, permissions.write(input.path));
      await vfs.createDirectory(context.privileges, input.path);
    }),
  downloadFile: os
    .$context<ResponseHeadersHandlerPluginContext>()
    .route({ method: "GET", path: "/download/{+path}" })
    .use(auth())
    .input(z.object({ path: z.string() }))
    .output(z.instanceof(ReadableStream<Uint8Array<ArrayBuffer>>))
    .handler(async ({ context, input }) => {
      assertPermission(context.privileges, permissions.read(input.path));
      context.resHeaders?.set(
        "Content-Type",
        vfs.getMimeType(context.privileges, input.path),
      );
      return await vfs.downloadFile(context.privileges, input.path);
    }),
  move: os
    .route({ method: "POST", path: "/move/{+oldPath}" })
    .use(auth())
    .input(z.object({ oldPath: z.string(), newPath: z.string() }))
    .handler(async ({ context, input }) => {
      assertPermission(context.privileges, permissions.write(input.oldPath));
      assertPermission(context.privileges, permissions.write(input.newPath));
      await vfs.move(context.privileges, input.oldPath, input.newPath);
    }),
  search: os
    .route({ method: "GET", path: "/search" })
    .use(auth())
    .input(
      z.object({
        query: z.string(),
        type: z.enum(["file", "directory", "any"]).optional(),
        pageSize: z.number().optional(),
        pageIndex: z.number().optional(),
      }),
    )
    .handler(async ({ context, input }) => {
      if (!context.user && !(input.pageSize && input.pageSize < 500)) {
        input.pageSize = 500;
      }
      return await vfs.search(
        context.privileges,
        input.query,
        input.type,
        input.pageSize,
        input.pageIndex,
      );
    }),
});
