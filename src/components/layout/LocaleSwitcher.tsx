"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState, useTransition, type MouseEvent } from "react";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import ListItemText from "@mui/material/ListItemText";
import LanguageIcon from "@mui/icons-material/Language";
import CheckIcon from "@mui/icons-material/Check";
import Box from "@mui/material/Box";

import { useRouter, usePathname } from "@/i18n/navigation";
import { locales, localeNames, type Locale } from "@/i18n/config";

export function LocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const t = useTranslations("nav");
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleOpen = (e: MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(e.currentTarget);
  };
  const handleClose = () => setAnchorEl(null);

  const choose = (next: Locale) => {
    handleClose();
    startTransition(() => {
      router.replace(pathname, { locale: next });
    });
  };

  return (
    <Box>
      <IconButton
        aria-label={t("language")}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={handleOpen}
        disabled={pending}
        color="inherit"
      >
        <LanguageIcon fontSize="small" />
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{ list: { role: "listbox", "aria-label": t("language") } }}
      >
        {locales.map((l) => {
          const selected = l === locale;
          return (
            <MenuItem
              key={l}
              selected={selected}
              onClick={() => choose(l)}
              role="option"
              aria-selected={selected}
            >
              <ListItemText primary={localeNames[l]} />
              {selected ? (
                <CheckIcon fontSize="small" sx={{ ml: 2, color: "primary.main" }} />
              ) : null}
            </MenuItem>
          );
        })}
      </Menu>
    </Box>
  );
}
