import type { App } from "./apps";
import { instantiateApp } from "./appsRegistry";

const runningApps = new Map<string, App>();

export function runOrGetApp(filePath: string) {
  const alreadyRunningApp = runningApps.get(filePath);
  if (alreadyRunningApp) return alreadyRunningApp;
  const app = instantiateApp({ path: filePath });
  if (!app) return;
  runningApps.set(filePath, app);
  return app;
}
