import ExcalidrawViewer from "./Excalidraw.client";
import {
  App,
  AppAssociation,
  type AppInstanceInfo,
  type AppProps,
} from "../apps";
import { createClientOnlyFn } from "@tanstack/react-start";

export const app = new AppAssociation(
  [".excalidraw"],
  (instanceInfo) => new ExcalidrawApp(instanceInfo),
);

class ExcalidrawApp extends App {
  constructor(instanceInfo: AppInstanceInfo) {
    super(instanceInfo, "");
  }

  override AppComponent = createClientOnlyFn(
    ({ data, setData, saveStatus }: AppProps) => {
      return (
        <ExcalidrawViewer
          data={data}
          setData={setData}
          path={this.instanceInfo.path}
          SaveStatusIndicator={this.SaveStatusIndicator(saveStatus)}
        />
      );
    },
  );
}
