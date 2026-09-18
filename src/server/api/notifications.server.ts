import { openapi } from "@orpc/openapi";
import { ORPCError, os } from "@orpc/server";
import { auth } from "./users.server";
import z from "zod";
import {
  addNotification,
  getNotifications,
  getNtfyshUrl,
  setNtfyshUrl,
} from "../stores/notificationsStore.server";
import { hasAdminPermission } from "../permissions";

export const notificationsRoutes = os
  .meta(openapi({ prefix: "/notifications" }))
  .router({
    getNtfyshUrl: os
      .route({ method: "GET", path: "/ntfysh-url" })
      .use(auth)
      .handler(async ({ context }) => {
        if (!hasAdminPermission(context.permissions)) {
          throw new ORPCError("FORBIDDEN", {
            message: "You must be an admin to get the ntfy.sh URL.",
          });
        }
        return getNtfyshUrl();
      }),
    setNtfyshUrl: os
      .route({ method: "POST", path: "/ntfysh-url" })
      .use(auth)
      .input(z.object({ url: z.string() }))
      .handler(async ({ context, input }) => {
        if (!hasAdminPermission(context.permissions)) {
          throw new ORPCError("FORBIDDEN", {
            message: "You must be an admin to set the ntfy.sh URL.",
          });
        }
        setNtfyshUrl(input.url);
      }),
    createNotification: os
      .route({ method: "POST", path: "/create" })
      .use(auth)
      .input(
        z.object({
          message: z.string(),
          origin: z.string(),
          url: z.string().optional(),
          scheduledFor: z.number().optional(),
        }),
      )
      .handler(async ({ context, input }) => {
        if (!context.user) {
          throw new ORPCError("FORBIDDEN", {
            message: "You must be a user to create notifications.",
          });
        }
        return addNotification({
          userId: context.user.id,
          ...input,
        });
      }),
    getNotifications: os
      .route({ method: "GET", path: "/get" })
      .use(auth)
      .input(
        z.object({
          filterOrigin: z.string().optional(),
          filterUrl: z.string().optional(),
          filterUpcomingScheduled: z.boolean().optional(),
        }),
      )
      .handler(async ({ context, input }) => {
        if (!context.user) {
          throw new Error("You must be a user to get notifications.");
        }
        let notifications = getNotifications().filter(
          (notification) => notification.userId === context.user?.id,
        );
        if (input.filterOrigin) {
          notifications = notifications.filter(
            (notification) => notification.origin === input.filterOrigin,
          );
        }
        if (input.filterUrl) {
          notifications = notifications.filter(
            (notification) => notification.url === input.filterUrl,
          );
        }
        if (input.filterUpcomingScheduled) {
          notifications = notifications.filter(
            (notification) =>
              notification.scheduledFor &&
              notification.scheduledFor >= Date.now(),
          );
        }
        return notifications;
      }),
  });
