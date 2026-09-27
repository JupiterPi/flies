import { InlineEditInput } from "#/components/inline-edit-input";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemMedia,
  ItemTitle,
} from "#/components/ui/item";
import { Button } from "#/components/ui/button";
import {
  formatFutureTimestampRelative,
  joinPath,
  parseNaturalLanguageDate,
} from "#/utils";
import { IconBell, IconBellCheck, IconBellOff } from "@tabler/icons-react";
import { Notification, operations, SchmierzettelData } from "./schema";
import { createServerOnlyFn } from "@tanstack/react-start";
import type { AppInstanceInfo } from "../apps";
import type { OperationsBasedFile } from "../fullApps.server";
import { env } from "#/env";
import { Field, FieldLabel } from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import { useSchmierzettelData } from "./app";
import { useState } from "react";
import {
  DialogFooter,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "#/components/ui/dialog";
import { Badge } from "#/components/ui/badge";

// sending notifications

export const startCheckingAndSendingNotifications = createServerOnlyFn(
  (
    abortSignal: AbortSignal,
    appInstanceInfo: AppInstanceInfo,
    operationsBasedFile: OperationsBasedFile<
      typeof SchmierzettelData,
      typeof operations
    >,
  ) => {
    const checkAndSendNotifications = async (
      appInstanceInfo: AppInstanceInfo,
      operationsBasedFile: OperationsBasedFile<
        typeof SchmierzettelData,
        typeof operations
      >,
    ) => {
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
              Click: `${env.serverUrl}/${joinPath(appInstanceInfo.path)}?note=${notification.note.id}`,
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
    };

    const interval = setInterval(() => {
      checkAndSendNotifications(appInstanceInfo, operationsBasedFile);
    }, 1000 * 15); // every 15 seconds // todo tmp
    abortSignal.addEventListener("abort", () => {
      clearInterval(interval);
    });
  },
);

// ui

export function NtfyshConfigurer() {
  const { data, dispatchOperation } = useSchmierzettelData();
  const [ntfyshUrlInput, setNtfyshUrlInput] = useState(data.ntfyshUrl ?? "");
  return (
    <Item variant="outline" size="sm" className="max-w-md">
      <ItemMedia>
        {data.ntfyshUrl ? (
          <IconBellCheck className="size-5" />
        ) : (
          <IconBellOff className="size-5" />
        )}
      </ItemMedia>
      <ItemContent>
        <ItemTitle>
          {data.ntfyshUrl
            ? `Sending notifications to ${new URL(data.ntfyshUrl).hostname}`
            : "Not connected to a notification service"}
        </ItemTitle>
      </ItemContent>
      <ItemActions>
        <Dialog>
          <DialogTrigger
            render={
              <Button
                variant="outline"
                size="sm"
                onClick={() => setNtfyshUrlInput(data.ntfyshUrl ?? "")}
              >
                Configure
              </Button>
            }
          />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Configure ntfy.sh</DialogTitle>
              <DialogDescription>
                Schmierzettel can send notifications via{" "}
                <a href="https://ntfy.sh" target="_blank">
                  ntfy.sh
                </a>
                , which you can also self-host. Configure the instance and topic
                for notifications below.
              </DialogDescription>
            </DialogHeader>
            <Field>
              <FieldLabel>ntfy.sh URL</FieldLabel>
              <Input
                type="url"
                value={ntfyshUrlInput}
                onChange={(e) => setNtfyshUrlInput(e.target.value)}
                placeholder="https://ntfy.sh/your-topic"
                className="input input-bordered w-full"
              />
            </Field>
            <DialogFooter>
              <DialogClose render={<Button variant="outline">Cancel</Button>} />
              {data.ntfyshUrl !== null && (
                <DialogClose
                  render={
                    <Button
                      variant="destructive"
                      onClick={() =>
                        dispatchOperation("setNtfyshUrl", { ntfyshUrl: null })
                      }
                    >
                      Disconnect
                    </Button>
                  }
                />
              )}
              <DialogClose
                render={
                  <Button
                    type="submit"
                    disabled={
                      ntfyshUrlInput === data.ntfyshUrl ||
                      ntfyshUrlInput.trim() === ""
                    }
                    onClick={() => {
                      dispatchOperation("setNtfyshUrl", {
                        ntfyshUrl: ntfyshUrlInput.trim(),
                      });
                    }}
                  >
                    Save
                  </Button>
                }
              />
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </ItemActions>
    </Item>
  );
}

export function EditableNotificationsList({
  notifications,
  setNotifications,
}: {
  notifications: Notification[];
  setNotifications: (value: Notification[]) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      {notifications.map((notification) => (
        <RemovableNotification
          key={notification.scheduledFor}
          notification={notification}
          onRemove={() => {
            setNotifications(
              notifications.filter(
                (n) => n.scheduledFor !== notification.scheduledFor,
              ),
            );
          }}
        />
      ))}
      <NotificationAdder
        addNotification={(notification) => {
          if (
            notifications.some(
              (n) => n.scheduledFor === notification.scheduledFor,
            )
          ) {
            return; // notification already exists for this time
          }
          setNotifications([...notifications, notification]);
        }}
      />
    </div>
  );
}

function RemovableNotification({
  notification,
  onRemove,
}: {
  notification: Notification;
  onRemove: () => void;
}) {
  const scheduledForStr = formatFutureTimestampRelative(
    notification.scheduledFor,
  );

  return (
    <Item variant="outline" size="xs">
      <ItemMedia variant="icon">
        <IconBell />
      </ItemMedia>
      <ItemContent>
        <ItemTitle>{scheduledForStr}</ItemTitle>
      </ItemContent>
      <ItemActions>
        <Button variant="outline" size="sm" onClick={onRemove}>
          Remove
        </Button>
      </ItemActions>
    </Item>
  );
}

function NotificationAdder({
  addNotification,
}: {
  addNotification: (notification: Notification) => void;
}) {
  return (
    <InlineEditInput
      placeholder="Add Notification"
      value=""
      onSave={(value) => {
        const scheduledFor = parseNaturalLanguageDate(value)?.getTime();
        if (scheduledFor) {
          addNotification({ scheduledFor });
          console.log("Scheduled notification for", new Date(scheduledFor));
        } else {
          console.log("Could not parse date from input:", value);
        }
      }}
    />
  );
}

export function NotificationBadges({
  notifications,
}: {
  notifications: Notification[];
}) {
  const notificationsStr = notifications.map((notification) =>
    formatFutureTimestampRelative(notification.scheduledFor),
  );
  return (
    <div className="flex flex-wrap gap-2">
      {notificationsStr.map((str, i) => (
        <Badge key={i} variant="outline">
          <IconBell />
          {str}
        </Badge>
      ))}
    </div>
  );
}
