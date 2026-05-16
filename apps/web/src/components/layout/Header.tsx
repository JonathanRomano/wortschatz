import { getTranslations } from "next-intl/server";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/db";
import { MuenzenBadge } from "@/components/ui/MuenzenBadge";
import { StreakFlame } from "@/components/ui/StreakFlame";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { MobileMenu } from "./MobileMenu";
import { ColorModeToggle } from "./ColorModeToggle";
import {
  HeaderBrandLink,
  HeaderLoginButton,
  HeaderNavLink,
  HeaderRegisterButton,
} from "./HeaderLinks";

export async function Header() {
  const t = await getTranslations("nav");
  const session = await auth();
  const isAuthed = !!session?.user;
  const role = session?.user?.role;
  const isAdmin = role === "ADMIN" || role === "TEACHER";

  // Pull live Münzen/streak for the header chip. Cheap, indexed by id.
  const wallet =
    isAuthed && session.user.id
      ? await prisma.user.findUnique({
          where: { id: session.user.id },
          select: { muenzen: true, streak: true },
        })
      : null;

  const authedLinks = [
    { href: "/dashboard", label: t("dashboard") },
    { href: "/exercises", label: t("exercises") },
    { href: "/exercises/mistakes", label: t("mistakes") },
    { href: "/review", label: t("review") },
    { href: "/profile", label: t("profile") },
    ...(isAdmin ? [{ href: "/admin", label: t("admin") }] : []),
  ];

  const signOutForm = (
    <form
      action={async () => {
        "use server";
        await signOut({ redirectTo: "/" });
      }}
    >
      <Button
        type="submit"
        variant="outlined"
        size="small"
        fullWidth
        sx={{ minHeight: 44 }}
      >
        {t("logout")}
      </Button>
    </form>
  );

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        borderBottom: 1,
        borderColor: "divider",
        backdropFilter: "blur(8px)",
      }}
    >
      <Container maxWidth="lg" disableGutters>
        <Toolbar
          sx={{
            px: { xs: 2, sm: 3 },
            py: 1,
            gap: 1.5,
            justifyContent: "space-between",
          }}
        >
          <HeaderBrandLink>
            <Wordmark />
          </HeaderBrandLink>

          {/* Desktop nav (md+) */}
          <Stack
            direction="row"
            spacing={0.5}
            sx={{ display: { xs: "none", md: "flex" }, alignItems: "center" }}
          >
            {isAuthed ? (
              <>
                {wallet ? (
                  <Stack direction="row" spacing={1} sx={{ mr: 1 }}>
                    <MuenzenBadge amount={wallet.muenzen} size="sm" />
                    <StreakFlame days={wallet.streak} size="sm" />
                  </Stack>
                ) : null}
                {authedLinks.map((link) => (
                  <HeaderNavLink key={link.href} href={link.href}>
                    {link.label}
                  </HeaderNavLink>
                ))}
                <Box sx={{ ml: 1 }}>{signOutForm}</Box>
                <Box sx={{ ml: 1 }}>
                  <ColorModeToggle />
                </Box>
                <Box>
                  <LocaleSwitcher />
                </Box>
              </>
            ) : (
              <>
                <HeaderLoginButton>{t("login")}</HeaderLoginButton>
                <HeaderRegisterButton>{t("register")}</HeaderRegisterButton>
                <Box sx={{ ml: 1 }}>
                  <ColorModeToggle />
                </Box>
                <Box>
                  <LocaleSwitcher />
                </Box>
              </>
            )}
          </Stack>

          {/* Mobile compact rail (below md): wallet chips next to the menu trigger */}
          <Stack
            direction="row"
            spacing={1}
            sx={{ display: { xs: "flex", md: "none" }, alignItems: "center" }}
          >
            {isAuthed && wallet ? (
              <>
                <MuenzenBadge amount={wallet.muenzen} size="sm" />
                <StreakFlame days={wallet.streak} size="sm" />
              </>
            ) : null}
            <MobileMenu
              isAuthed={isAuthed}
              labels={{
                openMenu: t("openMenu"),
                closeMenu: t("closeMenu"),
                menu: t("menu"),
                login: t("login"),
                register: t("register"),
                language: t("language"),
              }}
              links={authedLinks}
              signOutSlot={isAuthed ? signOutForm : null}
            />
          </Stack>
        </Toolbar>
      </Container>
    </AppBar>
  );
}

function Wordmark() {
  return (
    <Stack direction="row" spacing={0.75} sx={{ alignItems: "baseline" }}>
      <Typography
        component="span"
        sx={{
          fontFamily: "var(--font-fraunces), serif",
          fontWeight: 600,
          fontSize: { xs: "1.125rem", sm: "1.25rem" },
          color: "primary.main",
          letterSpacing: "-0.01em",
        }}
      >
        Wortschatz
      </Typography>
      <Box
        aria-hidden="true"
        sx={{
          display: { xs: "none", sm: "block" },
          height: 6,
          width: 6,
          borderRadius: "50%",
          backgroundColor: "secondary.main",
        }}
      />
    </Stack>
  );
}
