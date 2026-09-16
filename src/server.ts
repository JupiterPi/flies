import handler, { createServerEntry } from "@tanstack/react-start/server-entry";
import * as fs from "node:fs";
import { env } from "./env";
import { resolveFileViewer } from "./data/fileTypeAssociations";

const fsRootDir = `${env.DATA_DIR}/fs`;

const topLevelDirectories = fs
  .readdirSync(fsRootDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);
console.log("Top-level directories in DATA_DIR:", topLevelDirectories);

export default createServerEntry({
  async fetch(request) {
    const url = new URL(request.url);
    for (const topLevelDirectory of topLevelDirectories) {
      if (url.pathname?.startsWith(`/${topLevelDirectory}`)) {
        // is a request to an fs item
        const rawQueryParam = url.searchParams.get("raw");
        const isRawFileRequested =
          rawQueryParam !== null || rawQueryParam === "";
        const isUnhandledFileType =
          resolveFileViewer(url.pathname) === undefined;
        if (isRawFileRequested || isUnhandledFileType) {
          const filePath = decodeURIComponent(url.pathname);
          const fsFile = Bun.file(`${fsRootDir}${filePath}`);
          console.log(
            "fsFile exists:",
            `${fsRootDir}${filePath}`,
            await fsFile.exists(),
          );
          if (await fsFile.exists()) {
            const fileName = filePath.split("/").pop() || "file";
            return new Response(fsFile.stream(), {
              headers: {
                "Content-Type": fsFile.type || "application/octet-stream",
                "Content-Disposition": `inline; filename="${fileName}"`,
              },
            });
          }
        }
        break;
      }
    }
    // otherwise, handle normally
    return handler.fetch(request);
  },
});
