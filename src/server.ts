import handler, { createServerEntry } from "@tanstack/react-start/server-entry";
import { authFromRequest } from "./server/auth.server";
import { runSavedApps } from "./apps/runningAppsManager.server";
import { instantiateApp } from "./apps/appsRegistry";
import { env } from "./env";
import { permissions, Privileges } from "./server/permissions";
import { joinPath, pathFilename } from "./utils";
import { vfs } from "./server/vfs.server";

runSavedApps();

if (env.rateLimitingHeader === "") {
  console.warn(
    "WARNING: RATE_LIMITING_HEADER is not set. Rate limiting is disabled.",
  );
}

const topLevelDirectories = (await vfs.listDir(Privileges.PRIVILEGES_all(), ""))
  .filter((entry) => entry.type === "directory")
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
      const filePath = joinPath(decodeURIComponent(url.pathname));
      // is a request to an fs item
      const isDirectory =
        (await vfs.getInfo(Privileges.PRIVILEGES_all(), filePath)).type ===
        "directory";
      const rawQueryParam = url.searchParams.get("raw");
      const isRawFileRequested = rawQueryParam !== null || rawQueryParam === "";
      const isUnhandledFileType =
        instantiateApp({ path: url.pathname }) === null;
      if (!isDirectory && (isRawFileRequested || isUnhandledFileType)) {
        console.log("Raw file request for:", filePath);
        const auth = await authFromRequest(
          request.headers.get("Authorization"),
          request.headers.get("Cookie"),
          url.searchParams.get("share"),
        );
        if ("error" in auth) {
          return new Response(auth.error, { status: 401 });
        }
        if (!permissions.read(filePath).check(auth.privileges)) {
          return new Response(
            "You do not have permission to read " + filePath,
            {
              status: 403,
            },
          );
        }
        // todo: when no session cookie is detected, instead of failing, it would be nice to instead
        // return the app with a login prompt, and then it would retry the request with the session cookie
        if (await vfs.exists(auth.privileges, filePath)) {
          return new Response(
            await vfs.downloadFile(auth.privileges, filePath),
            {
              headers: {
                "Content-Type":
                  vfs.getMimeType(auth.privileges, filePath) ||
                  "application/octet-stream",
                "Content-Disposition": `inline; filename="${pathFilename(filePath)}"`,
              },
            },
          );
        }
      }
      break;
    }
  }
  return undefined;
}
