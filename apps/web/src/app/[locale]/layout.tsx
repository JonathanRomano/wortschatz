import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Inter, Fraunces } from "next/font/google";
import Box from "@mui/material/Box";

import { locales, type Locale } from "@/i18n/config";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { AppThemeProvider } from "@/theme/Provider";

const inter = Inter({
  subsets: ["latin", "latin-ext", "cyrillic", "cyrillic-ext"],
  variable: "--font-inter",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin", "latin-ext"],
  variable: "--font-fraunces",
  display: "swap",
  // Slightly warmer optical sizing for headings.
  axes: ["SOFT", "WONK", "opsz"],
});

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

// Blocking inline script that resolves the user's color-mode preference
// before React hydrates. Reads `localStorage["wortschatz:color-mode"]`
// (one of "light" | "dark" | "system"; defaults to "system") and falls
// back to `prefers-color-scheme` when the choice is "system". Writes the
// result to `documentElement.dataset.colorMode` and `style.colorScheme`
// so the first paint matches the active palette and native scrollbars /
// form controls render with the right base scheme.
//
// Must be self-contained and dependency-free: no `process.env`, no
// imports. Wrapped in try/catch so Safari private mode and other
// `localStorage`-throwing browsers degrade to the system preference.
const COLOR_MODE_BOOT_SCRIPT = `(function(){try{var k='wortschatz:color-mode';var s=null;try{s=window.localStorage.getItem(k);}catch(e){}if(s!=='light'&&s!=='dark'&&s!=='system')s='system';var r=s;if(r==='system'){r=(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches)?'dark':'light';}var d=document.documentElement;d.dataset.colorMode=r;d.style.colorScheme=r;}catch(e){}})();`;

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!locales.includes(locale as Locale)) notFound();
  setRequestLocale(locale);

  const messages = await getMessages();

  return (
    // suppressHydrationWarning is required because COLOR_MODE_BOOT_SCRIPT
    // below writes `data-color-mode` and `style.color-scheme` onto this
    // element before React hydrates. The server-rendered HTML has neither
    // attribute, so without this flag React would warn about an attribute
    // mismatch on first hydration. The suppression is one element deep
    // (per React docs) — it does *not* silence mismatches inside <body>,
    // which is why the theme provider keeps the very first React render
    // in light mode and only swaps to the user's preference in a layout
    // effect; see Provider.tsx for the matching half of this contract.
    <html
      lang={locale}
      className={`${inter.variable} ${fraunces.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/*
          Runs synchronously before <body> paints. Resolves the persisted
          color-mode choice (or `prefers-color-scheme` for "system") and
          stamps it onto <html> so first paint matches. See the script
          definition above for the contract.
        */}
        <script
          dangerouslySetInnerHTML={{ __html: COLOR_MODE_BOOT_SCRIPT }}
        />
      </head>
      <body>
        <AppThemeProvider>
          <NextIntlClientProvider messages={messages} locale={locale}>
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                minHeight: "100vh",
              }}
            >
              <Header />
              <Box
                component="main"
                sx={{ display: "flex", flex: 1, flexDirection: "column", width: "100%" }}
              >
                {children}
              </Box>
              <Footer />
            </Box>
          </NextIntlClientProvider>
        </AppThemeProvider>
      </body>
    </html>
  );
}
