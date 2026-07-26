import { getRouter } from "#/router";
import z from "zod";

// schema

export const PathAssociation = z.object({
  pathPrefix: z.string(),
  openWith: z.union([
    z.object({
      type: z.literal("local"),
      device: z.string(),
      path: z.string(),
    }),
    z.object({ type: z.literal("web"), url: z.string() }),
  ]),
});
export type PathAssociation = z.infer<typeof PathAssociation>;

export const FileViewer = z.enum(["text", "markdown", "excalidraw", "default"]);
export type FileViewer = z.infer<typeof FileViewer>;

export const FileTypeAssociation = z.object({
  extension: z.string(),
  icon: z.string().optional(),
  viewer: FileViewer,
});
export type FileTypeAssociation = z.infer<typeof FileTypeAssociation>;

export const FliesRoot = z.object({
  id: z
    .string()
    .refine((val) => val.length > 0, {
      message: "ID cannot be empty",
    })
    .refine((val) => /^[a-zA-Z0-9_-]+$/.test(val), {
      message: "ID must be alphanumeric with optional underscores or hyphens",
    })
    .refine(
      (val) =>
        Object.keys(getRouter().routesByPath).find(
          (route) => route === "/" + val || route == "/with_navbar/" + val,
        ) === undefined,
      {
        message: "ID overlaps with an existing Flies app route",
      },
    ),
  name: z.string().optional(),
  webdavEndpoint: z.url(),
  webdavCredentials: z
    .object({
      username: z.string(),
      password: z.string(),
    })
    .optional(),
  pathAssociations: z.array(PathAssociation).default([]),
  fileTypeAssociations: z.array(FileTypeAssociation).default([]),
});
export type FliesRoot = z.infer<typeof FliesRoot>;

export const FliesConfiguration = z.object({
  roots: z.array(FliesRoot).default([]),
  fileTypeAssociations: z.array(FileTypeAssociation).default([]),
});
export type FliesConfiguration = z.infer<typeof FliesConfiguration>;

export const fliesConfigurationSchema = FliesConfiguration.toJSONSchema();

// store

export function readConfigurationFromLocalStorageUnvalidated(): any {
  const configString = localStorage.getItem("flies-configuration");
  if (!configString) {
    return {};
  }
  try {
    return JSON.parse(configString);
  } catch (e) {
    console.error("Failed to parse configuration from localStorage", e);
    return {};
  }
}
export function readConfigurationFromLocalStorage(): FliesConfiguration | null {
  try {
    const unvalidated = readConfigurationFromLocalStorageUnvalidated();
    return FliesConfiguration.parse(unvalidated);
  } catch (e) {
    console.error(
      "Failed to parse and/or validate configuration from localStorage",
      e,
    );
    return null;
  }
}

export function writeConfigurationToLocalStorage(config: FliesConfiguration) {
  localStorage.setItem("flies-configuration", JSON.stringify(config));
}

export function readDeviceNameFromLocalStorage(): string | null {
  return localStorage.getItem("flies-device-name");
}

export function writeDeviceNameToLocalStorage(name: string) {
  localStorage.setItem("flies-device-name", name);
}
