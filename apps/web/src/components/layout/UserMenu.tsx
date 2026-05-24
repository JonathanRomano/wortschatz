"use client";

import { useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import Avatar from "@mui/material/Avatar";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Divider from "@mui/material/Divider";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import PersonOutlineIcon from "@mui/icons-material/PersonOutlined";
import LogoutIcon from "@mui/icons-material/Logout";

import { Link } from "@/i18n/navigation";

type Props = {
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
  signOutAction: () => Promise<void>;
};

export function UserMenu({ name, email, avatarUrl, signOutAction }: Props) {
  const t = useTranslations("nav");
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const [open, setOpen] = useState(false);
  const [signingOut, startSignOut] = useTransition();

  const initial = (name?.trim()?.[0] ?? email?.trim()?.[0] ?? "?").toUpperCase();

  function handleSignOut() {
    setOpen(false);
    startSignOut(() => {
      void signOutAction();
    });
  }

  return (
    <>
      <IconButton
        ref={buttonRef}
        onClick={() => setOpen(true)}
        aria-label={t("userMenu")}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? "user-menu" : undefined}
        sx={{ p: 0.5 }}
      >
        <Avatar
          src={avatarUrl ?? undefined}
          alt={name ?? ""}
          sx={{
            width: 36,
            height: 36,
            bgcolor: "primary.main",
            color: "primary.contrastText",
            fontSize: "0.95rem",
            fontWeight: 600,
          }}
        >
          {initial}
        </Avatar>
      </IconButton>

      <Menu
        id="user-menu"
        anchorEl={buttonRef.current}
        open={open}
        onClose={() => setOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{
          paper: { sx: { mt: 1, minWidth: 220 } },
          list: { "aria-label": t("userMenu") },
        }}
      >
        {(name || email) && (
          <Box sx={{ px: 2, py: 1 }}>
            {name ? (
              <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                {name}
              </Typography>
            ) : null}
            {email ? (
              <Typography variant="caption" sx={{ color: "text.secondary" }} noWrap>
                {email}
              </Typography>
            ) : null}
          </Box>
        )}
        {(name || email) && <Divider />}

        <MenuItem
          component={Link}
          href="/profile"
          onClick={() => setOpen(false)}
        >
          <ListItemIcon>
            <PersonOutlineIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>{t("profile")}</ListItemText>
        </MenuItem>

        <MenuItem onClick={handleSignOut} disabled={signingOut}>
          <ListItemIcon>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>{t("logout")}</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
}
