"use client";

import Chip from "@mui/material/Chip";
import { useTheme } from "@mui/material/styles";

type Size = "sm" | "md" | "lg";

const sizeMap: Record<Size, { iconPx: number; chipSize: "small" | "medium"; fontPx: number; height: number }> = {
  sm: { iconPx: 12, chipSize: "small", fontPx: 12, height: 24 },
  md: { iconPx: 14, chipSize: "small", fontPx: 14, height: 28 },
  lg: { iconPx: 18, chipSize: "medium", fontPx: 16, height: 36 },
};

type Props = {
  amount: number;
  size?: Size;
  className?: string;
  label?: string; // Optional aria-label override.
};

/**
 * Münzen balance pill. Amber (`secondary`) chip with a tiny coin glyph.
 */
export function MuenzenBadge({ amount, size = "md", className, label }: Props) {
  const s = sizeMap[size];
  const theme = useTheme();

  return (
    <Chip
      className={className}
      size={s.chipSize}
      color="secondary"
      variant="filled"
      icon={
        <CoinIcon
          size={s.iconPx}
          fill={theme.palette.secondary.main}
          stroke={theme.palette.secondary.contrastText}
        />
      }
      label={
        <span style={{ fontVariantNumeric: "tabular-nums", fontSize: s.fontPx }}>
          {amount.toLocaleString()}
        </span>
      }
      aria-label={label ?? `${amount} Münzen`}
      sx={{
        height: s.height,
        bgcolor: "accentSoft.main",
        color: "accentSoft.contrastText",
        border: 1,
        borderStyle: "solid",
        borderColor: "secondary.main",
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

function CoinIcon({
  size,
  fill,
  stroke,
}: {
  size: number;
  fill: string;
  stroke: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" fill={fill} stroke={fill} />
      <circle
        cx="12"
        cy="12"
        r="6"
        fill="none"
        stroke={stroke}
        strokeOpacity="0.35"
        strokeWidth="1"
      />
      <text
        x="12"
        y="16"
        textAnchor="middle"
        fontSize="9"
        fontWeight="700"
        fontFamily="ui-serif, Georgia, serif"
        fill={stroke}
      >
        M
      </text>
    </svg>
  );
}
