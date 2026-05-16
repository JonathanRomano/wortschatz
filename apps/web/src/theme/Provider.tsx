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
   * Optional initial explicit choice. Mostly useful for tests; in normal
   * operation the provider reads from `localStorage` on mount and falls
   * back to `"system"`.
   */
  defaultMode?: ColorModeChoice;
  /**
   * Legacy Task-1 prop. Accepts `"light" | "dark"` as a shorthand for
   * `defaultMode`. Kept so existing call sites (and the Task-1 unit
   * tests) don't have to change.
   */
  mode?: ColorModeChoice;
};

const PREFERS_DARK_QUERY = "(prefers-color-scheme: dark)";

function readStoredMode(): ColorModeChoice | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(COLOR_MODE_STORAGE_KEY);
    if (raw === "light" || raw === "dark" || raw === "system") return raw;
  } catch {
    // Safari private mode / disabled storage — fall through.
  }
  return null;
}

function readSystemMode(): ThemeMode | null {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return null;
  }
  return window.matchMedia(PREFERS_DARK_QUERY).matches ? "dark" : "light";
}

// The blocking inline script in the root layout writes the resolved
// mode to `<html data-color-mode="…">` before React hydrates. We read
// it back inside a layout effect (not in `useState`) so the very first
// React render still matches what the server emitted — otherwise every
// emotion-hashed className for dark-mode users would mismatch between
// SSR and hydration. The layout effect runs synchronously before the
// browser paints, so the dark theme swap is invisible to the user.
function readDomResolvedMode(): ThemeMode | null {
  if (typeof document === "undefined") return null;
  const value = document.documentElement.dataset.colorMode;
  return value === "dark" || value === "light" ? value : null;
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
  const initialMode: ColorModeChoice = defaultMode ?? legacyMode ?? "system";
  // The server has no access to localStorage or matchMedia, so it
  // always renders with `mode = initialMode` and `systemMode = "light"`.
  // The first client render (during hydration) must produce the same
  // tree to avoid a hydration mismatch on every emotion-styled class
  // name. Reading the user's actual preference happens in the layout
  // effect below — synchronously, before the browser paints.
  const [mode, setModeState] = useState<ColorModeChoice>(initialMode);
  const [systemMode, setSystemMode] = useState<ThemeMode>("light");
  const [hydrated, setHydrated] = useState(false);

  // Pick up the persisted choice + current system mode synchronously
  // after the hydration commit. `useLayoutEffect` guarantees the state
  // update is flushed before the browser paints, so dark-mode users
  // see one frame of dark, not a flash of light → dark. matchMedia is
  // the source of truth for `systemMode`; if the browser doesn't have
  // it (older Safari, some test envs), we fall back to whatever the
  // blocking inline script wrote on <html>.
  useIsomorphicLayoutEffect(() => {
    const stored = readStoredMode();
    if (stored !== null) setModeState(stored);
    const system = readSystemMode() ?? readDomResolvedMode();
    if (system !== null) setSystemMode(system);
    setHydrated(true);
  }, []);

  // Subscribe to system-preference changes — only meaningful when the
  // user has chosen "system", but the listener is cheap so we keep it
  // mounted regardless.
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }
    const mql = window.matchMedia(PREFERS_DARK_QUERY);
    const handler = (event: MediaQueryListEvent) => {
      setSystemMode(event.matches ? "dark" : "light");
    };
    // `addEventListener` is the modern API; older Safari uses `addListener`.
    if (typeof mql.addEventListener === "function") {
      mql.addEventListener("change", handler);
      return () => mql.removeEventListener("change", handler);
    }
    mql.addListener(handler);
    return () => mql.removeListener(handler);
  }, []);

  const resolvedMode: ThemeMode = mode === "system" ? systemMode : mode;

  // Keep the <html> data attribute and color-scheme in sync once React
  // owns the state. The inline script handles the very first paint.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    root.dataset.colorMode = resolvedMode;
    root.style.colorScheme = resolvedMode;
  }, [resolvedMode]);

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
      const next: ColorModeChoice =
        current === "light" ? "dark" : current === "dark" ? "system" : "light";
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

  const theme = useMemo(() => createAppTheme(resolvedMode), [resolvedMode]);

  const contextValue = useMemo<ColorModeContextValue>(
    () => ({ mode, resolvedMode, setMode, toggle }),
    [mode, resolvedMode, setMode, toggle],
  );

  // `hydrated` is intentionally not gating render — we want SSR markup,
  // just expose the flag for any consumer that needs to defer (none for now).
  void hydrated;

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
