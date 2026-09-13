import { OpenAPIHandler } from "@orpc/openapi/fetch";
import {
  CORSHandlerPlugin,
  RequestHeadersHandlerPlugin,
  ResponseHeadersHandlerPlugin,
} from "@orpc/server/plugins";
import { OpenAPIGenerator } from "@orpc/openapi";
import { ZodToJsonSchemaConverter } from "@orpc/zod";
import { OpenAPIReferenceHandlerPlugin } from "@orpc/openapi/plugins";
import { env } from "./env";
import { RPCHandler } from "@orpc/server/fetch";
import { resolveFileViewer } from "./fileTypeAssociations";
import { router } from ".";
import { fsRootDir } from "./fs";

const rpcHandler = new RPCHandler(router, {
  plugins: [
    new CORSHandlerPlugin(),
    new RequestHeadersHandlerPlugin(),
    new ResponseHeadersHandlerPlugin(),
  ],
});

async function handleRPCRequest(request: Request) {
  const { response } = await rpcHandler.handle(request, {
    prefix: "/rpc",
    context: {},
  });

  return response ?? new Response("Not found", { status: 404 });
}

const generator = new OpenAPIGenerator({
  converters: [new ZodToJsonSchemaConverter()],
});
const openapiHandler = new OpenAPIHandler(router, {
  plugins: [
    new CORSHandlerPlugin(),
    new OpenAPIReferenceHandlerPlugin({
      spec: () =>
        generator.generate(router, {
          base: {
            info: {
              title: "Flies",
              version: "0.0.0",
            },
            servers: [{ url: `${env.SERVER_URL}/api` }],
          },
        }),
    }),
  ],
});

async function handleOpenAPIRequest(request: Request) {
  const { response } = await openapiHandler.handle(request, {
    prefix: "/api",
    context: {},
  });

  return response ?? new Response("Not found", { status: 404 });
}

console.log("🚀 Server running at http://localhost:3000");
Bun.serve({
  port: 3000,
  routes: {
    "/hello": new Response("Hello, Flies!"),
    "/rpc": handleRPCRequest,
    "/rpc/*": handleRPCRequest,
    "/api": handleOpenAPIRequest,
    "/api/*": handleOpenAPIRequest,
    "/*": async (request) => {
      const root = "../flies-app/dist"; // make environment-dependent (dev/prod)

      const url = new URL(request.url);
      const filePathEncoded =
        url.pathname === "/" ? "/index.html" : url.pathname;
      const filePath = decodeURIComponent(filePathEncoded);

      // serve dist files that exist
      const file = Bun.file(`${root}${filePath}`);
      if (await file.exists()) {
        return new Response(file.stream(), {
          headers: {
            "Content-Type": file.type || "application/octet-stream",
          },
        });
      }

      // serve fs files that exist, if query param is set or is one of the unhandled filetypes
      const rawQueryParam = url.searchParams.get("raw");
      const isRawFileRequested = rawQueryParam !== null || rawQueryParam === "";
      const isUnhandledFileType = resolveFileViewer(filePath) === undefined;
      if (isRawFileRequested || isUnhandledFileType) {
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

      // otherwise, fallback to index.html for SPA routing
      const indexFile = Bun.file(`${root}/index.html`);
      return new Response(indexFile.stream(), {
        headers: {
          "Content-Type": "text/html",
        },
      });
    },
  },
});
