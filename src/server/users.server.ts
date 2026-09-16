import z from "zod";
import { ORPCError, os } from "@orpc/server";
import { openapi } from "@orpc/openapi";
import { isAdminPassword, signData, unsignData } from "#/data/secrets.server";
import { v4 as uuidv4 } from "uuid";
import type { ResponseHeadersHandlerPluginContext } from "@orpc/server/plugins";
import type { RequestHeadersHandlerPluginContext } from "@orpc/server/plugins";

interface ServerContext
  extends
    ResponseHeadersHandlerPluginContext,
    RequestHeadersHandlerPluginContext {}

export const UserId = z.string().default(() => uuidv4());
export type UserId = z.infer<typeof UserId>;

async function getUserKey(userId: UserId) {
  return await signData(userId);
}

async function readUserKey(userKey: string): Promise<UserId | null> {
  return (await unsignData(userKey)) ?? null;
}

const sessions = new Map<string, { userId: UserId; sessionStart: Date }>();
const sessionTimeout = 1000 * 60 * 60 * 24; // 24 hours

export const auth = os
  .$context<ServerContext>()
  .middleware(async ({ context, next }) => {
    const authHeader = context.reqHeaders?.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      throw new ORPCError("UNAUTHORIZED");
    }
    const sessionId = authHeader.slice("Bearer ".length);
    const session = sessionId ? (sessions.get(sessionId) ?? null) : null;
    if (session === null) {
      throw new ORPCError("UNAUTHORIZED");
    }
    if (session.sessionStart.getTime() + sessionTimeout < Date.now()) {
      sessions.delete(sessionId);
      throw new ORPCError("UNAUTHORIZED", { message: "Session expired" });
    }
    return next({
      context: { userId: session.userId },
    });
  });

export const userRoutes = os.meta(openapi({ prefix: "/user" })).router({
  createUserKey: os
    .route({ method: "POST", path: "/create-user-key" })
    .input(z.object({ adminPassword: z.string(), userId: UserId }))
    .handler(async ({ input }) => {
      if (!(await isAdminPassword(input.adminPassword))) {
        throw new ORPCError("UNAUTHORIZED", {
          message: "Invalid admin password",
        });
      }
      const userKey = await getUserKey(input.userId);
      return { userKey };
    }),
  login: os
    .route({ method: "POST", path: "/login" })
    .$context<ServerContext>()
    .input(z.object({ userKey: z.string() }))
    .handler(async ({ input }) => {
      const userId = await readUserKey(input.userKey);
      if (!userId) return null;
      const sessionId = uuidv4();
      sessions.set(sessionId, { userId, sessionStart: new Date() });
      return sessionId;
    }),
  getAccessibleTopLevelDirectories: os
    .route({ method: "GET", path: "/accessible-top-level-directories" })
    .use(auth)
    .handler(async () => {
      return ["f"]; // todo mocked data
    }),
});
