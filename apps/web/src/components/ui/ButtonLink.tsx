"use client";

import type { ComponentProps, ElementType, ReactNode } from "react";
import Button, { type ButtonProps } from "@mui/material/Button";

import { Link } from "@/i18n/navigation";

type LinkOnlyProps = ComponentProps<typeof Link>;

// We strip MUI's `href` type ("string" only) and replace it with the
// next-intl `href` shape that also accepts UrlObjects. This sidesteps
// the overload mismatch you get when feeding `<Button component={Link}>`
// from server pages — and keeps locale routing intact.
type Props = Omit<ButtonProps, "component" | "href"> & {
  href: string;
  locale?: LinkOnlyProps["locale"];
  prefetch?: LinkOnlyProps["prefetch"];
  children?: ReactNode;
};

// Treating the next-intl Link as an ElementType keeps MUI's overloads
// happy while still letting the locale-aware Link render at runtime.
const LinkComponent: ElementType = Link;

/**
 * Locale-aware MUI Button rendered as a next-intl Link. Lives in a
 * "use client" file so server pages can render it without tripping
 * React's "function passed to client component" guard (which fires when
 * `<Button component={Link}>` is composed across the boundary).
 */
export function ButtonLink({ href, locale, prefetch, children, ...rest }: Props) {
  return (
    <Button
      {...rest}
      component={LinkComponent}
      href={href}
      locale={locale}
      prefetch={prefetch}
    >
      {children}
    </Button>
  );
}
