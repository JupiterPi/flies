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
    ({ data, setData, saveStatus, readonly }: AppProps) => {
      return (
        <ExcalidrawViewer
          data={data}
          setData={setData}
          readonly={readonly}
          path={this.instanceInfo.path}
          SaveStatusIndicator={this.SaveStatusIndicator(saveStatus)}
        />
      );
    },
  );
}
