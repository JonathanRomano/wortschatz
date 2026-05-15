import { describe, it, expect, beforeEach, vi } from "vitest";
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

type Mql = {
  matches: boolean;
  media: string;
  onchange: null;
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
  addListener: ReturnType<typeof vi.fn>;
  removeListener: ReturnType<typeof vi.fn>;
  dispatchEvent: ReturnType<typeof vi.fn>;
};

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

function installMatchMediaStub(matches: boolean): Mql {
  const mql: Mql = {
    matches,
    media: "(prefers-color-scheme: dark)",
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  };
  // `vi.stubGlobal` also patches `window.matchMedia` because jsdom's
  // window === globalThis, but we re-pin via defineProperty to make the
  // assignment survive the StrictMode-style double-mount used in some
  // testing-library configurations.
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: vi.fn().mockReturnValue(mql),
  });
  return mql;
}

describe("<AppThemeProvider />", () => {
  beforeEach(() => {
    installInMemoryLocalStorage();
    delete document.documentElement.dataset.colorMode;
    installMatchMediaStub(false);
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

  it("uses dark palette when localStorage holds 'dark' (the realistic post-hydration path)", () => {
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

  it("resolves to dark when stored mode is 'system' and matchMedia reports dark", () => {
    installMatchMediaStub(true);
    window.localStorage.setItem(COLOR_MODE_STORAGE_KEY, "system");
    render(
      <AppThemeProvider>
        <ModeProbe />
      </AppThemeProvider>,
    );
    expect(screen.getByTestId("mode-probe")).toHaveTextContent("dark");
  });

  it("seeds systemMode from document.documentElement.dataset.colorMode when matchMedia is unavailable", () => {
    // With matchMedia missing, readSystemMode returns null and the mount
    // effect leaves the DOM-seeded value intact.
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: undefined,
    });
    document.documentElement.dataset.colorMode = "dark";

    render(
      <AppThemeProvider defaultMode="system">
        <ModeProbe />
      </AppThemeProvider>,
    );
    expect(screen.getByTestId("mode-probe")).toHaveTextContent("dark");
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

  it("survives without a matchMedia implementation", () => {
    // Some jsdom-based environments still leave matchMedia undefined.
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: undefined,
    });
    render(
      <AppThemeProvider defaultMode="light">
        <ModeProbe />
      </AppThemeProvider>,
    );
    expect(screen.getByTestId("mode-probe")).toHaveTextContent("light");
  });
});
