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

export async function authFromRequest(
  authHeader: string | null,
  cookieHeader: string | null,
  shareQueryParam: string | null,
): Promise<{ user?: User; privileges: Privileges } | { error: string }> {
  type AuthenticationMethod = () => Promise<
    { user?: User; privileges: Privileges } | null | { error: string }
  >;

  // try to authenticate from various sources
  const authFromAuthHeader: AuthenticationMethod = async () => {
    if (!authHeader) return null;
    if (authHeader.startsWith("Basic ")) {
      const credentials = atob(authHeader.slice("Basic ".length)).split(":");
      if (credentials.length !== 2) {
        return { error: "Invalid Basic auth header" };
      }
      const [username, password] = credentials;
      const user = AuthStore.verifyUser(username, password);
      if (!user) return { error: "Invalid username or password" };
      return {
        user,
        privileges: Privileges.forUser(user),
      };
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
  const authFromSessionCookie: AuthenticationMethod = async () => {
    if (!cookieHeader) return null;
    const sessionId = new Bun.CookieMap(cookieHeader).get("sessionId");
    if (!sessionId) return null;
    const session = getSession(sessionId);
    if (!session) return { error: "Invalid or expired session (cookie)" };
    return session;
  };
  const authFromShareQueryParam: AuthenticationMethod = async () => {
    if (!shareQueryParam) return null;
    const share = (await AuthStore.getShares()).shares.find(
      (s) => s.id === shareQueryParam,
    );
    if (!share) return { error: "Invalid share ID" };
    return {
      user: undefined,
      privileges: Privileges.forShare(share),
    };
  };
  const auth =
    (await authFromAuthHeader()) ||
    (await authFromSessionCookie()) ||
    (await authFromShareQueryParam());

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
  getAccessibleTopLevelDirectories: os
    .route({ method: "GET", path: "/accessible-top-level-directories" })
    .use(auth())
    .handler(async () => {
      return ["f"]; // todo: fake
    }),
});
