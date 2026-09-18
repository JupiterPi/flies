import { Button } from "#/components/ui/button";
import { Card, CardContent, CardFooter } from "#/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "#/components/ui/dialog";
import { Textarea } from "#/components/ui/textarea";
import {
  IconBellPlus,
  IconBellRinging,
  IconEdit,
  IconPlus,
} from "@tabler/icons-react";
import { useEffect, useState } from "react";
import z from "zod";
import { Masonry } from "masonic";
import { Toggle } from "#/components/ui/toggle";
import { useServer } from "#/client/orpc";
import { useLocation } from "@tanstack/react-router";
import { produce } from "immer";
import { Note, useSchmierzettelData } from "./Schmierzettel";

export function SchmierzettelUI() {
  return <SchmierzettelNotes />;
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
  const { client } = useServer();
  const location = useLocation();
  const { data, setData } = useSchmierzettelData();
  const [noteTextInput, setNoteTextInput] = useState("");
  useEffect(() => {
    if (isOpen) {
      setNoteTextInput(existingNote?.content ?? "");
    }
  }, [isOpen]);
  const notificationIntervals: Record<string, number> = {
    "10s": 10 * 1000,
    "5m": 5 * 60 * 1000,
    "10m": 10 * 60 * 1000,
    "15m": 15 * 60 * 1000,
    "30m": 30 * 60 * 1000,
    "1h": 1 * 60 * 60 * 1000,
    "3h": 3 * 60 * 60 * 1000,
  };
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
        {existingNote === null && (
          <div className="flex gap-2 flex-wrap">
            {Object.entries(notificationIntervals).map(([interval, _]) => (
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
                  const note = Note.parse({
                    ...existingNote,
                    content: noteTextInput,
                    createdAt: existingNote?.createdAt ?? Date.now(),
                    modifiedAt: Date.now(),
                  } satisfies z.input<typeof Note>);
                  for (const notification of notifications) {
                    client.notifications.createNotification({
                      message: noteTextInput,
                      origin: `Schmierzettel note ${note.id} at ${location.pathname}`,
                      url: window.location.href, // todo: highlight note by id
                      scheduledFor:
                        Date.now() + notificationIntervals[notification],
                    });
                  }
                  setData(
                    produce(data, (data) => {
                      data.notes = data.notes.filter(
                        (n) => n.id !== existingNote?.id,
                      );
                      data.notes.push(note);
                    }),
                  );
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
