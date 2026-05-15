"use client";

import type { ComponentProps, ElementType, ReactNode } from "react";
import Box from "@mui/material/Box";
import type { SxProps, Theme } from "@mui/material/styles";

import { Link } from "@/i18n/navigation";

type LinkOnlyProps = ComponentProps<typeof Link>;

type Props = {
  href: string;
  locale?: LinkOnlyProps["locale"];
  prefetch?: LinkOnlyProps["prefetch"];
  // 'primary' = ink-blue text link in body copy.
  // 'muted'   = de-emphasized text-secondary link used in breadcrumb-ish
  //             "back" rows.
  tone?: "primary" | "muted";
  sx?: SxProps<Theme>;
  className?: string;
  "aria-label"?: string;
  children?: ReactNode;
};

// Cast Link to an ElementType so Box's polymorphic `component` overloads
// resolve cleanly. The runtime is still the next-intl Link.
const LinkComponent: ElementType = Link;

/**
 * Inline text link styled with theme tokens. Wraps the next-intl `Link`
 * so locale routing keeps working. Marked `"use client"` so MUI's
 * theming/styled hooks can resolve at render time — server pages that
 * need a styled link import this primitive instead of using
 * `<MuiLink component={Link}>` (which trips React's "function passed to
 * client component" guard).
 */
export function InlineLink({
  href,
  locale,
  prefetch,
  tone = "primary",
  sx,
  className,
  children,
  "aria-label": ariaLabel,
}: Props) {
  return (
    <Box
      component={LinkComponent}
      href={href}
      locale={locale}
      prefetch={prefetch}
      className={className}
      aria-label={ariaLabel}
      sx={[
        {
          color: tone === "muted" ? "text.secondary" : "primary.main",
          textDecoration: "none",
          fontWeight: tone === "muted" ? 400 : 500,
          "&:hover": { textDecoration: "underline" },
        },
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
    >
      {children}
    </Box>
  );
}
