export const fileTypeAssociations = {
  plaintext: [".txt"],
  markdown: [".md"],
  excalidraw: [".excalidraw"],
  schmierzettel: ["Schmierzettel"],
} satisfies Record<string, string[]>;

export type FileViewer = keyof typeof fileTypeAssociations;

export function resolveFileViewer(path: string): FileViewer | undefined {
  for (const [handler, extensions] of Object.entries(fileTypeAssociations)) {
    if (extensions.some((ext) => path.endsWith(ext))) {
      return handler as FileViewer;
    }
  }
  return undefined;
}
