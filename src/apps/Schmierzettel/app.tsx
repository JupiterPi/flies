import { createContext, useContext } from "react";
import { SchmierzettelUI } from "./ui";
import { DefaultAppLayout } from "#/routes/$";
import { operations, SchmierzettelData } from "./schema";
import { FullApp, type FullAppProps } from "../fullApps";
import { AppAssociation, type AppInstanceInfo } from "../apps";
import type { OperationsBasedFile } from "../fullApps.server";
import type z from "zod";
import { createServerOnlyFn } from "@tanstack/react-start";
import { startCheckingAndSendingNotifications } from "./notifications";

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
    abortSignal: AbortSignal,
    operationsBasedFile: OperationsBasedFile<
      typeof SchmierzettelData,
      typeof operations
    >,
  ) {
    createServerOnlyFn(() => {
      startCheckingAndSendingNotifications(
        abortSignal,
        this.instanceInfo,
        operationsBasedFile,
      );
    })();
  }

  override FullAppComponent = ({
    data,
    dispatchOperation,
    PathBreadcrumbs,
    readonly,
  }: FullAppProps<typeof SchmierzettelData, typeof operations>) => {
    return (
      <SchmierzettelDataContext
        value={{
          data,
          dispatchOperation: readonly ? null : dispatchOperation,
          readonly,
        }}
      >
        <DefaultAppLayout
          PathBreadcrumbs={PathBreadcrumbs}
          SaveStatusIndicator={readonly && this.SaveStatusIndicator("readonly")}
        >
          <SchmierzettelUI />
        </DefaultAppLayout>
      </SchmierzettelDataContext>
    );
  };
}

export const SchmierzettelDataContext = createContext<{
  data: z.infer<typeof SchmierzettelData>;
  dispatchOperation:
    | null
    | FullAppProps<
        typeof SchmierzettelData,
        typeof operations
      >["dispatchOperation"];
  readonly: boolean;
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
