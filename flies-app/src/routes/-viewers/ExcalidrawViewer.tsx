import { useQuery } from "@tanstack/react-query";
import { LoadingPage, useFs } from "../$";
import classNames from "classnames";
import { useDebounce } from "@uidotdev/usehooks";
import { useEffect, useState } from "react";
import {
  IconCloudCheck,
  IconCloudUpload,
  IconFolderUp,
} from "@tabler/icons-react";
import { Excalidraw } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import { resolveTheme, useTheme } from "#/components/theme-provider";
import { Link } from "@tanstack/react-router";

export default function ExcalidrawViewer({ path }: { path: string }) {
  const fs = useFs();

  const content = useQuery({
    queryKey: ["text-file-content", fs.getRoot().id, path],
    queryFn: () => fs.readFile(path),
  });

  const [excalidrawInput, setExcalidrawInput] = useState<string | null>(null);
  const debouncedExcalidrawInput = useDebounce(excalidrawInput, 1000);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">(
    "idle",
  );
  useEffect(() => {
    if (debouncedExcalidrawInput !== null && saveStatus !== "saving") {
      setSaveStatus("saving");
      fs.writeFile(path, debouncedExcalidrawInput).then(() => {
        setSaveStatus("saved");
      });
    }
  }, [debouncedExcalidrawInput]);
  useEffect(() => {
    if (saveStatus === "saved") {
      const timeout = setTimeout(() => {
        setSaveStatus("idle");
      }, 700);
      return () => clearTimeout(timeout);
    }
  }, [saveStatus]);

  const { theme } = useTheme();

  if (content.isLoading) {
    return <LoadingPage />;
  }
  const contentStr =
    content.data! instanceof ArrayBuffer
      ? new TextDecoder().decode(content.data!)
      : (content.data as string);
  const parsedContent =
    contentStr.length > 0 ? JSON.parse(contentStr) : undefined;

  return (
    <div className="w-full h-[calc(100vh-69px)]">
      {
        <Excalidraw
          renderTopRightUI={() => (
            <div className="h-[40px] flex items-center gap-2">
              <Link
                to="/$"
                params={{
                  _splat:
                    fs.getRoot().id +
                    "/" +
                    path.split("/").slice(0, -1).join("/"),
                }}
                className="no-underline text-inherit! opacity-50 hover:opacity-100 transition-opacity transition-duration-300"
              >
                <IconFolderUp className="size-5" />
              </Link>
              {(saveStatus === "idle" || saveStatus === "saved") && (
                <IconCloudCheck
                  className={classNames(
                    "size-5 transition-opacity transition-duration-300",
                    {
                      "opacity-50": saveStatus === "idle",
                    },
                  )}
                />
              )}
              {saveStatus === "saving" && (
                <IconCloudUpload className="size-5 opacity-75" />
              )}
            </div>
          )}
          theme={resolveTheme(theme)}
          onChange={(elements, appState, files) => {
            const excalidrawSave = {
              type: "excalidraw",
              version: 2,
              source: "https://excalidraw.com",
              elements: [...elements],
              appState,
              files,
            };
            setExcalidrawInput(JSON.stringify(excalidrawSave, null, 2));
          }}
          initialData={
            parsedContent
              ? {
                  elements: parsedContent.elements,
                  appState: {
                    ...parsedContent.appState,
                    collaborators: new Map(
                      Object.entries(parsedContent.appState.collaborators),
                    ),
                  },
                  files: parsedContent.files,
                }
              : undefined
          }
        />
      }
    </div>
  );
}
