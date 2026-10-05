import { Button } from "#/components/ui/button";
import { Card, CardContent, CardFooter } from "#/components/ui/card";
import { Textarea } from "#/components/ui/textarea";
import { IconPlus } from "@tabler/icons-react";
import { useState } from "react";
import { Masonry } from "masonic";
import { useSchmierzettelData } from "./app";
import { Note, Notification } from "./schema";
import { useNavigate, useSearch } from "@tanstack/react-router";
import z from "zod";
import {
  EditableNotificationsList,
  NotificationBadges,
  NtfyshConfigurer,
} from "./notifications";

export function SchmierzettelUI() {
  const search = useSearch({ strict: false });
  const parsedSearch = z
    .object({
      newNote: z.string().optional(),
      note: z.string().optional(),
    })
    .safeParse(search).data;
  const navigation =
    parsedSearch?.newNote === ""
      ? { page: "note", existingNoteId: undefined }
      : parsedSearch?.note
        ? { page: "note", existingNoteId: parsedSearch.note }
        : { page: "home" };

  const _navigate = useNavigate();
  const navigateToHome = () =>
    _navigate({ to: "." /* for looser type checking on search */ });
  const navigateToNewNote = () =>
    // @ts-expect-error: search params are not validated here
    _navigate({ to: ".", search: { newNote: "" } });
  const navigateToNote = (noteId: string | null) =>
    _navigate({
      to: ".",
      // @ts-expect-error: search params are not validated here
      search: { note: noteId ?? undefined },
    });

  const { data } = useSchmierzettelData();

  if (navigation.page === "home") {
    return (
      <>
        <div className="mt-2">
          <NtfyshConfigurer />
        </div>
        <SchmierzettelNotes
          onOpenNote={(noteId) => navigateToNote(noteId)}
          onCreateNote={() => navigateToNewNote()}
        />
      </>
    );
  }
  if (navigation.page === "note") {
    const note = data.notes.find(
      (note) => note.id === navigation.existingNoteId,
    );
    return (
      <CaptureOrEditNoteDialog
        existingNote={note ?? null}
        navigateToHome={navigateToHome}
      />
    );
  }
}

function SchmierzettelNotes({
  onOpenNote,
  onCreateNote,
}: {
  onOpenNote: (noteId: string) => void;
  onCreateNote: () => void;
}) {
  const { data, readonly } = useSchmierzettelData();
  return (
    <div className="typeset mt-4">
      <h1>Notes</h1>
      {data.notes.length === 0 && (
        <div className="text-muted-foreground italic">No notes yet.</div>
      )}
      {!readonly && (
        <div className="my-4">
          <CreateNoteButton onClick={onCreateNote} />
        </div>
      )}
      <div className="flex flex-wrap gap-4">
        <Masonry
          key={data.notes.length} // trigger re-render when notes change, see error that is otherwise thrown
          items={data.notes}
          columnGutter={16}
          columnWidth={300}
          overscanBy={5}
          render={(data) => (
            <NoteCard
              note={data.data}
              onOpen={() => onOpenNote(data.data.id)}
            />
          )}
        ></Masonry>
      </div>
    </div>
  );
}

function NoteCard({ note, onOpen }: { note: Note; onOpen: () => void }) {
  return (
    <Card
      size="sm"
      className="w-full h-fit cursor-pointer hover:bg-muted"
      onClick={onOpen}
    >
      <CardContent className="flex-1 overflow-y-auto flex flex-col gap-2">
        <div className="whitespace-pre-line">
          {note.content}
          {note.content.trim().length === 0 && (
            <span className="text-muted-foreground italic">Empty Note</span>
          )}
        </div>
        {note.notifications.length > 0 && (
          <NotificationBadges notifications={note.notifications} />
        )}
      </CardContent>
    </Card>
  );
}

function CreateNoteButton({ onClick }: { onClick: () => void }) {
  return (
    <>
      <Button onClick={onClick}>
        <IconPlus />
        Capture Note
      </Button>
    </>
  );
}

function CaptureOrEditNoteDialog({
  existingNote,
  navigateToHome,
}: {
  existingNote: Note | null;
  navigateToHome: () => void;
}) {
  const { dispatchOperation } = useSchmierzettelData();
  const [noteTextInput, setNoteTextInput] = useState(
    existingNote?.content || "",
  );
  const [notifications, setNotifications] = useState<Notification[]>(
    existingNote?.notifications || [],
  );
  return (
    <Card className="mt-4 w-full mx-auto max-w-[500px] [--card-spacing:--spacing(4)]">
      <CardContent className="flex flex-col gap-4">
        <Textarea
          placeholder="Enter your note here"
          value={noteTextInput}
          onChange={(e) => setNoteTextInput(e.target.value)}
          cols={30}
        />
        <EditableNotificationsList
          notifications={notifications}
          setNotifications={setNotifications}
        />
      </CardContent>
      <CardFooter className="justify-end gap-2">
        <Button variant="outline" onClick={navigateToHome}>
          Cancel
        </Button>
        {dispatchOperation && existingNote && (
          <Button
            variant="destructive"
            onClick={() => {
              dispatchOperation("deleteNote", { id: existingNote.id });
              navigateToHome();
            }}
          >
            Delete
          </Button>
        )}
        {dispatchOperation && (
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
              navigateToHome();
            }}
          >
            Save
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
