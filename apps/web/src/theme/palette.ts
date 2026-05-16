import type { PaletteOptions } from "@mui/material/styles";

import "./augmentation";

// Tinte & Bernstein — Wortschatz palette.
//
// Light mode is the warm-paper textbook look (ink-blue primary, amber
// secondary). Dark mode keeps the same identity but inverts the surfaces
// to stone-950 and brightens both primary and secondary so they read
// against the dark paper.

export const lightPalette: PaletteOptions = {
  mode: "light",
  primary: {
    main: "#1e3a5f", // Tinte — ink blue
    contrastText: "#fbf7ef",
  },
  secondary: {
    main: "#c2860a", // Bernstein — amber
    contrastText: "#1c1917",
  },
  tertiary: {
    main: "#78716c", // warm stone — for muted text / de-emphasized chips
    contrastText: "#fbf7ef",
  },
  success: {
    main: "#047857",
    contrastText: "#ffffff",
  },
  warning: {
    main: "#c2860a",
    contrastText: "#1c1917",
  },
  error: {
    main: "#b91c1c",
    contrastText: "#ffffff",
  },
  info: {
    main: "#1e3a5f",
    contrastText: "#fbf7ef",
  },
  background: {
    default: "#fbf7ef", // Papier
    paper: "#ffffff",
  },
  text: {
    primary: "#1c1917",
    secondary: "#78716c",
  },
  divider: "#e3d9c5",
  accentSoft: { main: "#f5e6c2", contrastText: "#1c1917" },
  successSoft: { main: "#d1fae5", contrastText: "#047857" },
  dangerSoft: { main: "#fee2e2", contrastText: "#b91c1c" },
  surfaceAlt: { main: "#f3ece0", contrastText: "#1c1917" },
};

export const darkPalette: PaletteOptions = {
  mode: "dark",
  primary: {
    main: "#93c5fd", // sky-300
    contrastText: "#0c0a09",
  },
  secondary: {
    main: "#fbbf24", // amber-400
    contrastText: "#0c0a09",
  },
  tertiary: {
    main: "#a8a29e", // stone-400
    contrastText: "#0c0a09",
  },
  success: {
    main: "#34d399",
    contrastText: "#0c0a09",
  },
  warning: {
    main: "#fbbf24",
    contrastText: "#0c0a09",
  },
  error: {
    main: "#fca5a5",
    contrastText: "#0c0a09",
  },
  info: {
    main: "#93c5fd",
    contrastText: "#0c0a09",
  },
  background: {
    default: "#0c0a09", // stone-950
    paper: "#1c1917", // stone-900
  },
  text: {
    primary: "#fafaf9",
    secondary: "#a8a29e",
  },
  divider: "#3f3a32",
  accentSoft: { main: "#4d3d10", contrastText: "#fbbf24" },
  successSoft: { main: "#052e1c", contrastText: "#34d399" },
  dangerSoft: { main: "#3b0a0a", contrastText: "#fca5a5" },
  surfaceAlt: { main: "#292524", contrastText: "#fafaf9" },
};
