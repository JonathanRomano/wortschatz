import { defineConfig } from "vitest/config";

export default defineConfig({
  // apps/api is ESM with NodeNext-style `.js` extensions on relative imports
  // (e.g. `./services/generate.js`). extensionAlias teaches Vite to resolve
  // those back to the `.ts` source under vitest, mirroring the api's runtime
  // tsx/Node ESM resolution.
  resolve: {
    extensionAlias: {
      ".js": [".ts", ".js"],
    },
  },
  test: {
    environment: "node",
    globals: true,
  },
});
