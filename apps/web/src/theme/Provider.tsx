"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import GlobalStyles from "@mui/material/GlobalStyles";

import { createAppTheme, type ThemeMode } from "./index";
import {
  COLOR_MODE_STORAGE_KEY,
  ColorModeContext,
  type ColorModeChoice,
  type ColorModeContextValue,
} from "./ColorModeContext";

type Props = {
  children: ReactNode;
  /**
   * Optional initial mode. Mostly useful for tests; in normal operation
   * the provider reads from `localStorage` on mount and falls back to
   * `"light"`.
   */
  defaultMode?: ColorModeChoice;
  /**
   * Legacy Task-1 prop. Kept so existing call sites don't have to
   * change.
   */
  mode?: ColorModeChoice;
};

function readStoredMode(): ColorModeChoice | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(COLOR_MODE_STORAGE_KEY);
    if (raw === "light" || raw === "dark") return raw;
    // Pre-Sprint-04 users may have "system" stored. Treat as light and
    // let the next toggle persist the new choice.
  } catch {
    // Safari private mode / disabled storage — fall through.
  }
  return null;
}

// `useLayoutEffect` warns when called server-side. The Provider is a
// `"use client"` component but Next.js still SSRs it, so swap to
// `useEffect` on the server pass to silence the warning while keeping
// the synchronous-before-paint behavior on the client.
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export function AppThemeProvider({
  children,
  defaultMode,
  mode: legacyMode,
}: Props) {
  const initialMode: ColorModeChoice = defaultMode ?? legacyMode ?? "light";
  // Both server and first client render use `initialMode` so MUI's
  // emotion cache emits the same classNames. The actual stored choice
  // is picked up inside the layout effect below — synchronously, before
  // the browser paints — so dark-mode users see one frame of dark, not
  // a flash of light → dark.
  const [mode, setModeState] = useState<ColorModeChoice>(initialMode);

  useIsomorphicLayoutEffect(() => {
    const stored = readStoredMode();
    if (stored !== null) setModeState(stored);
  }, []);

  // Keep <html data-color-mode> and color-scheme in sync once React
  // owns the state. The inline script in the root layout handles the
  // very first paint.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    root.dataset.colorMode = mode;
    root.style.colorScheme = mode;
  }, [mode]);

  const setMode = useCallback((next: ColorModeChoice) => {
    setModeState(next);
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(COLOR_MODE_STORAGE_KEY, next);
    } catch {
      // Storage unavailable — fail silently; state still applies for the session.
    }
  }, []);

  const toggle = useCallback(() => {
    setModeState((current) => {
      const next: ColorModeChoice = current === "light" ? "dark" : "light";
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(COLOR_MODE_STORAGE_KEY, next);
        } catch {
          // Ignore storage failures (Safari private mode, etc.).
        }
      }
      return next;
    });
  }, []);

  const theme = useMemo(() => createAppTheme(mode), [mode]);

  const contextValue = useMemo<ColorModeContextValue>(
    () => ({ mode, setMode, toggle }),
    [mode, setMode, toggle],
  );

  return (
    <AppRouterCacheProvider options={{ key: "mui" }}>
      <ColorModeContext.Provider value={contextValue}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <GlobalStyles
            styles={(t) => ({
              // Paper-grain ambience. CSS can't read MUI tokens directly,
              // so we set them on :root from inside the theme provider and
              // reference them in the body::before pseudo-element below.
              ":root": {
                "--paper-grain-accent": t.palette.secondary.main,
                "--paper-grain-primary": t.palette.primary.main,
                "--app-bg-default": t.palette.background.default,
                "--app-bg-paper": t.palette.background.paper,
              },
              // Pin native color-scheme so scrollbars, form controls and
              // browser-rendered widgets match the active palette. The
              // blocking script in the root layout sets this on first
              // paint; this rule keeps it in sync once React takes over.
              ':root[data-color-mode="dark"]': {
                colorScheme: "dark",
              },
              ':root[data-color-mode="light"]': {
                colorScheme: "light",
              },
              body: {
                backgroundColor: t.palette.background.default,
                color: t.palette.text.primary,
              },
              "body::before": {
                content: '""',
                position: "fixed",
                inset: 0,
                pointerEvents: "none",
                zIndex: -1,
                background: [
                  "radial-gradient(1200px 600px at 12% -10%, color-mix(in srgb, var(--paper-grain-accent) 6%, transparent), transparent 60%)",
                  "radial-gradient(900px 500px at 100% 110%, color-mix(in srgb, var(--paper-grain-primary) 5%, transparent), transparent 60%)",
                ].join(", "),
              },
              "::selection": {
                backgroundColor: t.palette.secondary.main,
                color: t.palette.secondary.contrastText,
              },
            })}
          />
          {children}
        </ThemeProvider>
      </ColorModeContext.Provider>
    </AppRouterCacheProvider>
  );
}

// Legacy export — the previous Task-1 prop was `mode` and was always
// `"light"`. We keep the type alias for any consumer that imported it.
export type { ThemeMode };
