"use client";

import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import SettingsBrightnessOutlinedIcon from "@mui/icons-material/SettingsBrightnessOutlined";
import { useTranslations } from "next-intl";

import { useColorMode } from "@/hooks/useColorMode";

/**
 * Compact tri-state toggle for the header / mobile drawer. A single click
 * cycles light -> dark -> system -> light. The visible icon reflects the
 * user's *explicit* choice when they've picked light or dark, and the
 * resolved mode (sun/moon) when they're on "system" — so users can tell
 * at a glance what the app is currently rendering.
 */
export function ColorModeToggle() {
  const { mode, resolvedMode, toggle } = useColorMode();
  const t = useTranslations("nav.colorMode");

  // Icon rule:
  //  - explicit "light"  -> sun
  //  - explicit "dark"   -> moon
  //  - "system"          -> mixed-brightness icon, so users see the
  //                         distinction between "follows OS" and a
  //                         pinned choice.
  const icon =
    mode === "system" ? (
      <SettingsBrightnessOutlinedIcon fontSize="small" />
    ) : resolvedMode === "dark" ? (
      <DarkModeOutlinedIcon fontSize="small" />
    ) : (
      <LightModeOutlinedIcon fontSize="small" />
    );

  const tooltipText =
    mode === "light" ? t("light") : mode === "dark" ? t("dark") : t("system");

  return (
    <Tooltip title={tooltipText} enterDelay={300}>
      <IconButton
        type="button"
        onClick={toggle}
        aria-label={t("toggle")}
        color="inherit"
        size="medium"
      >
        {icon}
      </IconButton>
    </Tooltip>
  );
}
