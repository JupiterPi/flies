import z from "zod";
import { type App } from "./apps";
import { Store } from "#/server/stores/stores.server";
import { env } from "#/env";
import { os } from "@orpc/server";
import { openapi } from "@orpc/openapi";
import { instantiateApp } from "./appsRegistry";
import { assertPermission, auth } from "#/server/auth.server";
import { permissions } from "#/server/permissions";
import { joinPath } from "#/utils";

const runningApps = new Map<string, [App, AbortController]>();
// @ts-ignore
if (globalThis.__runningAppsManagerTeardown) {
  // @ts-ignore
  globalThis.__runningAppsManagerTeardown();
}
// @ts-ignore
globalThis.__runningAppsManagerTeardown = () => {
  for (const [_path, [_app, abortController]] of runningApps) {
    abortController.abort();
  }
};
// ^ this is necessary because the mixture of vite and nitro makes it really hard (impossible?)
// to detect hot reloads, but the running apps do need to be cleaned up, since they might have
// long-running server handles otherwise continuing to run in the background

const appFileStore = await Store.fromFile(
  Bun.file(`${env.paths.data}/runningApps.json`),
  z.object({
    appFilePaths: z.array(z.string()).default([]),
  }),
  {},
);
function saveAppFileStore() {
  appFileStore.write({
    appFilePaths: Array.from(runningApps.keys()),
  });
}
export async function runSavedApps() {
  const appFilePaths = appFileStore.read().appFilePaths;
  console.log("Running saved apps:", appFilePaths);
  for (const filePath of appFilePaths) {
    const file = Bun.file(env.paths.fs + "/" + joinPath(filePath));
    if (!(await file.exists())) {
      console.warn(`App file ${filePath} does not exist anymore.`);
      continue;
    }
    await runAndRegisterApp(filePath);
  }
}

export async function runAndRegisterApp(filePath: string) {
  if (runningApps.has(filePath)) return;
  const app = instantiateApp({ path: filePath });
  if (!app) return;
  const abortController = new AbortController();
  runningApps.set(filePath, [app, abortController]);
  saveAppFileStore();
  app.runServerHandler(abortController.signal)();
}

export const appsRoutes = os.meta(openapi({ prefix: "/apps" })).router({
  discoverAppFile: os
    .route({ method: "POST", path: "/discover" })
    .use(auth())
    .input(z.object({ filePath: z.string() }))
    .handler(async ({ context, input }) => {
      assertPermission(context.privileges, permissions.read(input.filePath));
      await runAndRegisterApp(input.filePath);
    }),
});
