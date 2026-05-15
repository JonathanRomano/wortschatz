"use client";

import { useEffect, useState } from "react";
import IconButton from "@mui/material/IconButton";
import Drawer from "@mui/material/Drawer";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Divider from "@mui/material/Divider";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";

import { Link, usePathname } from "@/i18n/navigation";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { ColorModeToggle } from "./ColorModeToggle";

type NavLink = { href: string; label: string };

type Props = {
  isAuthed: boolean;
  links: NavLink[];
  signOutSlot: React.ReactNode;
  labels: {
    openMenu: string;
    closeMenu: string;
    menu: string;
    login: string;
    register: string;
    language: string;
  };
};

export function MobileMenu({ isAuthed, links, signOutSlot, labels }: Props) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close menu on route change.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
      <IconButton
        aria-label={open ? labels.closeMenu : labels.openMenu}
        aria-expanded={open}
        aria-controls="mobile-menu-drawer"
        onClick={() => setOpen((v) => !v)}
        sx={{ display: { md: "none" } }}
        color="inherit"
      >
        {open ? <CloseIcon /> : <MenuIcon />}
      </IconButton>

      <Drawer
        id="mobile-menu-drawer"
        anchor="right"
        open={open}
        onClose={() => setOpen(false)}
        slotProps={{
          paper: {
            sx: {
              width: "85vw",
              maxWidth: 384,
              display: { md: "none" },
            },
            "aria-label": labels.menu,
          },
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            px: 2,
            py: 1.5,
            borderBottom: 1,
            borderColor: "divider",
          }}
        >
          <Typography variant="h6" component="span">
            {labels.menu}
          </Typography>
          <IconButton
            aria-label={labels.closeMenu}
            onClick={() => setOpen(false)}
            color="inherit"
          >
            <CloseIcon />
          </IconButton>
        </Box>

        <Box
          component="nav"
          sx={{ flex: 1, overflowY: "auto", px: 2, py: 2 }}
        >
          {isAuthed ? (
            <List disablePadding>
              {links.map((link) => (
                <ListItem key={link.href} disablePadding>
                  <ListItemButton component={Link} href={link.href}>
                    <ListItemText primary={link.label} />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          ) : (
            <Stack spacing={1.5}>
              <Button
                component={Link}
                href="/login"
                variant="outlined"
                size="large"
                fullWidth
              >
                {labels.login}
              </Button>
              <Button
                component={Link}
                href="/register"
                variant="contained"
                color="primary"
                size="large"
                fullWidth
              >
                {labels.register}
              </Button>
            </Stack>
          )}
        </Box>

        <Divider />
        <Stack spacing={2} sx={{ px: 2, py: 2 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 1,
            }}
          >
            <Box sx={{ flex: 1 }}>
              <Typography
                variant="overline"
                sx={{ color: "text.secondary", display: "block", mb: 1 }}
              >
                {labels.language}
              </Typography>
              <LocaleSwitcher />
            </Box>
            <ColorModeToggle />
          </Box>
          {signOutSlot ? <Box>{signOutSlot}</Box> : null}
        </Stack>
      </Drawer>
    </>
  );
}
