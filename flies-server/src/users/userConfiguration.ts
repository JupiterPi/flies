/* import z from "zod";
import { type UserId } from "./users";
import { env } from "../env";

// schema

export const FileViewer = z.enum([
  "text",
  "markdown",
  "excalidraw",
  "schmierzettel",
  "default",
]);
export type FileViewer = z.infer<typeof FileViewer>;

export const FileTypeAssociation = z.object({
  pathPrefix: z.string().optional(),
  extension: z.string(),
  icon: z.string().optional(),
  viewer: FileViewer,
});
export type FileTypeAssociation = z.infer<typeof FileTypeAssociation>;

export const UserConfiguration = z.object({
  name: z.string(),
  fileTypeAssociations: z.array(FileTypeAssociation).default([]),
});
export type UserConfiguration = z.infer<typeof UserConfiguration>;

export const exampleUserConfiguration: UserConfiguration = {
  name: "Alice",
  fileTypeAssociations: [
    {
      extension: "md",
      viewer: "markdown",
    },
    {
      extension: "excalidraw",
      viewer: "excalidraw",
    },
    {
      extension: "schmierzettel",
      viewer: "schmierzettel",
    },
  ],
};
// todo: are defaults not applied elsewhere?

// todo: mechanism that paths never conflict with reserved flies-app routes

// store

export async function readUserConfiguration(
  userId: UserId,
): Promise<UserConfiguration | null> {
  const file = userConfigurationFile(userId);
  if (!(await file.exists())) {
    return UserConfiguration.parse({
      name: "New User with ID " + userId,
    } satisfies z.input<typeof UserConfiguration>);
  }
  return UserConfiguration.parse(await file.json());
}

export async function writeUserConfiguration(
  userId: UserId,
  config: UserConfiguration,
): Promise<void> {
  const file = userConfigurationFile(userId);
  await Bun.write(file, JSON.stringify(config, null, 2));
}

const userConfigurationFile = (userId: UserId) =>
  Bun.file(`${env.DATA_DIR}/users/${userId}-configuration.json`);
 */
