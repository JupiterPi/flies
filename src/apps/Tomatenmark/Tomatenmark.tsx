import { Milkdown, MilkdownProvider, useEditor } from "@milkdown/react";
import { Crepe } from "@milkdown/crepe";
import "@milkdown/crepe/theme/common/style.css";
import "@milkdown/crepe/theme/frame-dark.css";
import "./milkdown.css";
import { useState } from "react";
import { createApp, type AppProps } from "../apps";

export const App = createApp<null>({
  associatedFileExtensions: [".md"],
  dataSchema: null,
  component: Tomatenmark,
});

export default function Tomatenmark({
  rawData,
  setRawData,
  PathBreadcrumbs,
  SaveStatusIndicator,
}: AppProps<null>) {
  return (
    <MilkdownProvider>
      {/* status bar */}
      <div className="mt-8 ml-[60px] flex gap-4 items-center">
        {PathBreadcrumbs}
        {SaveStatusIndicator}
      </div>

      <MilkdownEditor initialMarkdown={rawData} onChange={setRawData} />
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
