import { describe, it, expect } from "vitest";

import { typography } from "@/theme/typography";

describe("typography", () => {
  it("uses Inter for body copy with a 16px floor", () => {
    expect(typography.fontFamily).toContain("var(--font-inter)");
    expect(typography.body1?.fontFamily).toContain("var(--font-inter)");
    expect(typography.body1?.fontSize).toBe("1rem");
    expect(typography.fontSize).toBe(16);
    expect(typography.htmlFontSize).toBe(16);
  });

  it("uses Fraunces for display headings h1–h4", () => {
    for (const v of ["h1", "h2", "h3", "h4"] as const) {
      const variant = typography[v];
      expect(variant, `${v} variant should be defined`).toBeDefined();
      expect(variant?.fontFamily).toContain("var(--font-fraunces)");
    }
  });

  it("keeps h5/h6 on the sans face — they are UI labels, not display", () => {
    expect(typography.h5?.fontFamily).toContain("var(--font-inter)");
    expect(typography.h6?.fontFamily).toContain("var(--font-inter)");
  });

  it("button typography is non-uppercased and sans-serif", () => {
    expect(typography.button?.textTransform).toBe("none");
    expect(typography.button?.fontFamily).toContain("var(--font-inter)");
  });
});
