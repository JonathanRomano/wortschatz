import { describe, it, expect } from "vitest";

import { lightPalette, darkPalette } from "@/theme/palette";

// These tests pin the brief's color contract to the palette files so
// future drift is caught — the values come straight from the "Tinte &
// Bernstein" design tokens and from the augmentation soft-color keys.

describe("lightPalette", () => {
  it("uses the ink-blue primary and amber secondary", () => {
    expect(lightPalette.mode).toBe("light");
    // Cast through `any` is intentional: PaletteOptions narrows main/contrast
    // to optional, but the brief makes them mandatory.
    expect((lightPalette.primary as { main: string }).main).toBe("#1e3a5f");
    expect((lightPalette.secondary as { main: string }).main).toBe("#c2860a");
  });

  it("uses warm paper-tone backgrounds and ink text", () => {
    expect((lightPalette.background as { default: string; paper: string }).default).toBe(
      "#fbf7ef",
    );
    expect((lightPalette.background as { default: string; paper: string }).paper).toBe(
      "#ffffff",
    );
    expect((lightPalette.text as { primary: string }).primary).toBe("#1c1917");
    expect((lightPalette.text as { secondary: string }).secondary).toBe("#78716c");
    expect(lightPalette.divider).toBe("#e3d9c5");
  });

  it("exposes the augmented soft-color keys with the brief's values", () => {
    expect(lightPalette.tertiary).toBeDefined();
    expect((lightPalette.tertiary as { main: string }).main).toBe("#78716c");
    expect(lightPalette.accentSoft?.main).toBe("#f5e6c2");
    expect(lightPalette.successSoft?.main).toBe("#d1fae5");
    expect(lightPalette.dangerSoft?.main).toBe("#fee2e2");
    expect(lightPalette.surfaceAlt?.main).toBe("#f3ece0");
  });

  it("carries readable contrast tokens on the soft colors", () => {
    expect(lightPalette.accentSoft?.contrastText).toBe("#1c1917");
    expect(lightPalette.successSoft?.contrastText).toBe("#047857");
    expect(lightPalette.dangerSoft?.contrastText).toBe("#b91c1c");
    expect(lightPalette.surfaceAlt?.contrastText).toBe("#1c1917");
  });

  it("uses brand-aligned semantic colors", () => {
    expect((lightPalette.success as { main: string }).main).toBe("#047857");
    expect((lightPalette.error as { main: string }).main).toBe("#b91c1c");
    expect((lightPalette.warning as { main: string }).main).toBe("#c2860a");
    expect((lightPalette.info as { main: string }).main).toBe("#1e3a5f");
  });
});

describe("darkPalette", () => {
  it("uses brightened primary/secondary to read on stone-950", () => {
    expect(darkPalette.mode).toBe("dark");
    expect((darkPalette.primary as { main: string }).main).toBe("#93c5fd");
    expect((darkPalette.secondary as { main: string }).main).toBe("#fbbf24");
  });

  it("uses stone-950 / stone-900 surfaces and bright text", () => {
    expect((darkPalette.background as { default: string; paper: string }).default).toBe(
      "#0c0a09",
    );
    expect((darkPalette.background as { default: string; paper: string }).paper).toBe(
      "#1c1917",
    );
    expect((darkPalette.text as { primary: string }).primary).toBe("#fafaf9");
    expect(darkPalette.divider).toBe("#3f3a32");
  });

  it("exposes the augmented soft-color keys with the brief's dark values", () => {
    expect(darkPalette.tertiary).toBeDefined();
    expect((darkPalette.tertiary as { main: string }).main).toBe("#a8a29e");
    expect(darkPalette.accentSoft?.main).toBe("#4d3d10");
    expect(darkPalette.successSoft?.main).toBe("#052e1c");
    expect(darkPalette.dangerSoft?.main).toBe("#3b0a0a");
    expect(darkPalette.surfaceAlt?.main).toBe("#292524");
  });

  it("uses brand-aligned semantic colors in dark mode", () => {
    expect((darkPalette.success as { main: string }).main).toBe("#34d399");
    expect((darkPalette.error as { main: string }).main).toBe("#fca5a5");
    expect((darkPalette.warning as { main: string }).main).toBe("#fbbf24");
    expect((darkPalette.info as { main: string }).main).toBe("#93c5fd");
  });
});
