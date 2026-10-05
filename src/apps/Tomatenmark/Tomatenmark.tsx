import {
  App,
  AppAssociation,
  type AppInstanceInfo,
  type AppProps,
} from "../apps";
import { DefaultAppLayout, PathBreadcrumbs } from "#/routes/$";
import { useEffect, useState } from "react";
import CodeMirror, { EditorView } from "@uiw/react-codemirror";
import { aura } from "./theme";
import markdownEditor from "./markdown-editor";
import { indentUnit } from "@codemirror/language";

export const app = new AppAssociation(
  [".md"],
  (instanceInfo) => new TomatenmarkApp(instanceInfo),
);

class TomatenmarkApp extends App {
  constructor(instanceInfo: AppInstanceInfo) {
    super(instanceInfo, "");
  }

  override AppComponent = ({
    data,
    setData,
    saveStatus,
    readonly,
  }: AppProps) => {
    return (
      <div>
        <DefaultAppLayout
          PathBreadcrumbs={<PathBreadcrumbs path={this.instanceInfo.path} />}
          SaveStatusIndicator={this.SaveStatusIndicator(saveStatus)}
        >
          <TomatenmarkEditor
            initialMarkdown={data}
            readonly={readonly}
            onChange={setData}
          />
        </DefaultAppLayout>
      </div>
    );
  };
}

function TomatenmarkEditor({
  initialMarkdown,
  readonly,
  onChange,
}: {
  initialMarkdown: string;
  readonly?: boolean;
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
        readOnly={readonly}
        editable={!readonly}
        extensions={[
          markdownEditor(),
          EditorView.lineWrapping,
          indentUnit.of("\t"),
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
      <style>{` .cm-focused { outline: none !important; } `}</style>
      {/* remove widget buffer */}
      <style>{` .cm-widgetBuffer { display: none !important; } `}</style>
    </>
  );
}
