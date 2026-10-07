import { os } from "@orpc/server";
import "@orpc/openapi/extensions/route";
import { openapi } from "@orpc/openapi";
import { env } from "#/env";
import { auth } from "../auth.server";
import { permissions } from "../permissions";

export const adminRoutes = os.meta(openapi({ prefix: "/admin" })).router({
  selfUpdate: os
    .route({ method: "POST", path: "/selfupdate" })
    .use(auth(permissions.admin))
    .handler(async () => {
      const proc = Bun.spawn(["/bin/sh", "-c", env.selfUpdateCommand], {
        stdout: "inherit",
        stderr: "inherit",
      });
      await proc.exited;
    }),
});
