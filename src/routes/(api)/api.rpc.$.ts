import "#/polyfill";

import { RPCHandler } from "@orpc/server/fetch";
import { createFileRoute } from "@tanstack/react-router";
import { router } from "#/server/api/index.server";
import {
  CORSHandlerPlugin,
  RequestHeadersHandlerPlugin,
  ResponseHeadersHandlerPlugin,
} from "@orpc/server/plugins";

const handler = new RPCHandler(router, {
  plugins: [
    new CORSHandlerPlugin(),
    new RequestHeadersHandlerPlugin(),
    new ResponseHeadersHandlerPlugin(),
  ],
});

async function handle({ request }: { request: Request }) {
  const { response } = await handler.handle(request, {
    prefix: "/api/rpc",
    context: {},
  });

  return response ?? new Response("Not Found", { status: 404 });
}

export const Route = createFileRoute("/(api)/api/rpc/$")({
  server: {
    handlers: {
      HEAD: handle,
      GET: handle,
      POST: handle,
      PUT: handle,
      PATCH: handle,
      DELETE: handle,
    },
  },
});
