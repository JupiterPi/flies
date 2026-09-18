import "#/polyfill";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { createFileRoute } from "@tanstack/react-router";
import { onError } from "@orpc/server";
import { OpenAPIReferenceHandlerPlugin } from "@orpc/openapi/plugins";
import { ZodToJsonSchemaConverter } from "@orpc/zod";
import { router } from "#/server/api/index.server";
import { env } from "#/env";
import { OpenAPIGenerator } from "@orpc/openapi";
import {
  CORSHandlerPlugin,
  RequestHeadersHandlerPlugin,
  ResponseHeadersHandlerPlugin,
} from "@orpc/server/plugins";

const generator = new OpenAPIGenerator({
  converters: [new ZodToJsonSchemaConverter()],
});
const handler = new OpenAPIHandler(router, {
  interceptors: [
    onError((error) => {
      console.error(error);
    }),
  ],
  plugins: [
    new CORSHandlerPlugin(),
    new RequestHeadersHandlerPlugin(),
    new ResponseHeadersHandlerPlugin(),
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

async function handle({ request }: { request: Request }) {
  const { response } = await handler.handle(request, {
    prefix: "/api",
    context: {},
  });

  return response ?? new Response("Not Found", { status: 404 });
}

export const Route = createFileRoute("/(api)/api/$")({
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
