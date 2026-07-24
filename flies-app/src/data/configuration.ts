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

export const FileTypeAssociation = z.object({
  extension: z.string(),
  icon: z.string().optional(),
  application: z.string(),
});
export type FileTypeAssociation = z.infer<typeof FileTypeAssociation>;

export const FliesRoot = z.object({
  id: z.string(),
  name: z.string().optional(),
  webdavEndpoint: z.string(),
  pathAssociations: z.array(PathAssociation).default([]),
  fileTypeAssociations: z.array(FileTypeAssociation).default([]),
});
export type FliesRoot = z.infer<typeof FliesRoot>;

export const FliesConfiguration = z.object({
  roots: z.array(FliesRoot).default([]),
  fileTypeAssociations: z.array(FileTypeAssociation).default([]),
});
export type FliesConfiguration = z.infer<typeof FliesConfiguration>;

// store

const LOCAL_STORAGE_KEY = "flies-configuration";

export function readConfigurationFromLocalStorage(): FliesConfiguration {
  const configString = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!configString) {
    return FliesConfiguration.parse({});
  }
  try {
    const parsed = JSON.parse(configString);
    return FliesConfiguration.parse(parsed);
  } catch (e) {
    console.error("Failed to read configuration from localStorage", e);
    return FliesConfiguration.parse({});
  }
}

export function writeConfigurationToLocalStorage(config: FliesConfiguration) {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(config));
}
