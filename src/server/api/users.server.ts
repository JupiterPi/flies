import { ORPCError, os } from "@orpc/server";
import { openapi } from "@orpc/openapi";
import type { ResponseHeadersHandlerPluginContext } from "@orpc/server/plugins";
import type { RequestHeadersHandlerPluginContext } from "@orpc/server/plugins";
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
  createSession: os
    .route({ method: "POST", path: "/create-session" })
    .$context<ServerContext>()
    .use(auth)
    .handler(({ context }) => {
      const user = context.user;
      if (!user) throw new ORPCError("UNAUTHORIZED");
      const sessionId = createSession(user);
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
