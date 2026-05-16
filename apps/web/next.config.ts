import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    typedRoutes: false,
  },
  // The @wortschatz/* packages ship source-only (no precompiled dist),
  // with NodeNext-style `.js` extensions on relative imports so they
  // work under tsx / Node ESM. Webpack's default resolver doesn't map
  // those `.js` imports back to `.ts` files. `transpilePackages` tells
  // Next to transpile the package source, and `extensionAlias` teaches
  // webpack the `.js` → `.ts` fallback. Production-ready alternative:
  // add a tsc build to each package and point `main` at dist/index.js.
  transpilePackages: [
    "@wortschatz/config",
    "@wortschatz/types",
    "@wortschatz/database",
  ],
  webpack: (config) => {
    config.resolve.extensionAlias = {
      ...(config.resolve.extensionAlias ?? {}),
      ".js": [".ts", ".tsx", ".js", ".jsx"],
    };
    return config;
  },
};

export default withNextIntl(nextConfig);
