import { createContext, useContext } from "react";
import { SchmierzettelUI } from "./ui";
import { DefaultAppLayout, PathBreadcrumbs } from "#/routes/_loggedIn/$";
import { operations, SchmierzettelData } from "./data";
import { FullApp, type FullAppProps } from "../fullApps";
import { AppAssociation, type AppInstanceInfo } from "../apps";
import type { OperationsBasedFile } from "../fullApps.server";
import { startCheckingAndSendingNotifications } from "./app.server";
import type z from "zod";
import { createServerOnlyFn } from "@tanstack/react-start";

export const app = new AppAssociation(
  ["Schmierzettel"],
  (instanceInfo) => new SchmierzettelApp(instanceInfo),
);

class SchmierzettelApp extends FullApp<
  typeof SchmierzettelData,
  typeof operations
> {
  constructor(instanceInfo: AppInstanceInfo) {
    super(
      "Schmierzettel",
      instanceInfo,
      SchmierzettelData,
      {
        _: "https://github.com/JupiterPi/flies Schmierzettel data v1",
      },
      operations,
    );
  }

  override async runFullAppServerHandler(
    operationsBasedFile: OperationsBasedFile<
      typeof SchmierzettelData,
      typeof operations
    >,
  ) {
    createServerOnlyFn(() => {
      startCheckingAndSendingNotifications(
        this.instanceInfo,
        operationsBasedFile,
      );
    })();
  }

  override FullAppComponent = ({
    data,
    dispatchOperation,
  }: FullAppProps<typeof SchmierzettelData, typeof operations>) => {
    return (
      <SchmierzettelDataContext value={{ data, dispatchOperation }}>
        <DefaultAppLayout
          PathBreadcrumbs={<PathBreadcrumbs path={this.instanceInfo.path} />}
        >
          <SchmierzettelUI />
        </DefaultAppLayout>
      </SchmierzettelDataContext>
    );
  };
}

export const SchmierzettelDataContext = createContext<{
  data: z.infer<typeof SchmierzettelData>;
  dispatchOperation: FullAppProps<
    typeof SchmierzettelData,
    typeof operations
  >["dispatchOperation"];
} | null>(null);

export function useSchmierzettelData() {
  const context = useContext(SchmierzettelDataContext);
  if (!context) {
    throw new Error(
      "useSchmierzettelData must be used within a SchmierzettelDataProvider",
    );
  }
  return context;
}
