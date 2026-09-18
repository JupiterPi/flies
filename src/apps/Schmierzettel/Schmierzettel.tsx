import { createContext, useContext } from "react";
import z from "zod";
import { createApp, type AppProps } from "../apps";
import { SchmierzettelUI } from "./schmierzettelUi";
import { DefaultAppLayout } from "#/routes/_loggedIn/$";

// data

export const Note = z.object({
  id: z.string().default(() => crypto.randomUUID()),
  createdAt: z.number(),
  modifiedAt: z.number(),
  content: z.string(),
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
});
export type SchmierzettelData = z.infer<typeof SchmierzettelData>;

// app

export const App = createApp({
  associatedFileExtensions: ["Schmierzettel"],
  dataSchema: SchmierzettelData,
  newFileData: SchmierzettelData.parse({
    _: "https://github.com/JupiterPi/flies Schmierzettel data v1",
  } satisfies z.input<typeof SchmierzettelData>),
  component: Schmierzettel,
});

function Schmierzettel({
  data,
  setData,
  PathBreadcrumbs,
  SaveStatusIndicator,
}: AppProps<typeof SchmierzettelData>) {
  return (
    <SchmierzettelDataContext value={{ data, setData }}>
      <DefaultAppLayout
        PathBreadcrumbs={PathBreadcrumbs}
        SaveStatusIndicator={SaveStatusIndicator}
      >
        <SchmierzettelUI />
      </DefaultAppLayout>
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
