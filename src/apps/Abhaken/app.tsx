import { createContext, useContext } from "react";
import { AppAssociation, type AppInstanceInfo } from "../apps";
import { FullApp, type FullAppProps } from "../fullApps";
import { AbhakenData, operations } from "./schema";
import type z from "zod";
import { DefaultAppLayout } from "#/routes/$";
import { AbhakenUI } from "./ui";

export const app = new AppAssociation(
  ["Abhaken"],
  (instanceInfo) => new AbhakenApp(instanceInfo),
);

class AbhakenApp extends FullApp<typeof AbhakenData, typeof operations> {
  constructor(instanceInfo: AppInstanceInfo) {
    super(
      "Abhaken",
      instanceInfo,
      AbhakenData,
      {
        _: "https://github.com/JupiterPi/flies Abhaken data v1",
      },
      operations,
    );
  }

  override FullAppComponent = ({
    data,
    dispatchOperation,
    PathBreadcrumbs,
    readonly,
  }: FullAppProps<typeof AbhakenData, typeof operations>) => {
    return (
      <AbhakenDataContext
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
          <AbhakenUI />
        </DefaultAppLayout>
      </AbhakenDataContext>
    );
  };
}

export const AbhakenDataContext = createContext<{
  data: z.infer<typeof AbhakenData>;
  dispatchOperation:
    | null
    | FullAppProps<typeof AbhakenData, typeof operations>["dispatchOperation"];
  readonly: boolean;
} | null>(null);

export function useAbhakenData() {
  const context = useContext(AbhakenDataContext);
  if (!context) {
    throw new Error(
      "useAbhakenData must be used within an AbhakenDataContext Provider",
    );
  }
  return context;
}
