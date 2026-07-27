import { IconFolderUp } from "@tabler/icons-react";
import { Excalidraw } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import { resolveTheme, useTheme } from "#/components/theme-provider";
import { Link } from "@tanstack/react-router";
import { useFs } from "../$";

export default function ExcalidrawViewer({
  path,
  content,
  setContent,
  SaveStatusIndicator,
}: {
  path: string;
  content: string;
  setContent: (content: string) => void;
  SaveStatusIndicator: React.ReactNode;
}) {
  const fs = useFs();
  const { theme } = useTheme();

  const parsedContent = content.length > 0 ? JSON.parse(content) : undefined;

  return (
    <div className="w-full h-screen">
      {
        <Excalidraw
          renderTopRightUI={() => (
            <div className="h-[40px] flex items-center gap-2 ml-2">
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
              {SaveStatusIndicator}
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
            setContent(JSON.stringify(excalidrawSave, null, 2));
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
