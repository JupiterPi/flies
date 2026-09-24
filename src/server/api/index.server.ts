import { os } from "@orpc/server";
import { fsRoutes } from "./fs.server";
import { userRoutes } from "./users.server";
import { sharesRoutes } from "./shares.server";
import { fullAppRoutes } from "#/apps/fullApps.server";
import { appsRoutes } from "#/apps/runningAppsManager";

export const router = {
  hello: os.route({ method: "GET", path: "/hello" }).handler(async () => {
    return "Hello, Flies!";
  }),
  fs: fsRoutes,
  user: userRoutes,
  shares: sharesRoutes,
  apps: appsRoutes,
  fullApps: fullAppRoutes,
};
export type router = typeof router;
