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
 *  - `mode`    — the current palette mode (`"light" | "dark"`).
 *  - `setMode` — set the mode explicitly; persists to `localStorage`.
 *  - `toggle`  — flip light ↔ dark.
 */
export function useColorMode(): ColorModeContextValue {
  return useContext(ColorModeContext);
}
