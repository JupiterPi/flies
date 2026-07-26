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

  const queriedContent = useQuery({
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

  if (queriedContent.isLoading) {
    return <LoadingPage />;
  }
  const queriedContentStr =
    queriedContent.data! instanceof ArrayBuffer
      ? new TextDecoder().decode(queriedContent.data!)
      : (queriedContent.data as string);
  const content = contentInput === null ? queriedContentStr : contentInput;

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
  return children(content, setContentInput, SaveStatusIndicator);
}
