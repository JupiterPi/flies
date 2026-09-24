import z from "zod";
import { JsonApp } from "./jsonApps";
import { dispatchOperation, type Operation } from "./operations";
import type { AppInstanceInfo, AppSaveStatus } from "./apps";
import { useServer } from "#/client/orpc";
import { OperationsBasedFile, operationsBasedFiles } from "./fullApps.server";
import { createServerOnlyFn } from "@tanstack/react-start";

export abstract class FullApp<
  schema extends z.ZodObject,
  operations extends Record<string, Operation<z.infer<schema>, any>>,
> extends JsonApp<schema> {
  protected constructor(
    appDisplayName: string,
    instanceInfo: AppInstanceInfo,
    dataSchema: schema,
    newFileData: z.input<schema>,
    public readonly operations: operations,
  ) {
    super(appDisplayName, instanceInfo, dataSchema, newFileData);
  }

  override JsonAppComponent = ({
    data,
    saveStatus,
  }: {
    data: z.infer<schema>;
    setData: (
      data: z.infer<schema> | ((prev: z.infer<schema>) => z.infer<schema>),
    ) => void;
    saveStatus: AppSaveStatus;
  }) => {
    const client = useServer().client;
    const _dispatchOperation = async <opName extends keyof operations>(
      opName: opName,
      input: z.infer<operations[opName]["input"]>,
    ) => {
      await client.fullApps.dispatchOperation({
        path: this.instanceInfo.path,
        operation: dispatchOperation(opName, input),
      });
    };

    return (
      <this.FullAppComponent
        saveStatus={saveStatus}
        data={data}
        dispatchOperation={_dispatchOperation}
      />
    );
  };

  protected abstract FullAppComponent: React.ComponentType<
    FullAppProps<schema, operations>
  >;

  override async _runServerHandler() {
    createServerOnlyFn(async () => {
      const operationsBasedFile = await OperationsBasedFile.init(
        this.instanceInfo.path,
        this,
      );
      operationsBasedFiles.set(this.instanceInfo.path, operationsBasedFile);
      await this.runFullAppServerHandler(operationsBasedFile);
    })();
  }

  protected async runFullAppServerHandler(
    _operationsBasedFile: OperationsBasedFile<schema, operations>,
  ) {}
}

export type FullAppProps<
  schema extends z.ZodObject,
  operations extends Record<string, Operation<any, any>>,
> = {
  data: z.infer<schema>;
  dispatchOperation: <opName extends keyof operations>(
    opName: opName,
    input: z.infer<operations[opName]["input"]>,
  ) => Promise<void>;
  saveStatus: AppSaveStatus;
};
