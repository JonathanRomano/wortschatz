"use client";

import { createContext } from "react";

import type { ThemeMode } from "./index";

/**
 * The user's explicit color mode choice. `"system"` defers to the OS
 * `prefers-color-scheme` media query, while `"light"` and `"dark"` are
 * explicit overrides persisted to `localStorage`.
 */
export type ColorModeChoice = "light" | "dark" | "system";

export type ColorModeContextValue = {
  /** The user's explicit choice (may be `"system"`). */
  mode: ColorModeChoice;
  /** The actually-applied palette mode (`"light"` or `"dark"`). */
  resolvedMode: ThemeMode;
  /** Set the explicit choice. Persists to `localStorage`. */
  setMode: (next: ColorModeChoice) => void;
  /** Cycle light -> dark -> system -> light. */
  toggle: () => void;
};

/**
 * The default context value is only used when the hook is called outside
 * of an `<AppThemeProvider>`. The provider in `src/theme/Provider.tsx`
 * supplies the real implementation.
 */
export const ColorModeContext = createContext<ColorModeContextValue>({
  mode: "system",
  resolvedMode: "light",
  setMode: () => {},
  toggle: () => {},
});

/**
 * Storage key for the user's explicit choice. Kept in one place so the
 * inline FOUC-prevention script in the root layout and the React-side
 * provider stay in sync.
 */
export const COLOR_MODE_STORAGE_KEY = "wortschatz:color-mode";
