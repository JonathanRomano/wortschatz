// TypeScript module augmentation for MUI palette extensions.
//
// We add a few keys that don't ship with MUI by default but model the
// "Tinte & Bernstein" visual language:
//   - tertiary       — warm stone, used where the old design called
//                      muted-foreground (de-emphasized text, soft chips).
//   - accentSoft     — amber tint for emphasis backgrounds.
//   - successSoft    — green tint for "passed" surfaces.
//   - dangerSoft     — red tint for "failed" / error surfaces.
//   - surfaceAlt     — subtle alt fill, slightly warmer than the paper.
//
// Augmenting both `Palette` and `PaletteOptions` keeps the createTheme
// factory in `index.ts` type-safe and lets consumers write
// `theme.palette.tertiary.main` without `as any`.

import "@mui/material/styles";

type SoftColor = {
  main: string;
  contrastText?: string;
};

declare module "@mui/material/styles" {
  interface Palette {
    tertiary: Palette["primary"];
    accentSoft: SoftColor;
    successSoft: SoftColor;
    dangerSoft: SoftColor;
    surfaceAlt: SoftColor;
  }

  interface PaletteOptions {
    tertiary?: PaletteOptions["primary"];
    accentSoft?: SoftColor;
    successSoft?: SoftColor;
    dangerSoft?: SoftColor;
    surfaceAlt?: SoftColor;
  }
}

// Make `<Chip color="tertiary">` etc. type-check.
declare module "@mui/material/Chip" {
  interface ChipPropsColorOverrides {
    tertiary: true;
  }
}

declare module "@mui/material/Button" {
  interface ButtonPropsColorOverrides {
    tertiary: true;
  }
}

declare module "@mui/material/IconButton" {
  interface IconButtonPropsColorOverrides {
    tertiary: true;
  }
}

export {};
