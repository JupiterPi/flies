/**
 * The concept of an "app" in Flies is like a powerful file viewer.
 */

import z from "zod";
import { useServer } from "#/client/orpc";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useDebounce } from "@uidotdev/usehooks";
import { ErrorPage, LoadingPage, PathBreadcrumbs } from "#/routes/_loggedIn/$";
import { IconCloudCheck, IconCloudUpload } from "@tabler/icons-react";
import { cn } from "#/utils";

import * as TextViewer from "./TextViewer/TextViewer";
import * as Excalidraw from "./Excalidraw/Excalidraw";
import * as Tomatenmark from "./Tomatenmark/Tomatenmark";
import * as Schmierzettel from "./Schmierzettel/Schmierzettel";

export type AppProps<T> = {
  path: string;
  rawData: string;
  setRawData: (rawData: string | ((rawData: string) => string)) => void;
  data: z.infer<T>;
  setData: (data: z.infer<T> | ((data: z.infer<T>) => z.infer<T>)) => void;
  PathBreadcrumbs: React.ReactNode;
  SaveStatusIndicator: React.ReactNode;
};
type SchemaBase = z.ZodObject | null;
type App<T extends SchemaBase> = {
  associatedFileExtensions: string[];
  dataSchema: T;
  newFileData?: z.infer<T>;
  component: React.ComponentType<AppProps<T>>;
};
export function createApp<T extends SchemaBase>(options: {
  associatedFileExtensions: string[];
  dataSchema: T;
  newFileData?: z.infer<T>;
  component: React.ComponentType<AppProps<T>>;
}): App<T> {
  return {
    associatedFileExtensions: options.associatedFileExtensions,
    dataSchema: options.dataSchema,
    newFileData: options.newFileData,
    component: options.component,
  };
}

export const apps = [
  TextViewer.App,
  Excalidraw.App,
  Tomatenmark.App,
  Schmierzettel.App,
];

// wrapper

const SAVE_DEBOUNCE_MS = 1000;

export function AppWrapper<T extends SchemaBase>({
  app,
  path,
}: {
  app: App<T>;
  path: string;
}) {
  const { fs } = useServer();

  const queriedContent = useQuery({
    queryKey: ["file-content", path],
    queryFn: () => fs.readFile(path),
  });

  const [contentInput, setContentInput] = useState<string | null>(null);
  const debouncedContentInput = useDebounce(contentInput, SAVE_DEBOUNCE_MS);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">(
    "idle",
  );
  useEffect(() => {
    if (debouncedContentInput !== null && saveStatus !== "saving") {
      setSaveStatus("saving");
      fs.writeFile(path, debouncedContentInput).then(() => {
        setSaveStatus("saved");
      });
    }
  }, [debouncedContentInput]);
  useEffect(() => {
    if (saveStatus === "saved") {
      const timeout = setTimeout(() => {
        setSaveStatus("idle");
      }, 700);
      return () => clearTimeout(timeout);
    }
  }, [saveStatus]);

  if (queriedContent.isLoading) {
    return <LoadingPage />;
  }
  const queriedContentStr = new TextDecoder().decode(queriedContent.data!);
  const content = contentInput === null ? queriedContentStr : contentInput;

  const parseResult = app.dataSchema?.safeParse(JSON.parse(content));
  if (app.dataSchema && !parseResult!.success) {
    return (
      <ErrorPage>
        Invalid app data: <br />
        <div className="whitespace-pre font-mono">
          {z.prettifyError(parseResult!.error)}
        </div>
      </ErrorPage>
    );
  }
  const jsonData = app.dataSchema
    ? parseResult?.success
      ? parseResult.data
      : null
    : null;
  const setJsonData = (newData: z.infer<T>) => {
    if (app.dataSchema) {
      const newRawData = JSON.stringify(newData, null, 2);
      setContentInput(newRawData);
    }
  };

  const SaveStatusIndicator = (
    <>
      {(saveStatus === "idle" || saveStatus === "saved") && (
        <IconCloudCheck
          className={cn("size-5 transition-opacity transition-duration-300", {
            "opacity-50": saveStatus === "idle",
          })}
        />
      )}
      {saveStatus === "saving" && (
        <IconCloudUpload className="size-5 opacity-75" />
      )}
    </>
  );

  return (
    <app.component
      path={path}
      rawData={content}
      setRawData={(data) => {
        if (typeof data === "function") {
          setContentInput(data(content));
        } else {
          setContentInput(data);
        }
      }}
      data={jsonData as z.infer<T>}
      setData={(data) => {
        if (typeof data === "function") {
          setJsonData(
            (data as (d: z.infer<T>) => z.infer<T>)(jsonData as z.infer<T>),
          );
        } else {
          setJsonData(data);
        }
      }}
      PathBreadcrumbs={<PathBreadcrumbs path={path} />}
      SaveStatusIndicator={SaveStatusIndicator}
    />
  );
}
