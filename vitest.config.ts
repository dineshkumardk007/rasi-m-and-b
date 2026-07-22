import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/**
 * Unit tests for the pure logic — session tokens, password hashing, the
 * bilingual dictionary, policy copy and formatting helpers. Anything that needs
 * Supabase is out of scope here; those paths are covered by running the site in
 * demo mode.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // `server-only` throws by design when imported outside a React Server
      // Component. That guard is the point of the package, but it also stops a
      // plain Node test from importing the modules it protects, so tests swap
      // it for a no-op.
      "server-only": fileURLToPath(new URL("./tests/stubs/server-only.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // Keeps env.mjs on its keyless demo path rather than demanding real keys.
    env: { SKIP_ENV_VALIDATION: "1" },
  },
});
