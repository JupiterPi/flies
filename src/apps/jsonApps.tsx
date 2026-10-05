import z from "zod";
import { ErrorPage } from "#/routes/$";
import type { AppInstanceInfo, AppProps, AppSaveStatus } from "./apps";
import { App } from "./apps";

export abstract class JsonApp<schema extends z.ZodObject> extends App {
  constructor(
    protected readonly appDisplayName: string,
    instanceInfo: AppInstanceInfo,
    public readonly dataSchema: schema,
    public readonly newFileDataJson: z.input<schema>,
  ) {
    super(instanceInfo, JSON.stringify(newFileDataJson, null, 2));
  }

  override AppComponent = ({
    data,
    setData,
    saveStatus,
    PathBreadcrumbs,
    readonly,
  }: AppProps) => {
    const jsonData = (() => {
      try {
        return JSON.parse(data);
      } catch (error) {
        return null;
      }
    })();
    if (!jsonData) {
      return <ErrorPage>Invalid JSON data</ErrorPage>;
    }

    const parsedData = this.dataSchema.safeParse(jsonData);
    if (!parsedData.success) {
      return (
        <ErrorPage>
          Invalid {this.appDisplayName} data: <br />
          <div className="whitespace-pre font-mono">
            {z.prettifyError(parsedData.error)}
          </div>
        </ErrorPage>
      );
    }

    return (
      <this.JsonAppComponent
        data={parsedData.data}
        setData={(data) => {
          if (typeof data === "function") {
            setData(JSON.stringify(data(parsedData.data), null, 2));
          } else {
            setData(JSON.stringify(data, null, 2));
          }
        }}
        saveStatus={saveStatus}
        PathBreadcrumbs={PathBreadcrumbs}
        readonly={readonly}
      />
    );
  };

  protected abstract JsonAppComponent: React.ComponentType<
    JsonAppProps<schema>
  >;
}

export type JsonAppProps<schema extends z.ZodObject> = {
  data: z.infer<schema>;
  setData: (
    data: z.infer<schema> | ((prev: z.infer<schema>) => z.infer<schema>),
  ) => void;
  saveStatus: AppSaveStatus;
  PathBreadcrumbs: React.ReactNode;
  readonly: boolean;
};
