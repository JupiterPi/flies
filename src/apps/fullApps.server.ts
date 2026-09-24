import { auth } from "#/server/api/users.server";
import { hasWritePermission } from "#/server/permissions";
import { openapi } from "@orpc/openapi";
import { ORPCError, os } from "@orpc/server";
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
      Bun.file(env.paths.fs + (path.startsWith("/") ? path : "/" + path)), // todo: check if Claude would have found this issue
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
  dispatchOperation: os
    .use(auth)
    .route({ method: "POST", path: "/dispatch-operation" })
    .input(
      z.object({
        path: z.string(),
        operation: DispatchedOperation,
      }),
    )
    .handler(async ({ context, input }) => {
      if (!context.user) {
        throw new ORPCError("UNAUTHORIZED", {
          message: "User must be logged in to dispatch operations.",
        });
      }
      if (!hasWritePermission(context.permissions, input.path)) {
        throw new ORPCError("FORBIDDEN", {
          message:
            "User does not have write permission to dispatch operations.",
        });
      }

      const file = operationsBasedFiles.get(input.path);
      if (!file) {
        throw new ORPCError("NOT_FOUND", {
          message: `No operations-based file found for path: ${input.path}`,
        });
      }
      file.applyDispatchedOperation(input.operation);
    }),
});
