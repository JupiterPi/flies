import { app as SampleApp } from "./SampleApp";
import { app as Excalidraw } from "./Excalidraw/Excalidraw";
import { app as Schmierzettel } from "./Schmierzettel/app";
import { app as TextViewer } from "./TextViewer/TextViewer";
import { app as Tomatenmark } from "./Tomatenmark/Tomatenmark";
import type { App, AppAssociation, AppInstanceInfo } from "./apps";

const apps: AppAssociation[] = [
  SampleApp,
  Excalidraw,
  Schmierzettel,
  TextViewer,
  Tomatenmark,
];

export function instantiateApp(instanceInfo: AppInstanceInfo): App | null {
  for (const appAssociation of apps) {
    const app = appAssociation.instantiateOrNull(instanceInfo);
    if (app) return app;
  }
  return null;
}
