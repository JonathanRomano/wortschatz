import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ColorModeToggle } from "@/components/layout/ColorModeToggle";
import { AppThemeProvider } from "@/theme/Provider";
import { COLOR_MODE_STORAGE_KEY } from "@/theme/ColorModeContext";

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

function installMatchMediaStub(matches = false) {
  const mql = {
    matches,
    media: "(prefers-color-scheme: dark)",
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  };
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: vi.fn().mockReturnValue(mql),
  });
}

// Aria-label is i18n'd to `nav.colorMode.toggle`. Our next-intl mock
// returns "<namespace>.<key>" so we match the key string with a regex
// that also tolerates a real localized fallback (containing "toggle").
const TOGGLE_LABEL = /toggle/i;

describe("<ColorModeToggle />", () => {
  beforeEach(() => {
    installInMemoryLocalStorage();
    delete document.documentElement.dataset.colorMode;
    installMatchMediaStub(false);
  });

  it("renders an accessible toggle button", () => {
    render(
      <AppThemeProvider defaultMode="light">
        <ColorModeToggle />
      </AppThemeProvider>,
    );
    const btn = screen.getByRole("button", { name: TOGGLE_LABEL });
    expect(btn).toBeInTheDocument();
  });

  it("cycles light -> dark -> system -> light after three clicks", async () => {
    const user = userEvent.setup();
    // Pre-seed storage to 'light' — the mount effect re-reads storage
    // (it ignores the provider's `defaultMode` prop; see Provider.test).
    window.localStorage.setItem(COLOR_MODE_STORAGE_KEY, "light");
    render(
      <AppThemeProvider>
        <ColorModeToggle />
      </AppThemeProvider>,
    );
    const btn = screen.getByRole("button", { name: TOGGLE_LABEL });

    expect(localStorage.getItem(COLOR_MODE_STORAGE_KEY)).toBe("light");

    await user.click(btn);
    expect(localStorage.getItem(COLOR_MODE_STORAGE_KEY)).toBe("dark");

    await user.click(btn);
    expect(localStorage.getItem(COLOR_MODE_STORAGE_KEY)).toBe("system");

    await user.click(btn);
    expect(localStorage.getItem(COLOR_MODE_STORAGE_KEY)).toBe("light");
  });

  it("keeps its aria-label stable across mode changes", async () => {
    const user = userEvent.setup();
    render(
      <AppThemeProvider defaultMode="light">
        <ColorModeToggle />
      </AppThemeProvider>,
    );
    const btn = screen.getByRole("button", { name: TOGGLE_LABEL });
    const labelBefore = btn.getAttribute("aria-label");

    await user.click(btn);
    await user.click(btn);

    // Same button instance; aria-label is the stable "toggle" string.
    const labelAfter = btn.getAttribute("aria-label");
    expect(labelAfter).toBe(labelBefore);
  });

  it("renders inside a dark-mode provider without throwing", () => {
    render(
      <AppThemeProvider defaultMode="dark">
        <ColorModeToggle />
      </AppThemeProvider>,
    );
    expect(
      screen.getByRole("button", { name: TOGGLE_LABEL }),
    ).toBeInTheDocument();
  });
});
