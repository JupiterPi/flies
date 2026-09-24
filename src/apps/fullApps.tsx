import z from "zod";
import { JsonApp } from "./jsonApps";
import { dispatchOperation, type Operation } from "./operations";
import type { AppInstanceInfo } from "./apps";
import { useServer } from "#/client/orpc";
import { OperationsBasedFile, operationsBasedFiles } from "./fullApps.server";
import { createServerOnlyFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { LoadingPage } from "#/routes/_loggedIn/$";

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

  override JsonAppComponent = () => {
    const client = useServer().client;

    const [data, setData] = useState<z.infer<schema> | null>(null);
    useEffect(() => {
      const loadData = async () => {
        const iterator = await client.fullApps.getLiveData(
          {
            path: this.instanceInfo.path,
          },
          { context: { retry: Number.POSITIVE_INFINITY } },
        );
        for await (const newData of iterator) {
          setData(newData);
        }
      };
      loadData();
    }, []);
    if (data === null) {
      return <LoadingPage />;
    }

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
};
