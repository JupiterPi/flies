import { openapi } from "@orpc/openapi";
import { os } from "@orpc/server";
import z from "zod";
import * as AuthStore from "../stores/authStore.server";
import { auth, requireUser } from "../auth.server";
import { permissions } from "../permissions";

export const sharesRoutes = os.meta(openapi({ prefix: "/shares" })).router({
  getAllShares: os
    .route({ method: "GET", path: "/all" })
    .use(auth(permissions.admin))
    .handler(async () => {
      const shares = AuthStore.getShares();
      return shares;
    }),
  getSharesForUser: os
    .route({ method: "GET", path: "/" })
    .use(auth())
    .use(requireUser)
    .handler(async ({ context }) => {
      const shares = AuthStore.getShares().filter(
        (share) => share.ownerId === context.user.id,
      );
      return shares;
    }),
  createShare: os
    .route({ method: "POST", path: "/create" })
    .use(auth(permissions.createShares))
    .use(requireUser)
    .input(
      z.object({
        path: z.string(),
        note: z.string().optional(),
        password: z.string().nullable(),
        allowWrite: z.boolean().default(false),
      }),
    )
    .handler(async ({ context, input }) => {
      const share = AuthStore.createShare({
        ownerId: context.user.id,
        ...input,
      });
      return share;
    }),
});
