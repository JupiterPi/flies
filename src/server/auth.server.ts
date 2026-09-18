import type { User } from "./authStore.server";
import * as AuthStore from "./authStore.server";
import { defaultPermissions, type UserPermissions } from "./permissions";

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

export function createSession({
  user,
  permissions,
}: {
  user: User;
  permissions: UserPermissions;
}) {
  const sessionId = crypto.randomUUID();
  sessions.set(sessionId, { sessionStart: new Date(), user, permissions });
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
  const authFromSessionHeader: AuthenticationMethod = async () => {
    if (!authHeader) return null;
    if (!authHeader.startsWith("Bearer ")) {
      return { error: "Invalid Authorization header: Expected Bearer token" };
    }
    const session = getSession(authHeader.slice("Bearer ".length));
    if (!session) return { error: "Invalid or expired session (Auth header)" };
    return session;
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
    (await authFromSessionHeader()) ||
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
