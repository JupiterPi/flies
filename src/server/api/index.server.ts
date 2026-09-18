import { os } from "@orpc/server";
import { fsRoutes } from "./fs.server";
import { userRoutes } from "./users.server";
import { sharesRoutes } from "./shares.server";
import { notificationsRoutes } from "./notifications.server";

export const router = {
  hello: os.route({ method: "GET", path: "/hello" }).handler(async () => {
    return "Hello, Flies!";
  }),
  fs: fsRoutes,
  user: userRoutes,
  shares: sharesRoutes,
  notifications: notificationsRoutes,
};
export type router = typeof router;
