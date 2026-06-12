"use client";

import { useTranslations } from "next-intl";
import Stack from "@mui/material/Stack";

import { ButtonLink } from "@/components/ui/ButtonLink";

/**
 * Top-right links shared by the generator pages. The current page's own
 * link is omitted so only the destinations show.
 */
type NavKey = "generate" | "prompts" | "history" | "base";

export function AdminSubNav({ current }: { current: NavKey }) {
  const t = useTranslations("admin.generate.nav");

  const links: Array<{ key: NavKey; href: string; label: string }> = [
    { key: "generate", href: "/admin/generate", label: t("generator") },
    { key: "history", href: "/admin/generate/history", label: t("history") },
    { key: "prompts", href: "/admin/prompts", label: t("prompts") },
    { key: "base", href: "/admin/prompts/base", label: t("base") },
  ];

  return (
    <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1 }}>
      {links
        .filter((l) => l.key !== current)
        .map((l) => (
          <ButtonLink
            key={l.key}
            href={l.href}
            variant="outlined"
            size="small"
            color="primary"
            sx={{ minHeight: 44 }}
          >
            {l.label}
          </ButtonLink>
        ))}
    </Stack>
  );
}
