import { DefaultAppLayout, PathBreadcrumbs } from "#/routes/_loggedIn/$";
import {
  App,
  AppAssociation,
  type AppInstanceInfo,
  type AppProps,
} from "../apps";

export const app = new AppAssociation(
  [".txt", ".log"],
  (instanceInfo) => new TextViewerApp(instanceInfo),
);

class TextViewerApp extends App {
  constructor(instanceInfo: AppInstanceInfo) {
    super(instanceInfo, "");
  }

  override AppComponent = ({ data }: AppProps) => {
    return (
      <DefaultAppLayout
        PathBreadcrumbs={<PathBreadcrumbs path={this.instanceInfo.path} />}
      >
        <pre className="whitespace-pre-wrap break-words">{data}</pre>
      </DefaultAppLayout>
    );
  };
}
