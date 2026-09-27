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
import { IconEdit, IconPlus } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { Masonry } from "masonic";
import { useSchmierzettelData } from "./app";
import { Note, Notification } from "./data";
import { useSearch } from "@tanstack/react-router";
import z from "zod";
import { EditableNotificationsList, NtfyshConfigurer } from "./notifications";

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
  const search = useSearch({ strict: false });
  const parsedSearch = z
    .object({ noteId: z.string().optional() })
    .safeParse(search).data;
  const editDialogOpenFromSearch = parsedSearch?.noteId === note.id;

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
          isOpen={editDialogOpen || editDialogOpenFromSearch}
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
        <EditableNotificationsList
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
