"use client";

import { useTheme } from "@mui/material/styles";
import type { ExerciseType } from "@wortschatz/database";

type ColorName =
  | "primary"
  | "secondary"
  | "tertiary"
  | "error"
  | "success"
  | "inherit";

type Props = {
  type: ExerciseType;
  size?: number;
  // Either a MUI palette key or a free-form color (e.g. a theme path
  // already resolved by the caller). Default 'inherit' lets the parent
  // <Box color="primary.main">…</Box> control the tone.
  color?: ColorName;
  className?: string;
};

/**
 * Single inline SVG glyph per exercise type. Tiny, monochrome, follows
 * currentColor so callers control the tone. Designed to feel like
 * letterpress marginalia rather than a busy icon library.
 */
export function ExerciseTypeIcon({
  type,
  size = 22,
  color = "inherit",
  className,
}: Props) {
  const theme = useTheme();

  const resolved = (() => {
    switch (color) {
      case "primary":
        return theme.palette.primary.main;
      case "secondary":
        return theme.palette.secondary.main;
      case "tertiary":
        return theme.palette.tertiary.main;
      case "error":
        return theme.palette.error.main;
      case "success":
        return theme.palette.success.main;
      case "inherit":
      default:
        return "currentColor";
    }
  })();

  const dangerStroke = theme.palette.error.main;

  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: resolved,
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    className,
  };

  switch (type) {
    case "FILL_IN_THE_BLANK":
      return (
        <svg {...common}>
          <path d="M3 12h6" />
          <path d="M15 12h6" />
          <path d="M10 16h4" strokeDasharray="2 2" />
          <path d="M9 8.5h6" />
        </svg>
      );
    case "MULTIPLE_CHOICE":
      return (
        <svg {...common}>
          <circle cx="6" cy="7" r="1.4" />
          <circle cx="6" cy="12" r="1.4" />
          <circle cx="6" cy="17" r="1.4" fill={resolved} />
          <path d="M10 7h11" />
          <path d="M10 12h11" />
          <path d="M10 17h11" />
        </svg>
      );
    case "TRANSLATION":
      return (
        <svg {...common}>
          <path d="M4 7h7" />
          <path d="M7 5v2c0 2.5-2 5-3 6" />
          <path d="M4 12c2 2 4 2 6 1" />
          <path d="M13 20l4-10 4 10" />
          <path d="M14.5 17h5" />
        </svg>
      );
    case "WORD_ORDER":
      return (
        <svg {...common}>
          <rect x="3" y="5" width="6" height="4" rx="1" />
          <rect x="11" y="5" width="10" height="4" rx="1" />
          <rect x="3" y="13" width="9" height="4" rx="1" />
          <rect x="14" y="13" width="7" height="4" rx="1" />
        </svg>
      );
    case "MATCHING":
      return (
        <svg {...common}>
          <circle cx="5" cy="7" r="1.5" />
          <circle cx="5" cy="17" r="1.5" />
          <circle cx="19" cy="7" r="1.5" />
          <circle cx="19" cy="17" r="1.5" />
          <path d="M6.5 7c4 0 8 10 11 10" />
          <path d="M6.5 17c4 0 8-10 11-10" />
        </svg>
      );
    case "LISTENING_COMPREHENSION":
      return (
        <svg {...common}>
          <path d="M4 14v-2a8 8 0 0 1 16 0v2" />
          <path
            d="M4 14a2 2 0 0 0 2 2h1v-4H6a2 2 0 0 0-2 2z"
            fill={resolved}
            fillOpacity="0.15"
          />
          <path
            d="M20 14a2 2 0 0 1-2 2h-1v-4h1a2 2 0 0 1 2 2z"
            fill={resolved}
            fillOpacity="0.15"
          />
          <path d="M17 16v1a3 3 0 0 1-3 3h-1" />
        </svg>
      );
    case "READING_COMPREHENSION":
      return (
        <svg {...common}>
          <path d="M4 5c3 0 6 1 8 2 2-1 5-2 8-2v13c-3 0-6 1-8 2-2-1-5-2-8-2z" />
          <path d="M12 7v13" />
        </svg>
      );
    case "VERB_CONJUGATION":
      return (
        <svg {...common}>
          <path d="M5 5v14" />
          <path d="M5 5h8a4 4 0 0 1 0 8H5" />
          <path d="M11 13l5 6" />
        </svg>
      );
    case "ERROR_CORRECTION":
      return (
        <svg {...common}>
          <path d="M4 6h12" />
          <path d="M4 12h8" />
          <path d="M4 18h14" />
          <path d="M16 4l4 4" stroke={dangerStroke} />
          <path d="M20 4l-4 4" stroke={dangerStroke} />
        </svg>
      );
    case "FREE_WRITING":
      return (
        <svg {...common}>
          <path d="M4 20h16" />
          <path d="M6 17l9-12 3 3-9 12H6z" />
          <path d="M14 6l3 3" />
        </svg>
      );
  }
}
