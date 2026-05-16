"use client";

import type { ElementType, ReactNode } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";

import { Link } from "@/i18n/navigation";

// Cast Link to a polymorphic ElementType so MUI's overloads resolve
// without trying to type-merge anchor and button DOM refs.
const LinkComponent: ElementType = Link;

/**
 * Client-side primitives used by the (server) `Header` component. Both
 * need to cross the server/client boundary as JSX nodes rather than as
 * `component={Link}` props — otherwise React rejects the function
 * payload at serialization time.
 */

export function HeaderBrandLink({ children }: { children: ReactNode }) {
  return (
    <Box
      component={LinkComponent}
      href="/"
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        flexShrink: 0,
        color: "inherit",
        textDecoration: "none",
        transition: "opacity 150ms ease",
        "&:hover": { opacity: 0.85 },
      }}
    >
      {children}
    </Box>
  );
}

export function HeaderNavLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Button
      component={LinkComponent}
      href={href}
      color="inherit"
      sx={{
        minHeight: 44,
        fontWeight: 400,
        "&:hover": {
          backgroundColor: "surfaceAlt.main",
          color: "primary.main",
        },
      }}
    >
      {children}
    </Button>
  );
}

export function HeaderLoginButton({ children }: { children: ReactNode }) {
  return (
    <Button
      component={LinkComponent}
      href="/login"
      color="inherit"
      sx={{ minHeight: 44 }}
    >
      {children}
    </Button>
  );
}

export function HeaderRegisterButton({ children }: { children: ReactNode }) {
  return (
    <Button
      component={LinkComponent}
      href="/register"
      variant="contained"
      color="primary"
      sx={{ minHeight: 44, ml: 0.5 }}
    >
      {children}
    </Button>
  );
}
