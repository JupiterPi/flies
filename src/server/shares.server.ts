import { openapi } from "@orpc/openapi";
import { ORPCError, os } from "@orpc/server";
import { auth } from "./users.server";
import z from "zod";
import { hasAdminPermission } from "./permissions";
import * as AuthStore from "./authStore.server";

export const sharesRoutes = os.meta(openapi({ prefix: "/shares" })).router({
  createShare: os
    .route({ method: "POST", path: "/create" })
    .use(auth)
    .input(z.object({ name: z.string(), path: z.string() }))
    .handler(async ({ context, input }) => {
      if (!hasAdminPermission(context.permissions)) {
        throw new ORPCError("FORBIDDEN", {
          message: "You do not have permission to create shares",
        });
      }
      if (!context.user) {
        throw new ORPCError("FORBIDDEN", {
          message: "You must be a user to create shares.",
        });
      }
      const share = AuthStore.createShare({
        name: input.name,
        path: input.path,
        ownerId: context.user.id,
      });
      return share;
    }),
});
