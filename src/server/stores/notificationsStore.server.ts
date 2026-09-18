import { env } from "#/env";
import z from "zod";
import { Store } from "./stores.server";
import { produce } from "immer";

// schema

export const Notification = z.object({
  id: z.string().default(() => crypto.randomUUID()),
  userId: z.string(),
  message: z.string(),
  origin: z.string(),
  url: z.string().optional(),
  scheduledFor: z.number().optional(),
  sent: z.boolean().default(false),
});
export type Notification = z.infer<typeof Notification>;

const NotificationsStoreSchema = z.object({
  ntfyshUrl: z
    .string()
    .default(() => `https://ntfy.sh/flies-${crypto.randomUUID()}`),
  notifications: z.array(Notification).default([]),
});

// api

const notificationsStore = await Store.fromFile(
  Bun.file(`${env.DATA_DIR}/notifications.json`),
  NotificationsStoreSchema,
  {},
);

export function getNtfyshUrl() {
  return notificationsStore.read().ntfyshUrl;
}

export function setNtfyshUrl(url: string) {
  notificationsStore.write(produce((data) => (data.ntfyshUrl = url)));
}

export function addNotification(
  notification: Omit<z.input<typeof Notification>, "id">,
) {
  const newNotification = Notification.parse(
    notification satisfies z.input<typeof Notification>,
  );
  notificationsStore.write(
    produce((data) => {
      data.notifications.push(newNotification);
    }),
  );
  return newNotification;
}

export function getNotifications() {
  return notificationsStore.read().notifications;
}

export function markNotificationAsSent(id: string) {
  notificationsStore.write(
    produce((data) => {
      const notification = data.notifications.find((n) => n.id === id);
      if (notification) {
        notification.sent = true;
      }
    }),
  );
}
