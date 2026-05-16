"use client";

import Chip from "@mui/material/Chip";
import type { CefrLevel } from "@wortschatz/database";

type Props = {
  level: CefrLevel;
  size?: "sm" | "md";
  className?: string;
};

/**
 * CEFR level chip (A1 — C2). Uppercase mono label, neutral outline. The
 * tone variation that used to differ per level lives in higher-density
 * surfaces (e.g. ExerciseTypeIcon backgrounds) now — the chip itself is
 * a quiet typographic mark.
 */
export function LevelChip({ level, size = "md", className }: Props) {
  return (
    <Chip
      label={level}
      size={size === "sm" ? "small" : "medium"}
      variant="outlined"
      className={className}
      sx={{
        borderRadius: 9999,
        fontFamily:
          'ui-monospace, SFMono-Regular, "Menlo", "Monaco", monospace',
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.04em",
        height: size === "sm" ? 22 : 26,
        fontSize: size === "sm" ? "0.625rem" : "0.75rem",
        borderColor: "divider",
        color: "text.primary",
        "& .MuiChip-label": {
          paddingLeft: size === "sm" ? "8px" : "10px",
          paddingRight: size === "sm" ? "8px" : "10px",
        },
      }}
    />
  );
}
