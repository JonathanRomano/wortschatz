import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { useTheme } from "@mui/material/styles";

import { AppThemeProvider } from "@/theme/Provider";
import { COLOR_MODE_STORAGE_KEY } from "@/theme/ColorModeContext";

// Tiny consumer that surfaces the active palette mode so tests can
// assert on the *real* theme MUI ends up rendering rather than guessing
// from rendered styles.
function ModeProbe() {
  const theme = useTheme();
  return <span data-testid="mode-probe">{theme.palette.mode}</span>;
}

function installInMemoryLocalStorage(): void {
  const store = new Map<string, string>();
  const storage: Storage = {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (key: string) => (store.has(key) ? (store.get(key) as string) : null),
    setItem: (key: string, value: string) => {
      store.set(key, String(value));
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    key: (index: number) => Array.from(store.keys())[index] ?? null,
  };
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    writable: true,
    value: storage,
  });
}

describe("<AppThemeProvider />", () => {
  beforeEach(() => {
    installInMemoryLocalStorage();
    delete document.documentElement.dataset.colorMode;
  });

  it("renders children in the default (light) mode", () => {
    render(
      <AppThemeProvider>
        <p>hello</p>
      </AppThemeProvider>,
    );
    expect(screen.getByText("hello")).toBeInTheDocument();
  });

  it("renders children in dark mode without throwing", () => {
    render(
      <AppThemeProvider mode="dark">
        <p>dark child</p>
      </AppThemeProvider>,
    );
    expect(screen.getByText("dark child")).toBeInTheDocument();
  });

  it("uses dark palette when defaultMode='dark' and localStorage is empty", () => {
    render(
      <AppThemeProvider defaultMode="dark">
        <ModeProbe />
      </AppThemeProvider>,
    );
    expect(screen.getByTestId("mode-probe")).toHaveTextContent("dark");
  });

  it("honors legacy `mode` prop when defaultMode is omitted", () => {
    render(
      <AppThemeProvider mode="dark">
        <ModeProbe />
      </AppThemeProvider>,
    );
    expect(screen.getByTestId("mode-probe")).toHaveTextContent("dark");
  });

  it("uses dark palette when localStorage holds 'dark'", () => {
    window.localStorage.setItem(COLOR_MODE_STORAGE_KEY, "dark");
    render(
      <AppThemeProvider>
        <ModeProbe />
      </AppThemeProvider>,
    );
    expect(screen.getByTestId("mode-probe")).toHaveTextContent("dark");
  });

  it("uses light palette when localStorage holds 'light'", () => {
    window.localStorage.setItem(COLOR_MODE_STORAGE_KEY, "light");
    render(
      <AppThemeProvider>
        <ModeProbe />
      </AppThemeProvider>,
    );
    expect(screen.getByTestId("mode-probe")).toHaveTextContent("light");
  });

  it("migrates the pre-Sprint-04 'system' value to light", () => {
    // Users who picked "system" before Sprint 04 should fall back to
    // light without throwing or rendering an invalid theme.
    window.localStorage.setItem(COLOR_MODE_STORAGE_KEY, "system");
    render(
      <AppThemeProvider>
        <ModeProbe />
      </AppThemeProvider>,
    );
    expect(screen.getByTestId("mode-probe")).toHaveTextContent("light");
  });

  it("ignores garbage values and renders light", () => {
    window.localStorage.setItem(COLOR_MODE_STORAGE_KEY, "neon");
    render(
      <AppThemeProvider>
        <ModeProbe />
      </AppThemeProvider>,
    );
    expect(screen.getByTestId("mode-probe")).toHaveTextContent("light");
  });

  it("writes the resolved mode back onto <html data-color-mode>", () => {
    window.localStorage.setItem(COLOR_MODE_STORAGE_KEY, "dark");
    render(
      <AppThemeProvider>
        <ModeProbe />
      </AppThemeProvider>,
    );
    expect(document.documentElement.dataset.colorMode).toBe("dark");
  });
});
