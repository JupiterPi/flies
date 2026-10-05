import { openapi } from "@orpc/openapi";
import { os } from "@orpc/server";
import z from "zod";
import * as AuthStore from "../stores/authStore.server";
import { auth, requireUser } from "../auth.server";
import { permissions } from "../permissions";

export const sharesRoutes = os.meta(openapi({ prefix: "/shares" })).router({
  getAllShares: os // todo: currently unused
    .route({ method: "GET", path: "/" })
    .use(auth(permissions.admin))
    .handler(async () => {
      const shares = AuthStore.getShares();
      return shares;
    }),
  getSharesForUser: os // todo: currently unused
    .route({ method: "GET", path: "/for-user" })
    .use(auth())
    .use(requireUser)
    .handler(async ({ context }) => {
      const shares = AuthStore.getShares().filter(
        (share) => share.ownerId === context.user.id,
      );
      return shares;
    }),
  getSharesForPath: os
    .route({ method: "GET", path: "/for-path" })
    .use(auth())
    .use(requireUser)
    .input(z.object({ path: z.string() }))
    .handler(async ({ context, input }) => {
      return AuthStore.getShares()
        .filter((share) => share.ownerId === context.user.id)
        .filter(
          (share) =>
            input.path.startsWith(share.path) ||
            share.path.startsWith(input.path),
        );
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
  deleteShare: os
    .route({ method: "DELETE", path: "/" })
    .use(auth(permissions.createShares))
    .use(requireUser)
    .input(z.object({ shareId: z.string() }))
    .handler(async ({ context, input }) => {
      const share = AuthStore.getShares().find((s) => s.id === input.shareId);
      if (!share) {
        throw new Error("Share not found");
      }
      if (share.ownerId !== context.user.id) {
        throw new Error("You do not have permission to delete this share");
      }
      AuthStore.deleteShare(input.shareId);
    }),
});
