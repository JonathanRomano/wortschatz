import { describe, it, expect, beforeEach } from "vitest";
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

// Aria-label is i18n'd to `nav.colorMode.toggle`. Our next-intl mock
// returns "<namespace>.<key>" so we match the key string with a regex
// that also tolerates a real localized fallback (containing "toggle").
const TOGGLE_LABEL = /toggle/i;

describe("<ColorModeToggle />", () => {
  beforeEach(() => {
    installInMemoryLocalStorage();
    delete document.documentElement.dataset.colorMode;
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

  it("flips light ↔ dark on click", async () => {
    const user = userEvent.setup();
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
