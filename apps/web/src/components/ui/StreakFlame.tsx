"use client";

import Chip from "@mui/material/Chip";
import { useTheme } from "@mui/material/styles";

type Size = "sm" | "md" | "lg";

const sizeMap: Record<Size, { iconPx: number; chipSize: "small" | "medium"; fontPx: number; height: number }> = {
  sm: { iconPx: 14, chipSize: "small", fontPx: 12, height: 24 },
  md: { iconPx: 16, chipSize: "small", fontPx: 14, height: 28 },
  lg: { iconPx: 20, chipSize: "medium", fontPx: 16, height: 36 },
};

type Props = {
  days: number;
  size?: Size;
  className?: string;
  label?: string;
};

/**
 * Streak pill. Active streaks read in amber; zero-streak falls back to
 * a muted stone tone so users can see the difference at a glance.
 */
export function StreakFlame({ days, size = "md", className, label }: Props) {
  const s = sizeMap[size];
  const active = days > 0;
  const theme = useTheme();

  const flameFill = active
    ? theme.palette.secondary.main
    : theme.palette.text.secondary;
  const flameStroke = active
    ? theme.palette.secondary.contrastText
    : theme.palette.text.secondary;

  return (
    <Chip
      className={className}
      size={s.chipSize}
      variant="filled"
      icon={
        <FlameIcon
          size={s.iconPx}
          fill={flameFill}
          stroke={flameStroke}
          active={active}
        />
      }
      label={
        <span style={{ fontVariantNumeric: "tabular-nums", fontSize: s.fontPx }}>
          {days}
        </span>
      }
      aria-label={label ?? `${days} day streak`}
      sx={{
        height: s.height,
        bgcolor: active ? "accentSoft.main" : "surfaceAlt.main",
        color: active ? "accentSoft.contrastText" : "text.secondary",
        border: 1,
        borderStyle: "solid",
        borderColor: active ? "secondary.main" : "divider",
        borderRadius: 9999,
        fontWeight: 500,
        "& .MuiChip-icon": {
          marginLeft: "6px",
          marginRight: "-2px",
          color: "inherit",
        },
        "& .MuiChip-label": {
          paddingLeft: "6px",
          paddingRight: "10px",
        },
      }}
    />
  );
}

function FlameIcon({
  size,
  fill,
  stroke,
  active,
}: {
  size: number;
  fill: string;
  stroke: string;
  active: boolean;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 2.5c1.5 3.2 4.5 5.4 4.5 9.2a4.5 4.5 0 1 1-9 0c0-1.6.6-2.6 1.5-3.5C8.5 11 9.5 13 12 13c0-2.2-1.5-5 0-10.5z"
        fill={fill}
        stroke={stroke}
        strokeOpacity={active ? 0.25 : 0.6}
        strokeWidth="1"
        strokeLinejoin="round"
      />
    </svg>
  );
}
