import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "@scripts": fileURLToPath(new URL("./scripts", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    css: false,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: [
        "src/theme/**/*.{ts,tsx}",
        "src/components/ui/**/*.{ts,tsx}",
        "src/hooks/**/*.{ts,tsx}",
        "src/components/layout/ColorModeToggle.tsx",
      ],
      exclude: ["**/*.test.{ts,tsx}", "**/__tests__/**", "src/test/**"],
    },
  },
});
