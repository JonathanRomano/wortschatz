import type { Theme } from "@mui/material/styles";

// MUI requires `shadows` to be a tuple of exactly 25 strings: index 0
// must be 'none' and indexes 1..24 progressively heavier elevations.
// We override `elevation: 1` to match the existing soft Tinte shadow so
// raised surfaces (cards, the primary button on hover) keep their warm
// character. Indexes 2+ fall back to MUI's defaults (lightly tuned for
// our warm palette so they still read as ink-on-paper, not blue).

type Shadows = Theme["shadows"];

const SOFT_1 =
  "0 1px 2px rgba(28, 25, 23, 0.06), 0 1px 1px rgba(28, 25, 23, 0.04)";

const SOFT_2 =
  "0 2px 4px rgba(28, 25, 23, 0.06), 0 1px 2px rgba(28, 25, 23, 0.04)";

const SOFT_3 =
  "0 4px 6px rgba(28, 25, 23, 0.06), 0 2px 4px rgba(28, 25, 23, 0.04)";

const SOFT_4 =
  "0 6px 10px rgba(28, 25, 23, 0.07), 0 2px 4px rgba(28, 25, 23, 0.04)";

const SOFT_6 =
  "0 10px 15px rgba(28, 25, 23, 0.08), 0 4px 6px rgba(28, 25, 23, 0.04)";

const SOFT_8 =
  "0 14px 22px rgba(28, 25, 23, 0.09), 0 6px 10px rgba(28, 25, 23, 0.05)";

const SOFT_12 =
  "0 18px 32px rgba(28, 25, 23, 0.11), 0 8px 14px rgba(28, 25, 23, 0.06)";

const SOFT_16 =
  "0 24px 48px rgba(28, 25, 23, 0.14), 0 10px 20px rgba(28, 25, 23, 0.07)";

const SOFT_24 =
  "0 32px 64px rgba(28, 25, 23, 0.18), 0 12px 24px rgba(28, 25, 23, 0.08)";

// Fill the 25 slots with a hand-graded ramp so MUI doesn't blow up if
// some component asks for `elevation={12}` etc.
export const shadows: Shadows = [
  "none",
  SOFT_1,
  SOFT_2,
  SOFT_2,
  SOFT_3,
  SOFT_3,
  SOFT_4,
  SOFT_4,
  SOFT_6,
  SOFT_6,
  SOFT_6,
  SOFT_8,
  SOFT_8,
  SOFT_8,
  SOFT_12,
  SOFT_12,
  SOFT_12,
  SOFT_16,
  SOFT_16,
  SOFT_16,
  SOFT_24,
  SOFT_24,
  SOFT_24,
  SOFT_24,
  SOFT_24,
] as Shadows;
