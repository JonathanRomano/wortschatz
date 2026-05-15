import { describe, it, expect } from "vitest";

import { createAppTheme } from "@/theme";

// AppBar's `root` style override is a callback that reads `theme` at
// render time — exercising it from a unit test means resolving the
// override manually so coverage notes the callback as executed.
function callAppBarRoot(mode: "light" | "dark") {
  const theme = createAppTheme(mode);
  const appBar = theme.components?.MuiAppBar;
  const root = appBar?.styleOverrides?.root;
  if (typeof root === "function") {
    return root({ theme, ownerState: {} as never });
  }
  return null;
}

describe("createAppTheme", () => {
  it("builds a light theme with the ink-blue primary", () => {
    const theme = createAppTheme("light");
    expect(theme.palette.mode).toBe("light");
    expect(theme.palette.primary.main).toBe("#1e3a5f");
    expect(theme.palette.secondary.main).toBe("#c2860a");
    expect(theme.palette.background.default).toBe("#fbf7ef");
  });

  it("builds a dark theme with the brightened primary", () => {
    const theme = createAppTheme("dark");
    expect(theme.palette.mode).toBe("dark");
    expect(theme.palette.primary.main).toBe("#93c5fd");
    expect(theme.palette.secondary.main).toBe("#fbbf24");
    expect(theme.palette.background.default).toBe("#0c0a09");
  });

  it("wires the tertiary augmentation onto the live palette", () => {
    const light = createAppTheme("light");
    const dark = createAppTheme("dark");
    expect(light.palette.tertiary).toBeDefined();
    expect(light.palette.tertiary.main).toBe("#78716c");
    expect(dark.palette.tertiary.main).toBe("#a8a29e");
  });

  it("exposes the soft-color augmentations on the live palette", () => {
    const theme = createAppTheme("light");
    expect(theme.palette.accentSoft.main).toBe("#f5e6c2");
    expect(theme.palette.successSoft.main).toBe("#d1fae5");
    expect(theme.palette.dangerSoft.main).toBe("#fee2e2");
    expect(theme.palette.surfaceAlt.main).toBe("#f3ece0");
  });

  it("uses a 25-slot shadows tuple as MUI requires", () => {
    const theme = createAppTheme("light");
    expect(Array.isArray(theme.shadows)).toBe(true);
    expect(theme.shadows.length).toBe(25);
    // Index 0 must be 'none' per MUI's contract.
    expect(theme.shadows[0]).toBe("none");
    // Every other slot is a truthy CSS shadow string.
    for (let i = 1; i < 25; i += 1) {
      const slot = theme.shadows[i];
      expect(typeof slot).toBe("string");
      expect(slot?.length ?? 0).toBeGreaterThan(0);
    }
  });

  it("is deterministic: same mode produces equal palette tokens", () => {
    const a = createAppTheme("light");
    const b = createAppTheme("light");
    expect(a.palette.primary.main).toBe(b.palette.primary.main);
    expect(a.palette.secondary.main).toBe(b.palette.secondary.main);
    expect(a.palette.tertiary.main).toBe(b.palette.tertiary.main);
    expect(a.palette.accentSoft.main).toBe(b.palette.accentSoft.main);
    expect(a.palette.background.default).toBe(b.palette.background.default);
    expect(a.shape.borderRadius).toBe(b.shape.borderRadius);
  });

  it("sets a 6px shape.borderRadius for the global rounded-md feel", () => {
    const theme = createAppTheme("light");
    expect(theme.shape.borderRadius).toBe(6);
  });

  it("wires the MuiAppBar root callback to paper + text-primary tokens", () => {
    const light = callAppBarRoot("light") as Record<string, string>;
    expect(light).not.toBeNull();
    expect(light.backgroundColor).toBe("#ffffff");
    expect(light.color).toBe("#1c1917");
    expect(light.backgroundImage).toBe("none");

    const dark = callAppBarRoot("dark") as Record<string, string>;
    expect(dark.backgroundColor).toBe("#1c1917");
    expect(dark.color).toBe("#fafaf9");
  });
});
