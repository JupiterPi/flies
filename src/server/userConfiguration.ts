import z from "zod";

export const Dashboard = z.object({
  greetingName: z.string().optional(),
  pinnedFilePaths: z.array(z.string()).default([]),
  pinnedDirectoryPaths: z.array(z.string()).default([]),
});
export type Dashboard = z.infer<typeof Dashboard>;
