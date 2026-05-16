import type { ReactElement, ReactNode } from "react";
import { render, type RenderOptions, type RenderResult } from "@testing-library/react";
import { ThemeProvider } from "@mui/material/styles";

import { createAppTheme, type ThemeMode } from "@/theme";

type Wrapper = ({ children }: { children: ReactNode }) => ReactElement;

function makeWrapper(mode: ThemeMode): Wrapper {
  const theme = createAppTheme(mode);
  return function ThemeWrapper({ children }) {
    return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
  };
}

/**
 * Render a UI element under an MUI ThemeProvider in the requested mode.
 * `mode` defaults to `"light"` so callers can write
 * `renderWithTheme(<X />)` for the common case.
 */
export function renderWithTheme(
  ui: ReactElement,
  mode: ThemeMode = "light",
  options?: Omit<RenderOptions, "wrapper">,
): RenderResult {
  return render(ui, { wrapper: makeWrapper(mode), ...options });
}

export function renderLight(
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">,
): RenderResult {
  return renderWithTheme(ui, "light", options);
}

export function renderDark(
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">,
): RenderResult {
  return renderWithTheme(ui, "dark", options);
}

// Default export keeps imports terse when callers only need the helper.
export default renderWithTheme;
