import { openapi } from "@orpc/openapi";
import { os } from "@orpc/server";
import z from "zod";
import * as AuthStore from "../stores/authStore.server";
import { auth, requireUser } from "../auth.server";
import { permissions } from "../permissions";

export const sharesRoutes = os.meta(openapi({ prefix: "/shares" })).router({
  createShare: os
    .route({ method: "POST", path: "/create" })
    .use(auth(permissions.createShares))
    .use(requireUser)
    .input(z.object({ name: z.string(), path: z.string() }))
    .handler(async ({ context, input }) => {
      const share = AuthStore.createShare({
        name: input.name,
        path: input.path,
        ownerId: context.user.id,
      });
      return share;
    }),
});
