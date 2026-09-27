import { Button } from "#/components/ui/button";
import { Card, CardContent, CardFooter } from "#/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "#/components/ui/dialog";
import { Textarea } from "#/components/ui/textarea";
import {
  IconBell,
  IconBellCheck,
  IconBellOff,
  IconEdit,
  IconPlus,
} from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { Masonry } from "masonic";
import { useSchmierzettelData } from "./app";
import { Note, Notification } from "./data";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemMedia,
  ItemTitle,
} from "#/components/ui/item";
import { Field, FieldLabel } from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import { InlineEditInput } from "#/components/inline-edit-input";
import {
  formatFutureTimestampRelative,
  parseNaturalLanguageDate,
} from "#/utils";

export function SchmierzettelUI() {
  return (
    <>
      <div className="mt-2">
        <NtfyshConfigurer />
      </div>
      <SchmierzettelNotes />
    </>
  );
}

function NtfyshConfigurer() {
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

function SchmierzettelNotes() {
  const { data } = useSchmierzettelData();
  return (
    <div className="typeset mt-4">
      <h1>Notes</h1>
      {data.notes.length === 0 && (
        <div className="text-muted-foreground italic">No notes yet.</div>
      )}
      <div className="my-4">
        <CreateNoteButton />
      </div>
      <div className="flex flex-wrap gap-4">
        <Masonry
          key={data.notes.length} // trigger re-render when notes change, see error that is otherwise thrown
          items={data.notes}
          columnGutter={16}
          columnWidth={300}
          overscanBy={5}
          render={(data) => <NoteCard note={data.data} />}
        ></Masonry>
      </div>
    </div>
  );
}

function NoteCard({ note }: { note: Note }) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  return (
    <Card size="sm" className="w-full h-fit">
      <CardContent className="flex-1 overflow-y-auto">
        <div className="whitespace-pre-line">{note.content}</div>
      </CardContent>
      <CardFooter className="justify-end">
        <Button variant="outline" onClick={() => setEditDialogOpen(true)}>
          <IconEdit />
          Edit
        </Button>
        <CaptureOrEditNoteDialog
          isOpen={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          existingNote={note}
        />
      </CardFooter>
    </Card>
  );
}

function CreateNoteButton() {
  const [dialogOpen, setDialogOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setDialogOpen(true)}>
        <IconPlus />
        Capture Note
      </Button>
      <CaptureOrEditNoteDialog
        isOpen={dialogOpen}
        onOpenChange={setDialogOpen}
        existingNote={null}
      />
    </>
  );
}

function CaptureOrEditNoteDialog({
  isOpen,
  onOpenChange,
  existingNote,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  existingNote: Note | null;
}) {
  const { dispatchOperation } = useSchmierzettelData();
  const [noteTextInput, setNoteTextInput] = useState("");
  useEffect(() => {
    if (isOpen) {
      setNoteTextInput(existingNote?.content ?? "");
    }
  }, [isOpen]);
  const [notifications, setNotifications] = useState<Notification[]>(
    existingNote?.notifications || [],
  );
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{existingNote ? "Edit" : "Capture"} Note</DialogTitle>
        </DialogHeader>
        <Textarea
          placeholder="Enter your note here"
          value={noteTextInput}
          onChange={(e) => setNoteTextInput(e.target.value)}
        />
        <NotificationsList
          notifications={notifications}
          setNotifications={setNotifications}
        />
        <DialogFooter>
          <DialogClose render={<Button variant="outline">Cancel</Button>} />
          {existingNote && (
            <DialogClose
              render={
                <Button
                  variant="destructive"
                  onClick={() => {
                    dispatchOperation("deleteNote", { id: existingNote.id });
                  }}
                >
                  Delete
                </Button>
              }
            />
          )}
          <DialogClose
            render={
              <Button
                disabled={noteTextInput.trim() === ""}
                onClick={async () => {
                  if (existingNote) {
                    dispatchOperation("updateNote", {
                      id: existingNote.id,
                      content: noteTextInput,
                      timestamp: Date.now(),
                      notifications,
                    });
                  } else {
                    dispatchOperation("addNote", {
                      content: noteTextInput,
                      timestamp: Date.now(),
                      notifications,
                    });
                  }
                }}
              >
                Save
              </Button>
            }
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NotificationsList({
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
  /* const notificationIntervals = [
    { label: "5s", value: 5 * 1000 },
    { label: "10s", value: 10 * 1000 },
    { label: "5m", value: 5 * 60 * 1000 },
    { label: "10m", value: 10 * 60 * 1000 },
    { label: "15m", value: 15 * 60 * 1000 },
    { label: "30m", value: 30 * 60 * 1000 },
    { label: "1h", value: 1 * 60 * 60 * 1000 },
    { label: "3h", value: 3 * 60 * 60 * 1000 },
  ] as const; */
  /* submit({ scheduledFor: 0 }); // todo tnp */

  // return (
  //   <Combobox
  //     items={notificationIntervals}
  //     itemToStringValue={(interval) => interval.label}
  //   >
  //     <ComboboxInput placeholder="Add Notification" />
  //     <ComboboxContent>
  //       <ComboboxEmpty>No preset found.</ComboboxEmpty>{" "}
  //       {/* todo: accept and parse human time string */}
  //       <ComboboxList>
  //         {(item) => {
  //           <ComboboxItem key={item.label} value={item}>
  //             {item.label}
  //           </ComboboxItem>;
  //         }}
  //       </ComboboxList>
  //     </ComboboxContent>
  //   </Combobox>
  // );

  // todo: remove ^

  /* return <Input placeholder="Add Notification" />; */
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
