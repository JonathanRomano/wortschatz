import type { TypographyVariantsOptions } from "@mui/material/styles";

// Fonts are wired through CSS variables set by `next/font/google` in
// `src/app/[locale]/layout.tsx`, so the theme references them indirectly
// — that way next/font keeps its preloading + font-display contract.
const SANS =
  'var(--font-inter), ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
const SERIF =
  'var(--font-fraunces), Georgia, "Times New Roman", serif';

export const typography: TypographyVariantsOptions = {
  fontFamily: SANS,
  // 16px floor: iOS Safari zooms inputs smaller than this.
  fontSize: 16,
  htmlFontSize: 16,
  h1: {
    fontFamily: SERIF,
    fontSize: "3rem",
    lineHeight: "3.25rem",
    fontWeight: 600,
    letterSpacing: "-0.02em",
  },
  h2: {
    fontFamily: SERIF,
    fontSize: "2.25rem",
    lineHeight: "2.5rem",
    fontWeight: 600,
    letterSpacing: "-0.015em",
  },
  h3: {
    fontFamily: SERIF,
    fontSize: "1.75rem",
    lineHeight: "2rem",
    fontWeight: 600,
    letterSpacing: "-0.01em",
  },
  h4: {
    fontFamily: SERIF,
    fontSize: "1.375rem",
    lineHeight: "1.75rem",
    fontWeight: 600,
  },
  h5: {
    fontFamily: SANS,
    fontSize: "1.125rem",
    lineHeight: 1.4,
    fontWeight: 600,
  },
  h6: {
    fontFamily: SANS,
    fontSize: "1rem",
    lineHeight: 1.4,
    fontWeight: 600,
  },
  subtitle1: {
    fontFamily: SANS,
    fontSize: "1rem",
    lineHeight: 1.5,
    fontWeight: 500,
  },
  subtitle2: {
    fontFamily: SANS,
    fontSize: "0.875rem",
    lineHeight: 1.5,
    fontWeight: 500,
  },
  body1: {
    fontFamily: SANS,
    fontSize: "1rem",
    lineHeight: 1.6,
  },
  body2: {
    fontFamily: SANS,
    fontSize: "0.875rem",
    lineHeight: 1.55,
  },
  button: {
    fontFamily: SANS,
    fontWeight: 500,
    textTransform: "none",
    fontSize: "1rem",
    letterSpacing: 0,
  },
  caption: {
    fontFamily: SANS,
    fontSize: "0.75rem",
    lineHeight: 1.4,
  },
  overline: {
    fontFamily: SANS,
    fontSize: "0.75rem",
    fontWeight: 500,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    lineHeight: 1.4,
  },
};

export const FONT_SERIF = SERIF;
export const FONT_SANS = SANS;
