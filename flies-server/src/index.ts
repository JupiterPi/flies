import { OpenAPIHandler } from "@orpc/openapi/fetch";
import {
  CORSHandlerPlugin,
  RequestHeadersHandlerPlugin,
  ResponseHeadersHandlerPlugin,
} from "@orpc/server/plugins";
import { fsRoutes } from "./fs";
import { os } from "@orpc/server";
import "@orpc/openapi/extensions/route";
import { openapi, OpenAPIGenerator } from "@orpc/openapi";
import { ZodToJsonSchemaConverter } from "@orpc/zod";
import { OpenAPIReferenceHandlerPlugin } from "@orpc/openapi/plugins";
import { env } from "./env";
import { RPCHandler } from "@orpc/server/fetch";
import { userRoutes } from "./users/users";

export const router = os.meta(openapi({ prefix: "/api" })).router({
  hello: os.route({ method: "GET", path: "/hello" }).handler(async () => {
    return "Hello, Flies!";
  }),
  fs: fsRoutes,
  user: userRoutes,
});
export type router = typeof router;

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
    context: {},
  });

  return response ?? new Response("Not found", { status: 404 });
}

console.log("🚀 Server running at http://localhost:3000");
Bun.serve({
  port: 3000,
  routes: {
    "/rpc": handleRPCRequest,
    "/rpc/*": handleRPCRequest,
    "/api": handleOpenAPIRequest,
    "/api/*": handleOpenAPIRequest,
    /* "/ws/rpc": (req, server) => {
      if (server.upgrade(req)) {
        return new Response("Update successful");
      }
      return new Response("Upgrade failed", { status: 500 });
    }, */
  },
  /* websocket: {
    message(ws, message) {
      rpcHandler.message(ws, message);
    },
    close(ws) {
      rpcHandler.close(ws);
    },
  }, */
});
