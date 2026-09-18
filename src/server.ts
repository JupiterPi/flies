import handler, { createServerEntry } from "@tanstack/react-start/server-entry";
import * as fs from "node:fs";
import { env } from "./env";
import { resolveFileViewer } from "./data/fileTypeAssociations";
import { hasReadPermission } from "./server/permissions";
import { authFromRequest } from "./server/auth.server";
import { periodicallyCheckAndSendNotifications } from "./server/notificationsService.server";

periodicallyCheckAndSendNotifications();

const fsRootDir = `${env.DATA_DIR}/fs`;

const topLevelDirectories = fs
  .readdirSync(fsRootDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);
console.log("Top-level directories in DATA_DIR:", topLevelDirectories);

export default createServerEntry({
  async fetch(request) {
    return (
      (await routeRawFileRequest(request)) || (await handler.fetch(request))
    );
  },
});

async function routeRawFileRequest(request: Request) {
  const url = new URL(request.url);
  for (const topLevelDirectory of topLevelDirectories) {
    if (url.pathname?.startsWith(`/${topLevelDirectory}`)) {
      // is a request to an fs item
      const rawQueryParam = url.searchParams.get("raw");
      const isRawFileRequested = rawQueryParam !== null || rawQueryParam === "";
      const isUnhandledFileType = resolveFileViewer(url.pathname) === undefined;
      if (isRawFileRequested || isUnhandledFileType) {
        const filePath = decodeURIComponent(url.pathname);
        const auth = await authFromRequest(
          request.headers.get("Authorization"),
          request.headers.get("Cookie"),
          url.searchParams.get("share"),
        );
        if ("error" in auth) {
          return new Response(auth.error, { status: 401 });
        }
        if (!hasReadPermission(auth.permissions, filePath)) {
          return new Response("You do not have permission to read this path", {
            status: 403,
          });
        }
        // todo: when no session cookie is detected, instead of failing, it would be nice to instead
        // return the app with a login prompt, and then it would retry the request with the session cookie
        const fsFile = Bun.file(`${fsRootDir}${filePath}`);
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
  return undefined;
}
