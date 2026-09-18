import { DefaultAppLayout } from "#/routes/_loggedIn/$";
import { createApp, type AppProps } from "../apps";

export const App = createApp<null>({
  associatedFileExtensions: [".txt"],
  dataSchema: null,
  component: TextViewer,
});

function TextViewer({ rawData, PathBreadcrumbs }: AppProps<null>) {
  return (
    <DefaultAppLayout PathBreadcrumbs={PathBreadcrumbs}>
      <pre className="whitespace-pre-wrap break-words">{rawData}</pre>
    </DefaultAppLayout>
  );
}
