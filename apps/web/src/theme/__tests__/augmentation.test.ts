import { describe, it, expectTypeOf, expect } from "vitest";
import type { Palette } from "@mui/material/styles";

import { createAppTheme } from "@/theme";
import "@/theme/augmentation";

// This file is mostly a type smoke test — it must compile for the
// augmentation to be valid. The runtime assertion just exercises the
// types at runtime to keep the assertion count non-zero.

describe("palette augmentation (compile-time)", () => {
  it("declares `tertiary.main` as a string on Palette", () => {
    expectTypeOf<Palette["tertiary"]["main"]>().toEqualTypeOf<string>();
    expectTypeOf<Palette["accentSoft"]["main"]>().toEqualTypeOf<string>();
    expectTypeOf<Palette["successSoft"]["main"]>().toEqualTypeOf<string>();
    expectTypeOf<Palette["dangerSoft"]["main"]>().toEqualTypeOf<string>();
    expectTypeOf<Palette["surfaceAlt"]["main"]>().toEqualTypeOf<string>();
  });

  it("surfaces the augmented keys at runtime through createAppTheme", () => {
    const theme = createAppTheme("light");
    // No `as any` needed — if the augmentation regresses, this stops
    // compiling.
    const tertiary: string = theme.palette.tertiary.main;
    const accentSoft: string = theme.palette.accentSoft.main;
    expect(tertiary).toBeTypeOf("string");
    expect(accentSoft).toBeTypeOf("string");
  });
});
