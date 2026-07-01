"use client";

import Chip from "@mui/material/Chip";
import Tooltip from "@mui/material/Tooltip";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import { useTranslations } from "next-intl";

type Size = "sm" | "md" | "lg";

const sizeMap: Record<
  Size,
  { iconPx: number; chipSize: "small" | "medium"; fontPx: number; height: number }
> = {
  sm: { iconPx: 14, chipSize: "small", fontPx: 12, height: 24 },
  md: { iconPx: 16, chipSize: "small", fontPx: 14, height: 28 },
  lg: { iconPx: 20, chipSize: "medium", fontPx: 16, height: 36 },
};

type Props = {
  level: number;
  progressPct: number;
  size?: Size;
};

/**
 * XP-level pill (derived from lifetime earned Münzen — see `levelForXp`). A
 * tertiary-tinted chip with a star glyph; the tooltip shows progress to the
 * next level. Distinct from `LevelChip`, which shows CEFR proficiency.
 */
export function XpLevelBadge({ level, progressPct, size = "md" }: Props) {
  const t = useTranslations("dashboard");
  const s = sizeMap[size];

  return (
    <Tooltip title={t("levelProgress", { pct: progressPct })}>
      <Chip
        size={s.chipSize}
        variant="filled"
        icon={<StarRoundedIcon sx={{ fontSize: s.iconPx }} />}
        label={
          <span style={{ fontSize: s.fontPx }}>{t("level", { level })}</span>
        }
        aria-label={t("level", { level })}
        sx={{
          height: s.height,
          bgcolor: "surfaceAlt.main",
          color: "tertiary.main",
          border: 1,
          borderStyle: "solid",
          borderColor: "tertiary.main",
          borderRadius: 9999,
          fontWeight: 600,
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
    </Tooltip>
  );
}
