import { useQuery } from "@tanstack/react-query";
import { LoadingPage, useFs } from "../$";
import { useDebounce } from "@uidotdev/usehooks";
import { useEffect, useState } from "react";
import { IconCloudCheck, IconCloudUpload } from "@tabler/icons-react";
import classNames from "classnames";

const SAVE_DEBOUNCE_MS = 1000;

export default function Viewer({
  path,
  children,
}: {
  path: string;
  children: (
    content: string,
    setContent: (content: string) => void,
    SaveStatusIndicator: React.ReactNode,
  ) => React.ReactNode;
}) {
  const fs = useFs();

  const content = useQuery({
    queryKey: ["file-content", fs.getRoot().id, path],
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

  if (content.isLoading) {
    return <LoadingPage />;
  }
  const contentStr =
    content.data! instanceof ArrayBuffer
      ? new TextDecoder().decode(content.data!)
      : (content.data as string);

  const SaveStatusIndicator = (
    <>
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
    </>
  );
  return children(contentStr, setContentInput, SaveStatusIndicator);
}
