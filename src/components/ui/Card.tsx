"use client";

import { forwardRef, type ReactNode } from "react";
import Paper, { type PaperProps } from "@mui/material/Paper";

type CardProps = Omit<PaperProps, "elevation"> & {
  // When true the card carries a subtle amber tint — used for "you'll
  // like this" or current-balance style highlight panels.
  accent?: boolean;
  // Tighter padding for dense grids; default fits a typical content card.
  padding?: "sm" | "md" | "lg" | "none";
  children?: ReactNode;
};

const padMap = {
  none: 0,
  sm: 2,
  // 5px on mobile / 6px on tablet+ in the old design ≈ MUI spacing 2.5/3.
  md: { xs: 2.5, sm: 3 },
  lg: { xs: 3, sm: 4 },
} as const;

/**
 * Thin wrapper over MUI's `Paper`. Keeps the existing prop API (`accent`,
 * `padding`) so the migration of pages is a near drop-in. All color
 * decisions come from the theme.
 */
export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { accent, padding = "md", sx, children, ...rest },
  ref,
) {
  return (
    <Paper
      ref={ref}
      elevation={1}
      variant="elevation"
      {...rest}
      sx={[
        {
          p: padMap[padding],
          border: 1,
          borderColor: accent ? "secondary.main" : "divider",
          borderStyle: "solid",
          backgroundColor: accent ? "accentSoft.main" : "background.paper",
        },
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
    >
      {children}
    </Paper>
  );
});
