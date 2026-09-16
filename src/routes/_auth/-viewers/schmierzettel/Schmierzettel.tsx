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
import { Field, FieldLabel } from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemMedia,
  ItemTitle,
} from "#/components/ui/item";
import { Textarea } from "#/components/ui/textarea";
import {
  IconBellCheck,
  IconBellOff,
  IconBellPlus,
  IconBellRinging,
  IconEdit,
  IconPlus,
} from "@tabler/icons-react";
import { createContext, useContext, useEffect, useState } from "react";
import z from "zod";
import { Masonry } from "masonic";
import { Toggle } from "#/components/ui/toggle";
import { toast } from "#/components/ui/toast";

export const SchmierzettelNote = z.object({
  timestamp: z.number(),
  text: z.string(),
});
export type SchmierzettelNote = z.infer<typeof SchmierzettelNote>;
export const SchmierzettelData = z.object({
  _: z.literal("https://github.com/JupiterPi/flies Schmierzettel data v1"),
  ntfyshUrl: z.url().nullable(),
  notes: z.array(SchmierzettelNote),
  archivedNotes: z.array(SchmierzettelNote),
});
export type SchmierzettelData = z.infer<typeof SchmierzettelData>;
export const newSchmierzettelData: SchmierzettelData = {
  _: "https://github.com/JupiterPi/flies Schmierzettel data v1",
  ntfyshUrl: null,
  notes: [],
  archivedNotes: [],
};

export default function Schmierzettel({
  data,
  setData,
}: {
  data: SchmierzettelData;
  setData: (data: SchmierzettelData) => void;
}) {
  return (
    <SchmierzettelDataContext value={{ data, setData }}>
      <NtfyshConfigurer />
      <SchmierzettelNotes />
    </SchmierzettelDataContext>
  );
}

export const SchmierzettelDataContext = createContext<{
  data: SchmierzettelData;
  setData: (data: SchmierzettelData) => void;
} | null>(null);

export function useSchmierzettelData() {
  const context = useContext(SchmierzettelDataContext);
  if (!context) {
    throw new Error(
      "useSchmierzettelData must be used within a SchmierzettelDataProvider",
    );
  }
  return context;
}

function NtfyshConfigurer() {
  const { data, setData } = useSchmierzettelData();
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
                      onClick={() => setData({ ...data, ntfyshUrl: null })}
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
                      setData({ ...data, ntfyshUrl: ntfyshUrlInput.trim() });
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
    <div className="typeset">
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

function NoteCard({ note }: { note: SchmierzettelNote }) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  return (
    <Card size="sm" className="w-full h-fit">
      <CardContent className="flex-1 overflow-y-auto">
        <div className="whitespace-pre-line">{note.text}</div>
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
  existingNote: SchmierzettelNote | null;
}) {
  const { data, setData } = useSchmierzettelData();
  const [noteTextInput, setNoteTextInput] = useState("");
  useEffect(() => {
    if (isOpen) {
      setNoteTextInput(existingNote?.text ?? "");
    }
  }, [isOpen]);
  const notificationIntervals = ["10s", "5m", "10m", "15m", "30m", "1h", "3h"];
  const [notifications, setNotifications] = useState<string[]>([]);
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
        {data.ntfyshUrl !== null && existingNote === null && (
          <div className="flex gap-2 flex-wrap">
            {notificationIntervals.map((interval) => (
              <Toggle
                key={interval}
                variant="outline"
                onClick={() => {
                  if (notifications.includes(interval)) {
                    setNotifications(
                      notifications.filter((n) => n !== interval),
                    );
                  } else {
                    setNotifications([...notifications, interval]);
                  }
                }}
              >
                {notifications.includes(interval) ? (
                  <IconBellRinging />
                ) : (
                  <IconBellPlus />
                )}
                {interval}
              </Toggle>
            ))}
          </div>
        )}
        <DialogFooter>
          <DialogClose render={<Button variant="outline">Cancel</Button>} />
          {existingNote && (
            <DialogClose
              render={
                <Button
                  variant="destructive"
                  onClick={() => {
                    setData({
                      ...data,
                      notes: [...data.notes.filter((n) => n !== existingNote)],
                    });
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
                  const note = {
                    ...existingNote,
                    text: noteTextInput,
                    timestamp: Date.now(),
                  };
                  if (notifications.length > 0) {
                    let success = true;
                    for (const notificationInterval of notifications) {
                      try {
                        const res = await fetch(data.ntfyshUrl!, {
                          method: "POST",
                          body: note.text,
                          headers: {
                            At: notificationInterval,
                            Click: window.location.href,
                          },
                        });
                        if (!res.ok) {
                          console.error(
                            `Failed to send notification for interval ${notificationInterval}: ${res.status} ${res.statusText}`,
                          );
                          toast.add({
                            title: "Notification Failed",
                            description: `Failed to send notification for interval ${notificationInterval}: ${res.status} ${res.statusText}`,
                            type: "error",
                          });
                          success = false;
                        }
                      } catch (e) {
                        console.error(
                          `Failed to send notification for interval ${notificationInterval}: ${e}`,
                        );
                        toast.add({
                          title: "Notification Failed",
                          description: `Failed to send notification for interval ${notificationInterval}: ${e}`,
                          type: "error",
                        });
                        success = false;
                      }
                    }
                    if (success) {
                      toast.add({
                        title: `Notifications sent for ${notifications.join(
                          ", ",
                        )}`,
                        type: "success",
                      });
                    }
                  }
                  setData({
                    ...data,
                    notes: [
                      ...data.notes.filter((n) => n !== existingNote),
                      note,
                    ],
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
  );
}
