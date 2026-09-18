import type { User } from "./stores/authStore.server";
import * as AuthStore from "./stores/authStore.server";
import { defaultPermissions, type UserPermissions } from "./permissions";

function getUserPermissions(user: User): UserPermissions {
  return {
    admin: user.admin,
    readPaths: "*",
    writePaths: "*",
  };
}

// sessions

const sessions = new Map<
  string,
  { sessionStart: Date; user: User; permissions: UserPermissions }
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
    permissions: getUserPermissions(user),
  });
  return sessionId;
}

// authenticate

export async function authFromRequest(
  authHeader: string | null,
  cookieHeader: string | null,
  shareQueryParam: string | null,
): Promise<{ user?: User; permissions: UserPermissions } | { error: string }> {
  type AuthenticationMethod = () => Promise<
    { user?: User; permissions: UserPermissions } | null | { error: string }
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
        permissions: getUserPermissions(user),
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
      permissions: { admin: false, readPaths: [share.path], writePaths: [] },
    };
  };
  const auth =
    (await authFromAuthHeader()) ||
    (await authFromSessionCookie()) ||
    (await authFromShareQueryParam());

  if (auth && "error" in auth) {
    return { error: auth.error };
  }

  // always allow reading from public shares
  const permissions = auth ? auth.permissions : defaultPermissions;
  const publicShares = (await AuthStore.getShares()).publicShares;
  permissions.readPaths =
    permissions.readPaths === "*"
      ? "*"
      : [...permissions.readPaths, ...publicShares.map((s) => s.path)];

  return { user: auth?.user, permissions };
}
