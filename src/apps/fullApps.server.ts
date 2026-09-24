import { openapi } from "@orpc/openapi";
import { asyncIteratorObject, ORPCError, os } from "@orpc/server";
import z from "zod";
import {
  applyOperation,
  DispatchedOperation,
  dispatchOperation,
  type Operation,
} from "./operations";
import { Store } from "#/server/stores/stores.server";

import type { FullApp } from "./fullApps";
import { env } from "#/env";
import { assertPermission, auth } from "#/server/auth.server";
import { permissions } from "#/server/permissions";
import { joinPath } from "#/utils";
export class OperationsBasedFile<
  schema extends z.ZodObject,
  operations extends Record<string, Operation<any, any>>,
> {
  private constructor(
    public readonly path: string,
    private readonly app: FullApp<schema, operations>,
    private fileStore: Store<schema>,
  ) {}

  static async init<
    schema extends z.ZodObject,
    operations extends Record<string, Operation<any, any>>,
  >(path: string, app: FullApp<schema, operations>) {
    const fileStore = await Store.fromFile(
      Bun.file(joinPath(env.paths.fs, path)), // todo: check if Claude would have found this issue (which was there originally, at git commit 2ca85ee)
      app.dataSchema,
      app.newFileDataJson,
    );
    const instance = new OperationsBasedFile(path, app, fileStore);
    return instance;
  }

  read() {
    return this.fileStore.read();
  }

  private changeListeners: ((data: z.infer<schema>) => void)[] = [];
  addChangeListener(listener: (data: z.infer<schema>) => void) {
    this.changeListeners.push(listener);
  }
  callChangeListeners(data: z.infer<schema>) {
    for (const listener of this.changeListeners) {
      listener(data);
    }
  }

  applyOperation<opName extends keyof operations>(
    opName: opName,
    input: z.infer<operations[opName]["input"]>,
  ) {
    const dispatchedOperation = dispatchOperation(opName, input);
    this.applyDispatchedOperation(dispatchedOperation);
  }
  applyDispatchedOperation(operation: DispatchedOperation) {
    const updatedData = applyOperation(
      this.read(),
      this.app.operations,
      operation,
    );
    this.fileStore.write(updatedData);
    this.callChangeListeners(updatedData);
  }
}

export const operationsBasedFiles = new Map<
  string,
  OperationsBasedFile<any, any>
>();

export const fullAppRoutes = os.meta(openapi({ prefix: "/full-apps" })).router({
  getLiveData: os
    .use(auth())
    .route({ method: "GET", path: "/live-data" })
    .input(z.object({ path: z.string() }))
    .output(asyncIteratorObject(z.any()))
    .handler(async function* ({ context, input, signal }) {
      assertPermission(context.privileges, permissions.read(input.path));
      const file = operationsBasedFiles.get(input.path);
      if (!file) {
        throw new ORPCError("NOT_FOUND", {
          message: `No operations-based file found for path: ${input.path}`,
        });
      }

      let newData = false;
      let data = file.read();
      file.addChangeListener((d) => {
        newData = true;
        data = d;
      });
      while (true) {
        yield data;
        newData = false;
        while (!newData) {
          signal?.throwIfAborted();
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
      }
    }),
  dispatchOperation: os
    .use(auth())
    .route({ method: "POST", path: "/dispatch-operation" })
    .input(
      z.object({
        path: z.string(),
        operation: DispatchedOperation,
      }),
    )
    .handler(async ({ context, input }) => {
      assertPermission(context.privileges, permissions.write(input.path));
      const file = operationsBasedFiles.get(input.path);
      if (!file) {
        throw new ORPCError("NOT_FOUND", {
          message: `No operations-based file found for path: ${input.path}`,
        });
      }
      file.applyDispatchedOperation(input.operation);
    }),
});
