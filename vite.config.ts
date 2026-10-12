import { defineConfig } from "vite";

import { tanstackStart } from "@tanstack/react-start/plugin/vite";

import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { nitro } from "nitro/vite";

function prohibitUnsafeFileAccess() {
  return {
    name: "prohibit-unsafe-file-access",
    transform(code: string, id: string) {
      // skip node_modules to avoid scanning third-party libraries
      if (id.includes("node_modules")) return null;
      if (id.includes("nitro")) return null;

      // skip safe file
      if (id.includes("vfs.server.ts")) return null;

      if (
        code.includes("Bun.file") ||
        code.includes("node:fs") ||
        code.includes('"fs"')
      ) {
        throw new Error(
          `[prohibit-unsafe-file-access] Found forbidden string in file: ${id}`,
        );
      }
      return null;
    },
  };
}

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    prohibitUnsafeFileAccess(),
    nitro({ preset: "bun", rollupConfig: { external: [/^@sentry\//] } }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ],
});

export default config;
