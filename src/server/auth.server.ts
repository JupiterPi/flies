import type { User } from "./stores/authStore.server";
import * as AuthStore from "./stores/authStore.server";
import { Privileges, type Permission } from "./permissions";
import "@orpc/openapi/extensions/route";
import type {
  RequestHeadersHandlerPluginContext,
  ResponseHeadersHandlerPluginContext,
} from "@orpc/server/plugins";
import { ORPCError, os } from "@orpc/server";
import { openapi } from "@orpc/openapi";
import { setCookie } from "@orpc/server/helpers";
import z from "zod";
import { Dashboard } from "./userConfiguration";
import { MemoryRateLimiter } from "@orpc/ratelimit/memory";
import { env } from "#/env";

// sessions

const sessions = new Map<
  string,
  { sessionStart: Date; user: User; privileges: Privileges }
>();

export const sessionTimeoutMs = 1000 * 60 * 60 * 24; // 24 hours

function getSession(sessionId: string) {
  const session = sessions.get(sessionId);
  if (!session) return null;
  if (session.sessionStart.getTime() + sessionTimeoutMs < Date.now()) {
    sessions.delete(sessionId);
    return null;
  }
  return session;
}

export function createSession(user: User) {
  const sessionId = crypto.randomUUID();
  sessions.set(sessionId, {
    sessionStart: new Date(),
    user,
    privileges: Privileges.forUser(user),
  });
  return sessionId;
}

// authenticate

/**
 * Ways to authenticate:
 * - Authorization header with Basic scheme (<username>:<password>) for user
 * - Authorization header with Basic scheme ("share":<share token>) for share
 * - there may be multiple Basic scheme authorizations, like btoa(<username>:<password>,"share":<share token>,"share":<share token>)
 * - Authorization header with Bearer scheme (<session id>) for session
 * - Cookie header with sessionId cookie (<session id>) for session
 * - Query param "share" with share token for share
 */
export async function authFromRequest(
  authHeader: string | null,
  cookieHeader: string | null,
  shareQueryParam: string | null,
): Promise<{ user?: User; privileges: Privileges } | { error: string }> {
  type AuthenticationMethod = () =>
    { user?: User; privileges: Privileges } | null | { error: string };

  // try to authenticate from various sources
  const authFromAuthHeader: AuthenticationMethod = () => {
    if (!authHeader) return null;
    if (authHeader.startsWith("Basic ")) {
      const multipleCredentials = atob(authHeader.slice("Basic ".length))
        .split(",")
        .map((c) => c.split(":"));
      let user = undefined;
      let privileges = Privileges.unauthenticated();
      for (const credentials of multipleCredentials) {
        if (credentials.length !== 2) {
          return { error: "Invalid Basic auth header" };
        }
        const [username, password] = credentials;
        if (username === "share") {
          const share = AuthStore.resolveShareToken(password);
          if (!share) continue;
          privileges = Privileges.combine([
            privileges,
            Privileges.forShare(share),
          ]);
        } else {
          const u = AuthStore.verifyUser(username, password);
          if (!u) continue;
          if (user) return { error: "Multiple user credentials provided" };
          user = u;
          privileges = Privileges.combine([privileges, Privileges.forUser(u)]);
        }
      }
      if (user || privileges !== Privileges.unauthenticated()) {
        return { user, privileges };
      }
      return { error: "Couldn't authenticate with provided credentials" };
    }
    if (authHeader.startsWith("Bearer ")) {
      const session = getSession(authHeader.slice("Bearer ".length));
      if (!session)
        return { error: "Invalid or expired session (Auth header)" };
      return session;
    }
    return {
      error:
        "Invalid Authorization header: Expected Basic (with username/password) or Bearer (with session id) scheme",
    };
  };
  const authFromSessionCookie: AuthenticationMethod = () => {
    if (!cookieHeader) return null;
    const sessionId = new Bun.CookieMap(cookieHeader).get("sessionId");
    if (!sessionId) return null;
    const session = getSession(sessionId);
    if (!session) return { error: "Invalid or expired session (cookie)" };
    return session;
  };
  const authFromShareQueryParam: AuthenticationMethod = () => {
    if (!shareQueryParam) return null;
    const share = AuthStore.resolveShareToken(shareQueryParam);
    if (!share) return { error: "Invalid share query param" };
    return {
      user: undefined,
      privileges: Privileges.forShare(share),
    };
  };
  const auth =
    authFromAuthHeader() ||
    authFromSessionCookie() ||
    authFromShareQueryParam();

  if (auth && "error" in auth) {
    return { error: auth.error };
  }

  return {
    user: auth?.user,
    privileges: auth?.privileges || Privileges.unauthenticated(),
  };
}

// middlewares

interface ServerContext
  extends
    ResponseHeadersHandlerPluginContext,
    RequestHeadersHandlerPluginContext {}

export const auth = (...requiredPermissions: Permission[]) =>
  os.$context<ServerContext>().middleware(async ({ context, next }) => {
    const auth = await authFromRequest(
      context.reqHeaders?.get("Authorization") ?? null,
      context.reqHeaders?.get("Cookie") ?? null,
      null,
    );
    if ("error" in auth) {
      throw new ORPCError("UNAUTHORIZED", { message: auth.error });
    }

    for (const requiredPermission of Array.isArray(requiredPermissions)
      ? requiredPermissions
      : [requiredPermissions]) {
      assertPermission(auth.privileges, requiredPermission);
    }

    return next({ context: { ...auth } });
  });

export const requireUser = os
  .$context<{ user?: User }>()
  .middleware(async ({ context, next }) => {
    if (!context.user) {
      throw new ORPCError("FORBIDDEN", {
        message: "You must be a user to access this route.",
      });
    }
    return next({ context: { user: context.user } });
  });

export function assertPermission(
  privileges: Privileges,
  permission: Permission,
) {
  if (!permission.check(privileges)) {
    throw new ORPCError("FORBIDDEN", {
      message: `You are missing the required permission: ${permission.description}`,
    });
  }
}

// routes

const rateLimiter = new MemoryRateLimiter({
  maxRequests: 10,
  window: 1000 * 60, // 1 minute
});

export const userRoutes = os.meta(openapi({ prefix: "/user" })).router({
  createSession: os
    .route({ method: "POST", path: "/create-session" })
    .$context<ServerContext>()
    .use(auth())
    .use(requireUser)
    .handler(({ context }) => {
      const sessionId = createSession(context.user);
      setCookie(context.resHeaders, "sessionId", sessionId, {
        maxAge: sessionTimeoutMs / 1000,
        httpOnly: true,
        secure: true,
        sameSite: "strict",
      });
      return sessionId;
    }),
  getDashboard: os
    .route({ method: "GET", path: "/dashboard" })
    .use(auth())
    .use(requireUser)
    .handler(async ({ context }) => {
      return context.user.dashboard;
    }),
  setDashboard: os
    .route({ method: "POST", path: "/dashboard" })
    .use(auth())
    .use(requireUser)
    .input(z.object({ dashboard: Dashboard }))
    .handler(async ({ context, input }) => {
      AuthStore.setDashboard(context.user.id, input.dashboard);
    }),
  getShareTokenForPathOrParent: os
    .$context<ServerContext>()
    .route({ method: "GET", path: "/share-token-for-path-or-parent" })
    .input(z.object({ path: z.string(), sharePassword: z.string() }))
    .handler(async ({ context, input }) => {
      if (env.rateLimitingHeader !== "") {
        const rateLimitKey = context.reqHeaders?.get(env.rateLimitingHeader);
        if (!rateLimitKey) {
          throw new ORPCError("TOO_MANY_REQUESTS", {
            message: `Rate limiting header ${env.rateLimitingHeader} is not set.`,
          });
        }
        const rateLimitStatus = await rateLimiter.limit(
          rateLimitKey + " getShareTokenForPathOrParent",
          {
            weight: 2,
          },
        );
        if (!rateLimitStatus.success) {
          throw new ORPCError("TOO_MANY_REQUESTS", {
            data: {
              limit: rateLimitStatus.limit,
              remaining: rateLimitStatus.remaining,
              reset: rateLimitStatus.reset,
            },
          });
        }
      }

      return AuthStore.getShareTokenForPathOrParent(
        input.path,
        input.sharePassword,
      );
      // todo: must be rate limited!
    }),
});
