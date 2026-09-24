import { produce } from "immer";
import z from "zod";
import { createOperation as operation, createOperations } from "../operations";

// schema

export const Notification = z.object({
  scheduledFor: z.number(),
});
export type Notification = z.infer<typeof Notification>;

export const Note = z.object({
  id: z.string().default(() => crypto.randomUUID()),
  createdAt: z.number(),
  modifiedAt: z.number(),
  content: z.string(),
  notifications: z.array(Notification).default([]),
});
export type Note = z.infer<typeof Note>;

export const ArchivedNote = z.object({
  id: z.string().default(() => crypto.randomUUID()),
  archivedAt: z.number(),
  content: z.string(),
});
export type ArchivedNote = z.infer<typeof ArchivedNote>;

export const SchmierzettelData = z.object({
  _: z.literal("https://github.com/JupiterPi/flies Schmierzettel data v1"),
  notes: z.array(Note).default([]),
  archivedNotes: z.array(ArchivedNote).default([]),
  ntfyshUrl: z.string().nullable().default(null),
});
export type SchmierzettelData = z.infer<typeof SchmierzettelData>;

// operations

export const operations = createOperations<SchmierzettelData>()({
  setNtfyshUrl: operation({
    input: z.object({ ntfyshUrl: z.string().nullable() }),
    handler: (data, input) =>
      produce(data, (data) => {
        data.ntfyshUrl = input.ntfyshUrl;
      }),
  }),
  addNote: operation({
    input: z.object({
      content: z.string(),
      timestamp: z.number(),
      notifications: z.array(Notification).optional(),
    }),
    handler: (data, input) =>
      produce(data, (data) => {
        data.notes.push(
          Note.parse({
            createdAt: input.timestamp,
            modifiedAt: input.timestamp,
            content: input.content,
            notifications: input.notifications ?? [],
          } satisfies z.input<Note>),
        );
      }),
  }),
  updateNote: operation({
    input: z.object({
      id: z.string(),
      content: z.string(),
      timestamp: z.number(),
      notifications: z.array(Notification).optional(),
    }),
    handler: (data, input) =>
      produce(data, (data) => {
        const note = data.notes.find((n) => n.id === input.id);
        if (!note) return;
        note.content = input.content;
        note.modifiedAt = input.timestamp;
        if (input.notifications) {
          note.notifications = input.notifications;
        }
      }),
  }),
  deleteNote: operation({
    input: z.object({ id: z.string() }),
    handler: (data, input) =>
      produce(data, (data) => {
        data.notes = data.notes.filter((n) => n.id !== input.id);
      }),
  }),
  markNotificationSent: operation({
    input: z.object({ noteId: z.string(), scheduledFor: z.number() }),
    handler: (data, input) =>
      produce(data, (data) => {
        const note = data.notes.find((n) => n.id === input.noteId);
        if (!note) return;
        const notificationIdx = note.notifications.findIndex(
          (n) => n.scheduledFor === input.scheduledFor,
        );
        note.notifications.splice(notificationIdx, 1);
      }),
  }),
});
