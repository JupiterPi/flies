import { createRouterClient } from "@orpc/server";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { createIsomorphicFn } from "@tanstack/react-start";

import type { RouterClient } from "@orpc/server";

import { router } from "#/server/index.server";

const getORPCClient = createIsomorphicFn()
  .server(() =>
    createRouterClient(router, {
      context: () => ({
        headers: getRequestHeaders(),
      }),
    }),
  )
  .client((): RouterClient<typeof router> => {
    const link = new RPCLink({
      origin: `${window.location.origin}/api/rpc`,
    });
    return createORPCClient(link);
  });

export const client = getORPCClient();

export const orpc = createTanstackQueryUtils(client);
