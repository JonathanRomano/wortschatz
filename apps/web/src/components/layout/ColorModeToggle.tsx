"use client";

import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import { useTranslations } from "next-intl";

import { useColorMode } from "@/hooks/useColorMode";

/**
 * Two-state toggle for the header / mobile drawer. Shows the icon for
 * the *current* mode (sun in light, moon in dark) and flips on click.
 * The aria-label is the stable "toggle color mode" string so screen
 * readers don't read a different label every time the user clicks.
 */
export function ColorModeToggle() {
  const { mode, toggle } = useColorMode();
  const t = useTranslations("nav.colorMode");

  const icon =
    mode === "dark" ? (
      <DarkModeOutlinedIcon fontSize="small" />
    ) : (
      <LightModeOutlinedIcon fontSize="small" />
    );

  const tooltipText = mode === "dark" ? t("dark") : t("light");

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
