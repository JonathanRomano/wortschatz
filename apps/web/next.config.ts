import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Heavy, server-only deps. `serverExternalPackages` tells Next to
  // require() them at runtime instead of bundling/transpiling them
  // into the server bundle. Each one of these — especially
  // @prisma/client and @anthropic-ai/sdk — drags hundreds of modules
  // into the dev compile when bundled. None of them are usable from
  // a client component (Prisma can't run there; sharp/bcryptjs are
  // native; Anthropic ships node-only transports), so external is
  // always safe.
  serverExternalPackages: [
    "@prisma/client",
    "@anthropic-ai/sdk",
    "sharp",
    "bcryptjs",
  ],
  experimental: {
    // optimizePackageImports rewrites barrel imports (`from "recharts"`)
    // into per-symbol deep paths at build time, shrinking the dev
    // module graph. Recharts is the main beneficiary here (dashboard
    // uses the barrel); MUI imports are mostly already deep-path but
    // listing them catches any stray barrel uses for free.
    optimizePackageImports: [
      "@mui/material",
      "@mui/icons-material",
      "recharts",
    ],
    // Run webpack compilation in a worker thread so the main process
    // stays responsive while routes compile on demand in dev.
    webpackBuildWorker: true,
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
    "@wortschatz/exercises",
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
