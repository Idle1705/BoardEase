import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Runs only *.integration.test.ts, against the Neon DEV branch (DISCOVERY_DATABASE_URL), one file at a time.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(new URL("./src/test/server-only-stub.ts", import.meta.url)),
    },
  },
  test: { include: ["src/**/*.integration.test.ts"], testTimeout: 60_000, fileParallelism: false },
});
