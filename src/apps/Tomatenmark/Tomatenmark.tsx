import { Milkdown, MilkdownProvider, useEditor } from "@milkdown/react";
import { Crepe } from "@milkdown/crepe";
import "@milkdown/crepe/theme/common/style.css";
import "@milkdown/crepe/theme/frame-dark.css";
import "./milkdown.css";
import { useState } from "react";
import {
  App,
  AppAssociation,
  type AppInstanceInfo,
  type AppProps,
} from "../apps";
import { PathBreadcrumbs } from "#/routes/_loggedIn/$";

export const app = new AppAssociation(
  [".md"],
  (instanceInfo) => new TomatenmarkApp(instanceInfo),
);

class TomatenmarkApp extends App {
  constructor(instanceInfo: AppInstanceInfo) {
    super(instanceInfo, "");
  }

  override AppComponent = ({ data, setData, saveStatus }: AppProps) => {
    return (
      <MilkdownProvider>
        {/* status bar */}
        <div className="mt-8 ml-[60px] flex gap-4 items-center">
          {<PathBreadcrumbs path={this.instanceInfo.path} />}
          {this.SaveStatusIndicator(saveStatus)}
        </div>

        <MilkdownEditor initialMarkdown={data} onChange={setData} />
      </MilkdownProvider>
    );
  };
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
