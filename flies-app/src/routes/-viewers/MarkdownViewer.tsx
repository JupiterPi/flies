import { useQuery } from "@tanstack/react-query";
import { LoadingPage, PathBreadcrumbs, type ViewerInfo } from "../$";
import classNames from "classnames";

import { Milkdown, MilkdownProvider, useEditor } from "@milkdown/react";
import { Crepe } from "@milkdown/crepe";
import "@milkdown/crepe/theme/common/style.css";
import "@milkdown/crepe/theme/frame-dark.css";
import "./milkdown.css";
import { useDebounce } from "@uidotdev/usehooks";
import { useEffect, useState } from "react";
import { IconCloudCheck, IconCloudUpload } from "@tabler/icons-react";

export default function MarkdownViewer({ client, root, path }: ViewerInfo) {
  const content = useQuery({
    queryKey: ["text-file-content", root.id, path],
    queryFn: () =>
      client.getFileContents(path) as unknown as ArrayBuffer | String,
  });

  const [markdownInput, setMarkdownInput] = useState<string | null>(null);
  const debouncedMarkdownInput = useDebounce(markdownInput, 1000);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">(
    "idle",
  );
  useEffect(() => {
    if (debouncedMarkdownInput !== null && saveStatus !== "saving") {
      setSaveStatus("saving");
      client.putFileContents(path, debouncedMarkdownInput).then(() => {
        setSaveStatus("saved");
      });
    }
  }, [debouncedMarkdownInput]);
  useEffect(() => {
    if (saveStatus === "saved") {
      const timeout = setTimeout(() => {
        setSaveStatus("idle");
      }, 700);
      return () => clearTimeout(timeout);
    }
  }, [saveStatus]);

  if (content.isLoading) {
    return <LoadingPage />;
  }
  const contentStr =
    content.data! instanceof ArrayBuffer
      ? new TextDecoder().decode(content.data!)
      : (content.data as string);

  return (
    <MilkdownProvider>
      {/* status bar */}
      <div className="mt-8 ml-[60px] flex gap-4 items-center">
        <PathBreadcrumbs root={root} path={path} />
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

      <MilkdownEditor
        initialMarkdown={contentStr}
        onChange={setMarkdownInput}
      />
    </MilkdownProvider>
  );
}

function MilkdownEditor({
  initialMarkdown,
  onChange,
}: {
  initialMarkdown: string;
  onChange: (markdown: string) => void;
}) {
  const [markdownEverChanged, setMarkdownEverChanged] = useState(false);
  useEditor((root) => {
    const crepe = new Crepe({
      root,
      defaultValue: initialMarkdown,
    });
    crepe.on((listener) => {
      listener.markdownUpdated((_, markdown) => {
        if (markdownEverChanged || markdown !== initialMarkdown) {
          setMarkdownEverChanged(true);
          onChange(markdown);
        }
      });
    });
    return crepe;
  }, []);

  return <Milkdown />;
}
