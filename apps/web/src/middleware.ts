import NextAuth from "next-auth";
import createIntlMiddleware from "next-intl/middleware";

import { authConfig } from "@/auth.config";
import { defaultLocale, locales } from "@/i18n/config";

const intlMiddleware = createIntlMiddleware({
  locales: [...locales],
  defaultLocale,
  localePrefix: "always",
});

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  // Authorization (auth.config.callbacks.authorized) gates access; the
  // intl middleware then handles locale routing for everything else.
  return intlMiddleware(req);
});

export const config = {
  // Match all paths except Next.js internals, API auth, static files.
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
