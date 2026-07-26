import { PathBreadcrumbs, useFs } from "../$";
import { Milkdown, MilkdownProvider, useEditor } from "@milkdown/react";
import { Crepe } from "@milkdown/crepe";
import "@milkdown/crepe/theme/common/style.css";
import "@milkdown/crepe/theme/frame-dark.css";
import "./milkdown.css";
import { useState } from "react";

export default function MarkdownViewer({
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

  return (
    <MilkdownProvider>
      {/* status bar */}
      <div className="mt-8 ml-[60px] flex gap-4 items-center">
        <PathBreadcrumbs root={fs.getRoot()} path={path} />
        {SaveStatusIndicator}
      </div>

      <MilkdownEditor initialMarkdown={content} onChange={setContent} />
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
