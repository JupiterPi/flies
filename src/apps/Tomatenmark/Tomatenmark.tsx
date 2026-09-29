import {
  App,
  AppAssociation,
  type AppInstanceInfo,
  type AppProps,
} from "../apps";
import { DefaultAppLayout, PathBreadcrumbs } from "#/routes/_loggedIn/$";
import { useEffect, useState } from "react";

import CodeMirror, { EditorView } from "@uiw/react-codemirror";
import {
  markdown as cmMarkdown,
  markdownLanguage,
} from "@codemirror/lang-markdown";
import { aura } from "./theme";

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
      <div>
        <DefaultAppLayout
          PathBreadcrumbs={<PathBreadcrumbs path={this.instanceInfo.path} />}
          SaveStatusIndicator={this.SaveStatusIndicator(saveStatus)}
        >
          <TomatenmarkEditor initialMarkdown={data} onChange={setData} />
        </DefaultAppLayout>
      </div>
    );
  };
}

function TomatenmarkEditor({
  initialMarkdown,
  onChange,
}: {
  initialMarkdown: string;
  onChange: (markdown: string) => void;
}) {
  const [markdown, setMarkdown] = useState(initialMarkdown);
  useEffect(() => {
    onChange(markdown);
  }, [markdown, onChange]);

  return (
    <>
      <CodeMirror
        value={markdown}
        extensions={[
          cmMarkdown({ base: markdownLanguage }),
          EditorView.lineWrapping,
        ]}
        theme={aura}
        onChange={setMarkdown}
        height="100%"
        width="100%"
        basicSetup={{
          lineNumbers: false,
          foldGutter: false,
        }}
        autoFocus={true}
        className="mt-2"
      />

      {/* remove focus outline */}
      <style>{`
        .cm-focused {
          outline: none !important;
        }
      `}</style>
    </>
  );
}
