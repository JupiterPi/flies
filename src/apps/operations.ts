import { createServerOnlyFn } from "@tanstack/react-start";
import z from "zod";

export type Operation<data, input extends z.ZodObject | z.ZodNull> = {
  input: input;
  handler: (data: data, input: z.infer<input>) => data;
};
/**
 * Operations will only be called server-side.
 */
export function createOperation<data, input extends z.ZodObject | z.ZodNull>(
  operation: Operation<data, input>,
) {
  return {
    ...operation,
    handler: createServerOnlyFn(operation.handler),
  };
}

export function createOperations<data>() {
  return <operations extends Record<string, Operation<data, any>>>(
    operations: operations,
  ) => operations;
}

export const DispatchedOperation = z.object({
  operation: z.string(),
  input: z.any(),
});
export type DispatchedOperation = z.infer<typeof DispatchedOperation>;

export function dispatchOperation<
  operations extends Record<string, Operation<any, any>>,
  K extends keyof operations,
>(operation: K, input: z.infer<operations[K]["input"]>): DispatchedOperation {
  return { operation: operation as string, input };
}

export function applyOperation<
  data,
  operations extends Record<string, Operation<data, any>>,
>(
  data: data,
  operations: operations,
  dispatchedOperation: DispatchedOperation,
) {
  if (!Object.keys(operations).includes(dispatchedOperation.operation)) {
    throw new Error(`Unknown operation: ${dispatchedOperation.operation}`);
  }
  const operation =
    operations[dispatchedOperation.operation as keyof typeof operations];
  const input = operation.input.parse(dispatchedOperation.input);
  return operation.handler(data, input);
}
