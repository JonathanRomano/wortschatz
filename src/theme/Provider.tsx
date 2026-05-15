"use client";

import { useMemo, type ReactNode } from "react";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import GlobalStyles from "@mui/material/GlobalStyles";

import { createAppTheme, type ThemeMode } from "./index";

type Props = {
  children: ReactNode;
  // Task 1 hard-codes 'light' from the layout. Task 2 will lift this up
  // to a context + persistence layer; keeping the prop here means the
  // wiring story for Task 2 is "pass `mode={resolvedMode}`" and nothing
  // else has to change.
  mode?: ThemeMode;
};

export function AppThemeProvider({ children, mode = "light" }: Props) {
  const theme = useMemo(() => createAppTheme(mode), [mode]);

  return (
    <AppRouterCacheProvider options={{ key: "mui" }}>
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
    </AppRouterCacheProvider>
  );
}
