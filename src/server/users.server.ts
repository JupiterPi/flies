import z from "zod";
import { ORPCError, os } from "@orpc/server";
import { openapi } from "@orpc/openapi";
import type { ResponseHeadersHandlerPluginContext } from "@orpc/server/plugins";
import type { RequestHeadersHandlerPluginContext } from "@orpc/server/plugins";
import * as AuthStore from "./authStore.server";
import { setCookie } from "@orpc/server/helpers";
import {
  authFromRequest,
  createSession,
  sessionTimeoutMs,
} from "#/server/auth.server";

interface ServerContext
  extends
    ResponseHeadersHandlerPluginContext,
    RequestHeadersHandlerPluginContext {}

export const auth = os
  .$context<ServerContext>()
  .middleware(async ({ context, next }) => {
    const auth = await authFromRequest(
      context.reqHeaders?.get("Authorization") ?? null,
      context.reqHeaders?.get("Cookie") ?? null,
      null,
    );
    if ("error" in auth) {
      throw new ORPCError("UNAUTHORIZED", { message: auth.error });
    }
    return next({ context: { ...auth } });
  });

export const userRoutes = os.meta(openapi({ prefix: "/user" })).router({
  login: os
    .route({ method: "POST", path: "/login" })
    .$context<ServerContext>()
    .input(z.object({ username: z.string(), password: z.string() }))
    .handler(async ({ context, input }) => {
      const user = await AuthStore.verifyUser(input.username, input.password);
      if (!user)
        throw new ORPCError("UNAUTHORIZED", {
          message: "Invalid username or password",
        });
      const sessionId = createSession({
        user,
        permissions: {
          admin: user.admin,
          readPaths: "*",
          writePaths: "*",
        },
      });
      setCookie(context.resHeaders, "sessionId", sessionId, {
        maxAge: sessionTimeoutMs / 1000,
        httpOnly: true,
        secure: true,
        sameSite: "strict",
      });
      return sessionId;
    }),
  getAccessibleTopLevelDirectories: os
    .route({ method: "GET", path: "/accessible-top-level-directories" })
    .use(auth)
    .handler(async () => {
      return ["f"]; // todo: fake
    }),
});

// todo: eventually move to /auth
