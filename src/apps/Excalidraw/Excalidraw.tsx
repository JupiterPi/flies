import { ErrorPage } from "#/routes/_loggedIn/$";
import { createIsomorphicFn } from "@tanstack/react-start";
import { createApp, type AppProps } from "../apps";
import ExcalidrawViewer from "./Excalidraw.client";

const component = createIsomorphicFn()
  .client(() => {
    return ExcalidrawViewer;
  })
  .server(() => {
    return ({}: AppProps<null>) => {
      return <ErrorPage>Cannot SSR Excalidraw</ErrorPage>;
    };
  });

export const App = createApp<null>({
  associatedFileExtensions: [".excalidraw"],
  dataSchema: null,
  component: component(),
});
