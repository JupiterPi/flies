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

const runningApps = new Map<string, App>();

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
    const file = Bun.file(joinPath(env.paths.fs, filePath));
    if (!(await file.exists())) return null;
    await runAndRegisterApp(filePath);
  }
}

export async function runAndRegisterApp(filePath: string) {
  if (runningApps.has(filePath)) return;
  const app = instantiateApp({ path: filePath });
  if (!app) return;
  runningApps.set(filePath, app);
  saveAppFileStore();
  app.runServerHandler();
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
