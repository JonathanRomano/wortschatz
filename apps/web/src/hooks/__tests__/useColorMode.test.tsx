import { describe, it, expect, beforeEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";

import { useColorMode } from "@/hooks/useColorMode";
import { AppThemeProvider } from "@/theme/Provider";
import { COLOR_MODE_STORAGE_KEY } from "@/theme/ColorModeContext";

// Vitest 4 + jsdom 29 exposes `window.localStorage` as a placeholder
// without the Storage methods (likely waiting on the unset
// `--localstorage-file` flag). We swap in a tiny in-memory store so the
// provider's `setItem`/`getItem` calls actually round-trip.
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

function wrapper({ children }: { children: ReactNode }) {
  return <AppThemeProvider>{children}</AppThemeProvider>;
}

describe("useColorMode (outside provider)", () => {
  beforeEach(() => {
    installInMemoryLocalStorage();
    delete document.documentElement.dataset.colorMode;
  });

  it("returns safe defaults when called without a provider", () => {
    const { result } = renderHook(() => useColorMode());
    expect(result.current.mode).toBe("light");
  });

  it("does not throw when calling setMode/toggle outside a provider", () => {
    const { result } = renderHook(() => useColorMode());
    expect(() => result.current.setMode("dark")).not.toThrow();
    expect(() => result.current.toggle()).not.toThrow();
  });
});

describe("useColorMode (inside AppThemeProvider)", () => {
  beforeEach(() => {
    installInMemoryLocalStorage();
    delete document.documentElement.dataset.colorMode;
  });

  it("setMode('dark') updates mode", () => {
    const { result } = renderHook(() => useColorMode(), { wrapper });
    expect(result.current.mode).toBe("light");

    act(() => {
      result.current.setMode("dark");
    });

    expect(result.current.mode).toBe("dark");
  });

  it("toggle flips light ↔ dark", () => {
    const { result } = renderHook(() => useColorMode(), { wrapper });

    act(() => {
      result.current.setMode("light");
    });
    expect(result.current.mode).toBe("light");

    act(() => {
      result.current.toggle();
    });
    expect(result.current.mode).toBe("dark");

    act(() => {
      result.current.toggle();
    });
    expect(result.current.mode).toBe("light");
  });

  it("persists explicit choices to localStorage", () => {
    const { result } = renderHook(() => useColorMode(), { wrapper });

    act(() => {
      result.current.setMode("dark");
    });
    expect(localStorage.getItem(COLOR_MODE_STORAGE_KEY)).toBe("dark");

    act(() => {
      result.current.setMode("light");
    });
    expect(localStorage.getItem(COLOR_MODE_STORAGE_KEY)).toBe("light");
  });

  it("toggle persists the new value to localStorage", () => {
    const { result } = renderHook(() => useColorMode(), { wrapper });

    act(() => {
      result.current.setMode("light");
    });
    expect(localStorage.getItem(COLOR_MODE_STORAGE_KEY)).toBe("light");

    act(() => {
      result.current.toggle();
    });
    expect(localStorage.getItem(COLOR_MODE_STORAGE_KEY)).toBe("dark");
  });
});
