import { env } from "#/env";
import { joinPath } from "#/utils";
import type { AppInstanceInfo } from "../apps";
import type { OperationsBasedFile } from "../fullApps.server";
import type { operations, SchmierzettelData } from "./data";

type _OperationsBasedFile = OperationsBasedFile<
  typeof SchmierzettelData,
  typeof operations
>;

export const startCheckingAndSendingNotifications = (
  appInstanceInfo: AppInstanceInfo,
  operationsBasedFile: _OperationsBasedFile,
) => {
  setInterval(() => {
    checkAndSendNotifications(appInstanceInfo, operationsBasedFile);
  }, 1000 * 15); // every 15 seconds
};

async function checkAndSendNotifications(
  appInstanceInfo: AppInstanceInfo,
  operationsBasedFile: _OperationsBasedFile,
) {
  const ntfyshUrl = operationsBasedFile.read().ntfyshUrl;
  const notifications = operationsBasedFile
    .read()
    .notes.flatMap((note) =>
      note.notifications.map((notification) => ({ ...notification, note })),
    );
  for (const notification of notifications) {
    if (notification.scheduledFor && notification.scheduledFor > Date.now())
      continue;
    if (!ntfyshUrl) {
      console.warn(
        "No ntfy.sh URL configured. Cannot send notification: ",
        notification,
        notification.note,
      );
      continue;
    }
    try {
      const res = await fetch(ntfyshUrl, {
        method: "POST",
        body: notification.note.content,
        headers: {
          Click: `${env.serverUrl}/${joinPath(appInstanceInfo.path)}`,
        },
      });
      if (!res.ok) {
        throw new Error(
          `Failed to send notification to ntfy.sh: ${res.status} ${res.statusText}`,
        );
      }
    } catch (e) {
      throw new Error(`Failed to send notification to ntfy.sh: ${e}`);
    }
    operationsBasedFile.applyOperation("markNotificationSent", {
      noteId: notification.note.id,
      scheduledFor: notification.scheduledFor,
    });
  }
}
