"use client";

import { createContext } from "react";

/**
 * The user's color-mode choice. Only `"light"` and `"dark"` since
 * Sprint 04 — the previous `"system"` (follow OS) option was removed
 * to simplify the toggle UX. Pre-Sprint-04 stored values of `"system"`
 * are migrated to `"light"` on the next read.
 */
export type ColorModeChoice = "light" | "dark";

export type ColorModeContextValue = {
  /** Current palette mode. */
  mode: ColorModeChoice;
  /** Set the mode explicitly. Persists to `localStorage`. */
  setMode: (next: ColorModeChoice) => void;
  /** Flip light ↔ dark. */
  toggle: () => void;
};

/**
 * The default context value is only used when the hook is called outside
 * of an `<AppThemeProvider>`. The provider in `src/theme/Provider.tsx`
 * supplies the real implementation.
 */
export const ColorModeContext = createContext<ColorModeContextValue>({
  mode: "light",
  setMode: () => {},
  toggle: () => {},
});

/**
 * Storage key for the user's choice. Kept in one place so the inline
 * FOUC-prevention script in the root layout and the React-side provider
 * stay in sync.
 */
export const COLOR_MODE_STORAGE_KEY = "wortschatz:color-mode";
