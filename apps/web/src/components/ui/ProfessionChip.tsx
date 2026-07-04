"use client";

import Chip from "@mui/material/Chip";
import MedicalServicesRoundedIcon from "@mui/icons-material/MedicalServicesRounded";
import CodeRoundedIcon from "@mui/icons-material/CodeRounded";
import RestaurantRoundedIcon from "@mui/icons-material/RestaurantRounded";
import ConstructionRoundedIcon from "@mui/icons-material/ConstructionRounded";
import { useTranslations } from "next-intl";
import type { ProfessionSlug } from "@wortschatz/config";

type Size = "sm" | "md";

type Props = {
  slug: ProfessionSlug;
  size?: Size;
  className?: string;
};

const iconBySlug: Record<
  ProfessionSlug,
  typeof MedicalServicesRoundedIcon
> = {
  pflege: MedicalServicesRoundedIcon,
  it: CodeRoundedIcon,
  gastro: RestaurantRoundedIcon,
  handwerk: ConstructionRoundedIcon,
};

/**
 * Profession pill ("Beruf" pivot, Sprint 05). Localized name from the
 * `professions` message block plus a small glyph; quiet outline like
 * `LevelChip` so it can sit beside it on exercise cards and the track
 * header without competing.
 */
export function ProfessionChip({ slug, size = "md", className }: Props) {
  const t = useTranslations("professions");
  const Icon = iconBySlug[slug];
  const label = t(slug);

  return (
    <Chip
      label={label}
      aria-label={label}
      icon={<Icon sx={{ fontSize: size === "sm" ? 14 : 16 }} />}
      size={size === "sm" ? "small" : "medium"}
      variant="outlined"
      className={className}
      sx={{
        borderRadius: 9999,
        fontWeight: 600,
        height: size === "sm" ? 22 : 28,
        fontSize: size === "sm" ? "0.6875rem" : "0.8125rem",
        borderColor: "divider",
        color: "text.primary",
        "& .MuiChip-icon": {
          color: "tertiary.main",
          marginLeft: size === "sm" ? "6px" : "8px",
        },
        "& .MuiChip-label": {
          paddingLeft: size === "sm" ? "6px" : "8px",
          paddingRight: size === "sm" ? "8px" : "10px",
        },
      }}
    />
  );
}
