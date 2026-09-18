import {
  getNotifications,
  getNtfyshUrl,
  markNotificationAsSent,
  type Notification,
} from "./stores/notificationsStore.server";

export function periodicallyCheckAndSendNotifications() {
  setInterval(() => {
    checkAndSendNotifications();
  }, 1000 * 15); // every 15 seconds // todo: might change notifier interval later
}

function checkAndSendNotifications() {
  for (const notification of getNotifications()) {
    if (notification.sent) continue;
    if (notification.scheduledFor && notification.scheduledFor > Date.now())
      continue;
    sendNotification(notification);
    markNotificationAsSent(notification.id);
  }
}

async function sendNotification(notification: Notification) {
  const ntfyshUrl = getNtfyshUrl();
  if (!ntfyshUrl) {
    console.warn(
      "No ntfy.sh URL configured. Cannot send notification: ",
      notification,
    );
    return;
  }
  try {
    const res = await fetch(ntfyshUrl, {
      method: "POST",
      body: notification.message,
      headers: {
        Click: notification.url || "",
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
}
