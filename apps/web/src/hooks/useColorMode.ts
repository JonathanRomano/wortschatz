"use client";

import { useContext } from "react";

import {
  ColorModeContext,
  type ColorModeContextValue,
} from "@/theme/ColorModeContext";

/**
 * Access the active color-mode state and controls. Must be called inside
 * the `<AppThemeProvider>` (which lives in the root locale layout).
 *
 * Returns:
 *  - `mode`         — the user's explicit choice (`"light" | "dark" | "system"`).
 *  - `resolvedMode` — the palette mode actually rendered (`"light" | "dark"`).
 *  - `setMode`      — set the explicit choice; persists to `localStorage`.
 *  - `toggle`       — cycle light -> dark -> system -> light.
 */
export function useColorMode(): ColorModeContextValue {
  return useContext(ColorModeContext);
}
